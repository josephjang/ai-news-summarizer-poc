import { ContentFetcher } from '../../../src/services/fetcher';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

// Mock external dependencies
jest.mock('puppeteer');
jest.mock('@mozilla/readability');
jest.mock('jsdom');

describe('ContentFetcher - Mozilla Readability Integration', () => {
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
    // Initialize browser mock
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

  describe('fetchArticle with Mozilla Readability', () => {
    const mockUrl = 'https://example.com/test-article';
    
    beforeEach(() => {
      // Mock page.evaluate to return full HTML instead of selector-based extraction
      mockPage.evaluate.mockResolvedValue({
        fullHTML: `
          <html>
            <head>
              <title>Test Blog :: Sample Article Title</title>
              <meta property="article:published_time" content="2025-01-01T12:00:00.000Z">
            </head>
            <body>
              <nav>Navigation menu</nav>
              <aside>Sidebar content</aside>
              <article>
                <h1>Sample Article Title</h1>
                <p>This is the first paragraph of the test article.</p>
                <p>This is the second paragraph with more content.</p>
              </article>
              <footer>Footer content</footer>
            </body>
          </html>
        `,
        metaData: {
          'article:published_time': '2025-01-01T12:00:00.000Z'
        },
        url: mockUrl
      });

      // Mock JSDOM constructor
      const mockDocument = {};
      const mockWindow = { document: mockDocument };
      (JSDOM as jest.MockedClass<typeof JSDOM>).mockImplementation(() => ({
        window: mockWindow
      } as any));

      // Mock Readability to simulate successful content extraction
      const mockReadabilityInstance = {
        parse: jest.fn().mockReturnValue({
          title: 'Sample Article Title',
          content: '<h1>Sample Article Title</h1><p>This is the first paragraph of the test article.</p><p>This is the second paragraph with more content.</p>',
          textContent: 'Sample Article Title This is the first paragraph of the test article. This is the second paragraph with more content.'
        })
      };

      (Readability as jest.MockedClass<typeof Readability>).mockImplementation(() => mockReadabilityInstance as any);
    });

    it('should use Readability instead of hardcoded selectors', async () => {
      const result = await fetcher.fetchArticle(mockUrl);

      // Verify JSDOM was called with full HTML
      expect(JSDOM).toHaveBeenCalledWith(
        expect.stringContaining('<html>'),
        { url: mockUrl }
      );

      // Verify Readability was instantiated and parse was called
      expect(Readability).toHaveBeenCalledWith(expect.any(Object));
      
      // Get the mock instance and verify parse was called
      const MockReadability = Readability as jest.MockedClass<typeof Readability>;
      const mockInstance = MockReadability.mock.results[0].value;
      expect(mockInstance.parse).toHaveBeenCalled();
    });

    it('should extract correct content using Readability algorithm', async () => {
      const result = await fetcher.fetchArticle(mockUrl);

      expect(result).toMatchObject({
        url: mockUrl,
        title: 'Sample Article Title',
        markdownContent: expect.stringContaining('Sample Article Title'),
        publishedDate: expect.any(Date)
      });

      // Should contain actual article content, not navigation/sidebar
      expect(result.markdownContent).toContain('first paragraph');
      expect(result.markdownContent).toContain('second paragraph');
      expect(result.markdownContent).not.toContain('Navigation menu');
      expect(result.markdownContent).not.toContain('Sidebar content');
    });

    it('should handle Readability parse failure gracefully', async () => {
      // Mock Readability to return null (parse failure)
      const mockReadabilityInstance = {
        parse: jest.fn().mockReturnValue(null)
      };
      (Readability as jest.MockedClass<typeof Readability>).mockImplementation(() => mockReadabilityInstance as any);

      await expect(fetcher.fetchArticle(mockUrl)).rejects.toThrow(
        'Failed to extract article content using Readability'
      );
    });

    it('should handle missing content properties', async () => {
      // Mock Readability to return article with null content
      const mockReadabilityInstance = {
        parse: jest.fn().mockReturnValue({
          title: 'Test Title',
          content: null,
          textContent: null
        })
      };
      (Readability as jest.MockedClass<typeof Readability>).mockImplementation(() => mockReadabilityInstance as any);

      const result = await fetcher.fetchArticle(mockUrl);

      expect(result.title).toBe('Test Title');
      expect(result.markdownContent).toBe(''); // Should handle null content gracefully
    });

    it('should handle missing title gracefully', async () => {
      const mockReadabilityInstance = {
        parse: jest.fn().mockReturnValue({
          title: null,
          content: '<p>Content without title</p>',
          textContent: 'Content without title'
        })
      };
      (Readability as jest.MockedClass<typeof Readability>).mockImplementation(() => mockReadabilityInstance as any);

      const result = await fetcher.fetchArticle(mockUrl);

      expect(result.title).toBe('Untitled');
      expect(result.markdownContent).toContain('Content without title');
    });
  });

  describe('improved content extraction vs old approach', () => {
    it('should not rely on hardcoded selectors anymore', async () => {
      const mockUrl = 'https://example.com/article';
      
      // Mock page that would fail with old selector approach
      mockPage.evaluate.mockResolvedValue({
        fullHTML: `
          <html>
            <body>
              <div class="unknown-content-class">
                <h1>Article Title</h1>
                <p>This content would be missed by hardcoded selectors</p>
              </div>
            </body>
          </html>
        `,
        metaData: {},
        url: mockUrl
      });

      const mockDocument = {};
      const mockWindow = { document: mockDocument };
      (JSDOM as jest.MockedClass<typeof JSDOM>).mockImplementation(() => ({
        window: mockWindow
      } as any));

      // Readability successfully extracts content regardless of CSS classes
      const mockReadabilityInstance = {
        parse: jest.fn().mockReturnValue({
          title: 'Article Title',
          content: '<h1>Article Title</h1><p>This content would be missed by hardcoded selectors</p>',
          textContent: 'Article Title This content would be missed by hardcoded selectors'
        })
      };
      (Readability as jest.MockedClass<typeof Readability>).mockImplementation(() => mockReadabilityInstance as any);

      const result = await fetcher.fetchArticle(mockUrl);

      expect(result.title).toBe('Article Title');
      expect(result.markdownContent).toContain('This content would be missed by hardcoded selectors');
    });

    it('should pass full HTML to Readability for analysis', async () => {
      const mockUrl = 'https://example.com/complex-page';
      const fullHTML = '<html><head><title>Test</title></head><body><main>Main content</main></body></html>';
      
      mockPage.evaluate.mockResolvedValue({
        fullHTML,
        metaData: {},
        url: mockUrl
      });

      const mockDocument = {};
      const mockWindow = { document: mockDocument };
      (JSDOM as jest.MockedClass<typeof JSDOM>).mockImplementation(() => ({
        window: mockWindow
      } as any));

      const mockReadabilityInstance = {
        parse: jest.fn().mockReturnValue({
          title: 'Test',
          content: '<main>Main content</main>',
          textContent: 'Main content'
        })
      };
      (Readability as jest.MockedClass<typeof Readability>).mockImplementation(() => mockReadabilityInstance as any);

      await fetcher.fetchArticle(mockUrl);

      // Verify full HTML was passed to JSDOM
      expect(JSDOM).toHaveBeenCalledWith(fullHTML, { url: mockUrl });
    });
  });

  describe('debug logging improvements', () => {
    it('should log content length from Readability result', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockUrl = 'https://example.com/test';
      
      mockPage.evaluate.mockResolvedValue({
        fullHTML: '<html><body>test</body></html>',
        metaData: {},
        url: mockUrl
      });

      const mockDocument = {};
      const mockWindow = { document: mockDocument };
      (JSDOM as jest.MockedClass<typeof JSDOM>).mockImplementation(() => ({
        window: mockWindow
      } as any));

      const mockContent = '<p>Test content from Readability</p>';
      const mockReadabilityInstance = {
        parse: jest.fn().mockReturnValue({
          title: 'Test',
          content: mockContent,
          textContent: 'Test content from Readability'
        })
      };
      (Readability as jest.MockedClass<typeof Readability>).mockImplementation(() => mockReadabilityInstance as any);

      await fetcher.fetchArticle(mockUrl);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Content length: ${mockContent.length}`)
      );

      consoleSpy.mockRestore();
    });
  });
});