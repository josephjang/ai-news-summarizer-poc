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
3. **Basic Summarization**: ❓ Not tested (requires valid OpenAI API key)
4. **Output Verification**: ❓ Not tested
5. **Prompt Templates**: ❓ Not tested
6. **Custom Output**: ❓ Not tested

#### Notes
- Initial config validation failed due to hardcoded paths in config.json
- Fixed by deleting config.json and regenerating with proper environment variables
- Test environment is now properly configured with local test-vault
- Ready for end-to-end testing with valid API key

#### Overall Result
⚠️ **Setup Complete** - Configuration system working, ready for functional testing