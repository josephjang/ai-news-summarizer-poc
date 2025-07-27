import { BaseTrigger, TriggerConfig, TriggerEvent } from '../../../src/services/triggers/base';

// Mock implementation for testing
class TestTrigger extends BaseTrigger {
  private running = false;
  private lastCheck?: Date;

  async start(): Promise<void> {
    this.running = true;
    this.lastCheck = new Date();
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  getStatus() {
    return {
      running: this.running,
      lastCheck: this.lastCheck,
      nextCheck: this.running ? new Date(Date.now() + 60000) : undefined
    };
  }

  // Public method to trigger events for testing
  async triggerTestEvent(event: TriggerEvent): Promise<void> {
    await this.handleTriggerEvent(event);
  }
}

describe('BaseTrigger', () => {
  let mockOnTrigger: jest.Mock;
  let testConfig: TriggerConfig;
  let trigger: TestTrigger;

  beforeEach(() => {
    mockOnTrigger = jest.fn().mockResolvedValue(undefined);
    testConfig = {
      id: 'test-trigger',
      name: 'Test Trigger',
      type: 'test',
      enabled: true,
      profile: 'test'
    };
    trigger = new TestTrigger(testConfig, mockOnTrigger);
  });

  describe('Lifecycle Management', () => {
    test('should start and stop correctly', async () => {
      // Initially not running
      expect(trigger.getStatus().running).toBe(false);

      // Start trigger
      await trigger.start();
      const statusAfterStart = trigger.getStatus();
      expect(statusAfterStart.running).toBe(true);
      expect(statusAfterStart.lastCheck).toBeInstanceOf(Date);

      // Stop trigger
      await trigger.stop();
      expect(trigger.getStatus().running).toBe(false);
    });

    test('should provide correct status information', async () => {
      await trigger.start();
      const status = trigger.getStatus();

      expect(status.running).toBe(true);
      expect(status.lastCheck).toBeInstanceOf(Date);
      expect(status.nextCheck).toBeInstanceOf(Date);
      expect(status.nextCheck!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Event Handling', () => {
    test('should handle trigger event when enabled', async () => {
      const testEvent: TriggerEvent = {
        url: 'https://example.com/article',
        title: 'Test Article',
        timestamp: new Date(),
        metadata: { source: 'test' }
      };

      await trigger.triggerTestEvent(testEvent);
      expect(mockOnTrigger).toHaveBeenCalledWith(testEvent);
    });

    test('should not handle trigger event when disabled', async () => {
      // Create disabled trigger
      const disabledConfig = { ...testConfig, enabled: false };
      const disabledTrigger = new TestTrigger(disabledConfig, mockOnTrigger);

      const testEvent: TriggerEvent = {
        url: 'https://example.com/article',
        title: 'Test Article',
        timestamp: new Date()
      };

      await disabledTrigger.triggerTestEvent(testEvent);
      expect(mockOnTrigger).not.toHaveBeenCalled();
    });

    test('should handle errors in onTrigger callback gracefully', async () => {
      const errorTrigger = new TestTrigger(testConfig, jest.fn().mockRejectedValue(new Error('Test error')));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const testEvent: TriggerEvent = {
        url: 'https://example.com/article',
        title: 'Test Article',
        timestamp: new Date()
      };

      await expect(errorTrigger.triggerTestEvent(testEvent)).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error handling trigger event for test-trigger:'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration', () => {
    test('should store and use correct configuration', () => {
      expect((trigger as any).config).toEqual(testConfig);
    });

    test('should handle different trigger types', () => {
      const rssConfig: TriggerConfig = {
        id: 'rss-test',
        name: 'RSS Test',
        type: 'rss',
        enabled: true,
        profile: 'technical'
      };

      const rssTrigger = new TestTrigger(rssConfig, mockOnTrigger);
      expect((rssTrigger as any).config.type).toBe('rss');
    });
  });
});