import { BaseTrigger, TriggerConfig, TriggerEvent } from './base';
import { RssTrigger, RssTriggerConfig } from './rss';
import { ContentFetcher } from '../fetcher';
import { AISummarizer } from '../summarizer';
import { ObsidianIntegration } from '../obsidian';
import { ConfigManager } from '../../utils/config';

export interface TriggerManagerConfig {
  triggers: TriggerConfig[];
}

export class TriggerManager {
  private triggers: Map<string, BaseTrigger> = new Map();
  private configManager: ConfigManager;
  private fetcher: ContentFetcher;
  private summarizer!: AISummarizer;
  private obsidian!: ObsidianIntegration;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.fetcher = new ContentFetcher();
  }

  async initialize(): Promise<void> {
    const config = await this.configManager.loadConfig();
    
    // Initialize AI services
    this.summarizer = new AISummarizer(config.ai.apiKey, config.ai.baseUrl);
    this.obsidian = new ObsidianIntegration(config.obsidian);
    
    console.log('Trigger manager initialized');
  }

  async loadTriggers(triggerConfigs: TriggerConfig[]): Promise<void> {
    // Stop existing triggers
    await this.stopAllTriggers();

    // Create new triggers
    for (const triggerConfig of triggerConfigs) {
      const trigger = this.createTrigger(triggerConfig);
      if (trigger) {
        this.triggers.set(triggerConfig.id, trigger);
        console.log(`Loaded trigger: ${triggerConfig.id} (${triggerConfig.type})`);
      }
    }
  }

  private createTrigger(config: TriggerConfig): BaseTrigger | null {
    const onTrigger = this.createTriggerHandler(config);

    switch (config.type) {
      case 'rss':
        return new RssTrigger(config as RssTriggerConfig, onTrigger);
      default:
        console.error(`Unknown trigger type: ${config.type}`);
        return null;
    }
  }

  private createTriggerHandler(triggerConfig: TriggerConfig) {
    return async (event: TriggerEvent): Promise<void> => {
      try {
        console.log(`🔔 Trigger ${triggerConfig.id} fired for: ${event.title || event.url}`);

        // Fetch article content
        console.log('🔍 Fetching article content...');
        const article = await this.fetcher.fetchArticle(event.url);

        if (!article.markdownContent || article.markdownContent.length < 100) {
          console.warn(`⚠️ Insufficient content from ${event.url}, skipping`);
          return;
        }

        // Get configuration
        const config = await this.configManager.loadConfig();
        
        // Get prompt template
        const promptTemplate = config.prompts[triggerConfig.profile] || config.prompts[config.defaultPrompt];
        if (!promptTemplate) {
          console.error(`❌ Prompt template '${triggerConfig.profile}' not found`);
          return;
        }

        // Summarize
        console.log(`🤖 Generating summary using '${promptTemplate.name}' prompt...`);
        const summary = await this.summarizer.summarize(article, promptTemplate, config.ai.model);

        // Add trigger metadata to summary
        if (event.metadata) {
          summary.metadata = { ...summary.metadata, ...event.metadata, triggeredBy: triggerConfig.id };
        }

        // Save to Obsidian
        console.log('💾 Saving to Obsidian vault...');
        const savedPath = await this.obsidian.saveArticle(summary);

        console.log(`✅ Summary saved to: ${savedPath}`);

      } catch (error) {
        console.error(`❌ Error processing trigger event from ${triggerConfig.id}:`, error);
      }
    };
  }

  async startTrigger(triggerId: string): Promise<void> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`Trigger ${triggerId} not found`);
    }

    await trigger.start();
  }

  async stopTrigger(triggerId: string): Promise<void> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`Trigger ${triggerId} not found`);
    }

    await trigger.stop();
  }

  async startAllTriggers(): Promise<void> {
    console.log(`Starting ${this.triggers.size} triggers...`);
    
    for (const [id, trigger] of this.triggers) {
      try {
        await trigger.start();
      } catch (error) {
        console.error(`Error starting trigger ${id}:`, error);
      }
    }
  }

  async stopAllTriggers(): Promise<void> {
    console.log(`Stopping ${this.triggers.size} triggers...`);
    
    for (const [id, trigger] of this.triggers) {
      try {
        await trigger.stop();
      } catch (error) {
        console.error(`Error stopping trigger ${id}:`, error);
      }
    }
    
    this.triggers.clear();
  }

  getTriggerStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [id, trigger] of this.triggers) {
      status[id] = trigger.getStatus();
    }
    
    return status;
  }

  listTriggers(): string[] {
    return Array.from(this.triggers.keys());
  }

  async cleanup(): Promise<void> {
    await this.stopAllTriggers();
    await this.fetcher.close();
  }
}