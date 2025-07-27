import * as fs from 'fs/promises';
import * as path from 'path';
import { TriggerManager } from '../../src/services/triggers/manager';
import { ConfigManager } from '../../src/utils/config';

describe('Trigger System E2E Tests', () => {
  let testVaultPath: string;
  let configManager: ConfigManager;
  let triggerManager: TriggerManager;

  beforeAll(async () => {
    testVaultPath = path.join(__dirname, '../../test-e2e-vault');
    await fs.mkdir(testVaultPath, { recursive: true });
    await fs.mkdir(path.join(testVaultPath, 'Test Summaries'), { recursive: true });
  });

  afterAll(async () => {
    // Cleanup test vault
    try {
      await fs.rm(testVaultPath, { recursive: true, force: true });
    } catch (error) {
      console.log('Cleanup error:', error);
    }
  });

  beforeEach(() => {
    // Create mock config manager
    const mockConfig = {
      ai: {
        apiKey: 'test-key',
        model: 'test-model',
        baseUrl: 'https://test.com'
      },
      obsidian: {
        vaultPath: testVaultPath,
        outputFolder: 'Test Summaries'
      },
      prompts: {
        test: {
          name: 'Test Profile',
          systemPrompt: 'You are a test summarizer',
          userPrompt: 'Summarize: {content}',
          filename: 'TEST-E2E-{timestamp}',
          tags: ['test', 'e2e']
        }
      },
      defaultPrompt: 'test'
    };

    configManager = {
      loadConfig: jest.fn().mockResolvedValue(mockConfig)
    } as any;

    triggerManager = new TriggerManager(configManager);
  });

  describe('Full System Integration', () => {
    test('should handle trigger lifecycle without errors', async () => {
      await triggerManager.initialize();

      const testTriggerConfig = {
        id: 'e2e-test',
        name: 'E2E Test Trigger',
        type: 'rss',
        enabled: true,
        profile: 'test',
        feedUrl: 'https://example.com/test-feed.xml',
        schedule: '*/30 * * * *',
        maxItemsPerCheck: 1,
        testMode: true
      };

      // Load trigger
      await expect(triggerManager.loadTriggers([testTriggerConfig])).resolves.not.toThrow();

      // Check status
      const status = triggerManager.getTriggerStatus();
      expect(status).toHaveProperty('e2e-test');

      // List triggers
      const triggerIds = triggerManager.listTriggers();
      expect(triggerIds).toContain('e2e-test');

      // Cleanup
      await expect(triggerManager.cleanup()).resolves.not.toThrow();
    });

    test('should handle multiple triggers simultaneously', async () => {
      await triggerManager.initialize();

      const multipleConfigs = [
        {
          id: 'test-1',
          name: 'Test 1',
          type: 'rss',
          enabled: true,
          profile: 'test',
          feedUrl: 'https://example.com/feed1.xml',
          schedule: '*/30 * * * *',
          maxItemsPerCheck: 1
        },
        {
          id: 'test-2',
          name: 'Test 2',
          type: 'rss',
          enabled: true,
          profile: 'test',
          feedUrl: 'https://example.com/feed2.xml',
          schedule: '*/45 * * * *',
          maxItemsPerCheck: 2
        }
      ];

      await expect(triggerManager.loadTriggers(multipleConfigs)).resolves.not.toThrow();

      const triggerIds = triggerManager.listTriggers();
      expect(triggerIds).toEqual(['test-1', 'test-2']);

      await expect(triggerManager.startAllTriggers()).resolves.not.toThrow();
      await expect(triggerManager.stopAllTriggers()).resolves.not.toThrow();
      
      await triggerManager.cleanup();
    });

    test('should handle configuration errors gracefully', async () => {
      await triggerManager.initialize();

      const invalidConfig = {
        id: 'invalid-test',
        name: 'Invalid Test',
        type: 'nonexistent',
        enabled: true,
        profile: 'test'
      } as any;

      // Should not throw, but should log error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(triggerManager.loadTriggers([invalidConfig])).resolves.not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('Unknown trigger type: nonexistent');
      consoleSpy.mockRestore();

      await triggerManager.cleanup();
    });
  });

  describe('Error Recovery', () => {
    test('should recover from trigger start failures', async () => {
      await triggerManager.initialize();

      const testConfig = {
        id: 'fail-test',
        name: 'Failing Test',
        type: 'rss',
        enabled: true,
        profile: 'test',
        feedUrl: 'invalid-url',
        schedule: '*/30 * * * *',
        maxItemsPerCheck: 1
      };

      await triggerManager.loadTriggers([testConfig]);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // This should not throw even if individual triggers fail
      await expect(triggerManager.startAllTriggers()).resolves.not.toThrow();

      consoleSpy.mockRestore();
      await triggerManager.cleanup();
    });
  });
});