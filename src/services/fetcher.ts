import puppeteer, { Browser } from 'puppeteer';
import TurndownService from 'turndown';

export interface ArticleContent {
  title: string;
  content: string;
  markdownContent: string;
  url: string;
  publishedDate?: string;
  author?: string;
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
      
      const articleData = await page.evaluate(() => {
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

        let content = '';
        let htmlContent = '';
        let title = '';
        
        // Extract title
        const titleElement = document.querySelector('h1') || 
                           document.querySelector('title') ||
                           document.querySelector('.headline');
        if (titleElement) {
          title = titleElement.textContent?.trim() || '';
        }

        // Extract content (both HTML and text)
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
            
            content = clonedElement.textContent?.trim() || '';
            htmlContent = clonedElement.innerHTML || '';
            
            console.log(`Selector: ${selector}, Content length: ${content.length}`);
            
            if (content.length > 100) break; // Found substantial content
          }
        }

        // Fallback to body if no content found
        if (!content || content.length < 100) {
          console.log('Using body fallback');
          const body = document.body.cloneNode(true) as Element;
          if (body) {
            const unwantedElements = body.querySelectorAll(
              'script, style, nav, header, footer, .advertisement, .ads, .social-share, ' +
              '.ad, .banner, .sidebar, .related-articles, .comment, .comments, ' +
              '.subscription, .newsletter, .popup, .modal, .overlay, .promo, ' +
              '.share-button, .social-media, .breadcrumb, .navigation, .menu'
            );
            unwantedElements.forEach(el => el.remove());
            content = body.textContent?.trim() || '';
            htmlContent = body.innerHTML || '';
          }
        }

        // Try to extract publish date
        let publishedDate = '';
        const dateSelectors = [
          'time[datetime]',
          '.published',
          '.date',
          '[itemprop="datePublished"]'
        ];
        
        for (const selector of dateSelectors) {
          const dateElement = document.querySelector(selector);
          if (dateElement) {
            publishedDate = dateElement.getAttribute('datetime') || 
                          dateElement.textContent?.trim() || '';
            if (publishedDate) break;
          }
        }

        // Try to extract author
        let author = '';
        const authorSelectors = [
          '[itemprop="author"]',
          '.author',
          '.byline',
          '[rel="author"]'
        ];
        
        for (const selector of authorSelectors) {
          const authorElement = document.querySelector(selector);
          if (authorElement) {
            author = authorElement.textContent?.trim() || '';
            if (author) break;
          }
        }

        console.log(`Final content length: ${content.length}`);
        console.log(`Final HTML length: ${htmlContent.length}`);
        console.log(`Title: ${title || document.title || ''}`);
        
        return {
          title: title || document.title || '',
          content: content || '',
          htmlContent: htmlContent || '',
          publishedDate,
          author
        };
      });

      // Debug: Log what we extracted
      console.log(`\n=== DEBUG INFO ===`);
      console.log(`Title: ${articleData.title}`);
      console.log(`Content length: ${articleData.content.length}`);
      console.log(`HTML length: ${articleData.htmlContent.length}`);
      console.log(`Author: ${articleData.author}`);
      console.log(`Published: ${articleData.publishedDate}`);
      console.log(`Content preview: ${articleData.content.substring(0, 200)}...`);
      console.log(`==================\n`);
      
      const markdownContent = this.turndownService.turndown(articleData.htmlContent);
      
      return {
        ...articleData,
        url,
        content: this.cleanContent(articleData.content),
        markdownContent: this.cleanMarkdownContent(markdownContent)
      };

    } finally {
      await page.close();
    }
  }

  private cleanContent(content: string): string {
    // Remove extra whitespace and clean up the content
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
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