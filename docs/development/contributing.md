# Contributing Guide

Welcome to the Semble n8n Integration project! This guide will help you contribute effectively, whether you're fixing bugs, adding features, or improving documentation.

## 🚀 Quick Start for Contributors

### Prerequisites
```yaml
Required:
  - Node.js 18.10.0 or higher
  - pnpm package manager
  - Git for version control
  - TypeScript knowledge
  - n8n development experience (helpful)

Recommended:
  - VS Code with extensions:
    - TypeScript and JavaScript Language Features
    - ESLint
    - Prettier
    - GitLens
```

### Development Environment Setup
```bash
# Clone the repository
git clone https://github.com/your-org/n8n-nodes-semble.git
cd n8n-nodes-semble

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test

# Start development mode
pnpm dev
```

### Project Structure Overview
```yaml
n8n-nodes-semble/
├── nodes/                    # Main node implementations
│   ├── Semble/              # Action node
│   ├── SembleTrigger/       # Trigger node
│   └── shared/              # Shared utilities
├── credentials/             # Authentication handling
├── services/               # Business logic services
├── types/                  # TypeScript type definitions
├── components/             # Reusable UI components
├── core/                   # Core framework components
├── test/                   # Test suites
├── docs/                   # Documentation
└── scripts/                # Build and utility scripts
```

---

## 📋 Contribution Guidelines

### Code of Conduct
```yaml
Our Commitment:
  - Respectful and inclusive environment
  - Constructive feedback and discussion
  - Focus on project improvement
  - Welcome newcomers and diverse perspectives

Expected Behavior:
  - Professional communication
  - Collaborative problem-solving
  - Knowledge sharing
  - Quality-focused contributions

Unacceptable Behavior:
  - Harassment or discrimination
  - Offensive language or imagery
  - Personal attacks
  - Spam or inappropriate content
```

### Types of Contributions

#### 🐛 Bug Reports
```yaml
Good Bug Reports Include:
  - Clear, descriptive title
  - Steps to reproduce
  - Expected vs actual behavior
  - Environment details
  - Logs and error messages
  - Screenshots if applicable

Template:
  **Bug Description**: Brief summary
  **Steps to Reproduce**: 1. 2. 3.
  **Expected Behavior**: What should happen
  **Actual Behavior**: What actually happens
  **Environment**: OS, Node.js version, n8n version
  **Logs**: Error messages and stack traces
```

#### 🎯 Feature Requests
```yaml
Good Feature Requests Include:
  - Clear use case description
  - Business value explanation
  - Proposed implementation approach
  - Alternative solutions considered
  - Impact assessment

Template:
  **Feature Summary**: Brief description
  **Use Case**: Why is this needed?
  **Proposed Solution**: How should it work?
  **Alternatives**: Other approaches considered
  **Additional Context**: Supporting information
```

#### 📝 Documentation Improvements
```yaml
Documentation Needs:
  - API reference updates
  - Tutorial improvements
  - Code example additions
  - Translation contributions
  - Accessibility improvements

Guidelines:
  - Clear, concise writing
  - Practical examples
  - Up-to-date information
  - Consistent formatting
  - User-focused content
```

#### ⚡ Code Contributions
```yaml
Code Standards:
  - TypeScript strict mode
  - Comprehensive error handling
  - Unit test coverage
  - Documentation updates
  - Performance considerations

Review Criteria:
  - Functionality correctness
  - Code quality and style
  - Test coverage adequacy
  - Documentation completeness
  - Breaking change assessment
```

---

## 🔧 Development Workflow

### Branch Strategy
```yaml
Main Branches:
  main: Production-ready code
  develop: Integration branch for features
  
Feature Branches:
  feature/feature-name: New functionality
  fix/issue-description: Bug fixes
  docs/topic-name: Documentation updates
  refactor/component-name: Code improvements

Branch Naming:
  ✅ feature/patient-bulk-operations
  ✅ fix/authentication-token-refresh
  ✅ docs/api-reference-update
  ❌ my-feature-branch
  ❌ fixes
```

