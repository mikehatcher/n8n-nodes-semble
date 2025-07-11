<SYSTEM>
You are an AI programming assistant that is specialized in applying code changes to an existing document.
Follow Microsoft content policies.
Avoid content that violates copyrights.
If you are asked to generate content that is harmful, hateful, racist, sexist, lewd, violent, or completely irrelevant to software engineering, only respond with "Sorry, I can't assist with that."
Keep your answers short and impersonal.
The user has a code block that represents a suggestion for a code change and a instructions file opened in a code editor.
Rewrite the existing document to fully incorporate the code changes in the provided code block.
For the response, always follow these instructions:
1. Analyse the code block and the existing document to decide if the code block should replace existing code or should be inserted.
2. If necessary, break up the code block in multiple parts and insert each part at the appropriate location.
3. Preserve whitespace and newlines right after the parts of the file that you modify.
4. The final result must be syntactically valid, properly formatted, and correctly indented. It should not contain any ...existing code... comments.
5. Finally, provide the fully rewritten file. You must output the complete file.
</SYSTEM>


I have the following code open in the editor, starting from line 1 to line 278.
````instructions
# Copilot Custom Instruction

## 🚀 QUICK REFERENCE - CRITICAL GUIDELINES

**Essential Rules:**
- **Authentication**: CRITICAL - Semble API uses `x-token` header, NOT `Authorization: Bearer`
- **Testing**: NEVER create new workflows - always use "Automated test - Don't delete"
- **API Docs**: ALWAYS verify Semble API documentation at https://docs.semble.io/ before coding
- **API Endpoint**: https://open.semble.io/graphql
- **Rate Limiting**: Use `sembleApiRequest` helper - max 120 requests/minute, min 30s polling
- **Language**: Use British English (optimise, colour, customise)
- **Errors**: Use NodeApiError/NodeOperationError with user-friendly messages
- **Types**: TypeScript strict mode with comprehensive annotations
- **Git**: Feature branches with conventional commits (feat:, fix:, docs:)
- **Files**: Check if files exist before creating, update all references when moving

---

## SEMBLE API AUTHENTICATION - CRITICAL INFORMATION

### Semble API Authentication
**CRITICAL**: The Semble API uses the `x-token` header for authentication, NOT the standard `Authorization: Bearer` header.

```javascript
// CORRECT - Use x-token header
const headers = {
    'x-token': 'your-api-token-here',
    'Content-Type': 'application/json'
};

// INCORRECT - Do NOT use Authorization Bearer
const headers = {
    'Authorization': 'Bearer your-api-token-here',  // This will NOT work
    'Content-Type': 'application/json'
};
```

This is implemented correctly in the node credentials (`SembleApi.credentials.ts`) and should be used consistently in all API calls and tests.

### Common Authentication Mistakes to Avoid

1. **Using Authorization: Bearer header** - This will result in 401 Unauthorized errors
2. **Missing x-token header** - API calls will fail silently or return authentication errors
3. **Using lowercase header names** - While HTTP headers are case-insensitive, consistently use `x-token`
4. **Forgetting to update test scripts** - Always use `x-token` in curl commands and Node.js test scripts

### Testing Authentication
When testing API calls manually, always use:
```bash
# Correct curl command
curl -X POST https://open.semble.io/graphql \
  -H "Content-Type: application/json" \
  -H "x-token: your-api-token-here" \
  -d '{"query": "query { patients { data { id firstName } } }"}'

# Incorrect curl command (will fail)
curl -X POST https://open.semble.io/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-token-here" \
  -d '{"query": "query { patients { data { id firstName } } }"}'
```

### API Field Validation
When implementing GraphQL queries, always verify field names against the official Semble API documentation at https://docs.semble.io/docs/API/objects/

**CRITICAL**: GraphQL validation errors (`GRAPHQL_VALIDATION_FAILED`) typically indicate invalid field names, not access restrictions. Always check the official API documentation for correct field structures:

- CustomAttribute fields: `id`, `title`, `text`, `response`, `required`
- PatientRelationship fields: `relationshipId`, `relationshipType`, `relationshipLabel`, `deleted`, `contactDetails`
- Use nested object syntax correctly (e.g., `placeOfBirth { name code }`)

---

## PROJECT BASICS

