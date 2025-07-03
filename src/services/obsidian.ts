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
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Clean title for filename
    const cleanTitle = article.title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, 50);
    
    // Support different filename formats
    const format = this.config.filenameFormat || '{date}-{title}';
    
    const filename = format
      .replace('{date}', date)
      .replace('{title}', cleanTitle)
      .replace('{timestamp}', Date.now().toString());
    
    return `${filename}.md`;
  }

  private generateMarkdown(summary: SummaryResult): string {
    const article = summary.originalArticle;
    const date = new Date().toISOString();
    
    let markdown = '';
    
    // Frontmatter
    markdown += '---\n';
    markdown += `title: "${article.title.replace(/"/g, '\\"')}"\n`;
    markdown += `url: ${article.url}\n`;
    markdown += `date: ${date}\n`;
    
    if (article.author) {
      markdown += `author: ${article.author}\n`;
    }
    
    if (article.publishedDate) {
      markdown += `published: ${article.publishedDate}\n`;
    }
    
    
    markdown += 'type: article-summary\n';
    markdown += '---\n\n';
    
    // Title
    markdown += `# ${article.title}\n\n`;
    
    // Metadata
    markdown += '## Article Info\n\n';
    markdown += `- **URL:** ${article.url}\n`;
    if (article.author) {
      markdown += `- **Author:** ${article.author}\n`;
    }
    if (article.publishedDate) {
      markdown += `- **Published:** ${article.publishedDate}\n`;
    }
    markdown += `- **Summarized:** ${new Date().toLocaleDateString()}\n\n`;
    
    
    // Summary
    markdown += '## Summary\n\n';
    markdown += summary.summary + '\n\n';
    
    
    // Link back to original
    markdown += '## Links\n\n';
    markdown += `- [Original Article](${article.url})\n`;
    
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