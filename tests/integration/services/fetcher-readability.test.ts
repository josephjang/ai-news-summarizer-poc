import { ContentFetcher } from '../../../src/services/fetcher';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

// Mock external dependencies for integration test
jest.mock('puppeteer');
jest.mock('@mozilla/readability');
jest.mock('jsdom');

describe('ContentFetcher Integration - Readability vs Selector Approach', () => {
  let fetcher: ContentFetcher;
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    // Mock Puppeteer
    mockPage = {
      goto: jest.fn(),
      evaluate: jest.fn(),
      close: jest.fn(),
    };
    
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    };

    const puppeteer = require('puppeteer');
    puppeteer.launch = jest.fn().mockResolvedValue(mockBrowser);
    
    fetcher = new ContentFetcher();
    (fetcher as any).browser = mockBrowser;
    // Initialize turndown service mock
    (fetcher as any).turndownService = {
      turndown: jest.fn().mockImplementation((html: string) => {
        // Simple HTML to markdown conversion for testing
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      })
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Integration test to verify Readability handles various site structures
  describe('content extraction scalability', () => {
    it('should handle sites with non-standard content containers', async () => {
      // Create a mock HTML structure that would fail with hardcoded selectors
      const mockHTML = `
        <html>
          <head><title>Custom Site Structure</title></head>
          <body>
            <div class="custom-wrapper">
              <div class="non-standard-content">
                <h1>Main Article Title</h1>
                <div class="paragraph-container">
                  <p>First paragraph of actual content.</p>
                  <p>Second paragraph with important information.</p>
                </div>
              </div>
              <div class="sidebar">
                <h3>Related Links</h3>
                <ul><li>Link 1</li><li>Link 2</li></ul>
              </div>
            </div>
          </body>
        </html>
      `;

      // Mock page evaluation
      mockPage.evaluate.mockResolvedValue({
        fullHTML: mockHTML,
        metaData: {},
        url: 'https://example.com/test'
      });

      // Mock JSDOM and Readability
      const mockDocument = {};
      const mockWindow = { document: mockDocument };
      (JSDOM as jest.MockedClass<typeof JSDOM>).mockImplementation(() => ({
        window: mockWindow
      } as any));

      const mockReadabilityInstance = {
        parse: jest.fn().mockReturnValue({
          title: 'Main Article Title',
          content: '<h1>Main Article Title</h1><p>First paragraph of actual content.</p><p>Second paragraph with important information.</p>',
          textContent: 'Main Article Title First paragraph of actual content. Second paragraph with important information.'
        })
      };
      (Readability as jest.MockedClass<typeof Readability>).mockImplementation(() => mockReadabilityInstance as any);

      const result = await fetcher.fetchArticle('https://example.com/test');
      
      // Readability should extract the main content and ignore sidebar
      expect(result.title).toBe('Main Article Title');
      expect(result.markdownContent).toContain('First paragraph');
      expect(result.markdownContent).not.toContain('Related Links');
    });

    it('should prioritize article content over navigation elements', async () => {
      mockPage.evaluate.mockResolvedValue({
        fullHTML: '<html><body><nav>Home</nav><article><h1>Breaking News</h1><p>Main content</p></article></body></html>',
        metaData: {},
        url: 'https://news.example.com/breaking'
      });

      const mockDocument = {};
      const mockWindow = { document: mockDocument };
      (JSDOM as jest.MockedClass<typeof JSDOM>).mockImplementation(() => ({
        window: mockWindow
      } as any));

      const mockReadabilityInstance = {
        parse: jest.fn().mockReturnValue({
          title: 'Breaking News',
          content: '<h1>Breaking News</h1><p>Main content</p>',
          textContent: 'Breaking News Main content'
        })
      };
      (Readability as jest.MockedClass<typeof Readability>).mockImplementation(() => mockReadabilityInstance as any);

      const result = await fetcher.fetchArticle('https://news.example.com/breaking');
      
      expect(result.markdownContent).toContain('Breaking News');
      expect(result.markdownContent).toContain('Main content');
      expect(result.markdownContent).not.toContain('Home');
    });
  });

  describe('error handling improvements', () => {
    it('should provide meaningful error when Readability fails', async () => {
      mockPage.evaluate.mockResolvedValue({
        fullHTML: '<html><body><div></div></body></html>',
        metaData: {},
        url: 'https://empty.example.com'
      });

      const mockDocument = {};
      const mockWindow = { document: mockDocument };
      (JSDOM as jest.MockedClass<typeof JSDOM>).mockImplementation(() => ({
        window: mockWindow
      } as any));

      // Mock Readability to fail parsing
      const mockReadabilityInstance = {
        parse: jest.fn().mockReturnValue(null)
      };
      (Readability as jest.MockedClass<typeof Readability>).mockImplementation(() => mockReadabilityInstance as any);

      await expect(fetcher.fetchArticle('https://empty.example.com'))
        .rejects
        .toThrow('Failed to extract article content using Readability');
    });

    it('should handle network errors gracefully', async () => {
      mockPage.goto.mockRejectedValue(new Error('Network timeout'));

      await expect(fetcher.fetchArticle('https://unreachable.example.com'))
        .rejects
        .toThrow('Network timeout');
    });
  });

  describe('metadata preservation', () => {
    it('should extract and preserve publication date', async () => {
      mockPage.evaluate.mockResolvedValue({
        fullHTML: '<html><head><meta property="article:published_time" content="2025-01-15T10:30:00.000Z"></head><body><article><h1>Test</h1></article></body></html>',
        metaData: {
          'article:published_time': '2025-01-15T10:30:00.000Z'
        },
        url: 'https://example.com/dated-article'
      });

      const mockDocument = {};
      const mockWindow = { document: mockDocument };
      (JSDOM as jest.MockedClass<typeof JSDOM>).mockImplementation(() => ({
        window: mockWindow
      } as any));

      const mockReadabilityInstance = {
        parse: jest.fn().mockReturnValue({
          title: 'Test Article',
          content: '<h1>Test</h1><p>Content</p>',
          textContent: 'Test Content'
        })
      };
      (Readability as jest.MockedClass<typeof Readability>).mockImplementation(() => mockReadabilityInstance as any);

      const result = await fetcher.fetchArticle('https://example.com/dated-article');
      
      expect(result.publishedDate).toBeInstanceOf(Date);
      expect(result.publishedDate?.toISOString()).toBe('2025-01-15T10:30:00.000Z');
      expect(result.metaData).toHaveProperty('article:published_time');
    });
  });
});