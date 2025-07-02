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

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async summarize(
    article: ArticleContent, 
    prompt: SummaryPrompt
  ): Promise<SummaryResult> {
    
    const userMessage = prompt.userPrompt
      .replace('{title}', article.title)
      .replace('{content}', article.content)
      .replace('{url}', article.url);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: prompt.systemPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = completion.choices[0]?.message?.content || '';
    
    let keyPoints: string[] = [];
    let tags: string[] = [];
    
    if (prompt.extractKeyPoints) {
      keyPoints = await this.extractKeyPoints(article, response);
    }
    
    if (prompt.extractTags) {
      tags = await this.extractTags(article, response);
    }

    return {
      summary: response,
      keyPoints,
      tags,
      originalArticle: article
    };
  }

  private async extractKeyPoints(article: ArticleContent, summary: string): Promise<string[]> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Extract 3-5 key points from the given article summary. Return only a JSON array of strings, no other text.'
        },
        {
          role: 'user',
          content: `Summary: ${summary}\n\nOriginal Title: ${article.title}`
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const response = completion.choices[0]?.message?.content || '[]';
    
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

  private async extractTags(article: ArticleContent, summary: string): Promise<string[]> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Generate 3-7 relevant tags for this article. Focus on topics, technologies, companies, and categories. Return only a JSON array of strings, no other text.'
        },
        {
          role: 'user',
          content: `Title: ${article.title}\n\nSummary: ${summary}`
        }
      ],
      temperature: 0.3,
      max_tokens: 100
    });

    const response = completion.choices[0]?.message?.content || '[]';
    
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