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
    
    // Extract domain name for filename
    const urlParts = new URL(article.url);
    const domain = urlParts.hostname.replace(/^www\./, '');
    const cleanDomain = domain.replace(/[^a-zA-Z0-9-]/g, '-');
    
    // Support different filename formats
    const format = this.config.filenameFormat || '{date}-{domain}';
    
    const filename = format
      .replace('{date}', date)
      .replace('{domain}', cleanDomain)
      .replace('{timestamp}', Date.now().toString());
    
    return `${filename}.md`;
  }

  private generateMarkdown(summary: SummaryResult): string {
    const article = summary.originalArticle;
    const now = new Date();
    const date = now.getFullYear() + '-' + 
                 String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                 String(now.getDate()).padStart(2, '0') + ' ' +
                 String(now.getHours()).padStart(2, '0') + ':' + 
                 String(now.getMinutes()).padStart(2, '0') + ':' + 
                 String(now.getSeconds()).padStart(2, '0');
    
    // Extract title from markdown content (first h1)
    const titleMatch = article.markdownContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Article Summary';
    
    let markdown = '';
    
    // Frontmatter
    markdown += '---\n';
    markdown += `title: "${title.replace(/"/g, '\\"')}"\n`;
    markdown += `url: ${article.url}\n`;
    markdown += `date: ${date}\n`;
    markdown += '---\n\n';
    
    // Title based on extracted title or URL
    const urlParts = new URL(article.url);
    const domain = urlParts.hostname.replace(/^www\./, '');
    const displayTitle = title !== 'Article Summary' ? title : `Article Summary from ${domain}`;
    markdown += `# ${displayTitle}\n\n`;
    
    
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