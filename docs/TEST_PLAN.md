# Test Plan: Main Scenario (POC)

## Core Flow Test
**Scenario**: Summarize a news article and save to Obsidian

### Prerequisites
- [ ] `.env` file configured with `OPENAI_API_KEY` and `OBSIDIAN_VAULT_PATH`
- [ ] Project built: `npm run build`
- [ ] Valid news article URL (e.g., BBC, Reuters, TechCrunch)

### Test Steps

1. **Initialize Configuration**
   ```bash
   npm run dev config --init
   npm run dev config --validate
   ```
   - ✅ Config file created
   - ✅ No validation errors

2. **Basic Summarization**
   ```bash
   npm run dev summarize "https://www.bbc.com/news/technology-article"
   ```
   - ✅ Article fetched successfully
   - ✅ Content extracted (title, body text)
   - ✅ AI summary generated
   - ✅ Markdown file saved to Obsidian vault

3. **Verify Output File**
   - ✅ File exists in vault at correct path
   - ✅ Contains proper frontmatter (title, URL, date, tags)
   - ✅ Has readable summary content
   - ✅ Includes key points section
   - ✅ Links back to original article

4. **Test Different Prompt Templates**
   ```bash
   npm run dev summarize "https://example.com/article" --prompt technical
   npm run dev summarize "https://example.com/article" --prompt brief
   ```
   - ✅ Different summary styles generated
   - ✅ Content matches prompt template intent

5. **Test Custom Output Folder**
   ```bash
   npm run dev summarize "https://example.com/article" --output "Tech News"
   ```
   - ✅ File saved in specified subfolder
   - ✅ Folder created if doesn't exist

### Expected Results
- **Processing time**: < 30 seconds per article
- **File size**: Generated markdown 1-5KB
- **Success rate**: 90%+ for mainstream news sites

### Common Failure Scenarios to Test
- [ ] Invalid URL (should fail gracefully)
- [ ] Site blocks scraping (should show clear error)
- [ ] Missing API key (should fail with helpful message)
- [ ] Invalid vault path (should fail with helpful message)

### Test Articles (Good Candidates)
- BBC News technology articles
- Reuters business news
- TechCrunch posts
- Ars Technica articles

### Success Criteria
✅ **MVP Complete**: Can fetch, summarize, and save one article end-to-end without errors

## Test Execution Log

### Test Run: 2025-07-02

#### Prerequisites Check
- ✅ Environment setup (.env file created)
- ✅ Dependencies installed (npm install)
- ✅ Build successful (npm run build)

#### Configuration Setup (Fixed Issues)
- ✅ Created test-vault directory for Obsidian path
- ✅ Updated .env with valid paths and placeholder API key
- ✅ Regenerated config.json to pick up environment variables
- ✅ Configuration validation now passes

#### Test Results
1. **Configuration Init**: ✅ Pass - Config file created successfully
2. **Configuration Validation**: ✅ Pass - After fixing .env and vault path
3. **Basic Summarization**: ✅ Pass - Multiple articles successfully processed
4. **Output Verification**: ✅ Pass - Proper markdown files with frontmatter, tags, key points
5. **Prompt Templates**: ✅ Pass - Default and technical prompts working differently
6. **Custom Output**: ✅ Pass - Files saved to specified folders

#### Detailed Test Results

**✅ Successful URLs:**
- `https://dev.to/devteam/reflect-and-share-your-worlds-largest-hackathon-journey-writing-challenge-now-open-g82` - Full content extraction
- `https://stackoverflow.blog/` - Extracted "Why is this code five times slower in C# compared to Java?" article
- `https://github.blog/changelog/` - Extracted changelog content
- `https://httpbin.org/html` - Herman Melville content extraction
- `https://www.example.com` - Simple page extraction

**❌ Failed URLs:**
- `https://www.bbc.com/news/articles/c62jdz61ppvo` - Only title extraction
- `https://techcrunch.com/2024/12/31/...` - 404 error, only got "404" title
- `https://www.reuters.com/technology/artificial-intelligence/` - "Could not extract sufficient content"
- `https://apnews.com/technology` - Landing page, only got "Technology" title

**Site Compatibility Analysis:**
- ✅ **Dev.to**: Excellent - Full content extraction with metadata
- ✅ **Stack Overflow Blog**: Good - Article content and author info
- ✅ **GitHub Blog**: Good - Changelog content extraction
- ✅ **Simple HTML sites**: Perfect - Complete content extraction
- ❌ **Major news sites**: Poor - Anti-scraping, JavaScript-heavy content
- ❌ **Landing pages**: Limited - Only titles extracted

#### Notes
- Configuration system working after environment variable fixes
- OpenAI integration successful with valid API key
- Content extraction varies significantly by site architecture
- Some sites use anti-scraping measures or JavaScript rendering
- Prompt templates generate different summary styles as expected
- File naming and organization working correctly

#### Overall Result
⚠️ **Partially Successful** - Core functionality works but limited by site compatibility (~60% success rate with real sites)