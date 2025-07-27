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

## Automated Triggers Testing
- Use test profile and local test vault for safe development testing
- Test triggers with `npm run dev -- triggers --test <trigger-id> --test-limit <n>`
- Always use `--test-limit` to prevent processing too many items during testing
- Test vault location: `./test-vault/Test Summaries/`
- Test profile generates files with pattern: `TEST-{domain}-{timestamp}.md`

## Code Organization
- External prompt files go in `templates/prompts/` directory
- Profile configurations in `templates/profiles.json`
- Use `userPromptFile` field to reference external prompt files
- Keep long prompts in separate files for better maintainability
- Trigger implementations go in `src/services/triggers/` directory
- Follow modular trigger architecture with base interface

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

## Frontmatter and File Naming
- Use new frontmatter format: `title`, `type`, `date`, `url`, `created`, `updated`, `tags`
- Support placeholder variables in filenames: `{date}`, `{title}`, `{published_date}`, `{domain}`, `{timestamp}`
- Ensure both `generateFilename()` and `generateMarkdown()` methods handle all placeholders
- Clean titles for safe filename use while preserving Korean characters
- Use comma-separated tags format instead of YAML lists for better readability

## Profile Management
- Keep profiles minimal and focused on actual use cases
- Separate complex prompts into external files in `templates/prompts/`
- Design filename patterns to match prompt-generated content structure
- Use descriptive profile names that reflect their analytical approach
- Consider chronological sorting when designing filename patterns (date-first format)