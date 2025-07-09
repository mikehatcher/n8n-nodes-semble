# Copilot Custom Instruction

## Project Overview
XXXX

## Technology Stack
XXXX

## Collaboration Guidelines
- When receiving corrections or feedback, ask if they should be incorporated into these custom instructions
- Continuously improve code quality based on review feedback
- Share knowledge and best practices with the team
- Before creating new files:
  - Check if the file already exists elsewhere in the project
  - Ask for confirmation before creating a new file
  - Explicitly show the full path where the file will be created
  - Remember that the project root is the `n8n-nodes-semble` directory
  - Use path variables defined in the `.env` and `wp-config.php` files when referencing project files
  - Avoid hardcoding absolute or relative paths when environment variables are available
  - Avoid duplicating files by always verifying locations first
- When build configuration files are changed (package.json, webpack.config.js, etc.):
  - Review the changes to understand the updated build process
  - Revisit assumptions about project structure and asset processing
  - Update approach to reflect the current build system configuration
  - Ensure suggestions align with the current build toolchain
- For change management and rollbacks:
  - When asked to undo changes, provide a chronological list of recent prompts
  - Display timestamps and brief summary of each change request
  - Identify the exact point to roll back to
  - When implementing rollbacks, ensure complete restoration of the specified version
  - For complex changes, maintain a history of file states at key points
  - Consider using code comments to mark sections that have been significantly modified
  - Document any dependencies between changes that might complicate rollbacks

## Documentation and Knowledge Management
- Project documentation is located in `./docs/` directory
- When making significant code changes, update the relevant documentation
- Before implementing new features, check existing documentation first
- If documentation is outdated or missing, create or update it as part of your work
- Use consistent formatting in documentation files
- Include code examples where appropriate
- Document architectural decisions and their rationales
- Keep Getting Started guide updated for new team members
- Link to external resources when relevant rather than duplicating information
- When documenting processes, use step-by-step instructions with clear headings

## API Integration Guidelines
- **ALWAYS verify API documentation before making assumptions about data models**
- For Semble API integration, refer to the official documentation: https://docs.semble.io/
- Never assume field names, resource types, or API structure without checking the actual API schema
- Use GraphQL introspection queries to verify available fields and types before implementation
- When encountering API errors, use the enhanced debug logging to identify the exact issue
- Test API endpoints with tools like curl or GraphQL playground before implementing in code
- Document any API quirks or special requirements discovered during development

## Development Standards

XXXX

## Documentation Guidelines
- Use PHPDocumentor 3.x compatible syntax for all PHP documentation
- Run PHPDocumentor periodically to generate and update documentation
- Include example usage for complex functions
- Document all hooks and filters with descriptions of their purpose
- Maintain a changelog for significant changes
- Update documentation immediately when making API changes
- Document any assumptions or dependencies in code
- For JavaScript, use JSDoc format with similar thoroughness to PHP documentation
- Add inline comments for complex logic or non-obvious code sections
- Write comments that help junior developers understand the code
- Focus on explaining "why" rather than "what" (the code shows what it does)
- Avoid redundant comments that merely restate what the code is doing
- When removing code, don't leave comments about what was removed
- Use meaningful variable and function names to make code self-documenting
- Comment any workarounds, browser-specific hacks, or unusual patterns

## Best Practices
XXXX

## Debugging Guidelines
XXXX

## n8n Testing Guidelines
- When using the n8n API for automated testing, **DO NOT create a new workflow each time**
- Use the existing workflow called "Automated test - Don't delete" for all testing purposes
- Only create this workflow if it doesn't exist or if you are specifically testing workflow creation functionality
- When testing n8n nodes, enable debug mode in the node settings to capture detailed logging
- Use the enhanced error logging to identify API issues and troubleshoot problems
- Test nodes with valid credentials and realistic data to ensure proper functionality
- Document any testing procedures or requirements for future reference

## Content and Language Standards
- Use British English spelling and grammar for all documentation and comments
- Preferred spellings: "optimise" (not "optimize"), "colour" (not "color"), etc.
- Use "-ise" suffix rather than "-ize" (e.g., "customise" not "customize")
- Follow UK punctuation standards (single quotes for first level, double for quotes within quotes)
- Maintain consistent terminology throughout codebase and documentation
- Use proper medical terminology following UK medical standards

## Markdown Generation Guidelines
- Provide complete markdown files with properly escaped nested code blocks
- Use triple backticks (```) for inner code blocks
- Use four backticks (````) to wrap the entire markdown content
- This ensures nested code blocks don't terminate the outer block prematurely
- Test markdown validity before delivering final content

## Code Style Guidelines
XXXX

## Workflow Tips
- Use git feature branches for new functionality
- Create descriptive branch names using format `feature/feature-name` or `fix/issue-description`
- Commit to your feature branch often with clear commit messages
- Regular commits make rollbacks easier and provide better history
- Create pull requests for code review before merging to main/develop
- Squash commits before merging to maintain a clean commit history
- Follow conventional commits pattern (`feat:`, `fix:`, `docs:`, etc.)

## Performance Requirements
XXXX

## File Management Instructions

When renaming or moving files:

1. Delete old files that are no longer needed after migration
2. Update all references to moved/renamed files across the codebase
3. Remove superfluous code which has been duplicated or moved between files
4. Verify that all dependencies and imports are correctly updated
5. Ensure that the file structure remains logically organized

This helps maintain a clean codebase without stale files or duplicate functionality.