### Commit Convention
```yaml
Format: type(scope): description

Types:
  feat: New feature
  fix: Bug fix
  docs: Documentation changes
  style: Code style changes (formatting, etc.)
  refactor: Code refactoring
  test: Test additions or modifications
  chore: Maintenance tasks

Examples:
  ✅ feat(patient): add bulk patient import functionality
  ✅ fix(auth): resolve token refresh timeout issue
  ✅ docs(api): update GraphQL query examples
  ✅ test(booking): add integration tests for appointment creation
  ❌ added new feature
  ❌ bug fix
```

### Pull Request Process
```yaml
1. Preparation:
    - Create feature branch from develop
    - Implement changes with tests
    - Update documentation
    - Ensure all tests pass
    - Run linting and formatting

2. PR Creation:
    - Use descriptive title
    - Fill out PR template
    - Link related issues
    - Add appropriate labels
    - Request relevant reviewers

3. Review Process:
    - Address reviewer feedback
    - Update tests if needed
    - Maintain clean commit history
    - Ensure CI/CD passes
    - Get required approvals

4. Merge:
    - Squash commits if needed
    - Update changelog
    - Delete feature branch
    - Monitor deployment
```

---

## 🏗️ Architecture Guidelines

### Node Development Patterns

#### Base Node Structure
```typescript
import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

import { SembleService } from '../services/SembleService';
import { ErrorMapper } from '../core/ErrorMapper';

export class SembleNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Semble',
    name: 'semble',
    icon: 'file:semble.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with Semble Practice Management API',
    defaults: {
      name: 'Semble',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'sembleApi',
        required: true,
      },
    ],
    properties: [
      // Node properties definition
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    try {
      const items = this.getInputData();
      const returnData: INodeExecutionData[] = [];

      for (let i = 0; i < items.length; i++) {
        const resource = this.getNodeParameter('resource', i) as string;
        const operation = this.getNodeParameter('operation', i) as string;

        // Business logic implementation
        const result = await this.processOperation(resource, operation, i);
        
        returnData.push({
          json: result,
          pairedItem: { item: i },
        });
      }

      return [returnData];
    } catch (error) {
      throw ErrorMapper.mapToNodeError(error, this.getNode());
    }
  }

  private async processOperation(
    resource: string,
    operation: string,
    itemIndex: number,
  ): Promise<any> {
    const sembleService = new SembleService(this, itemIndex);
    
    switch (resource) {
      case 'patient':
        return this.handlePatientOperation(operation, sembleService, itemIndex);
      case 'booking':
        return this.handleBookingOperation(operation, sembleService, itemIndex);
      default:
        throw new Error(`Unknown resource: ${resource}`);
    }
  }
}
```

#### Service Layer Pattern
```typescript
export class SembleService {
  constructor(
    private context: IExecuteFunctions,
    private itemIndex: number,
  ) {}

  async getPatients(options: GetPatientsOptions): Promise<Patient[]> {
    try {
      const query = this.buildPatientsQuery(options);
      const response = await this.makeApiRequest(query);
      
      return this.transformPatientsResponse(response);
    } catch (error) {
      throw this.handleApiError(error, 'getPatients');
    }
  }

  private async makeApiRequest(query: string): Promise<any> {
    const credentials = await this.context.getCredentials('sembleApi');
    
    return sembleApiRequest.call(this.context, {
      query,
      variables: {},
    });
  }

  private handleApiError(error: any, operation: string): Error {
    return ErrorMapper.mapApiError(error, operation);
  }
}
```

### Error Handling Strategy
```typescript
export class ErrorMapper {
  static mapToNodeError(error: any, node: INode): NodeApiError {
    if (error instanceof NodeApiError) {
      return error;
    }

    const nodeError = new NodeApiError(node, error);
    
    // Enhance error with context
    if (error.response?.status === 401) {
      nodeError.message = 'Authentication failed. Please check your API credentials.';
      nodeError.description = 'Verify your API token and base URL in the credentials configuration.';
    } else if (error.response?.status === 429) {
      nodeError.message = 'Rate limit exceeded. Please reduce request frequency.';
      nodeError.description = 'Consider increasing poll intervals or implementing exponential backoff.';
    }

    return nodeError;
  }

  static mapApiError(error: any, operation: string): Error {
    const baseMessage = `API operation failed: ${operation}`;
    
    if (error.response?.data?.errors) {
      const graphqlErrors = error.response.data.errors
        .map((e: any) => e.message)
        .join(', ');
      return new Error(`${baseMessage} - ${graphqlErrors}`);
    }

    return new Error(`${baseMessage} - ${error.message}`);
  }
}
```

