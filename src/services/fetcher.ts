import puppeteer, { Browser } from 'puppeteer';
import TurndownService from 'turndown';

export interface ArticleContent {
  markdownContent: string;
  url: string;
}

export class ContentFetcher {
  private browser: Browser | null = null;
  private turndownService!: TurndownService;

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
      
      const htmlContent = await page.evaluate(() => {
        // Try to extract content using common selectors
        const selectors = [
          'article',
          '.article-content',
          '.post-content',
          '.entry-content',
          '.content',
          '.news-content',
          '.article-body',
          '.article-text',
          '.story-content',
          '.body-content',
          '#articleBodyContents',
          '.article_body',
          '.content-body',
          '.post-body',
          'main',
          '[role="main"]'
        ];

        let htmlContent = '';
        
        // Extract content HTML
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            // Clone element to avoid modifying original
            const clonedElement = element.cloneNode(true) as Element;
            
            // Remove script and style elements and common unwanted elements
            const unwantedElements = clonedElement.querySelectorAll(
              'script, style, nav, header, footer, .advertisement, .ads, .social-share, ' +
              '.ad, .banner, .sidebar, .related-articles, .comment, .comments, ' +
              '.subscription, .newsletter, .popup, .modal, .overlay, .promo, ' +
              '.share-button, .social-media, .breadcrumb, .navigation, .menu'
            );
            unwantedElements.forEach(el => el.remove());
            
            htmlContent = clonedElement.innerHTML || '';
            
            if (htmlContent.length > 500) break; // Found substantial content
          }
        }

        // Fallback to body if no content found
        if (!htmlContent || htmlContent.length < 500) {
          const body = document.body.cloneNode(true) as Element;
          if (body) {
            const unwantedElements = body.querySelectorAll(
              'script, style, nav, header, footer, .advertisement, .ads, .social-share, ' +
              '.ad, .banner, .sidebar, .related-articles, .comment, .comments, ' +
              '.subscription, .newsletter, .popup, .modal, .overlay, .promo, ' +
              '.share-button, .social-media, .breadcrumb, .navigation, .menu'
            );
            unwantedElements.forEach(el => el.remove());
            htmlContent = body.innerHTML || '';
          }
        }
        
        return htmlContent;
      });

      // Debug: Log what we extracted
      console.log(`\n=== DEBUG INFO ===`);
      console.log(`HTML length: ${htmlContent.length}`);
      console.log(`HTML preview: ${htmlContent.substring(0, 200)}...`);
      console.log(`==================\n`);
      
      const markdownContent = this.turndownService.turndown(htmlContent);
      
      return {
        url,
        markdownContent: this.cleanMarkdownContent(markdownContent)
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