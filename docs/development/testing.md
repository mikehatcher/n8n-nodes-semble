# Testing Guide

Comprehensive testing strategies, frameworks, and best practices for the n8n Semble integration to ensure reliability and maintainability.

## 🧪 Testing Overview

### Testing Philosophy
```yaml
Testing Pyramid:
  ┌─────────────────┐
  │   E2E Tests     │ ← Few, critical user journeys
  │   (10% of tests)│
  ├─────────────────┤
  │ Integration     │ ← API interactions, workflows
  │    Tests        │   (30% of tests)
  │   (30% tests)   │
  ├─────────────────┤
  │   Unit Tests    │ ← Business logic, utilities
  │ (60% of tests)  │   (60% of tests)
  └─────────────────┘

Test Strategy:
  - Fast feedback through unit tests
  - Comprehensive API coverage via integration tests
  - Critical path validation with E2E tests
  - Continuous testing in CI/CD pipeline
```

### Test Categories
```yaml
Unit Tests:
  Purpose: Test individual functions and classes in isolation
  Tools: Jest, TypeScript
  Coverage: Business logic, utilities, transformations
  Speed: Very fast (< 100ms per test)

Integration Tests:
  Purpose: Test interactions between components and external APIs
  Tools: Jest, Supertest, API mocks
  Coverage: API calls, data flow, error handling
  Speed: Moderate (< 1s per test)

End-to-End Tests:
  Purpose: Test complete user workflows
  Tools: n8n test framework, real API calls
  Coverage: Critical user journeys, workflow execution
  Speed: Slower (5-30s per test)

Performance Tests:
  Purpose: Validate system performance under load
  Tools: Jest, custom benchmarks
  Coverage: API response times, memory usage, throughput
  Speed: Variable (depends on test scope)
```

---

## 🔧 Test Setup and Configuration

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.test.ts',
    '**/*.spec.ts',
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'nodes/**/*.ts',
    'services/**/*.ts',
    'core/**/*.ts',
    'components/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 30000,
  verbose: true,
};
```

### Test Environment Setup
```typescript
// test/setup.ts
import { config } from 'dotenv';
import { ServiceContainer } from '../core/ServiceContainer';
import { TestMockManager } from './utils/TestMockManager';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Initialize service container for tests
  ServiceContainer.initialize();
  
  // Setup API mocks
  TestMockManager.initializeMocks();
  
  // Set test-specific configurations
  process.env.NODE_ENV = 'test';
  process.env.ENABLE_DEBUG_LOGGING = 'false';
});

afterAll(async () => {
  // Cleanup after all tests
  TestMockManager.cleanup();
});

// Global test utilities
global.setTimeout = (fn: () => void, delay: number) => {
  return setTimeout(fn, delay);
};
```

### Environment Configuration
```bash
# .env.test
NODE_ENV=test
SEMBLE_API_URL=https://test-api.semble.io/graphql
SEMBLE_API_TOKEN=test_token_123456789
API_TIMEOUT=5000
RATE_LIMIT_RPM=1000
ENABLE_DEBUG_LOGGING=false
CACHE_TTL=1000
```

---

## 🏗️ Unit Testing

### Service Layer Testing
```typescript
// test/services/PatientService.test.ts
import { PatientService } from '../../services/PatientService';
import { TestUtils } from '../utils/TestUtils';
import { TestFixtures } from '../fixtures/TestFixtures';
import { ValidationError } from '../../core/SembleError';