## Project Overview
This project is an n8n community node package that provides integration with the Semble practice management system. It allows n8n workflows to interact with Semble's GraphQL API for booking management, enabling automation of appointment scheduling, patient data synchronisation, and healthcare workflow orchestration. The package includes both action nodes for CRUD operations and trigger nodes for real-time event monitoring.

## Technology Stack
- **Node.js** (v18.10+): Runtime environment for the n8n community node
- **TypeScript**: Primary development language with strict type checking
- **n8n-workflow**: Core n8n framework for node development and workflow integration
- **GraphQL**: API communication protocol for Semble integration
- **Gulp**: Build automation for icon processing and asset compilation
- **ESLint**: Code linting with n8n-specific rules and TypeScript integration
- **Prettier**: Code formatting and style consistency
- **PNPM**: Package manager for dependency management and workspace handling
- **Jest**: Testing framework for unit and integration tests
- **Docker**: Containerised n8n environment for local development and testing

---

## DETAILED GUIDELINES

### Collaboration Guidelines
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

### Documentation and Knowledge Management
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

### API Integration Guidelines
- **ALWAYS verify API documentation before making assumptions about data models**
- For Semble API integration, refer to the official documentation: https://docs.semble.io/
- Never assume field names, resource types, or API structure without checking the actual API schema
- Use GraphQL introspection queries to verify available fields and types before implementation
- When encountering API errors, use the enhanced debug logging to identify the exact issue
- Test API endpoints with tools like curl or GraphQL playground before implementing in code
- Document any API quirks or special requirements discovered during development

### Development Standards
- Follow n8n community node development guidelines and conventions
- Use TypeScript strict mode with comprehensive type annotations
- Implement proper error handling with NodeApiError and NodeOperationError
- Follow the n8n naming conventions for node properties and operations
- Use semantic versioning (semver) for all releases and version management
- Implement rate limiting to respect Semble API constraints (120 requests/minute)
- Use GraphQL best practices with proper query optimisation and field selection
- Implement polling triggers with configurable intervals and efficient data filtering
- Follow healthcare data handling best practices and privacy considerations
- Use JSDoc format for comprehensive code documentation
- Implement proper credential validation and security measures
- Use consistent error messages and user-friendly descriptions

### Documentation Guidelines
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

### Best Practices
- Always use the sembleApiRequest helper function for API calls to ensure rate limiting
- Implement comprehensive input validation for all node parameters
- Use dynamic option loading for dropdowns (appointment types, staff, etc.)
- Provide meaningful default values and clear parameter descriptions
- Handle API errors gracefully with user-friendly error messages
- Use polling intervals of at least 30 seconds to respect API rate limits
- Implement proper credential management with environment-specific settings
- Use TypeScript interfaces for consistent data structures across the codebase
- Follow n8n's property naming conventions (camelCase for internal, display names for UI)
- Implement proper pagination handling for large data sets
- Use consistent GraphQL query patterns and field selection
- Implement debug logging for troubleshooting and development
- Provide clear examples and documentation for each node operation
- Handle edge cases such as deleted records, API timeouts, and network failures

### Debugging Guidelines
- Enable debug mode in node settings to capture detailed API request/response logging
- Use the enhanced error logging in GenericFunctions.ts for API troubleshooting
- Check n8n execution logs for detailed error information and stack traces
- Verify Semble API credentials and base URL configuration in credential settings
- Test GraphQL queries independently using tools like GraphQL Playground or Postman
- Monitor API rate limiting and implement appropriate backoff strategies
- Use the safety mode settings to prevent accidental data modifications during development
- Implement comprehensive logging for polling triggers to track data synchronisation
- Check network connectivity and API endpoint availability when troubleshooting
- Use browser developer tools to inspect n8n UI interactions and parameter validation
- Implement proper error boundaries to prevent node crashes from affecting workflows
- Document common error scenarios and their resolutions in the project documentation

### n8n Testing Guidelines
- **DO NOT create new workflows for testing** - Always use the existing "Automated test - Don't delete" workflow
- Only create this workflow if it doesn't exist or when specifically testing workflow creation functionality
- Enable debug mode in node settings to capture detailed logging during testing
- Use enhanced error logging to identify and troubleshoot API issues
- Test with valid credentials and realistic data to ensure proper functionality
- Document testing procedures and requirements for future reference

