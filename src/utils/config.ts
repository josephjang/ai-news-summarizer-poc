import * as fs from 'fs/promises';
import * as path from 'path';
import { ObsidianConfig } from '../services/obsidian';
import { SummaryProfile } from '../services/summarizer';
import { TriggerConfig } from '../services/triggers';

export interface AppConfig {
  ai: {
    provider: 'openai' | 'openrouter';
    apiKey: string;
    model: string;
    baseUrl?: string;
  };
  obsidian: ObsidianConfig;
  prompts: Record<string, SummaryProfile>;
  defaultPrompt: string;
  triggers?: TriggerConfig[];
}

export class ConfigManager {
  private configPath: string;
  private config: AppConfig | null = null;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'config.json');
  }

  async loadConfig(): Promise<AppConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
    } catch (error) {
      // Create default config if file doesn't exist
      this.config = await this.createDefaultConfig();
    }

    // Load profiles from templates
    if (!this.config!.prompts || Object.keys(this.config!.prompts).length === 0) {
      this.config!.prompts = await this.loadProfiles();
    }

    return this.config!;
  }

  async saveConfig(config: AppConfig): Promise<void> {
    this.config = config;
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf8');
  }

  private async createDefaultConfig(): Promise<AppConfig> {
    const defaultConfig: AppConfig = {
      ai: {
        provider: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '',
        model: 'google/gemini-2.5-pro',
        baseUrl: 'https://openrouter.ai/api/v1'
      },
      obsidian: {
        vaultPath: process.env.OBSIDIAN_VAULT_PATH || '',
        outputFolder: 'AI News Summaries',
        templateName: 'default',
        filenameFormat: '{date}-{domain}'
      },
      prompts: {},
      defaultPrompt: 'default',
      triggers: []
    };

    // Save the default config
    await this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  private async loadProfiles(): Promise<Record<string, SummaryProfile>> {
    try {
      const profilesPath = path.join(__dirname, '../../templates/profiles.json');
      const profilesData = await fs.readFile(profilesPath, 'utf8');
      const profiles = JSON.parse(profilesData);
      
      // Process profiles to load external userPrompt files
      for (const [key, profile] of Object.entries(profiles)) {
        const typedProfile = profile as SummaryProfile;
        if (typedProfile.userPromptFile && !typedProfile.userPrompt) {
          try {
            const promptPath = path.join(__dirname, '../../templates/prompts', typedProfile.userPromptFile);
            const promptContent = await fs.readFile(promptPath, 'utf8');
            typedProfile.userPrompt = promptContent;
          } catch (error) {
            console.warn(`Could not load userPrompt file ${typedProfile.userPromptFile} for profile ${key}`);
          }
        }
      }
      
      return profiles;
    } catch (error) {
      console.warn('Could not load profiles from templates, using defaults');
      return {
        default: {
          name: 'Default Summary',
          systemPrompt: 'You are an expert at summarizing news articles. Create concise, informative summaries.',
          userPrompt: 'Please summarize this article:\n\nContent: {content}',
          filename: 'Summary {date}',
          tags: ['summary', 'news']
        }
      };
    }
  }

  async updateConfig(updates: Partial<AppConfig>): Promise<AppConfig> {
    const config = await this.loadConfig();
    const updatedConfig = { ...config, ...updates };
    await this.saveConfig(updatedConfig);
    return updatedConfig;
  }

  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    const config = await this.loadConfig();
    const errors: string[] = [];

    // Check AI API key
    if (!config.ai.apiKey) {
      errors.push('AI API key is not configured. Set OPENAI_API_KEY or OPENROUTER_API_KEY environment variable or update config.json');
    }

    // Check Obsidian vault path
    if (!config.obsidian.vaultPath) {
      errors.push('Obsidian vault path is not configured. Set OBSIDIAN_VAULT_PATH environment variable or update config.json');
    } else {
      try {
        const stats = await fs.stat(config.obsidian.vaultPath);
        if (!stats.isDirectory()) {
          errors.push(`Obsidian vault path is not a directory: ${config.obsidian.vaultPath}`);
        }
      } catch {
        errors.push(`Obsidian vault path does not exist: ${config.obsidian.vaultPath}`);
      }
    }

    // Check default prompt exists
    if (!config.prompts[config.defaultPrompt]) {
      errors.push(`Default prompt '${config.defaultPrompt}' not found in prompts`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getConfigPath(): string {
    return this.configPath;
  }
}