describe('PatientService', () => {
  let patientService: PatientService;
  let mockContext: jest.Mocked<IExecuteFunctions>;

  beforeEach(() => {
    mockContext = TestUtils.createMockExecuteFunction();
    patientService = new PatientService(mockContext);
  });

  describe('getPatients', () => {
    it('should fetch patients with default parameters', async () => {
      // Arrange
      const expectedResponse = TestFixtures.patients.listResponse;
      mockContext.helpers.request.mockResolvedValue({
        data: { patients: expectedResponse },
      });

      // Act
      const result = await patientService.getPatients({});

      // Assert
      expect(result).toEqual(expectedResponse.data);
      expect(mockContext.helpers.request).toHaveBeenCalledWith({
        method: 'POST',
        url: expect.stringContaining('/graphql'),
        headers: expect.objectContaining({
          'x-token': expect.any(String),
          'Content-Type': 'application/json',
        }),
        body: expect.objectContaining({
          query: expect.stringContaining('query GetPatients'),
        }),
      });
    });

    it('should apply filters correctly', async () => {
      // Arrange
      const filters = {
        status: 'Active',
        searchTerm: 'John',
        limit: 25,
      };
      mockContext.helpers.request.mockResolvedValue({
        data: { patients: TestFixtures.patients.filteredResponse },
      });

      // Act
      await patientService.getPatients(filters);

      // Assert
      const requestBody = mockContext.helpers.request.mock.calls[0][0].body;
      expect(requestBody.variables).toMatchObject({
        limit: 25,
        filters: {
          status: 'Active',
          search: 'John',
        },
      });
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const apiError = new Error('Network error');
      mockContext.helpers.request.mockRejectedValue(apiError);

      // Act & Assert
      await expect(patientService.getPatients({})).rejects.toThrow();
    });
  });

  describe('createPatient', () => {
    it('should create patient with valid data', async () => {
      // Arrange
      const patientData = TestFixtures.patients.validCreate;
      const expectedResponse = TestFixtures.patients.createResponse;
      mockContext.helpers.request.mockResolvedValue({
        data: { createPatient: expectedResponse },
      });

      // Act
      const result = await patientService.createPatient(patientData);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockContext.helpers.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            query: expect.stringContaining('mutation CreatePatient'),
            variables: expect.objectContaining({
              input: expect.objectContaining({
                firstName: patientData.firstName,
                lastName: patientData.lastName,
                email: patientData.email,
              }),
            }),
          }),
        }),
      );
    });

    it('should validate required fields', async () => {
      // Arrange
      const invalidData = { firstName: 'John' }; // Missing required fields

      // Act & Assert
      await expect(patientService.createPatient(invalidData as any))
        .rejects.toThrow(ValidationError);
    });

    it('should handle GraphQL validation errors', async () => {
      // Arrange
      const patientData = TestFixtures.patients.validCreate;
      mockContext.helpers.request.mockResolvedValue({
        data: null,
        errors: [{ message: 'Email already exists' }],
      });

      // Act & Assert
      await expect(patientService.createPatient(patientData))
        .rejects.toThrow('GraphQL errors: Email already exists');
    });
  });
});
```

### Node Testing
```typescript
// test/nodes/Semble.test.ts
import { Semble } from '../../nodes/Semble/Semble';
import { TestUtils } from '../utils/TestUtils';
import { TestFixtures } from '../fixtures/TestFixtures';

describe('Semble Node', () => {
  let sembleNode: Semble;
  let mockContext: jest.Mocked<IExecuteFunctions>;

  beforeEach(() => {
    sembleNode = new Semble();
    mockContext = TestUtils.createMockExecuteFunction();
  });

  describe('execute', () => {
    it('should handle patient get operation', async () => {
      // Arrange
      mockContext.getInputData.mockReturnValue([
        { json: { id: 'test-id' } },
      ]);
      mockContext.getNodeParameter
        .mockReturnValueOnce('patient') // resource
        .mockReturnValueOnce('get') // operation
        .mockReturnValueOnce('pat_123'); // patientId

      mockContext.helpers.request.mockResolvedValue({
        data: { patient: TestFixtures.patients.getResponse },
      });

      // Act
      const result = await sembleNode.execute.call(mockContext);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual(TestFixtures.patients.getResponse);
    });

    it('should handle invalid resource gracefully', async () => {
      // Arrange
      mockContext.getInputData.mockReturnValue([{ json: {} }]);
      mockContext.getNodeParameter
        .mockReturnValueOnce('invalid_resource')
        .mockReturnValueOnce('get');

      // Act & Assert
      await expect(sembleNode.execute.call(mockContext))
        .rejects.toThrow('Invalid resource: invalid_resource');
    });

    it('should pass credentials to API requests', async () => {
      // Arrange
      const credentials = {
        apiToken: 'test_token_123',
        baseUrl: 'https://test.semble.io/graphql',
      };
      mockContext.getCredentials.mockResolvedValue(credentials);
      mockContext.getInputData.mockReturnValue([{ json: {} }]);
      mockContext.getNodeParameter
        .mockReturnValueOnce('patient')
        .mockReturnValueOnce('getAll');

      mockContext.helpers.request.mockResolvedValue({
        data: { patients: TestFixtures.patients.listResponse },
      });

      // Act
      await sembleNode.execute.call(mockContext);

      // Assert
      expect(mockContext.helpers.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-token': 'test_token_123',
          }),
          url: 'https://test.semble.io/graphql',
        }),
      );
    });
  });
});
```

### Utility Testing
```typescript
// test/utils/DataTransformer.test.ts
import { DataTransformer } from '../../core/DataTransformer';