---

## 🧪 Testing Guidelines

### Test Structure
```yaml
test/
├── unit/                    # Unit tests
│   ├── nodes/              # Node logic tests
│   ├── services/           # Service layer tests
│   └── utils/              # Utility function tests
├── integration/            # Integration tests
│   ├── api/               # API interaction tests
│   └── workflows/         # End-to-end workflow tests
├── fixtures/              # Test data fixtures
└── helpers/               # Test utilities
```

### Unit Testing Patterns
```typescript
// Example: Service unit test
describe('SembleService', () => {
  let service: SembleService;
  let mockContext: jest.Mocked<IExecuteFunctions>;

  beforeEach(() => {
    mockContext = createMockExecuteFunction();
    service = new SembleService(mockContext, 0);
  });

  describe('getPatients', () => {
    it('should fetch patients successfully', async () => {
      // Arrange
      const mockResponse = {
        data: {
          patients: {
            data: [
              { id: '1', firstName: 'John', lastName: 'Doe' },
              { id: '2', firstName: 'Jane', lastName: 'Smith' },
            ],
          },
        },
      };
      
      mockContext.helpers.request.mockResolvedValue(mockResponse);

      // Act
      const result = await service.getPatients({ limit: 10 });

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const apiError = new Error('Network error');
      mockContext.helpers.request.mockRejectedValue(apiError);

      // Act & Assert
      await expect(service.getPatients({ limit: 10 }))
        .rejects
        .toThrow('API operation failed: getPatients');
    });
  });
});
```

### Integration Testing
```typescript
// Example: Node integration test
describe('Semble Node Integration', () => {
  it('should create patient successfully', async () => {
    const workflow = {
      nodes: [
        {
          name: 'Start',
          type: 'n8n-nodes-base.start',
          position: [100, 100],
          parameters: {},
        },
        {
          name: 'Semble',
          type: 'n8n-nodes-semble.semble',
          position: [300, 100],
          parameters: {
            resource: 'patient',
            operation: 'create',
            firstName: 'Test',
            lastName: 'Patient',
            email: 'test@example.com',
          },
          credentials: {
            sembleApi: 'semble-test-credentials',
          },
        },
      ],
      connections: {
        Start: {
          main: [
            [
              {
                node: 'Semble',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
      },
    };

    const result = await executeWorkflow(workflow);
    
    expect(result.data.resultData.runData.Semble[0].data.main[0]).toMatchObject([
      {
        json: {
          id: expect.any(String),
          firstName: 'Test',
          lastName: 'Patient',
          email: 'test@example.com',
        },
      },
    ]);
  });
});
```

### Test Data Management
```typescript
// fixtures/patients.ts
export const mockPatientData = {
  validPatient: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+44 20 7946 0958',
    dateOfBirth: '1980-05-15',
  },
  
  invalidPatient: {
    firstName: '',
    lastName: 'Doe',
    email: 'invalid-email',
    phone: 'invalid-phone',
  },
  
  apiResponse: {
    createPatient: {
      data: {
        createPatient: {
          id: 'pat_123456789',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          status: 'Active',
          dateCreated: '2024-02-20T10:30:00Z',
        },
      },
    },
  },
};
```

---

## 📖 Documentation Standards

