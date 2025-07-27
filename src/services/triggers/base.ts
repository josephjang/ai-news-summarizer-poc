export interface TriggerConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  profile: string;
  schedule?: string;
  [key: string]: any;
}

export interface TriggerEvent {
  url: string;
  title?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export abstract class BaseTrigger {
  protected config: TriggerConfig;
  protected onTrigger: (event: TriggerEvent) => Promise<void>;

  constructor(config: TriggerConfig, onTrigger: (event: TriggerEvent) => Promise<void>) {
    this.config = config;
    this.onTrigger = onTrigger;
  }

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract getStatus(): { running: boolean; lastCheck?: Date; nextCheck?: Date };

  protected async handleTriggerEvent(event: TriggerEvent): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      await this.onTrigger(event);
    } catch (error) {
      console.error(`Error handling trigger event for ${this.config.id}:`, error);
    }
  }
}