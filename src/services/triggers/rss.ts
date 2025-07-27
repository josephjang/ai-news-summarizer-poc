import * as cron from 'node-cron';
import Parser from 'rss-parser';
import { BaseTrigger, TriggerConfig, TriggerEvent } from './base';

export interface RssTriggerConfig extends TriggerConfig {
  type: 'rss';
  feedUrl: string;
  schedule: string;
  maxItems?: number; // For backward compatibility (deprecated)
  testMode?: boolean;
  maxItemsPerCheck?: number; // Maximum items to process in one check cycle (both test and normal mode)
}

export class RssTrigger extends BaseTrigger {
  private parser: Parser;
  private task?: cron.ScheduledTask;
  private lastCheck?: Date;
  private seenItems: Set<string> = new Set();

  constructor(config: RssTriggerConfig, onTrigger: (event: TriggerEvent) => Promise<void>) {
    super(config, onTrigger);
    this.parser = new Parser();
  }

  private get rssConfig(): RssTriggerConfig {
    return this.config as RssTriggerConfig;
  }

  async start(): Promise<void> {
    if (this.task) {
      console.log(`RSS trigger ${this.config.id} is already running`);
      return;
    }

    console.log(`Starting RSS trigger ${this.config.id} for ${this.rssConfig.feedUrl}`);
    
    // Initialize with existing items to avoid processing old articles
    await this.initializeSeenItems();

    this.task = cron.schedule(this.rssConfig.schedule, async () => {
      await this.checkFeed();
    });
    console.log(`RSS trigger ${this.config.id} scheduled with pattern: ${this.rssConfig.schedule}`);
    
    // In test mode, run immediately
    if (this.rssConfig.testMode) {
      console.log(`Test mode: Running RSS check immediately for ${this.config.id}`);
      setTimeout(async () => {
        await this.checkFeed();
      }, 1000); // Small delay to let initialization complete
    }
  }

  async stop(): Promise<void> {
    if (this.task) {
      this.task.stop();
      this.task = undefined;
      console.log(`Stopped RSS trigger ${this.config.id}`);
    }
  }

  getStatus() {
    return {
      running: !!this.task,
      lastCheck: this.lastCheck,
      nextCheck: this.task ? new Date(Date.now() + this.getNextCheckInterval()) : undefined
    };
  }

  private getNextCheckInterval(): number {
    // Simple estimation based on schedule pattern
    if (this.rssConfig.schedule.includes('*/5')) return 5 * 60 * 1000; // 5 minutes
    if (this.rssConfig.schedule.includes('*/15')) return 15 * 60 * 1000; // 15 minutes
    if (this.rssConfig.schedule.includes('0 *')) return 60 * 60 * 1000; // 1 hour
    return 60 * 60 * 1000; // Default 1 hour
  }

  private async initializeSeenItems(): Promise<void> {
    try {
      console.log(`Initializing RSS feed ${this.config.id}...`);
      const feed = await this.parser.parseURL(this.rssConfig.feedUrl);
      
      if (this.rssConfig.testMode) {
        // In test mode, don't mark items as seen so we can process them immediately
        const maxItems = this.rssConfig.maxItemsPerCheck || 2;
        const itemCount = Math.min(feed.items.length, maxItems);
        console.log(`Test mode enabled - will process ${itemCount} out of ${feed.items.length} items for testing (limit: ${maxItems})`);
      } else {
        // Mark all current items as seen to avoid processing old articles
        feed.items.forEach(item => {
          const itemId = this.getItemId(item);
          if (itemId) {
            this.seenItems.add(itemId);
          }
        });
        console.log(`Initialized RSS trigger ${this.config.id} with ${this.seenItems.size} existing items`);
      }
    } catch (error) {
      console.error(`Error initializing RSS feed ${this.config.id}:`, error);
    }
  }

  private async checkFeed(): Promise<void> {
    try {
      this.lastCheck = new Date();
      console.log(`Checking RSS feed ${this.config.id} at ${this.lastCheck.toISOString()}`);

      const feed = await this.parser.parseURL(this.rssConfig.feedUrl);
      const newItems = [];

      for (const item of feed.items) {
        const itemId = this.getItemId(item);
        if (itemId && !this.seenItems.has(itemId)) {
          newItems.push(item);
          this.seenItems.add(itemId);
        }
      }

      console.log(`Found ${newItems.length} new items in RSS feed ${this.config.id}`);

      // Apply safety limit for both test and normal mode
      const maxItemsLimit = this.rssConfig.maxItemsPerCheck || this.rssConfig.maxItems || 3;
      
      // Safety check: warn if trying to process too many items
      if (newItems.length > maxItemsLimit) {
        console.log(`⚠️  Found ${newItems.length} new items, but will only process ${maxItemsLimit} for safety. Remaining ${newItems.length - maxItemsLimit} items will be processed in next cycle.`);
      }
      
      const itemsToProcess = newItems
        .slice(0, maxItemsLimit)
        .reverse(); // Process oldest new items first

      for (const item of itemsToProcess) {
        if (item.link) {
          const event: TriggerEvent = {
            url: item.link,
            title: item.title,
            timestamp: new Date(item.pubDate || Date.now()),
            metadata: {
              feedTitle: feed.title,
              feedUrl: this.rssConfig.feedUrl,
              itemId: this.getItemId(item),
              categories: item.categories,
              author: item.creator || item['dc:creator']
            }
          };

          console.log(`Triggering for new article: ${item.title} - ${item.link}`);
          await this.handleTriggerEvent(event);
        }
      }

      // Cleanup old seen items to prevent memory growth
      if (this.seenItems.size > 1000) {
        const itemsArray = Array.from(this.seenItems);
        this.seenItems = new Set(itemsArray.slice(-500)); // Keep latest 500
      }

    } catch (error) {
      console.error(`Error checking RSS feed ${this.config.id}:`, error);
    }
  }

  private getItemId(item: any): string | null {
    return item.guid || item.link || item.id || null;
  }

  async runTestCheck(): Promise<void> {
    console.log(`🧪 Running test check for RSS feed ${this.config.id}`);
    await this.checkFeed();
  }
}