### Code Documentation
```typescript
/**
 * Retrieves patients from Semble API with optional filtering and pagination.
 * 
 * @param options - Configuration options for patient retrieval
 * @param options.limit - Maximum number of patients to return (default: 50)
 * @param options.dateFilter - Filter patients by creation/modification date
 * @param options.status - Filter by patient status (Active, Inactive)
 * @param options.searchTerm - Search patients by name or email
 * 
 * @returns Promise resolving to array of patient objects
 * 
 * @throws {NodeApiError} When API request fails or returns invalid data
 * @throws {ValidationError} When provided options are invalid
 * 
 * @example
 * ```typescript
 * const patients = await service.getPatients({
 *   limit: 25,
 *   status: 'Active',
 *   searchTerm: 'john'
 * });
 * ```
 * 
 * @since 2.0.0
 */
async getPatients(options: GetPatientsOptions): Promise<Patient[]> {
  // Implementation
}
```

### API Documentation
```typescript
/**
 * Patient resource operations interface.
 * 
 * Provides CRUD operations for managing patient records in Semble.
 * All operations require appropriate API permissions.
 */
export interface PatientOperations {
  /**
   * Create a new patient record.
   * 
   * @param patientData - Patient information for creation
   * @requires permissions: patients:write
   */
  create(patientData: CreatePatientData): Promise<Patient>;
  
  /**
   * Retrieve patient by ID.
   * 
   * @param patientId - Unique patient identifier
   * @requires permissions: patients:read
   */
  get(patientId: string): Promise<Patient>;
  
  /**
   * Update existing patient record.
   * 
   * @param patientId - Unique patient identifier
   * @param updates - Partial patient data for update
   * @requires permissions: patients:write
   */
  update(patientId: string, updates: Partial<Patient>): Promise<Patient>;
  
  /**
   * Delete patient record (soft delete by default).
   * 
   * @param patientId - Unique patient identifier
   * @param permanent - Whether to permanently delete (requires admin permissions)
   * @requires permissions: patients:delete
   */
  delete(patientId: string, permanent?: boolean): Promise<void>;
}
```

### User Documentation
```yaml
Documentation Types:
  Getting Started: Quick setup and first workflow
  API Reference: Comprehensive endpoint documentation
  Tutorials: Step-by-step implementation guides
  Examples: Real-world use case demonstrations
  Troubleshooting: Common issues and solutions

Writing Guidelines:
  - User-focused language (avoid technical jargon)
  - Clear step-by-step instructions
  - Working code examples
  - Screenshots for complex UI operations
  - Cross-references to related topics
```

---

## 🔍 Code Review Guidelines

### Review Checklist

#### Functionality
```yaml
✅ Code Logic:
  - Implements requirements correctly
  - Handles edge cases appropriately
  - Follows established patterns
  - Maintains backward compatibility

✅ Error Handling:
  - Comprehensive error coverage
  - User-friendly error messages
  - Proper error logging
  - Graceful failure handling

✅ Performance:
  - Efficient algorithms
  - Appropriate data structures
  - Memory usage optimization
  - Network request optimization
```

#### Code Quality
```yaml
✅ TypeScript Standards:
  - Strict type checking
  - Comprehensive type annotations
  - Interface definitions
  - Generic type usage

✅ Code Structure:
  - Single responsibility principle
  - Proper abstraction levels
  - Consistent naming conventions
  - Modular organization

✅ Documentation:
  - JSDoc comments for public APIs
  - Inline comments for complex logic
  - Updated user documentation
  - Example usage provided
```

#### Testing
```yaml
✅ Test Coverage:
  - Unit tests for core logic
  - Integration tests for API interactions
  - Edge case coverage
  - Error scenario testing

✅ Test Quality:
  - Clear test descriptions
  - Proper test data setup
  - Isolated test scenarios
  - Meaningful assertions
```

### Review Process
```yaml
1. Automated Checks:
    - Linting passes
    - Type checking succeeds
    - Tests pass
    - Security scanning clear

2. Manual Review:
    - Code logic correctness
    - Design pattern compliance
    - Performance implications
    - Documentation adequacy

3. Approval Criteria:
    - All automated checks pass
    - At least one approval from maintainer
    - No outstanding review comments
    - Documentation updated if needed
```

---

## 🚀 Release Process

