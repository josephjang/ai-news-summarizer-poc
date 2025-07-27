#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { ContentFetcher } from './services/fetcher';
import { AISummarizer } from './services/summarizer';
import { ObsidianIntegration } from './services/obsidian';
import { ConfigManager } from './utils/config';
import { TriggerManager } from './services/triggers';

dotenv.config();

const program = new Command();

program
  .name('ai-news-summarizer')
  .description('Fetch, summarize, and save AI news articles to Obsidian')
  .version('1.0.0');

program
  .command('summarize')
  .description('Summarize a news article from URL')
  .argument('<url>', 'URL of the article to summarize')
  .option('-p, --prompt <name>', 'prompt template to use', 'default')
  .option('-o, --output <path>', 'output directory (relative to vault)')
  .option('-c, --config <path>', 'path to config file')
  .option('-m, --model <model>', 'AI model to use (overrides config)')
  .action(async (url: string, options: any) => {
    try {
      console.log(`📰 Fetching article from: ${url}`);
      
      // Initialize services
      const configManager = new ConfigManager(options.config);
      const config = await configManager.loadConfig();
      
      // Validate configuration
      const validation = await configManager.validateConfig();
      if (!validation.valid) {
        console.error('❌ Configuration errors:');
        validation.errors.forEach(error => console.error(`  - ${error}`));
        process.exit(1);
      }
      
      const fetcher = new ContentFetcher();
      const summarizer = new AISummarizer(config.ai.apiKey, config.ai.baseUrl);
      
      // Override output folder if specified
      if (options.output) {
        config.obsidian.outputFolder = options.output;
      }
      
      const obsidian = new ObsidianIntegration(config.obsidian);
      
      // Fetch article
      console.log('🔍 Extracting article content...');
      const article = await fetcher.fetchArticle(url);
      
      if (!article.markdownContent || article.markdownContent.length < 100) {
        throw new Error('Could not extract sufficient content from the article');
      }
      
      console.log(`✅ Extracted article content from: ${article.url}`);
      
      // Get prompt template
      const promptTemplate = config.prompts[options.prompt];
      if (!promptTemplate) {
        console.error(`❌ Prompt template '${options.prompt}' not found`);
        console.log('Available prompts:', Object.keys(config.prompts).join(', '));
        process.exit(1);
      }
      
      // Summarize
      const modelToUse = options.model || config.ai.model;
      console.log(`🤖 Generating summary using '${promptTemplate.name}' prompt with ${modelToUse}...`);
      const summary = await summarizer.summarize(article, promptTemplate, modelToUse);
      
      // Save to Obsidian
      console.log('💾 Saving to Obsidian vault...');
      const savedPath = await obsidian.saveArticle(summary);
      
      console.log(`✅ Summary saved to: ${savedPath}`);
      
      // Cleanup
      await fetcher.close();
      
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Manage configuration')
  .option('-s, --show', 'show current configuration')
  .option('-v, --validate', 'validate configuration')
  .option('-i, --init', 'initialize configuration')
  .action(async (options: any) => {
    try {
      const configManager = new ConfigManager();
      
      if (options.init) {
        console.log('🔧 Initializing configuration...');
        await configManager.loadConfig(); // This creates default config
        console.log(`✅ Configuration initialized at: ${configManager.getConfigPath()}`);
        console.log('📝 Please edit the config file and set your API keys and vault path');
        return;
      }
      
      if (options.validate) {
        console.log('🔍 Validating configuration...');
        const validation = await configManager.validateConfig();
        if (validation.valid) {
          console.log('✅ Configuration is valid');
        } else {
          console.log('❌ Configuration errors:');
          validation.errors.forEach(error => console.log(`  - ${error}`));
        }
        return;
      }
      
      if (options.show) {
        const config = await configManager.loadConfig();
        console.log('📄 Current configuration:');
        console.log(JSON.stringify({
          ...config,
          ai: { ...config.ai, apiKey: config.ai.apiKey ? '***set***' : '***not set***' }
        }, null, 2));
        return;
      }
      
      // Default: show help
      console.log('Use --help to see available options');
      
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('prompts')
  .description('List available prompt templates')
  .action(async () => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.loadConfig();
      
      console.log('📝 Available prompt templates:');
      Object.entries(config.prompts).forEach(([key, prompt]) => {
        const isDefault = key === config.defaultPrompt ? ' (default)' : '';
        console.log(`  - ${key}: ${prompt.name}${isDefault}`);
      });
      
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('triggers')
  .description('Manage automated triggers')
  .option('-l, --list', 'list all triggers')
  .option('-s, --status', 'show trigger status')
  .option('--start [id]', 'start trigger(s) - specific ID or all')
  .option('--stop [id]', 'stop trigger(s) - specific ID or all')
  .option('--test <id>', 'test trigger immediately (processes existing items)')
  .option('--test-limit <number>', 'max items to process in test mode (default: 2)', '2')
  .option('-c, --config <path>', 'path to config file')
  .action(async (options: any) => {
    try {
      const configManager = new ConfigManager(options.config);
      const config = await configManager.loadConfig();
      const triggerManager = new TriggerManager(configManager);
      
      await triggerManager.initialize();
      
      if (!config.triggers || config.triggers.length === 0) {
        console.log('📭 No triggers configured. Add triggers to your config.json file.');
        return;
      }
      
      await triggerManager.loadTriggers(config.triggers);

      if (options.list) {
        console.log('🔔 Configured triggers:');
        config.triggers.forEach(trigger => {
          const status = trigger.enabled ? '✅' : '❌';
          console.log(`  ${status} ${trigger.id} (${trigger.type}): ${trigger.name}`);
          if (trigger.type === 'rss') {
            console.log(`    Feed: ${(trigger as any).feedUrl}`);
            console.log(`    Schedule: ${trigger.schedule}`);
            console.log(`    Profile: ${trigger.profile}`);
          }
        });
        return;
      }

      if (options.status) {
        const status = triggerManager.getTriggerStatus();
        console.log('📊 Trigger status:');
        Object.entries(status).forEach(([id, triggerStatus]) => {
          console.log(`  ${id}:`);
          console.log(`    Running: ${(triggerStatus as any).running ? '✅' : '❌'}`);
          if ((triggerStatus as any).lastCheck) {
            console.log(`    Last check: ${(triggerStatus as any).lastCheck}`);
          }
          if ((triggerStatus as any).nextCheck) {
            console.log(`    Next check: ${(triggerStatus as any).nextCheck}`);
          }
        });
        return;
      }

      if (options.start !== undefined) {
        if (options.start === true || options.start === '') {
          // Start all triggers
          await triggerManager.startAllTriggers();
          console.log('🚀 All triggers started');
        } else {
          // Start specific trigger
          await triggerManager.startTrigger(options.start);
          console.log(`🚀 Trigger ${options.start} started`);
        }
        return;
      }

      if (options.stop !== undefined) {
        if (options.stop === true || options.stop === '') {
          // Stop all triggers
          await triggerManager.stopAllTriggers();
          console.log('🛑 All triggers stopped');
        } else {
          // Stop specific trigger
          await triggerManager.stopTrigger(options.stop);
          console.log(`🛑 Trigger ${options.stop} stopped`);
        }
        return;
      }

      if (options.test) {
        // Test specific trigger with existing items
        const triggerConfig = config.triggers?.find(t => t.id === options.test);
        if (!triggerConfig) {
          console.error(`❌ Trigger ${options.test} not found`);
          process.exit(1);
        }

        // Enable test mode for this trigger
        const testLimit = parseInt(options.testLimit) || 2;
        const testConfig = { ...triggerConfig, testMode: true, maxItemsPerCheck: testLimit };
        await triggerManager.loadTriggers([testConfig]);
        
        console.log(`🧪 Testing trigger ${options.test} with existing RSS items (limit: ${testLimit})...`);
        await triggerManager.startTrigger(options.test);
        
        // Wait a moment for the test to complete
        console.log('⏳ Processing... (this may take a moment)');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        await triggerManager.stopTrigger(options.test);
        console.log(`✅ Test completed for trigger ${options.test}`);
        return;
      }

      // Default: show help
      console.log('Use --help to see available options');
      
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('daemon')
  .description('Run as daemon with all enabled triggers')
  .option('-c, --config <path>', 'path to config file')
  .action(async (options: any) => {
    try {
      console.log('🤖 Starting AI News Summarizer daemon...');
      
      const configManager = new ConfigManager(options.config);
      await configManager.loadConfig();
      
      // Validate configuration
      const validation = await configManager.validateConfig();
      if (!validation.valid) {
        console.error('❌ Configuration errors:');
        validation.errors.forEach(error => console.error(`  - ${error}`));
        process.exit(1);
      }
      
      const triggerManager = new TriggerManager(configManager);
      await triggerManager.initialize();
      
      const config = await configManager.loadConfig();
      const enabledTriggers = (config.triggers || []).filter(t => t.enabled);
      
      if (enabledTriggers.length === 0) {
        console.log('📭 No enabled triggers found. Please configure triggers in config.json');
        process.exit(0);
      }
      
      await triggerManager.loadTriggers(enabledTriggers);
      await triggerManager.startAllTriggers();
      
      console.log(`✅ Daemon started with ${enabledTriggers.length} trigger(s)`);
      console.log('Press Ctrl+C to stop');
      
      // Handle shutdown gracefully
      const cleanup = async () => {
        console.log('\n🛑 Shutting down daemon...');
        await triggerManager.cleanup();
        console.log('✅ Daemon stopped');
        process.exit(0);
      };
      
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
      
      // Keep process alive
      await new Promise(() => {});
      
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught error:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason);
  process.exit(1);
});

program.parse();