### Content and Language Standards
- Use British English spelling and grammar for all documentation and comments
- Preferred spellings: "optimise" (not "optimize"), "colour" (not "color"), etc.
- Use "-ise" suffix rather than "-ize" (e.g., "customise" not "customize")
- Follow UK punctuation standards (single quotes for first level, double for quotes within quotes)
- Maintain consistent terminology throughout codebase and documentation
- Use proper medical terminology following UK medical standards

### Markdown Generation Guidelines
- Provide complete markdown files with properly escaped nested code blocks
- Use triple backticks (```) for inner code blocks
- Use four backticks (````) to wrap the entire markdown content
- This ensures nested code blocks don't terminate the outer block prematurely
- Test markdown validity before delivering final content

### Code Style Guidelines
- Use TypeScript strict mode with explicit type annotations for all functions and variables
- Follow n8n naming conventions: camelCase for properties, PascalCase for classes
- Use meaningful variable and function names that clearly describe their purpose
- Implement proper JSDoc documentation for all public methods and classes
- Use consistent indentation (2 spaces) and follow Prettier formatting rules
- Group imports logically: n8n imports first, then local imports, then external libraries
- Use const for immutable values, let for mutable variables, avoid var entirely
- Implement proper error handling with try-catch blocks and meaningful error messages
- Use template literals for string interpolation and multi-line strings
- Follow GraphQL query formatting with proper indentation and field organisation
- Use destructuring for object and array assignments where appropriate
- Implement consistent parameter validation patterns across all node operations
- Use arrow functions for callbacks and short function expressions
- Follow async/await patterns consistently rather than mixing with Promise chains

### Workflow Tips
- Use git feature branches for new functionality
- Create descriptive branch names using format `feature/feature-name` or `fix/issue-description`
- Commit to your feature branch often with clear commit messages
- Regular commits make rollbacks easier and provide better history
- Create pull requests for code review before merging to main/develop
- Squash commits before merging to maintain a clean commit history
- Follow conventional commits pattern (`feat:`, `fix:`, `docs:`, etc.)

### Performance Requirements
- Maintain API request rates below 120 requests per minute to respect Semble API limits
- Implement efficient polling with minimum 30-second intervals for trigger nodes
- Use GraphQL field selection to minimise data transfer and improve response times
- Implement proper pagination for large datasets to avoid memory issues
- Use connection pooling and request batching where appropriate
- Cache dynamic option data (appointment types, staff lists) to reduce API calls
- Implement exponential backoff for failed requests with jitter to prevent thundering herd
- Monitor memory usage during large data processing operations
- Use streaming or chunked processing for large result sets
- Implement proper cleanup of resources and event listeners
- Optimise GraphQL queries to avoid N+1 query problems
- Use efficient data structures and avoid unnecessary object copying
- Implement timeout handling for long-running API requests
- Monitor and log performance metrics for continuous optimisation

### Field Handling Strategy
**DRY Excluded Fields Solution**: Complex fields like Letters, Labs, Prescriptions, Records, Patient Documents, Bookings, and Invoices are intentionally excluded from n8n triggers to maintain simplicity and performance.

- **User Experience**: Excluded fields appear as actual fields in the n8n output with explanatory messages like "Excluded from n8n - Use dedicated Letter nodes for detailed letter data"
- **Implementation**: Uses `EXCLUDED_FIELDS_CONFIG` in `BaseTrigger.ts` for centralized configuration
- **Function**: `addExcludedFieldsToItem()` adds these fields to all trigger outputs
- **Extensible**: Easy to add new excluded fields or extend to other resource types
- **Similar to Permission Fields**: Follows the same pattern as restricted fields for consistency

**Before:**
```json
{
  "id": "123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**After (with excluded fields):**
```json
{
  "id": "123",
  "firstName": "John",
  "lastName": "Doe",
  "letters": {
    "__excludedFromN8n": true,
    "message": "Excluded from n8n - Use dedicated Letter nodes for detailed letter data",
    "suggestedAction": "Use Semble Letter nodes or API calls for accessing letter data",
    "timestamp": "2025-07-11T14:03:22.100Z"
  },
  "labs": {
    "__excludedFromN8n": true,
    "message": "Excluded from n8n - Use dedicated Lab nodes for detailed lab data",
    "suggestedAction": "Use Semble Lab nodes or API calls for accessing lab data",
    "timestamp": "2025-07-11T14:03:22.103Z"
  }
}
````
