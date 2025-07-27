# AI News Summarizer - Development Guidelines

## Model Usage
- Use `claude-sonnet-4` when we want to use claude models
- Use `google/gemini-2.5-pro` model when using gemini model

## Git Workflow
- Separate commits by logical changes - each commit should have a single logical purpose
- Never combine unrelated changes (e.g., bug fixes + new features) in one commit
- Use `git reset --soft HEAD~1` to split commits that accidentally combined multiple changes
- Avoid using git aliases to ensure clarity and consistency across different environments
- Use git binary (`/usr/bin/git`) to avoid git alias conflicts
- Write descriptive commit messages that explain the "why" not just the "what"

## Testing
- Test changes with `npm run dev -- summarize <url> --prompt <profile>`
- Always test with ainews profile after making changes to prompt loading
- Verify external prompt files are loaded correctly from `templates/prompts/`
- **Content Extraction Testing**: Use diverse sites (Tistory, Hacker News) to verify Readability performance
- **Metadata Validation**: Check debug logs for Readability vs manual parsing comparison
- **Template Testing**: Verify new placeholders (`{author}`, `{siteName}`) work in filename generation
- **Comprehensive Test Suite**: Run `npm test -- --testPathPatterns=fetcher` for content extraction tests

## Automated Triggers Testing
- Use test profile and local test vault for safe development testing
- Test triggers with `npm run dev -- triggers --test <trigger-id> --test-limit <n>`
- Always use `--test-limit` to prevent processing too many items during testing
- Test vault location: `./test-vault/Test Summaries/`
- Test profile generates files with pattern: `TEST-{author}-{siteName}-{timestamp}.md` (updated with new placeholders)

## Code Organization
- External prompt files go in `templates/prompts/` directory
- Profile configurations in `templates/profiles.json`
- Use `userPromptFile` field to reference external prompt files
- Keep long prompts in separate files for better maintainability
- Trigger implementations go in `src/services/triggers/` directory
- Follow modular trigger architecture with base interface
- **Content Extraction**: `src/services/fetcher.ts` uses Mozilla Readability for scalable parsing
- **Template Generation**: `src/services/obsidian.ts` handles rich placeholder substitution
- **Test Coverage**: Comprehensive unit and integration tests in `tests/unit/services/` and `tests/integration/services/`

## Safety Guidelines
- Always implement safety limits (`maxItemsPerCheck`) to prevent accidental mass processing
- Use test mode for development and verification
- Keep test and production environments completely separated
- Implement graceful error handling for all automated processes
- Use unique file naming patterns to avoid overwrites

## Trigger System Operations
- Start daemon with `npm run dev -- daemon` for production use
- Monitor trigger status with `npm run dev -- triggers --status`
- List all triggers with `npm run dev -- triggers --list`
- Configure triggers in `config.json` with proper safety limits
- RSS triggers automatically avoid processing old articles on initialization
- Use meaningful trigger IDs and names for easy identification

## Configuration Best Practices
- Set appropriate `maxItemsPerCheck` values (recommended: 2-5 for testing, 3-10 for production)
- Use cron expressions for scheduling (e.g., `*/15 * * * *` for every 15 minutes)
- Configure separate test and production vault paths
- Use profile-specific filename patterns with timestamps for uniqueness
- Enable/disable triggers via `enabled` flag in configuration

## Content Extraction and Metadata
- **Mozilla Readability Integration**: Use `@mozilla/readability` for robust content extraction instead of hardcoded CSS selectors
- **Scalable Content Parsing**: Readability handles diverse site structures automatically without site-specific selector maintenance
- **Rich Metadata Extraction**: Leverage Readability's `publishedTime`, `byline`, `siteName`, `lang`, `excerpt` fields
- **Metadata Prioritization**: Prioritize Readability metadata over manual meta tag parsing with robust fallback
- **Debugging and Comparison**: Use detailed comparison logging between Readability vs manual extraction approaches

## Frontmatter and File Naming
- Use new frontmatter format: `title`, `type`, `date`, `url`, `created`, `updated`, `tags`
- **Enhanced Placeholder Support**: `{author}`, `{siteName}`, `{language}` from Readability metadata
- **Legacy Placeholders**: `{date}`, `{title}`, `{published_date}`, `{domain}`, `{timestamp}`
- **Smart Fallbacks**: `{siteName}` falls back to `{domain}` when site name unavailable
- Ensure both `generateFilename()` and `generateMarkdown()` methods handle all placeholders
- Clean titles for safe filename use while preserving Korean characters
- Use comma-separated tags format instead of YAML lists for better readability

## Profile Management
- Keep profiles minimal and focused on actual use cases
- Separate complex prompts into external files in `templates/prompts/`
- Design filename patterns to match prompt-generated content structure
- Use descriptive profile names that reflect their analytical approach
- Consider chronological sorting when designing filename patterns (date-first format)
- **Rich Filename Templates**: Leverage `{author}`, `{siteName}`, `{language}` for context-aware naming

## Architecture Decisions and Lessons Learned

### Content Extraction Evolution
- **Problem**: Hardcoded CSS selectors required manual maintenance for each new site structure
- **Solution**: Mozilla Readability integration provides Firefox Reader View-level content extraction
- **Benefits**: Automatic handling of diverse site layouts, rich metadata extraction, battle-tested algorithm
- **Lesson**: Prefer proven, scalable algorithms over site-specific hacks

### Metadata Strategy
- **Hybrid Approach**: Prioritize Readability metadata with manual parsing fallback for maximum reliability
- **Debugging Philosophy**: Always provide comparison logging between extraction methods for transparency
- **Template Integration**: Make rich metadata available as template placeholders for flexible file organization

### Testing Strategy for Content Extraction
- **Multi-site Validation**: Test with structurally different sites (blog vs forum vs news) 
- **Comprehensive Coverage**: Unit tests for logic, integration tests for real-world scenarios
- **Edge Case Handling**: Invalid dates, missing metadata, parsing failures
- **Debug-First Development**: Implement detailed logging before optimization

### Scalability Principles
- **Avoid Site-Specific Code**: Resist the temptation to add hardcoded solutions for individual sites
- **Fallback Chains**: Always provide graceful degradation (Readability → manual → defaults)
- **Rich Data Utilization**: Expose extracted metadata through templates for user customization