describe('DataTransformer', () => {
  let transformer: DataTransformer;

  beforeEach(() => {
    transformer = new DataTransformer();
  });

  describe('normalizePhoneNumber', () => {
    it('should format UK phone numbers correctly', () => {
      const testCases = [
        { input: '07946123456', expected: '+44 7946 123456' },
        { input: '+447946123456', expected: '+44 7946 123456' },
        { input: '0207 946 0958', expected: '+44 20 7946 0958' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = transformer.normalizePhoneNumber(input);
        expect(result).toBe(expected);
      });
    });

    it('should handle invalid phone numbers', () => {
      const invalidNumbers = ['invalid', '123', ''];
      
      invalidNumbers.forEach(number => {
        expect(() => transformer.normalizePhoneNumber(number))
          .toThrow('Invalid phone number format');
      });
    });
  });

  describe('transformPatientData', () => {
    it('should transform API response to n8n format', () => {
      // Arrange
      const apiData = {
        id: 'pat_123',
        first_name: 'john',
        last_name: 'doe',
        email_address: 'john.doe@example.com',
        phone_number: '07946123456',
        date_of_birth: '1990-05-15',
      };

      const expected = {
        id: 'pat_123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+44 7946 123456',
        dateOfBirth: '1990-05-15',
      };

      // Act
      const result = transformer.transformPatientData(apiData);

      // Assert
      expect(result).toEqual(expected);
    });
  });
});
```

---

## 🔗 Integration Testing

### API Integration Tests
```typescript
// test/integration/SembleApi.integration.test.ts
import { SembleService } from '../../services/SembleService';
import { TestUtils } from '../utils/TestUtils';
import { ApiTestHelper } from '../utils/ApiTestHelper';

