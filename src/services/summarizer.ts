import OpenAI from 'openai';
import { ArticleContent } from './fetcher';

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  tags: string[];
  originalArticle: ArticleContent;
}

export interface SummaryPrompt {
  name: string;
  systemPrompt: string;
  userPrompt: string;
  extractKeyPoints: boolean;
  extractTags: boolean;
}

export class AISummarizer {
  private openai: OpenAI;

  constructor(apiKey: string, baseUrl?: string) {
    this.openai = new OpenAI({ 
      apiKey,
      baseURL: baseUrl || 'https://api.openai.com/v1'
    });
  }

  async summarize(
    article: ArticleContent, 
    prompt: SummaryPrompt,
    model: string = 'gpt-4'
  ): Promise<SummaryResult> {
    
    const userMessage = prompt.userPrompt
      .replace('{title}', article.title)
      .replace('{content}', article.markdownContent || article.content)
      .replace('{url}', article.url);

    const completion = await this.openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: prompt.systemPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    const response = completion.choices[0]?.message?.content || '';
    
    // Debug: Log the main summary response
    console.log(`\n=== SUMMARY DEBUG ===`);
    console.log(`Model: ${model}`);
    console.log(`Summary length: ${response.length}`);
    console.log(`Summary preview: ${response.substring(0, 200)}...`);
    console.log(`====================\n`);
    
    let keyPoints: string[] = [];
    let tags: string[] = [];
    
    if (prompt.extractKeyPoints) {
      keyPoints = await this.extractKeyPoints(article, response, model);
    }
    
    if (prompt.extractTags) {
      tags = await this.extractTags(article, response, model);
    }

    return {
      summary: response,
      keyPoints,
      tags,
      originalArticle: article
    };
  }

  private async extractKeyPoints(article: ArticleContent, summary: string, model: string): Promise<string[]> {
    const completion = await this.openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'Extract 3-5 key points from the given article summary. Return only a JSON array of strings, no other text.'
        },
        {
          role: 'user',
          content: `Summary: ${summary}\n\nOriginal Title: ${article.title}`
        }
      ]
    });

    const response = completion.choices[0]?.message?.content || '[]';
    
    // Debug: Log key points extraction
    console.log(`\n=== KEY POINTS DEBUG ===`);
    console.log(`Model: ${model}`);
    console.log(`Response length: ${response.length}`);
    console.log(`Raw response: ${response}`);
    console.log(`=========================\n`);
    
    try {
      return JSON.parse(response);
    } catch {
      // Fallback: split by lines and clean up
      return response
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[-*•]\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 5);
    }
  }

  private async extractTags(article: ArticleContent, summary: string, model: string): Promise<string[]> {
    const completion = await this.openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'Generate 3-7 relevant tags for this article. Focus on topics, technologies, companies, and categories. Return only a JSON array of strings, no other text.'
        },
        {
          role: 'user',
          content: `Title: ${article.title}\n\nSummary: ${summary}`
        }
      ]
    });

    const response = completion.choices[0]?.message?.content || '[]';
    
    // Debug: Log tags extraction
    console.log(`\n=== TAGS DEBUG ===`);
    console.log(`Model: ${model}`);
    console.log(`Response length: ${response.length}`);
    console.log(`Raw response: ${response}`);
    console.log(`===================\n`);
    
    try {
      return JSON.parse(response);
    } catch {
      // Fallback: extract hashtag-like words
      return response
        .split(/[,\s]+/)
        .map(tag => tag.replace(/[#"'\[\]]/g, '').trim().toLowerCase())
        .filter(tag => tag.length > 0 && tag.length < 20)
        .slice(0, 7);
    }
  }
}