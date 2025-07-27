import { RssTrigger, RssTriggerConfig } from '../../../src/services/triggers/rss';

// Mock rss-parser
const mockParseURL = jest.fn();
jest.mock('rss-parser', () => {
  return jest.fn().mockImplementation(() => ({
    parseURL: mockParseURL
  }));
});

// Mock node-cron  
jest.mock('node-cron', () => ({
  schedule: jest.fn()
}));

const mockSchedule = require('node-cron').schedule;

describe('Trigger Safety Limits Integration', () => {
  let mockOnTrigger: jest.Mock;
  let baseConfig: RssTriggerConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOnTrigger = jest.fn().mockResolvedValue(undefined);
    baseConfig = {
      id: 'safety-test',
      name: 'Safety Test Trigger',
      type: 'rss',
      enabled: true,
      profile: 'test',
      feedUrl: 'https://example.com/feed.xml',
      schedule: '*/5 * * * *'
    };

    // Mock cron task
    const mockTask = { start: jest.fn(), stop: jest.fn() };
    mockSchedule.mockReturnValue(mockTask);
  });

  describe('MaxItemsPerCheck Safety Limits', () => {
    test('should enforce default safety limit of 3 items', async () => {
      const trigger = new RssTrigger(baseConfig, mockOnTrigger);

      // Create a large RSS feed
      const largeFeed = {
        title: 'Large Feed',
        items: Array.from({ length: 10 }, (_, i) => ({
          title: `Article ${i + 1}`,
          link: `https://example.com/article-${i + 1}`,
          guid: `article-${i + 1}`,
          pubDate: new Date().toISOString()
        }))
      };

      mockParseURL
        .mockResolvedValueOnce({ items: [] }) // Initial empty state
        .mockResolvedValueOnce(largeFeed);

      await trigger.start();

      // Simulate cron execution
      const cronCallback = mockSchedule.mock.calls[0][1];
      await cronCallback();

      // Should only process 3 items (default limit)
      expect(mockOnTrigger).toHaveBeenCalledTimes(3);
    });

    test('should respect custom maxItemsPerCheck limit', async () => {
      const customConfig = { ...baseConfig, maxItemsPerCheck: 2 };
      const trigger = new RssTrigger(customConfig, mockOnTrigger);

      const mediumFeed = {
        title: 'Medium Feed',
        items: Array.from({ length: 5 }, (_, i) => ({
          title: `Article ${i + 1}`,
          link: `https://example.com/article-${i + 1}`,
          guid: `article-${i + 1}`,
          pubDate: new Date().toISOString()
        }))
      };

      mockParseURL
        .mockResolvedValueOnce({ items: [] })
        .mockResolvedValueOnce(mediumFeed);

      await trigger.start();

      const cronCallback = mockSchedule.mock.calls[0][1];
      await cronCallback();

      // Should only process 2 items (custom limit)
      expect(mockOnTrigger).toHaveBeenCalledTimes(2);
    });

    test('should show warning when exceeding limits', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const strictConfig = { ...baseConfig, maxItemsPerCheck: 1 };
      const trigger = new RssTrigger(strictConfig, mockOnTrigger);

      const largeFeed = {
        title: 'Large Feed',
        items: Array.from({ length: 5 }, (_, i) => ({
          title: `Article ${i + 1}`,
          link: `https://example.com/article-${i + 1}`,
          guid: `article-${i + 1}`,
          pubDate: new Date().toISOString()
        }))
      };

      mockParseURL
        .mockResolvedValueOnce({ items: [] })
        .mockResolvedValueOnce(largeFeed);

      await trigger.start();

      const cronCallback = mockSchedule.mock.calls[0][1];
      await cronCallback();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 5 new items, but will only process 1 for safety')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Remaining 4 items will be processed in next cycle')
      );

      consoleSpy.mockRestore();
    });

    test('should use backward compatible maxItems limit', async () => {
      const legacyConfig = { ...baseConfig, maxItems: 4 } as any;
      const trigger = new RssTrigger(legacyConfig, mockOnTrigger);

      const largeFeed = {
        title: 'Large Feed',
        items: Array.from({ length: 6 }, (_, i) => ({
          title: `Article ${i + 1}`,
          link: `https://example.com/article-${i + 1}`,
          guid: `article-${i + 1}`,
          pubDate: new Date().toISOString()
        }))
      };

      mockParseURL
        .mockResolvedValueOnce({ items: [] })
        .mockResolvedValueOnce(largeFeed);

      await trigger.start();

      const cronCallback = mockSchedule.mock.calls[0][1];
      await cronCallback();

      // Should process 4 items (legacy maxItems)
      expect(mockOnTrigger).toHaveBeenCalledTimes(4);
    });

    test('should prefer maxItemsPerCheck over maxItems when both present', async () => {
      const mixedConfig = { 
        ...baseConfig, 
        maxItems: 5, 
        maxItemsPerCheck: 2 
      } as any;
      const trigger = new RssTrigger(mixedConfig, mockOnTrigger);

      const largeFeed = {
        title: 'Large Feed',
        items: Array.from({ length: 6 }, (_, i) => ({
          title: `Article ${i + 1}`,
          link: `https://example.com/article-${i + 1}`,
          guid: `article-${i + 1}`,
          pubDate: new Date().toISOString()
        }))
      };

      mockParseURL
        .mockResolvedValueOnce({ items: [] })
        .mockResolvedValueOnce(largeFeed);

      await trigger.start();

      const cronCallback = mockSchedule.mock.calls[0][1];
      await cronCallback();

      // Should process 2 items (maxItemsPerCheck takes precedence)
      expect(mockOnTrigger).toHaveBeenCalledTimes(2);
    });
  });

  describe('Test Mode Safety', () => {
    test('should respect safety limits in test mode', async () => {
      const testConfig = { 
        ...baseConfig, 
        testMode: true, 
        maxItemsPerCheck: 2 
      };
      const trigger = new RssTrigger(testConfig, mockOnTrigger);

      const testFeed = {
        title: 'Test Feed',
        items: Array.from({ length: 5 }, (_, i) => ({
          title: `Test Article ${i + 1}`,
          link: `https://example.com/test-${i + 1}`,
          guid: `test-${i + 1}`,
          pubDate: new Date().toISOString()
        }))
      };

      mockParseURL.mockResolvedValue(testFeed);

      jest.useFakeTimers();
      
      await trigger.start();
      
      // Fast forward to trigger immediate execution in test mode
      jest.advanceTimersByTime(1100);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should only process 2 items even in test mode
      expect(mockOnTrigger).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    test('should use default test limit of 2 when not specified', async () => {
      const testConfig = { ...baseConfig, testMode: true };
      const trigger = new RssTrigger(testConfig, mockOnTrigger);

      const testFeed = {
        title: 'Test Feed',
        items: Array.from({ length: 4 }, (_, i) => ({
          title: `Test Article ${i + 1}`,
          link: `https://example.com/test-${i + 1}`,
          guid: `test-${i + 1}`,
          pubDate: new Date().toISOString()
        }))
      };

      mockParseURL.mockResolvedValue(testFeed);

      jest.useFakeTimers();
      
      await trigger.start();
      jest.advanceTimersByTime(1100);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should process default test limit (2 items)
      expect(mockOnTrigger).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe('Error Handling with Safety Limits', () => {
    test('should continue processing remaining items after individual failures', async () => {
      const mockOnTriggerWithFailure = jest.fn()
        .mockResolvedValueOnce(undefined) // First call succeeds
        .mockRejectedValueOnce(new Error('Processing failed')) // Second call fails
        .mockResolvedValueOnce(undefined); // Third call succeeds

      const trigger = new RssTrigger(baseConfig, mockOnTriggerWithFailure);

      const testFeed = {
        title: 'Test Feed',
        items: [
          { title: 'Article 1', link: 'https://example.com/1', guid: '1' },
          { title: 'Article 2', link: 'https://example.com/2', guid: '2' },
          { title: 'Article 3', link: 'https://example.com/3', guid: '3' }
        ]
      };

      mockParseURL
        .mockResolvedValueOnce({ items: [] })
        .mockResolvedValueOnce(testFeed);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await trigger.start();

      const cronCallback = mockSchedule.mock.calls[0][1];
      await cronCallback();

      // All 3 items should be attempted despite the failure
      expect(mockOnTriggerWithFailure).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error handling trigger event'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});