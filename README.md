# AI News Summarizer

A CLI tool to fetch news articles from URLs, summarize them using AI, and save the results to your Obsidian vault.

## Features

- 🌐 **Web Scraping** - Extract content from news URLs using Puppeteer
- 🤖 **AI Summarization** - Generate summaries using OpenAI's GPT models
- 📝 **Multiple Prompt Templates** - Choose from different summarization styles
- 📊 **Key Points & Tags** - Automatically extract key insights and tags
- 📁 **Obsidian Integration** - Save summaries as markdown files in your vault
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
OPENAI_API_KEY=your_openai_api_key_here
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

## Configuration

The `config.json` file contains:

```json
{
  "openai": {
    "apiKey": "your-api-key"
  },
  "obsidian": {
    "vaultPath": "/path/to/vault",
    "outputFolder": "AI News Summaries",
    "templateName": "default",
    "filenameFormat": "{date}-{title}"
  },
  "defaultPrompt": "default"
}
```

### Filename Formats

- `{date}` - Current date (YYYY-MM-DD)
- `{title}` - Article title (cleaned)
- `{timestamp}` - Unix timestamp

## Output Format

Generated markdown files include:

- **Frontmatter** - Title, URL, date, tags, author
- **Article Info** - Metadata and source information
- **Summary** - AI-generated summary
- **Key Points** - Bullet-pointed insights
- **Links** - Back to original article

## Example Output

```markdown
---
title: "AI Breakthrough in Natural Language Processing"
url: https://example.com/article
date: 2024-01-15T10:30:00.000Z
tags:
  - ai
  - nlp
  - machine-learning
type: article-summary
---

# AI Breakthrough in Natural Language Processing

## Article Info

- **URL:** https://example.com/article
- **Published:** 2024-01-15
- **Summarized:** 1/15/2024

**Tags:** #ai #nlp #machine-learning

## Summary

[AI-generated summary content here...]

## Key Points

- Revolutionary approach to language understanding
- 40% improvement in accuracy over previous models
- Potential applications in customer service and education

## Links

- [Original Article](https://example.com/article)
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

## Troubleshooting

1. **Puppeteer Issues**: Install Chromium dependencies
2. **OpenAI API Errors**: Check API key and quota
3. **Obsidian Path**: Ensure vault path is correct and writable
4. **Content Extraction**: Some sites may block automated access

Run `npm run dev config --validate` to check your setup.