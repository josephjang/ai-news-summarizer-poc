# AI News Summarizer - Development Guidelines

## Model Usage
- Use `claude-sonnet-4` when we want to use claude models
- Use `google/gemini-2.5-pro` model when using gemini model

## Git Workflow
- Separate commits by logical changes
- Avoid using git aliases to ensure clarity and consistency across different environments
- Use git binary to avoid git alias
- Write descriptive commit messages that explain the "why" not just the "what"

## Testing
- Test changes with `npm run dev -- summarize <url> --prompt <profile>`
- Always test with ainews profile after making changes to prompt loading
- Verify external prompt files are loaded correctly from `templates/prompts/`

## Code Organization
- External prompt files go in `templates/prompts/` directory
- Profile configurations in `templates/profiles.json`
- Use `userPromptFile` field to reference external prompt files
- Keep long prompts in separate files for better maintainability