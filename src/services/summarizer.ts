import OpenAI from 'openai';
import { ArticleContent } from './fetcher';

export interface SummaryResult {
  summary: string;
  originalArticle: ArticleContent;
  profile: SummaryProfile;
}

export interface SummaryProfile {
  name: string;
  systemPrompt: string;
  userPrompt?: string;
  userPromptFile?: string;
  filename?: string;
  tags?: string[];
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
    profile: SummaryProfile,
    model: string = 'gpt-4'
  ): Promise<SummaryResult> {
    
    if (!profile.userPrompt) {
      throw new Error(`Profile ${profile.name} has no userPrompt defined`);
    }
    
    const userMessage = profile.userPrompt
      .replace('{content}', article.markdownContent)
      .replace('{url}', article.url);

    const completion = await this.openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: profile.systemPrompt
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
    
    return {
      summary: response,
      originalArticle: article,
      profile
    };
  }

}