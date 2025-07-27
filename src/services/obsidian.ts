import * as fs from 'fs/promises';
import * as path from 'path';
import { SummaryResult } from './summarizer';

export interface ObsidianConfig {
  vaultPath: string;
  outputFolder: string;
  templateName: string;
  filenameFormat: string;
}

export class ObsidianIntegration {
  constructor(private config: ObsidianConfig) {}

  async saveArticle(summary: SummaryResult): Promise<string> {
    const filename = this.generateFilename(summary);
    const fullPath = path.join(this.config.vaultPath, this.config.outputFolder, filename);
    
    // Ensure the output directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    const markdown = this.generateMarkdown(summary);
    await fs.writeFile(fullPath, markdown, 'utf8');
    
    return fullPath;
  }

  private generateFilename(summary: SummaryResult): string {
    const article = summary.originalArticle;
    const now = new Date();
    const currentDate = now.getFullYear() + '-' + 
                        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(now.getDate()).padStart(2, '0');
    
    // Use published date if available, otherwise use current date
    const publishedDate = article.publishedDate || now;
    const publishedDateStr = publishedDate.getFullYear() + '-' + 
                             String(publishedDate.getMonth() + 1).padStart(2, '0') + '-' + 
                             String(publishedDate.getDate()).padStart(2, '0');
    
    // Use profile filename if available, otherwise fallback to config
    const filenameTemplate = summary.profile.filename || this.config.filenameFormat || '{date}-summary';
    
    // Extract domain name for fallback
    const urlParts = new URL(article.url);
    const domain = urlParts.hostname.replace(/^www\./, '');
    const cleanDomain = domain.replace(/[^a-zA-Z0-9-]/g, '-');
    
    const filename = filenameTemplate
      .replace('{date}', currentDate)
      .replace('{published_date}', publishedDateStr)
      .replace('{published_year}', publishedDate.getFullYear().toString())
      .replace('{published_month}', String(publishedDate.getMonth() + 1).padStart(2, '0'))
      .replace('{published_day}', String(publishedDate.getDate()).padStart(2, '0'))
      .replace('{domain}', cleanDomain)
      .replace('{timestamp}', Date.now().toString());
    
    return `${filename}.md`;
  }

  private generateMarkdown(summary: SummaryResult): string {
    const article = summary.originalArticle;
    const now = new Date();
    const createdDateTime = now.getFullYear() + '-' + 
                           String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(now.getDate()).padStart(2, '0') + ' ' +
                           String(now.getHours()).padStart(2, '0') + ':' + 
                           String(now.getMinutes()).padStart(2, '0');
    
    // Generate title based on profile filename pattern
    const filenameTemplate = summary.profile.filename || 'Article Summary {date}';
    let title = filenameTemplate;
    
    // Replace placeholders in title
    const currentDateStr = now.getFullYear() + '-' + 
                          String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(now.getDate()).padStart(2, '0');
    
    if (article.publishedDate) {
      const publishedDateStr = article.publishedDate.getFullYear() + '-' + 
                               String(article.publishedDate.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(article.publishedDate.getDate()).padStart(2, '0');
      title = title.replace('{published_date}', publishedDateStr);
    }
    
    // Extract domain for title
    const urlParts = new URL(article.url);
    const domain = urlParts.hostname.replace(/^www\./, '');
    const cleanDomain = domain.replace(/[^a-zA-Z0-9-]/g, '-');
    
    title = title.replace('{date}', currentDateStr);
    title = title.replace('{domain}', cleanDomain);
    title = title.replace('{timestamp}', Date.now().toString());
    
    let markdown = '';
    
    // Frontmatter - new format
    markdown += '---\n';
    markdown += `title: ${title}\n`;
    markdown += `type: summary\n`;
    
    // Add date (published date if available, otherwise current date)
    if (article.publishedDate) {
      const publishedDateStr = article.publishedDate.getFullYear() + '-' + 
                               String(article.publishedDate.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(article.publishedDate.getDate()).padStart(2, '0');
      markdown += `date: ${publishedDateStr}\n`;
    } else {
      const currentDateStr = now.getFullYear() + '-' + 
                            String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                            String(now.getDate()).padStart(2, '0');
      markdown += `date: ${currentDateStr}\n`;
    }
    
    markdown += `url: ${article.url}\n`;
    markdown += `created: ${createdDateTime}\n`;
    markdown += `updated: ${createdDateTime}\n`;
    
    // Add tags from profile (single line format)
    if (summary.profile.tags && summary.profile.tags.length > 0) {
      markdown += `tags: ${summary.profile.tags.join(', ')}\n`;
    }
    
    markdown += '---\n\n';
    
    // Only the AI-generated summary content
    markdown += summary.summary;
    
    return markdown;
  }

  async validateVaultPath(): Promise<boolean> {
    try {
      const stats = await fs.stat(this.config.vaultPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async createOutputFolder(): Promise<void> {
    const fullPath = path.join(this.config.vaultPath, this.config.outputFolder);
    await fs.mkdir(fullPath, { recursive: true });
  }
}