describe('Semble API Integration', () => {
  let sembleService: SembleService;
  let apiHelper: ApiTestHelper;

  beforeAll(async () => {
    apiHelper = new ApiTestHelper();
    await apiHelper.setup();
  });

  afterAll(async () => {
    await apiHelper.cleanup();
  });

  beforeEach(() => {
    const mockContext = TestUtils.createMockExecuteFunction();
    sembleService = new SembleService(mockContext);
  });

  describe('Patient Operations', () => {
    it('should create, read, update, and delete patient', async () => {
      // Create
      const createData = {
        firstName: 'Integration',
        lastName: 'Test',
        email: `test-${Date.now()}@example.com`,
        phone: '+44 7946 123456',
      };

      const createdPatient = await sembleService.createPatient(createData);
      expect(createdPatient.id).toBeTruthy();
      expect(createdPatient.firstName).toBe(createData.firstName);

      // Read
      const retrievedPatient = await sembleService.getPatient(createdPatient.id);
      expect(retrievedPatient.id).toBe(createdPatient.id);
      expect(retrievedPatient.email).toBe(createData.email);

      // Update
      const updateData = { firstName: 'UpdatedName' };
      const updatedPatient = await sembleService.updatePatient(
        createdPatient.id,
        updateData,
      );
      expect(updatedPatient.firstName).toBe('UpdatedName');

      // Delete
      await sembleService.deletePatient(createdPatient.id);
      
      // Verify deletion
      await expect(sembleService.getPatient(createdPatient.id))
        .rejects.toThrow();
    }, 30000);

    it('should handle pagination correctly', async () => {
      // Create test data
      const patients = [];
      for (let i = 0; i < 15; i++) {
        patients.push(await sembleService.createPatient({
          firstName: `Test${i}`,
          lastName: 'Pagination',
          email: `test-pagination-${i}-${Date.now()}@example.com`,
        }));
      }

      try {
        // Test pagination
        const page1 = await sembleService.getPatients({ limit: 10 });
        expect(page1.length).toBe(10);

        const page2 = await sembleService.getPatients({
          limit: 10,
          offset: 10,
        });
        expect(page2.length).toBeGreaterThan(0);

        // Ensure no overlap
        const page1Ids = page1.map(p => p.id);
        const page2Ids = page2.map(p => p.id);
        const overlap = page1Ids.filter(id => page2Ids.includes(id));
        expect(overlap).toHaveLength(0);
      } finally {
        // Cleanup
        await Promise.all(patients.map(p => 
          sembleService.deletePatient(p.id).catch(() => {})
        ));
      }
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      const invalidService = new SembleService(
        TestUtils.createMockExecuteFunctionWithCredentials({
          apiToken: 'invalid_token',
          baseUrl: process.env.SEMBLE_API_URL,
        }),
      );

      await expect(invalidService.getPatients({}))
        .rejects.toThrow(/authentication/i);
    });

    it('should handle rate limiting gracefully', async () => {
      // Make many requests quickly to trigger rate limiting
      const requests = Array(150).fill(null).map(() => 
        sembleService.getPatients({ limit: 1 })
      );

      // Some requests should succeed, others should be rate limited
      const results = await Promise.allSettled(requests);
      
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');
      
      expect(successes.length).toBeGreaterThan(0);
      expect(failures.length).toBeGreaterThan(0);
      
      // Check that failures are due to rate limiting
      failures.forEach(failure => {
        expect((failure as PromiseRejectedResult).reason.message)
          .toMatch(/rate limit/i);
      });
    }, 30000);
  });
});
```

### Workflow Integration Tests
```typescript
// test/integration/Workflow.integration.test.ts
import { WorkflowTestRunner } from '../utils/WorkflowTestRunner';
import { TestFixtures } from '../fixtures/TestFixtures';

describe('Workflow Integration Tests', () => {
  let workflowRunner: WorkflowTestRunner;

  beforeAll(async () => {
    workflowRunner = new WorkflowTestRunner();
    await workflowRunner.initialize();
  });

  afterAll(async () => {
    await workflowRunner.cleanup();
  });

  it('should execute patient creation workflow', async () => {
    const workflow = TestFixtures.workflows.patientCreation;
    const inputData = TestFixtures.workflows.patientCreationInput;

    const result = await workflowRunner.executeWorkflow(workflow, inputData);

    expect(result.success).toBe(true);
    expect(result.data.main[0][0].json).toMatchObject({
      id: expect.any(String),
      firstName: inputData.firstName,
      lastName: inputData.lastName,
      email: inputData.email,
    });
  });

  it('should handle workflow errors gracefully', async () => {
    const workflow = TestFixtures.workflows.patientCreation;
    const invalidInput = { ...TestFixtures.workflows.patientCreationInput };
    delete invalidInput.firstName; // Make it invalid

    const result = await workflowRunner.executeWorkflow(workflow, invalidInput);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/validation/i);
  });

  it('should execute booking workflow with patient dependency', async () => {
    // First create a patient
    const patientWorkflow = TestFixtures.workflows.patientCreation;
    const patientInput = TestFixtures.workflows.patientCreationInput;
    
    const patientResult = await workflowRunner.executeWorkflow(
      patientWorkflow,
      patientInput,
    );
    expect(patientResult.success).toBe(true);
    
    const patientId = patientResult.data.main[0][0].json.id;

    // Then create a booking for that patient
    const bookingWorkflow = TestFixtures.workflows.bookingCreation;
    const bookingInput = {
      ...TestFixtures.workflows.bookingCreationInput,
      patientId,
    };

    const bookingResult = await workflowRunner.executeWorkflow(
      bookingWorkflow,
      bookingInput,
    );

    expect(bookingResult.success).toBe(true);
    expect(bookingResult.data.main[0][0].json).toMatchObject({
      id: expect.any(String),
      patientId,
      appointmentTypeId: bookingInput.appointmentTypeId,
    });
  });
});
```

---

## 🚀 End-to-End Testing

### E2E Test Framework
```typescript
// test/e2e/E2ETestRunner.ts
import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { N8nTestHelper } from '../utils/N8nTestHelper';

