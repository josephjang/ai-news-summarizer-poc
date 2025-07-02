import puppeteer, { Browser } from 'puppeteer';

export interface ArticleContent {
  title: string;
  content: string;
  url: string;
  publishedDate?: string;
  author?: string;
}

export class ContentFetcher {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
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
          'main',
          '[role="main"]'
        ];

        let content = '';
        let title = '';
        
        // Extract title
        const titleElement = document.querySelector('h1') || 
                           document.querySelector('title') ||
                           document.querySelector('.headline');
        if (titleElement) {
          title = titleElement.textContent?.trim() || '';
        }

        // Extract content
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            // Remove script and style elements
            const scripts = element.querySelectorAll('script, style');
            scripts.forEach(script => script.remove());
            
            content = element.textContent?.trim() || '';
            if (content.length > 200) break; // Found substantial content
          }
        }

        // Fallback to body if no content found
        if (!content) {
          const body = document.body;
          if (body) {
            const scripts = body.querySelectorAll('script, style, nav, header, footer');
            scripts.forEach(script => script.remove());
            content = body.textContent?.trim() || '';
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

        return {
          title: title || document.title || '',
          content: content || '',
          publishedDate,
          author
        };
      });

      return {
        ...articleData,
        url,
        content: this.cleanContent(articleData.content)
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

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}