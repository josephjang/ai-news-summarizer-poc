# AI News Summarizer

A CLI tool to fetch news articles from URLs, summarize them using AI, and save the results to your Obsidian vault with automated trigger support.

## Features

- 🌐 **Smart Content Extraction** - Powered by Mozilla Readability for Firefox-level content parsing
- 🤖 **AI Summarization** - Generate summaries using Google Gemini, Claude, or OpenAI models
- 📝 **Rich Profile System** - Multiple analysis styles with external prompt files
- 🔄 **Automated Triggers** - RSS monitoring, scheduled processing with safety limits
- 📅 **Rich Metadata Extraction** - Author, site name, language, published dates, excerpts
- 🌍 **Multi-language Support** - Korean specialized profiles with proper formatting
- 📁 **Advanced Obsidian Integration** - Smart filename templates with rich placeholders
- ⚙️ **Production Ready** - Comprehensive testing, error handling, and monitoring

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
npm run dev -- summarize "https://example.com/article"

# Use a specific analysis profile
npm run dev -- summarize "https://example.com/article" --prompt critical

# Use Korean AI news analysis
npm run dev -- summarize "https://example.com/article" --prompt ainews
```

### Available Commands

```bash
# Article Processing
npm run dev -- summarize <url> [--prompt <profile>]

# Automated Triggers
npm run dev -- daemon                          # Start trigger daemon
npm run dev -- triggers --list                 # List all triggers
npm run dev -- triggers --status               # Check trigger status
npm run dev -- triggers --test <id> --test-limit 3  # Safe testing

# Configuration Management
npm run dev -- config --show                   # Show current config
npm run dev -- config --validate               # Validate setup

# Testing
npm test                                        # Run test suite
npm test -- --testPathPatterns=fetcher        # Test content extraction
```

### Analysis Profiles

Built-in profiles:
- `default` - General purpose summary with practical insights
- `critical` - Korean structured critical analysis (하다체) with systematic evaluation
- `ainews` - Korean AI news format with comprehensive technical insights
- `test` - Development testing profile with brief summaries

Each profile includes:
- Custom system and user prompts
- Filename templates with rich placeholders
- Appropriate tags and metadata

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

### Filename Template Placeholders

**Date & Time:**
- `{date}` - Current processing date (YYYY-MM-DD)
- `{published_date}` - Article published date (YYYY-MM-DD)
- `{published_year}`, `{published_month}`, `{published_day}` - Date components
- `{timestamp}` - Unix timestamp

**Content Metadata (from Mozilla Readability):**
- `{title}` - Article title (cleaned for filename use)
- `{author}` - Article author/byline
- `{siteName}` - Site name (e.g., "TISTORY", "Hacker News")
- `{language}` - Detected content language
- `{domain}` - Website domain (fallback when siteName unavailable)

**Example Templates:**
- `{date} {title} - {siteName} 기사 요약` → `2025-01-28 Article Title - ExampleSite 기사 요약.md`
- `TEST-{author}-{siteName}-{timestamp}` → `TEST-author-ExampleSite-1753630445329.md`

## Output Format

Generated markdown files include:

- **Rich Frontmatter** - Title, type, dates, URL, author, site info, language, tags
- **AI-Generated Content** - Summary based on selected analysis profile

## Example Output

```markdown
---
title: 2025-01-28 Example Article - ExampleSite 기사 요약
type: summary
date: 2025-01-28
url: https://example.com/article
author: example-author
siteName: ExampleSite
language: en
excerpt: Sample excerpt automatically extracted by Readability...
created: 2025-01-28 10:30
updated: 2025-01-28 10:30
tags: critical, analysis, korean
---

# Example Analysis Content

[Profile-specific AI-generated analysis content based on selected profile]
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

### Mozilla Readability Integration

Content extraction is powered by Mozilla Readability, the same technology behind Firefox Reader View:

- **Smart Content Detection**: Automatically identifies main article content
- **Metadata Extraction**: Author, site name, language, and publication dates
- **Scalable Architecture**: No need for site-specific selectors
- **High Accuracy**: Handles complex layouts and modern web frameworks

### External Prompt Files

Complex prompts can be stored in separate files in `templates/prompts/`:

```json
{
  "custom-analysis": {
    "name": "Custom Analysis Profile",
    "systemPrompt": "You are an expert analyst...",
    "userPromptFile": "custom-analysis.md",
    "filename": "{date} {title} - {siteName} Analysis",
    "tags": ["analysis", "custom"]
  }
}
```

### Rich Metadata Extraction

The tool automatically extracts comprehensive metadata:

**Publication Information:**
- Published dates from multiple meta tag formats
- Author/byline information
- Site names and branding
- Content language detection

**Content Analysis:**
- Automatic excerpt generation
- Reading time estimation
- Content classification

### Automated Triggers

RSS monitoring and scheduled processing with production-ready safety features:

```bash
# Configure RSS trigger with safety limits
npm run dev -- daemon
npm run dev -- triggers --test rss-tech-news --test-limit 3
```

**Safety Features:**
- `maxItemsPerCheck` limits to prevent mass processing
- Test mode for safe development
- Graceful error handling and recovery
- Comprehensive logging and monitoring

### Multiple AI Providers

Supports both OpenAI direct and OpenRouter for access to multiple AI models:
- `google/gemini-2.5-pro` (recommended for Korean content)
- `claude-sonnet-4` (excellent for analysis tasks)
- OpenAI GPT models
- And many others via OpenRouter

## Testing

Comprehensive test coverage ensures reliability:

```bash
# Run all tests
npm test

# Test content extraction specifically
npm test -- --testPathPatterns=fetcher

# Test trigger system
npm test -- --testPathPatterns=triggers
```

**Test Structure:**
- Unit tests for core functionality
- Integration tests for real-world scenarios
- Mock data for development safety
- Edge case and error handling coverage

## Troubleshooting

### Common Issues

1. **Content Extraction Failures**
   - Mozilla Readability handles most sites automatically
   - Some sites may block automated access (check robots.txt)
   - Verify network connectivity and user agent settings

2. **AI API Errors**
   - Check API key validity and quota limits
   - Verify model availability (some models have regional restrictions)
   - Test with simpler models first (e.g., gpt-3.5-turbo)

3. **Obsidian Integration**
   - Ensure vault path is correct and writable
   - Check folder permissions and disk space
   - Verify Obsidian isn't blocking external writes

4. **Metadata Issues**
   - Published dates use current date as fallback
   - Author information may not be available on all sites
   - Site names fall back to domain when unavailable

5. **Trigger System**
   - Check cron expression syntax
   - Verify RSS feed accessibility
   - Use `--test-limit` for safe testing

### Validation Commands

```bash
# Comprehensive setup validation
npm run dev -- config --validate

# Test specific components
npm run dev -- triggers --status
npm test -- --testPathPatterns=integration
```

Run validation commands to identify configuration issues quickly.