export class E2ETestRunner {
  private n8nHelper: N8nTestHelper;

  constructor() {
    this.n8nHelper = new N8nTestHelper({
      baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
      email: process.env.N8N_TEST_EMAIL!,
      password: process.env.N8N_TEST_PASSWORD!,
    });
  }

  async initialize(): Promise<void> {
    await this.n8nHelper.connect();
    await this.n8nHelper.authenticate();
  }

  async executeUserJourney(journey: UserJourney): Promise<JourneyResult> {
    const startTime = Date.now();
    const steps: StepResult[] = [];

    try {
      for (const step of journey.steps) {
        const stepStart = Date.now();
        const stepResult = await this.executeStep(step);
        
        steps.push({
          ...stepResult,
          duration: Date.now() - stepStart,
        });

        if (!stepResult.success) {
          throw new Error(`Step failed: ${step.name}`);
        }
      }

      return {
        success: true,
        duration: Date.now() - startTime,
        steps,
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        steps,
        error: error.message,
      };
    }
  }

  private async executeStep(step: JourneyStep): Promise<StepResult> {
    switch (step.type) {
      case 'create-workflow':
        return this.createWorkflow(step);
      case 'configure-node':
        return this.configureNode(step);
      case 'execute-workflow':
        return this.executeWorkflow(step);
      case 'verify-result':
        return this.verifyResult(step);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async createWorkflow(step: CreateWorkflowStep): Promise<StepResult> {
    try {
      const workflow = await this.n8nHelper.createWorkflow(step.workflowData);
      return {
        success: true,
        data: { workflowId: workflow.id },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async executeWorkflow(step: ExecuteWorkflowStep): Promise<StepResult> {
    try {
      const execution = await this.n8nHelper.executeWorkflow(
        step.workflowId,
        step.inputData,
      );
      
      return {
        success: execution.finished,
        data: execution.data,
        error: execution.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
```

### Critical User Journeys
```typescript
// test/e2e/journeys/PatientManagement.e2e.test.ts
import { E2ETestRunner } from '../E2ETestRunner';
import { UserJourneys } from '../fixtures/UserJourneys';

describe('Patient Management E2E', () => {
  let e2eRunner: E2ETestRunner;

  beforeAll(async () => {
    e2eRunner = new E2ETestRunner();
    await e2eRunner.initialize();
  }, 30000);

  it('should complete full patient lifecycle journey', async () => {
    const journey = UserJourneys.patientLifecycle;
    const result = await e2eRunner.executeUserJourney(journey);

    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(journey.steps.length);
    expect(result.duration).toBeLessThan(60000); // Should complete within 1 minute
  }, 120000);

  it('should handle bulk patient import journey', async () => {
    const journey = UserJourneys.bulkPatientImport;
    const result = await e2eRunner.executeUserJourney(journey);

    expect(result.success).toBe(true);
    
    // Verify all patients were imported
    const importStep = result.steps.find(s => s.data?.importedCount);
    expect(importStep?.data?.importedCount).toBeGreaterThan(0);
  }, 300000);

  it('should recover from API failures gracefully', async () => {
    const journey = UserJourneys.apiFailureRecovery;
    const result = await e2eRunner.executeUserJourney(journey);

    // Journey should succeed despite temporary failures
    expect(result.success).toBe(true);
    
    // Should have retry attempts logged
    const retrySteps = result.steps.filter(s => s.data?.retryAttempt);
    expect(retrySteps.length).toBeGreaterThan(0);
  }, 180000);
});
```

---

## 📊 Performance Testing

### Load Testing
```typescript
// test/performance/LoadTest.ts
import { PerformanceTestRunner } from '../utils/PerformanceTestRunner';
import { LoadTestScenarios } from '../fixtures/LoadTestScenarios';

describe('Performance Tests', () => {
  let performanceRunner: PerformanceTestRunner;

  beforeAll(async () => {
    performanceRunner = new PerformanceTestRunner();
    await performanceRunner.initialize();
  });

  it('should handle concurrent patient operations', async () => {
    const scenario = LoadTestScenarios.concurrentPatientOps;
    const result = await performanceRunner.runLoadTest(scenario);

    expect(result.success).toBe(true);
    expect(result.averageResponseTime).toBeLessThan(2000); // < 2 seconds
    expect(result.errorRate).toBeLessThan(0.05); // < 5% error rate
    expect(result.throughput).toBeGreaterThan(50); // > 50 ops/minute
  }, 300000);

  it('should respect rate limits', async () => {
    const scenario = LoadTestScenarios.rateLimitTest;
    const result = await performanceRunner.runLoadTest(scenario);

    // Should successfully throttle requests
    expect(result.rateLimitHits).toBeGreaterThan(0);
    expect(result.averageResponseTime).toBeLessThan(5000); // Including delays
  }, 180000);

  it('should handle memory efficiently during bulk operations', async () => {
    const scenario = LoadTestScenarios.memoryEfficiencyTest;
    const result = await performanceRunner.runLoadTest(scenario);

    expect(result.maxMemoryUsage).toBeLessThan(512 * 1024 * 1024); // < 512MB
    expect(result.memoryLeaks).toBe(0);
  }, 600000);
});
```

### Benchmark Tests
```typescript
// test/performance/Benchmarks.test.ts
import { BenchmarkRunner } from '../utils/BenchmarkRunner';

describe('Performance Benchmarks', () => {
  let benchmarkRunner: BenchmarkRunner;

  beforeEach(() => {
    benchmarkRunner = new BenchmarkRunner();
  });

  it('should benchmark data transformation performance', async () => {
    const result = await benchmarkRunner.benchmark(
      'data-transformation',
      () => {
        // Transform 1000 patient records
        const patients = generateTestPatients(1000);
        return transformPatientData(patients);
      },
      { iterations: 100 },
    );

    expect(result.averageTime).toBeLessThan(50); // < 50ms for 1000 records
    expect(result.operationsPerSecond).toBeGreaterThan(20);
  });

  it('should benchmark GraphQL query building', async () => {
    const result = await benchmarkRunner.benchmark(
      'query-building',
      () => {
        return buildComplexPatientQuery({
          includeBookings: true,
          includeCustomAttributes: true,
          fields: ['id', 'name', 'email', 'phone', 'address'],
        });
      },
      { iterations: 1000 },
    );

    expect(result.averageTime).toBeLessThan(1); // < 1ms per query
  });

  it('should benchmark cache operations', async () => {
    const result = await benchmarkRunner.benchmark(
      'cache-operations',
      async () => {
        await cacheManager.set('test-key', { data: 'test' });
        await cacheManager.get('test-key');
        await cacheManager.invalidate('test-key');
      },
      { iterations: 1000 },
    );

    expect(result.averageTime).toBeLessThan(0.1); // < 0.1ms per operation
  });
});
```

---

## 🛠️ Test Utilities and Helpers

### Mock Factory
```typescript
// test/utils/MockFactory.ts
export class MockFactory {
  static createPatient(overrides: Partial<Patient> = {}): Patient {
    return {
      id: `pat_${Date.now()}`,
      firstName: 'Test',
      lastName: 'Patient',
      email: `test.patient.${Date.now()}@example.com`,
      phone: '+44 7946 123456',
      dateOfBirth: '1990-01-01',
      status: 'Active',
      dateCreated: new Date().toISOString(),
      dateUpdated: new Date().toISOString(),
      ...overrides,
    };
  }

  static createBooking(overrides: Partial<Booking> = {}): Booking {
    return {
      id: `bkg_${Date.now()}`,
      patientId: `pat_${Date.now()}`,
      appointmentTypeId: `apt_${Date.now()}`,
      staffId: `stf_${Date.now()}`,
      startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(), // +1 hour
      status: 'Confirmed',
      notes: 'Test booking',
      dateCreated: new Date().toISOString(),
      ...overrides,
    };
  }

  static createWorkflowData(nodeTypes: string[]): WorkflowData {
    const nodes = nodeTypes.map((type, index) => ({
      id: `node-${index}`,
      name: `${type} Node`,
      type,
      position: [index * 200, 100],
      parameters: {},
    }));

    return {
      name: 'Test Workflow',
      nodes,
      connections: this.createConnections(nodes),
      active: false,
      settings: {},
    };
  }

  private static createConnections(nodes: any[]): any {
    const connections: any = {};
    
    for (let i = 0; i < nodes.length - 1; i++) {
      connections[nodes[i].name] = {
        main: [[{ node: nodes[i + 1].name, type: 'main', index: 0 }]],
      };
    }
    
    return connections;
  }
}
```

### API Test Helper
```typescript
// test/utils/ApiTestHelper.ts
export class ApiTestHelper {
  private testDataIds: string[] = [];

  async setup(): Promise<void> {
    // Verify API connectivity
    await this.verifyApiConnection();
    
    // Setup test data isolation
    await this.setupTestDataIsolation();
  }

  async cleanup(): Promise<void> {
    // Clean up any test data created during tests
    await this.cleanupTestData();
  }

  async createTestPatient(overrides: Partial<Patient> = {}): Promise<Patient> {
    const patientData = MockFactory.createPatient(overrides);
    const patient = await this.apiCall('createPatient', patientData);
    
    this.testDataIds.push(patient.id);
    return patient;
  }

  async createTestBooking(patientId: string, overrides: Partial<Booking> = {}): Promise<Booking> {
    const bookingData = MockFactory.createBooking({ patientId, ...overrides });
    const booking = await this.apiCall('createBooking', bookingData);
    
    this.testDataIds.push(booking.id);
    return booking;
  }

  private async verifyApiConnection(): Promise<void> {
    try {
      await this.apiCall('getPatients', { limit: 1 });
    } catch (error) {
      throw new Error(`API connection failed: ${error.message}`);
    }
  }

  private async cleanupTestData(): Promise<void> {
    for (const id of this.testDataIds) {
      try {
        if (id.startsWith('pat_')) {
          await this.apiCall('deletePatient', { id });
        } else if (id.startsWith('bkg_')) {
          await this.apiCall('deleteBooking', { id });
        }
      } catch (error) {
        console.warn(`Failed to cleanup test data ${id}:`, error.message);
      }
    }
    
    this.testDataIds = [];
  }

  private async apiCall(operation: string, data: any): Promise<any> {
    // Implementation would use actual API service
    // This is simplified for example purposes
    const service = new SembleService(TestUtils.createMockExecuteFunction());
    return service[operation](data);
  }
}
```

### Test Data Generator
```typescript
// test/utils/TestDataGenerator.ts
export class TestDataGenerator {
  static generatePatients(count: number): Patient[] {
    return Array.from({ length: count }, (_, index) => 
      MockFactory.createPatient({
        firstName: `Patient${index}`,
        lastName: `Test${index}`,
        email: `patient${index}@test.com`,
      })
    );
  }

  static generateBookings(patientIds: string[], count: number): Booking[] {
    return Array.from({ length: count }, (_, index) => {
      const patientId = patientIds[index % patientIds.length];
      return MockFactory.createBooking({
        patientId,
        startTime: new Date(Date.now() + index * 3600000).toISOString(),
      });
    });
  }

  static generateWorkflowTestData(scenario: string): any {
    switch (scenario) {
      case 'patient-creation':
        return {
          firstName: 'Integration',
          lastName: 'Test',
          email: `integration-${Date.now()}@test.com`,
          phone: '+44 7946 123456',
        };
      
      case 'booking-creation':
        return {
          appointmentTypeId: 'apt_general',
          staffId: 'stf_doctor1',
          duration: 30,
          notes: 'Integration test booking',
        };
      
      default:
        throw new Error(`Unknown test scenario: ${scenario}`);
    }
  }
}
```

---

## 🔍 Test Coverage and Quality

### Coverage Configuration
```typescript
// test/coverage/CoverageConfig.ts
export const coverageConfig = {
  // Minimum coverage thresholds
  thresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Specific thresholds for critical components
    'services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'nodes/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  
  // Files to exclude from coverage
  exclude: [
    '**/test/**',
    '**/node_modules/**',
    '**/*.d.ts',
    '**/index.ts',
  ],
  
  // Coverage report formats
  reporters: ['text', 'lcov', 'html', 'json-summary'],
};
```

### Quality Gates
```typescript
// test/quality/QualityGates.ts
export class QualityGates {
  static async validateTestQuality(): Promise<QualityReport> {
    const report: QualityReport = {
      coverage: await this.checkCoverage(),
      testSpeed: await this.checkTestSpeed(),
      testStability: await this.checkTestStability(),
      codeQuality: await this.checkCodeQuality(),
    };

    return report;
  }

  private static async checkCoverage(): Promise<CoverageMetrics> {
    // Read coverage report and validate against thresholds
    const coverage = await this.readCoverageReport();
    
    return {
      passed: coverage.lines >= 80,
      metrics: coverage,
      recommendations: this.getCoverageRecommendations(coverage),
    };
  }

  private static async checkTestSpeed(): Promise<SpeedMetrics> {
    // Analyze test execution times
    const testTimes = await this.getTestExecutionTimes();
    
    return {
      passed: testTimes.average < 5000, // 5 seconds average
      averageTime: testTimes.average,
      slowTests: testTimes.slow,
      recommendations: this.getSpeedRecommendations(testTimes),
    };
  }

  private static async checkTestStability(): Promise<StabilityMetrics> {
    // Check for flaky tests
    const flakyTests = await this.identifyFlakyTests();
    
    return {
      passed: flakyTests.length === 0,
      flakyTests,
      recommendations: this.getStabilityRecommendations(flakyTests),
    };
  }
}
```

### Test Automation
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm test:unit
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm test:integration
        env:
          SEMBLE_API_URL: ${{ secrets.TEST_API_URL }}
          SEMBLE_API_TOKEN: ${{ secrets.TEST_API_TOKEN }}

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm test:e2e
        env:
          N8N_BASE_URL: ${{ secrets.N8N_TEST_URL }}
          N8N_TEST_EMAIL: ${{ secrets.N8N_TEST_EMAIL }}
          N8N_TEST_PASSWORD: ${{ secrets.N8N_TEST_PASSWORD }}
```

## 📝 Test Documentation

### Test Strategy Document
```markdown
# Test Strategy

## Testing Principles
1. **Test Pyramid**: Focus on unit tests, supplement with integration and E2E tests
2. **Test Early**: Implement tests alongside feature development
3. **Test Isolation**: Each test should be independent and repeatable
4. **Real-World Scenarios**: Tests should reflect actual usage patterns
5. **Continuous Improvement**: Regularly review and improve test coverage

## Test Categories
- **Unit Tests** (60%): Fast, isolated tests of individual components
- **Integration Tests** (30%): API interactions and component integration
- **E2E Tests** (10%): Critical user journey validation

## Quality Standards
- Minimum 80% code coverage across all components
- All tests must pass consistently (no flaky tests)
- Test execution time should be under 5 minutes for full suite
- Integration tests must use isolated test data
```

### Test Maintenance Guide
```markdown
# Test Maintenance

## Regular Maintenance Tasks
1. **Weekly**: Review test execution times and identify slow tests
2. **Monthly**: Analyze coverage reports and improve low-coverage areas
3. **Quarterly**: Review and update test data and scenarios
4. **Before Releases**: Run full test suite including performance tests

## Best Practices
- Keep tests simple and focused on one concern
- Use descriptive test names that explain the scenario
- Mock external dependencies to ensure test isolation
- Clean up test data after test execution
- Use test fixtures for consistent test data
- Document complex test scenarios and their purpose
```

## Next Steps

Continue improving test coverage and quality:

- **[Contributing Guide](contributing.md)** - Development workflow and standards
- **[Architecture Guide](architecture.md)** - System design and patterns
- **[Troubleshooting](../examples/troubleshooting.md)** - Common issues and solutions
- **[API Reference](../nodes/overview.md)** - Node implementation details

---

**Testing Questions?** Review our test examples or contribute new test scenarios to improve coverage.
