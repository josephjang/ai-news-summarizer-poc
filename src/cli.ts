#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { ContentFetcher } from './services/fetcher';
import { AISummarizer } from './services/summarizer';
import { ObsidianIntegration } from './services/obsidian';
import { ConfigManager } from './utils/config';

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