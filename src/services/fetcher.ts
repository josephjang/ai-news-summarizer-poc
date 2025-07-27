import puppeteer, { Browser } from 'puppeteer';
import TurndownService from 'turndown';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface ArticleContent {
  markdownContent: string;
  url: string;
  title?: string;
  publishedDate?: Date;
  metaData?: Record<string, string>;
}

export class ContentFetcher {
  private browser: Browser | null = null;
  private turndownService!: TurndownService;

  private parsePublishedDate(metaData: Record<string, string>): Date | undefined {
    // Common meta tag names for published dates
    const dateFields = [
      'article:published_time',
      'article:published',
      'published-date',
      'publication-date',
      'og:published_time',
      'twitter:published_time',
      'date',
      'pubdate',
      'publishedAt',
      'datePublished',
      'article:modified_time',
      'article:modified',
      'modified-date',
      'lastmod'
    ];

    for (const field of dateFields) {
      const dateString = metaData[field];
      if (dateString) {
        const parsedDate = this.parseDate(dateString);
        if (parsedDate) {
          return parsedDate;
        }
      }
    }

    return undefined;
  }

  private parseDate(dateString: string): Date | undefined {
    if (!dateString) return undefined;

    // Clean up the date string
    const cleaned = dateString.trim();
    
    // Try parsing ISO format first
    const isoDate = new Date(cleaned);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Try parsing common date formats
    const dateFormats = [
      // RFC 2822 format
      /^\w{3}, \d{1,2} \w{3} \d{4} \d{2}:\d{2}:\d{2}/,
      // ISO-like formats
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/,
      /^\d{4}-\d{2}-\d{2}/,
      // Common formats
      /^\d{1,2}\/\d{1,2}\/\d{4}/,
      /^\d{1,2}-\d{1,2}-\d{4}/,
      /^\w{3} \d{1,2}, \d{4}/
    ];

    for (const format of dateFormats) {
      if (format.test(cleaned)) {
        const parsed = new Date(cleaned);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    return undefined;
  }

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      bulletListMarker: '-'
    });
  }

  async fetchArticle(url: string): Promise<ArticleContent> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Get full HTML and meta data
      const pageData = await page.evaluate(() => {
        // Extract meta data
        const metaData: Record<string, string> = {};
        const metaTags = document.querySelectorAll('meta');
        
        metaTags.forEach(tag => {
          const name = tag.getAttribute('name') || tag.getAttribute('property') || tag.getAttribute('itemprop');
          const content = tag.getAttribute('content');
          if (name && content) {
            metaData[name] = content;
          }
        });
        
        // Get full HTML for Readability processing
        const fullHTML = document.documentElement.outerHTML;
        
        return {
          fullHTML,
          metaData,
          url: window.location.href
        };
      });

      // Use Readability to extract main content
      const dom = new JSDOM(pageData.fullHTML, { url: pageData.url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        throw new Error('Failed to extract article content using Readability');
      }

      // Parse published date from meta data
      const publishedDate = this.parsePublishedDate(pageData.metaData);
      
      // Debug: Log what we extracted
      console.log(`\n=== DEBUG INFO ===`);
      console.log(`Content length: ${article.content?.length || 0}`);
      console.log(`Title: ${article.title}`);
      console.log(`Published date: ${publishedDate ? publishedDate.toISOString() : 'Not found'}`);
      console.log(`Content preview: ${article.textContent?.substring(0, 200)}...`);
      console.log(`==================\n`);
      
      const markdownContent = this.turndownService.turndown(article.content || '');
      
      return {
        url,
        markdownContent: this.cleanMarkdownContent(markdownContent),
        title: article.title || 'Untitled',
        publishedDate,
        metaData: pageData.metaData
      };

    } finally {
      await page.close();
    }
  }


  private cleanMarkdownContent(markdown: string): string {
    // Clean up markdown formatting
    return markdown
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .replace(/\s+$/gm, '') // Remove trailing whitespace
      .replace(/^\s+/gm, '') // Remove leading whitespace
      .replace(/\[\]\([^)]*\)/g, '') // Remove empty links
      .replace(/!\[\]\([^)]*\)/g, '') // Remove empty images
      .trim();
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}