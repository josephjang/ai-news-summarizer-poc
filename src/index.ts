// Main library exports for programmatic usage
export { ContentFetcher, ArticleContent } from './services/fetcher';
export { AISummarizer, SummaryResult, SummaryProfile } from './services/summarizer';
export { ObsidianIntegration, ObsidianConfig } from './services/obsidian';
export { ConfigManager, AppConfig } from './utils/config';

// Re-export for convenience
export * from './services/fetcher';
export * from './services/summarizer';
export * from './services/obsidian';
export * from './utils/config';