import { RssTrigger, RssTriggerConfig } from '../../../src/services/triggers/rss';
import { TriggerEvent } from '../../../src/services/triggers/base';
import * as fs from 'fs';
import * as path from 'path';

// Mock rss-parser
const mockParseURL = jest.fn();
jest.mock('rss-parser', () => {
  return jest.fn().mockImplementation(() => ({
    parseURL: mockParseURL
  }));
});

// Mock node-cron
const mockTaskStart = jest.fn();
const mockTaskStop = jest.fn();
jest.mock('node-cron', () => ({
  schedule: jest.fn()
}));

const mockSchedule = require('node-cron').schedule;

describe('RssTrigger', () => {
  let mockOnTrigger: jest.Mock;
  let rssConfig: RssTriggerConfig;
  let trigger: RssTrigger;
  let mockRssFeed: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOnTrigger = jest.fn().mockResolvedValue(undefined);
    rssConfig = {
      id: 'test-rss',
      name: 'Test RSS Feed',
      type: 'rss',
      enabled: true,
      profile: 'test',
      feedUrl: 'https://example.com/feed.xml',
      schedule: '*/5 * * * *',
      maxItemsPerCheck: 3
    };

    // Mock RSS feed data
    mockRssFeed = {
      title: 'Test RSS Feed',
      items: [
        {
          title: 'First Test Article',
          link: 'https://example.com/article-1',
          guid: 'https://example.com/article-1',
          pubDate: 'Sun, 27 Jul 2025 10:00:00 GMT',
          categories: ['Technology'],
          creator: 'Test Author'
        },
        {
          title: 'Second Test Article',
          link: 'https://example.com/article-2',
          guid: 'https://example.com/article-2',
          pubDate: 'Sun, 27 Jul 2025 09:00:00 GMT',
          categories: ['AI'],
          creator: 'Another Author'
        },
        {
          title: 'Third Test Article',
          link: 'https://example.com/article-3',
          guid: 'https://example.com/article-3',
          pubDate: 'Sun, 27 Jul 2025 08:00:00 GMT',
          categories: ['Testing']
        }
      ]
    };

    mockParseURL.mockResolvedValue(mockRssFeed);
    
    // Mock cron task
    const mockTask = {
      start: mockTaskStart,
      stop: mockTaskStop
    };
    mockSchedule.mockReturnValue(mockTask);

    trigger = new RssTrigger(rssConfig, mockOnTrigger);
  });

  describe('Initialization', () => {
    test('should initialize and mark existing items as seen in normal mode', async () => {
      await trigger.start();

      expect(mockParseURL).toHaveBeenCalledWith(rssConfig.feedUrl);
      expect(mockSchedule).toHaveBeenCalledWith(
        rssConfig.schedule,
        expect.any(Function)
      );
    });

    test('should not mark items as seen in test mode', async () => {
      const testConfig = { ...rssConfig, testMode: true, maxItemsPerCheck: 2 };
      const testTrigger = new RssTrigger(testConfig, mockOnTrigger);

      await testTrigger.start();

      expect(mockParseURL).toHaveBeenCalledWith(rssConfig.feedUrl);
      // In test mode, items should be available for processing
    });

    test('should handle RSS parsing errors gracefully', async () => {
      mockParseURL.mockRejectedValue(new Error('RSS parsing failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await trigger.start();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error initializing RSS feed'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Feed Checking', () => {
    test('should process new items within safety limits', async () => {
      // Start with empty seen items (simulate new feed)
      const newTrigger = new RssTrigger(rssConfig, mockOnTrigger);
      
      // Mock first call (initialization) to return empty, second call to return items
      mockParseURL
        .mockResolvedValueOnce({ items: [] })
        .mockResolvedValueOnce(mockRssFeed);

      await newTrigger.start();

      // Simulate cron job execution
      const cronCallback = mockSchedule.mock.calls[0][1];
      await cronCallback();

      expect(mockOnTrigger).toHaveBeenCalledTimes(3); // All 3 items within limit
      expect(mockOnTrigger).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com/article-1',
          title: 'First Test Article',
          metadata: expect.objectContaining({
            feedTitle: 'Test RSS Feed',
            feedUrl: rssConfig.feedUrl
          })
        })
      );
    });

    test('should respect maxItemsPerCheck safety limit', async () => {
      const limitedConfig = { ...rssConfig, maxItemsPerCheck: 1 };
      const limitedTrigger = new RssTrigger(limitedConfig, mockOnTrigger);

      mockParseURL
        .mockResolvedValueOnce({ items: [] })
        .mockResolvedValueOnce(mockRssFeed);

      await limitedTrigger.start();

      const cronCallback = mockSchedule.mock.calls[0][1];
      await cronCallback();

      expect(mockOnTrigger).toHaveBeenCalledTimes(1); // Only 1 item due to limit
    });

    test('should handle items without links gracefully', async () => {
      const feedWithBadItems = {
        ...mockRssFeed,
        items: [
          { title: 'No Link Article', guid: 'no-link' }, // No link
          { title: 'Good Article', link: 'https://example.com/good', guid: 'good' }
        ]
      };

      mockParseURL
        .mockResolvedValueOnce({ items: [] })
        .mockResolvedValueOnce(feedWithBadItems);

      await trigger.start();

      const cronCallback = mockSchedule.mock.calls[0][1];
      await cronCallback();

      expect(mockOnTrigger).toHaveBeenCalledTimes(1); // Only the good article
      expect(mockOnTrigger).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com/good'
        })
      );
    });

    test('should provide warning when exceeding safety limits', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const limitedConfig = { ...rssConfig, maxItemsPerCheck: 1 };
      const limitedTrigger = new RssTrigger(limitedConfig, mockOnTrigger);

      mockParseURL
        .mockResolvedValueOnce({ items: [] })
        .mockResolvedValueOnce(mockRssFeed);

      await limitedTrigger.start();

      const cronCallback = mockSchedule.mock.calls[0][1];
      await cronCallback();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 3 new items, but will only process 1 for safety')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Status and Lifecycle', () => {
    test('should provide correct status information', async () => {
      await trigger.start();
      const status = trigger.getStatus();

      expect(status.running).toBe(true);
      expect(status.nextCheck).toBeInstanceOf(Date);
    });

    test('should stop properly', async () => {
      await trigger.start();
      await trigger.stop();

      expect(mockTaskStop).toHaveBeenCalled();
      expect(trigger.getStatus().running).toBe(false);
    });

    test('should handle stop when not started', async () => {
      await expect(trigger.stop()).resolves.not.toThrow();
    });
  });

  describe('Item ID Generation', () => {
    test('should generate item IDs from guid, link, or id', () => {
      const items = [
        { guid: 'test-guid', link: 'test-link', id: 'test-id' },
        { link: 'test-link-only', id: 'test-id-only' },
        { id: 'test-id-only' },
        {} // No identifying fields
      ];

      // Access private method for testing
      const getItemId = (trigger as any).getItemId.bind(trigger);

      expect(getItemId(items[0])).toBe('test-guid');
      expect(getItemId(items[1])).toBe('test-link-only');
      expect(getItemId(items[2])).toBe('test-id-only');
      expect(getItemId(items[3])).toBe(null);
    });
  });

  describe('Test Mode', () => {
    test('should run immediate check in test mode', async () => {
      const testConfig = { ...rssConfig, testMode: true, maxItemsPerCheck: 2 };
      const testTrigger = new RssTrigger(testConfig, mockOnTrigger);

      // Use fake timers to control setTimeout
      jest.useFakeTimers();

      await testTrigger.start();

      // Fast forward past the 1 second delay
      jest.advanceTimersByTime(1100);

      // Allow promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockOnTrigger).toHaveBeenCalledTimes(2); // Limited by maxItemsPerCheck

      jest.useRealTimers();
    });
  });
});