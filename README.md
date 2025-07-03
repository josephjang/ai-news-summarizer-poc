# AI News Summarizer

A CLI tool to fetch news articles from URLs, summarize them using AI, and save the results to your Obsidian vault.

## Features

- 🌐 **Web Scraping** - Extract content from news URLs using Puppeteer
- 🤖 **AI Summarization** - Generate summaries using OpenAI GPT models or OpenRouter (multiple providers)
- 📝 **Multiple Prompt Templates** - Choose from different summarization styles
- 📅 **Published Date Extraction** - Automatically extract and use article publication dates
- 🌍 **External Prompt Files** - Support for complex prompts in separate files (e.g., Korean AI news format)
- 📁 **Obsidian Integration** - Save summaries as markdown files with rich metadata
- ⚙️ **Configurable** - Customize output format, prompts, and settings

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-news-summarizer-poc
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Set up configuration:
```bash
# Copy environment template
cp .env.example .env

# Edit with your settings
nano .env
```

## Setup

### 1. Environment Variables

Create a `.env` file with:

```env
# For OpenAI (direct)
OPENAI_API_KEY=your_openai_api_key_here

# For OpenRouter (supports multiple AI providers)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Obsidian Vault Configuration
OBSIDIAN_VAULT_PATH=/path/to/your/obsidian/vault
```

### 2. Initialize Configuration

```bash
npm run dev config --init
```

This creates a `config.json` file with default settings.

### 3. Validate Setup

```bash
npm run dev config --validate
```

## Usage

### Basic Usage

```bash
# Summarize an article with default prompt
npm run dev summarize "https://example.com/article"

# Use a specific prompt template
npm run dev summarize "https://example.com/article" --prompt technical

# Save to a custom folder in your vault
npm run dev summarize "https://example.com/article" --output "Tech News"
```

### Available Commands

```bash
# Summarize an article
npm run dev summarize <url> [options]

# Show configuration
npm run dev config --show

# Validate configuration  
npm run dev config --validate

# List available prompt templates
npm run dev prompts
```

### Prompt Templates

Available templates:
- `default` - General purpose summary
- `technical` - Focus on technical details and implications
- `business` - Business and market impact analysis
- `brief` - Very concise 2-3 sentence summary
- `detailed` - Comprehensive analysis with context
- `ainews` - Korean-formatted AI news analysis with structured insights

## Configuration

The `config.json` file contains:

```json
{
  "ai": {
    "provider": "openrouter",
    "apiKey": "your-api-key",
    "model": "google/gemini-2.5-pro",
    "baseUrl": "https://openrouter.ai/api/v1"
  },
  "obsidian": {
    "vaultPath": "/path/to/vault",
    "outputFolder": "AI News Summaries",
    "templateName": "default",
    "filenameFormat": "{date}-{domain}"
  },
  "defaultPrompt": "default"
}
```

### Filename Formats

- `{date}` - Current processing date (YYYY-MM-DD)
- `{published_date}` - Article published date (YYYY-MM-DD)
- `{published_year}` - Article published year
- `{published_month}` - Article published month
- `{published_day}` - Article published day
- `{domain}` - Website domain (cleaned)
- `{timestamp}` - Unix timestamp

## Output Format

Generated markdown files include:

- **Frontmatter** - Title, URL, processing date, published date, tags
- **Summary Content** - AI-generated summary based on selected prompt template

## Example Output

```markdown
---
title: "AI Breakthrough in Natural Language Processing"
url: https://example.com/article
processing_date: 2024-01-15 10:30:45
published_date: 2024-01-14 08:15:22
tags:
  - ai
  - nlp
  - machine-learning
---

[AI-generated summary content based on selected prompt template]
```

## Development

```bash
# Development mode with auto-reload
npm run dev

# Build for production
npm run build

# Run built version
npm start
```

## Advanced Features

### External Prompt Files

Complex prompts can be stored in separate files in `templates/prompts/`:

```json
{
  "ainews": {
    "name": "AI News Summary",
    "systemPrompt": "You are an expert...",
    "userPromptFile": "ainews-korean.md",
    "filename": "AINews {published_date}",
    "tags": ["AINews"]
  }
}
```

### Published Date Detection

The tool automatically extracts published dates from HTML meta tags:
- `article:published_time`
- `og:published_time` 
- `published-date`
- And many other common meta tag formats

### Multiple AI Providers

Supports both OpenAI direct and OpenRouter for access to multiple AI models:
- `google/gemini-2.5-pro` (recommended)
- `claude-sonnet-4`
- OpenAI GPT models
- And many others via OpenRouter

## Troubleshooting

1. **Puppeteer Issues**: Install Chromium dependencies
2. **AI API Errors**: Check API key and quota (OpenAI or OpenRouter)
3. **Obsidian Path**: Ensure vault path is correct and writable
4. **Content Extraction**: Some sites may block automated access
5. **Published Date**: If not found, current date will be used as fallback

Run `npm run dev config --validate` to check your setup.