### Version Management
```yaml
Semantic Versioning (semver):
  Major (X.0.0): Breaking changes
  Minor (x.Y.0): New features (backward compatible)
  Patch (x.y.Z): Bug fixes (backward compatible)

Examples:
  2.0.0: New GraphQL API integration (breaking)
  2.1.0: Patient bulk operations feature
  2.1.1: Authentication token refresh fix
```

### Release Workflow
```yaml
1. Preparation:
    - Update version in package.json
    - Update CHANGELOG.md
    - Verify all tests pass
    - Run security audit

2. Release Creation:
    - Create release branch
    - Tag release version
    - Generate release notes
    - Build and package

3. Publishing:
    - Publish to npm registry
    - Update GitHub release
    - Deploy documentation
    - Notify community

4. Post-Release:
    - Monitor for issues
    - Address urgent bugs
    - Plan next iteration
    - Update project boards
```

### Changelog Format
```markdown
## [2.1.0] - 2024-02-20

### Added
- Patient bulk import functionality
- Advanced filtering for booking queries
- Integration with Mailchimp for automated emails

### Changed
- Improved error messages for authentication failures
- Enhanced performance for large data sets
- Updated GraphQL query optimization

### Fixed
- Token refresh timeout issue
- Calendar sync timezone handling
- Memory leak in trigger nodes

### Deprecated
- Legacy patient search API (use new filtering instead)

### Security
- Updated dependencies with security patches
- Enhanced input validation for all endpoints
```

---

## 🤝 Community Guidelines

### Communication Channels
```yaml
GitHub Issues:
  - Bug reports
  - Feature requests
  - Technical discussions
  - Release planning

GitHub Discussions:
  - General questions
  - Implementation ideas
  - Best practices sharing
  - Community announcements

Discord/Slack:
  - Real-time collaboration
  - Quick questions
  - Community building
  - Pair programming

Email:
  - Security issues
  - Private matters
  - Partnership inquiries
```

### Contributor Recognition
```yaml
Contributor Types:
  Core Maintainers: Long-term project stewards
  Regular Contributors: Frequent code/doc contributors
  Community Champions: Help others, share knowledge
  Occasional Contributors: Valuable individual contributions

Recognition Methods:
  - Contributor documentation
  - Release note acknowledgments
  - Conference speaking opportunities
  - Swag and rewards program
```

### Getting Started as New Contributor
```yaml
1. First Steps:
    - Read project documentation
    - Set up development environment
    - Explore codebase structure
    - Run existing tests

2. Find Your First Issue:
    - Look for "good first issue" labels
    - Start with documentation improvements
    - Fix small bugs or typos
    - Add test cases

3. Make Your Contribution:
    - Follow development workflow
    - Write comprehensive tests
    - Update documentation
    - Submit pull request

4. Engage with Community:
    - Respond to review feedback
    - Help others in discussions
    - Share your experiences
    - Suggest improvements
```

## 📋 Contribution Checklist

### Before Starting
- [ ] Read and understand project goals
- [ ] Set up development environment
- [ ] Familiarize yourself with codebase
- [ ] Join communication channels
- [ ] Find suitable issue to work on

### During Development
- [ ] Follow coding standards
- [ ] Write comprehensive tests
- [ ] Update documentation
- [ ] Follow commit conventions
- [ ] Test thoroughly

### Before Submitting
- [ ] All tests pass
- [ ] Linting passes
- [ ] Documentation updated
- [ ] Commit history clean
- [ ] PR template completed

### After Submission
- [ ] Respond to review feedback
- [ ] Update PR as needed
- [ ] Monitor CI/CD results
- [ ] Celebrate contribution! 🎉

## Next Steps

Ready to contribute? Here's what to do next:

- **[Architecture Guide](architecture.md)** - Deep dive into project structure
- **[Testing Guide](testing.md)** - Comprehensive testing practices
- **[Node Documentation](../nodes/overview.md)** - Understanding the node system
- **[API Reference](../api/README.md)** - Technical implementation details

---

**Questions?** Don't hesitate to ask in our community channels. We're here to help you succeed! 🚀
