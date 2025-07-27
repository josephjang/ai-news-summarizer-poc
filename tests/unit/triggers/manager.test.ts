import { TriggerManager } from '../../../src/services/triggers/manager';
import { ConfigManager } from '../../../src/utils/config';
import { TriggerConfig } from '../../../src/services/triggers/base';

// Mock all dependencies
jest.mock('../../../src/services/triggers/rss');
jest.mock('../../../src/services/fetcher');
jest.mock('../../../src/services/summarizer');
jest.mock('../../../src/services/obsidian');

const mockRssTriggerStart = jest.fn();
const mockRssTriggerStop = jest.fn();
const mockRssTriggerStatus = jest.fn();

// Mock RssTrigger class
const MockRssTrigger = jest.fn().mockImplementation(() => ({
  start: mockRssTriggerStart,
  stop: mockRssTriggerStop,
  getStatus: mockRssTriggerStatus
}));

jest.doMock('../../../src/services/triggers/rss', () => ({
  RssTrigger: MockRssTrigger
}));

describe('TriggerManager', () => {
  let configManager: ConfigManager;
  let triggerManager: TriggerManager;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      ai: {
        apiKey: 'test-key',
        model: 'test-model',
        baseUrl: 'https://test.com'
      },
      obsidian: {
        vaultPath: './test-vault',
        outputFolder: 'Test'
      },
      prompts: {
        test: {
          name: 'Test Profile',
          systemPrompt: 'Test system prompt',
          userPrompt: 'Test user prompt'
        }
      },
      defaultPrompt: 'test'
    };

    configManager = {
      loadConfig: jest.fn().mockResolvedValue(mockConfig)
    } as any;

    triggerManager = new TriggerManager(configManager);
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(triggerManager.initialize()).resolves.not.toThrow();
    });

    test('should initialize AI services', async () => {
      await triggerManager.initialize();
      // Verify internal state is set up correctly
      expect(configManager.loadConfig).toHaveBeenCalled();
    });
  });

  describe('Trigger Loading', () => {
    const testTriggers: TriggerConfig[] = [
      {
        id: 'rss-1',
        name: 'RSS Trigger 1',
        type: 'rss',
        enabled: true,
        profile: 'test',
        feedUrl: 'https://example.com/feed1.xml',
        schedule: '*/5 * * * *'
      },
      {
        id: 'rss-2',
        name: 'RSS Trigger 2',
        type: 'rss',
        enabled: true,
        profile: 'test',
        feedUrl: 'https://example.com/feed2.xml',
        schedule: '*/10 * * * *'
      }
    ];

    beforeEach(async () => {
      await triggerManager.initialize();
    });

    test('should load RSS triggers correctly', async () => {
      await triggerManager.loadTriggers(testTriggers);

      expect(MockRssTrigger).toHaveBeenCalledTimes(2);
      expect(MockRssTrigger).toHaveBeenCalledWith(
        testTriggers[0],
        expect.any(Function)
      );
      expect(MockRssTrigger).toHaveBeenCalledWith(
        testTriggers[1],
        expect.any(Function)
      );
    });

    test('should ignore unknown trigger types', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const invalidTriggers = [
        ...testTriggers,
        {
          id: 'unknown-1',
          name: 'Unknown Trigger',
          type: 'unknown',
          enabled: true,
          profile: 'test'
        } as any
      ];

      await triggerManager.loadTriggers(invalidTriggers);

      expect(MockRssTrigger).toHaveBeenCalledTimes(2); // Only valid triggers
      expect(consoleSpy).toHaveBeenCalledWith('Unknown trigger type: unknown');

      consoleSpy.mockRestore();
    });

    test('should stop existing triggers before loading new ones', async () => {
      // Load first set of triggers
      await triggerManager.loadTriggers([testTriggers[0]]);
      expect(MockRssTrigger).toHaveBeenCalledTimes(1);

      // Load second set - should stop existing ones first
      await triggerManager.loadTriggers([testTriggers[1]]);
      expect(mockRssTriggerStop).toHaveBeenCalled();
      expect(MockRssTrigger).toHaveBeenCalledTimes(2);
    });
  });

  describe('Trigger Control', () => {
    const testTrigger: TriggerConfig = {
      id: 'test-rss',
      name: 'Test RSS',
      type: 'rss',
      enabled: true,
      profile: 'test',
      feedUrl: 'https://example.com/feed.xml',
      schedule: '*/5 * * * *'
    };

    beforeEach(async () => {
      await triggerManager.initialize();
      await triggerManager.loadTriggers([testTrigger]);
    });

    test('should start individual trigger', async () => {
      await triggerManager.startTrigger('test-rss');
      expect(mockRssTriggerStart).toHaveBeenCalled();
    });

    test('should stop individual trigger', async () => {
      await triggerManager.stopTrigger('test-rss');
      expect(mockRssTriggerStop).toHaveBeenCalled();
    });

    test('should start all triggers', async () => {
      await triggerManager.startAllTriggers();
      expect(mockRssTriggerStart).toHaveBeenCalled();
    });

    test('should stop all triggers', async () => {
      await triggerManager.stopAllTriggers();
      expect(mockRssTriggerStop).toHaveBeenCalled();
    });

    test('should throw error for non-existent trigger', async () => {
      await expect(triggerManager.startTrigger('non-existent'))
        .rejects.toThrow('Trigger non-existent not found');
    });

    test('should handle errors when starting triggers', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockRssTriggerStart.mockRejectedValue(new Error('Start failed'));

      await triggerManager.startAllTriggers();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error starting trigger test-rss:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Status Management', () => {
    beforeEach(async () => {
      await triggerManager.initialize();
    });

    test('should return trigger status', async () => {
      const testTrigger: TriggerConfig = {
        id: 'test-rss',
        name: 'Test RSS',
        type: 'rss',
        enabled: true,
        profile: 'test',
        feedUrl: 'https://example.com/feed.xml',
        schedule: '*/5 * * * *'
      };

      mockRssTriggerStatus.mockReturnValue({
        running: true,
        lastCheck: new Date(),
        nextCheck: new Date()
      });

      await triggerManager.loadTriggers([testTrigger]);
      const status = triggerManager.getTriggerStatus();

      expect(status['test-rss']).toEqual({
        running: true,
        lastCheck: expect.any(Date),
        nextCheck: expect.any(Date)
      });
    });

    test('should list trigger IDs', async () => {
      const triggers: TriggerConfig[] = [
        {
          id: 'rss-1',
          name: 'RSS 1',
          type: 'rss',
          enabled: true,
          profile: 'test',
          feedUrl: 'https://example.com/feed1.xml',
          schedule: '*/5 * * * *'
        },
        {
          id: 'rss-2',
          name: 'RSS 2',
          type: 'rss',
          enabled: true,
          profile: 'test',
          feedUrl: 'https://example.com/feed2.xml',
          schedule: '*/10 * * * *'
        }
      ];

      await triggerManager.loadTriggers(triggers);
      const triggerIds = triggerManager.listTriggers();

      expect(triggerIds).toEqual(['rss-1', 'rss-2']);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup all resources', async () => {
      await triggerManager.initialize();
      
      const testTrigger: TriggerConfig = {
        id: 'test-rss',
        name: 'Test RSS',
        type: 'rss',
        enabled: true,
        profile: 'test',
        feedUrl: 'https://example.com/feed.xml',
        schedule: '*/5 * * * *'
      };

      await triggerManager.loadTriggers([testTrigger]);
      await triggerManager.cleanup();

      expect(mockRssTriggerStop).toHaveBeenCalled();
    });
  });
});