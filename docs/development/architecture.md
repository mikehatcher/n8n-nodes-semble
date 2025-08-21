# Architecture Guide

Comprehensive guide to the n8n Semble integration architecture, design patterns, and implementation details for contributors and maintainers.

## 🏗️ System Architecture Overview

### High-Level Architecture
```yaml
External Systems:
  ┌─────────────────┐
  │   Semble API    │ ←──── GraphQL endpoint
  │  (GraphQL)      │
  └─────────────────┘
           │
           │ HTTPS/GraphQL
           ▼
  ┌─────────────────┐
  │  n8n Platform   │
  │                 │
  │ ┌─────────────┐ │
  │ │   Semble    │ │ ←──── Action Node
  │ │    Node     │ │
  │ └─────────────┘ │
  │                 │
  │ ┌─────────────┐ │
  │ │   Semble    │ │ ←──── Trigger Node
  │ │  Trigger    │ │
  │ └─────────────┘ │
  │                 │
  │ ┌─────────────┐ │
  │ │ Credentials │ │ ←──── Authentication
  │ │   Manager   │ │
  │ └─────────────┘ │
  └─────────────────┘
           │
           │ Integration APIs
           ▼
  ┌─────────────────┐
  │ Target Systems  │
  │                 │
  │ • CRM Systems   │
  │ • Email Platforms│
  │ • Calendars     │
  │ • Analytics     │
  └─────────────────┘
```

### Component Architecture
```yaml
Core Components:
  📦 nodes/                 # Node implementations
  ├── Semble/              # Action node
  ├── SembleTrigger/       # Trigger node
  └── shared/              # Common utilities

  🔐 credentials/          # Authentication
  ├── SembleApi.credentials.ts
  └── validation/

  ⚙️ services/            # Business logic
  ├── SembleService.ts     # API interaction
  ├── PatientService.ts    # Patient operations
  ├── BookingService.ts    # Booking operations
  └── ProductService.ts    # Product operations

  🧩 components/           # Reusable components
  ├── ResourceSelector.ts  # Resource selection
  ├── FieldRegistry.ts     # Dynamic fields
  └── PollTimeSelector.ts  # Polling configuration

  🏗️ core/                # Core framework
  ├── BaseConfig.ts        # Configuration
  ├── EventSystem.ts       # Event handling
  ├── ErrorMapper.ts       # Error handling
  └── ServiceContainer.ts  # Dependency injection

  📝 types/               # TypeScript definitions
  ├── api/                # API types
  ├── nodes/              # Node types
  └── shared/             # Common types
```

---

## 🧩 Node Architecture

### Base Node Structure

#### INodeType Implementation
```typescript
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
      // Dynamic property generation
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // Execution logic
  }
}
```

#### Dynamic Property System
```typescript
// Property generation strategy
class PropertyBuilder {
  static buildProperties(): INodeProperties[] {
    return [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        options: ResourceRegistry.getResourceOptions(),
        default: 'patient',
        description: 'Semble resource to operate on',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['patient'],
          },
        },
        options: OperationRegistry.getPatientOperations(),
        default: 'get',
        description: 'Operation to perform',
      },
      ...AdditionalFieldsRegistry.getFields(),
    ];
  }
}
```

### Trigger Node Architecture

#### ITriggerFunction Implementation
```typescript
export class SembleTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Semble Trigger',
    name: 'sembleTrigger',
    icon: 'file:semble.svg',
    group: ['trigger'],
    version: 1,
    description: 'Monitor Semble for changes and trigger workflows',
    defaults: {
      name: 'Semble Trigger',
    },
    inputs: [],
    outputs: ['main'],
    credentials: [
      {
        name: 'sembleApi',
        required: true,
      },
    ],
    polling: true,
    properties: [
      // Trigger-specific properties
    ],
  };

  async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
    // Polling implementation
  }
}
```

#### Polling Strategy
```typescript
class PollManager {
  async executePoll(
    context: IPollFunctions,
    resource: string,
    pollConfig: PollConfiguration,
  ): Promise<INodeExecutionData[][] | null> {
    try {
      // 1. Get last poll timestamp
      const lastPoll = this.getLastPollTime(context);
      
      // 2. Query for changes since last poll
      const changes = await this.fetchChanges(resource, lastPoll, pollConfig);
      
      // 3. Process and format results
      const results = this.processChanges(changes);
      
      // 4. Update poll timestamp
      this.updateLastPollTime(context);
      
      return results.length > 0 ? [results] : null;
    } catch (error) {
      throw ErrorMapper.mapPollingError(error);
    }
  }
}
```

---

## 🔐 Authentication Architecture

### Credentials System
```typescript
export class SembleApiCredentials implements ICredentialType {
  name = 'sembleApi';
  displayName = 'Semble API';
  description = 'Credentials for Semble Practice Management API';
  documentationUrl = 'https://docs.semble.io/authentication';
  
  properties: INodeProperties[] = [
    {
      displayName: 'API Token',
      name: 'apiToken',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'Your Semble API authentication token',
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://open.semble.io/graphql',
      required: true,
      description: 'Semble GraphQL API endpoint URL',
    },
  ];

  async authenticate(
    credentials: ICredentialDataDecryptedObject,
    requestOptions: IHttpRequestOptions,
  ): Promise<IHttpRequestOptions> {
    // Authentication implementation
    requestOptions.headers = {
      ...requestOptions.headers,
      'x-token': credentials.apiToken as string,
      'Content-Type': 'application/json',
    };
    
    return requestOptions;
  }

  async test(
    this: ICredentialTestFunctions,
    credential: ICredentialsDecrypted,
  ): Promise<INodeCredentialTestResult> {
    // Credential validation
    try {
      const options: IHttpRequestOptions = {
        method: 'POST',
        url: credential.data!.baseUrl as string,
        headers: {
          'x-token': credential.data!.apiToken as string,
          'Content-Type': 'application/json',
        },
        body: {
          query: 'query { patients(first: 1) { data { id } } }',
        },
      };

      await this.helpers.request(options);
      
      return {
        status: 'OK',
        message: 'Connection successful',
      };
    } catch (error) {
      return {
        status: 'Error',
        message: `Authentication failed: ${error.message}`,
      };
    }
  }
}
```

### Security Implementation
```typescript
class SecurityManager {
  static validateCredentials(credentials: ICredentialDataDecryptedObject): void {
    // Validate API token format
    if (!credentials.apiToken || typeof credentials.apiToken !== 'string') {
      throw new Error('Invalid API token format');
    }
    
    // Validate base URL format
    if (!this.isValidUrl(credentials.baseUrl as string)) {
      throw new Error('Invalid base URL format');
    }
  }

  static sanitizeApiToken(token: string): string {
    // Remove any whitespace
    return token.trim();
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('https://');
    } catch {
      return false;
    }
  }
}
```

---

## 🏗️ Service Layer Architecture

### Service Container Pattern
```typescript
export class ServiceContainer {
  private static services = new Map<string, any>();
  
  static register<T>(name: string, factory: () => T): void {
    this.services.set(name, factory);
  }
  
  static get<T>(name: string): T {
    const factory = this.services.get(name);
    if (!factory) {
      throw new Error(`Service not found: ${name}`);
    }
    return factory();
  }
  
  static initialize(): void {
    // Register core services
    this.register('sembleService', () => new SembleService());
    this.register('patientService', () => new PatientService());
    this.register('bookingService', () => new BookingService());
    this.register('errorMapper', () => new ErrorMapper());
  }
}
```

### Base Service Implementation
```typescript
export abstract class BaseService {
  constructor(
    protected context: IExecuteFunctions | IPollFunctions,
    protected itemIndex: number = 0,
  ) {}

  protected async makeApiRequest<T>(
    query: string,
    variables: Record<string, any> = {},
  ): Promise<T> {
    try {
      const response = await sembleApiRequest.call(this.context, {
        query,
        variables,
      });
      
      return this.validateApiResponse(response);
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  protected validateApiResponse<T>(response: any): T {
    if (response.errors && response.errors.length > 0) {
      throw new Error(`GraphQL errors: ${response.errors.map((e: any) => e.message).join(', ')}`);
    }
    
    return response.data;
  }

  protected handleApiError(error: any): Error {
    return ErrorMapper.mapApiError(error, this.constructor.name);
  }

  protected getCredentials(): Promise<ICredentialDataDecryptedObject> {
    return this.context.getCredentials('sembleApi');
  }
}
```

### Specialized Services
```typescript
export class PatientService extends BaseService {
  async getPatients(options: GetPatientsOptions): Promise<Patient[]> {
    const query = `
      query GetPatients($limit: Int, $filters: PatientFilters) {
        patients(first: $limit, filters: $filters) {
          data {
            id
            firstName
            lastName
            email
            phone
            dateOfBirth
            status
            dateCreated
            dateUpdated
          }
          pageInfo {
            hasNextPage
            totalCount
          }
        }
      }
    `;

    const variables = {
      limit: options.limit || 50,
      filters: this.buildFilters(options),
    };

    const response = await this.makeApiRequest<{ patients: PatientResponse }>(query, variables);
    return response.patients.data;
  }

  async createPatient(patientData: CreatePatientData): Promise<Patient> {
    // Validation
    this.validatePatientData(patientData);
    
    const mutation = `
      mutation CreatePatient($input: CreatePatientInput!) {
        createPatient(input: $input) {
          id
          firstName
          lastName
          email
          phone
          status
          dateCreated
        }
      }
    `;

    const variables = {
      input: this.transformCreateData(patientData),
    };

    const response = await this.makeApiRequest<{ createPatient: Patient }>(mutation, variables);
    return response.createPatient;
  }

  private validatePatientData(data: CreatePatientData): void {
    const validator = new PatientValidator();
    const result = validator.validate(data);
    
    if (!result.valid) {
      throw new ValidationError(`Invalid patient data: ${result.errors.join(', ')}`);
    }
  }

  private buildFilters(options: GetPatientsOptions): Record<string, any> {
    const filters: Record<string, any> = {};
    
    if (options.status) {
      filters.status = options.status;
    }
    
    if (options.dateRange) {
      filters.dateCreated = {
        gte: options.dateRange.start,
        lte: options.dateRange.end,
      };
    }
    
    if (options.searchTerm) {
      filters.search = options.searchTerm;
    }
    
    return filters;
  }
}
```

---

## 🔄 Event System Architecture

### Event-Driven Pattern
```typescript
export class EventSystem {
  private static listeners = new Map<string, EventListener[]>();
  
  static on(event: string, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }
  
  static emit(event: string, data: any): void {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Event listener error for ${event}:`, error);
      }
    });
  }
  
  static off(event: string, listener: EventListener): void {
    const listeners = this.listeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }
}

// Usage in services
export class PatientService extends BaseService {
  async createPatient(data: CreatePatientData): Promise<Patient> {
    const patient = await this.performCreate(data);
    
    // Emit event for other systems to react
    EventSystem.emit('patient:created', {
      patient,
      timestamp: new Date().toISOString(),
      source: 'api',
    });
    
    return patient;
  }
}
```

### Middleware Pipeline
```typescript
export class MiddlewarePipeline {
  private middlewares: Middleware[] = [];
  
  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }
  
  async execute(context: ExecutionContext): Promise<any> {
    let index = 0;
    
    const next = async (): Promise<any> => {
      if (index >= this.middlewares.length) {
        return context.handler();
      }
      
      const middleware = this.middlewares[index++];
      return middleware(context, next);
    };
    
    return next();
  }
}

// Example middleware
const loggingMiddleware: Middleware = async (context, next) => {
  const start = Date.now();
  console.log(`Starting ${context.operation}`);
  
  try {
    const result = await next();
    console.log(`Completed ${context.operation} in ${Date.now() - start}ms`);
    return result;
  } catch (error) {
    console.error(`Failed ${context.operation} in ${Date.now() - start}ms:`, error);
    throw error;
  }
};

const rateLimitMiddleware: Middleware = async (context, next) => {
  await RateLimiter.checkLimit(context.userId);
  return next();
};
```

---

## 📊 Data Flow Architecture

### Data Transformation Pipeline
```typescript
export class DataTransformer {
  private transformers = new Map<string, TransformFunction>();
  
  register(name: string, transformer: TransformFunction): void {
    this.transformers.set(name, transformer);
  }
  
  async transform(data: any, transformations: string[]): Promise<any> {
    let result = data;
    
    for (const transformation of transformations) {
      const transformer = this.transformers.get(transformation);
      if (transformer) {
        result = await transformer(result);
      }
    }
    
    return result;
  }
}

// Transformation functions
const patientTransformations = {
  normalizePhone: (data: any) => ({
    ...data,
    phone: normalizePhoneNumber(data.phone),
  }),
  
  formatName: (data: any) => ({
    ...data,
    firstName: capitalizeFirstLetter(data.firstName),
    lastName: capitalizeFirstLetter(data.lastName),
  }),
  
  validateEmail: (data: any) => {
    if (!isValidEmail(data.email)) {
      throw new ValidationError('Invalid email format');
    }
    return data;
  },
};
```

### Caching Layer
```typescript
export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTtl = 5 * 60 * 1000; // 5 minutes
  
  set(key: string, value: any, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTtl);
    this.cache.set(key, { value, expiresAt });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
}

// Usage in services
export class SembleService extends BaseService {
  private cache = new CacheManager();
  
  async getAppointmentTypes(): Promise<AppointmentType[]> {
    return this.cache.getOrSet(
      'appointment-types',
      () => this.fetchAppointmentTypesFromApi(),
      30 * 60 * 1000, // 30 minutes
    );
  }
}
```

---

## 🚦 Error Handling Architecture

### Error Hierarchy
```typescript
export abstract class SembleError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  
  constructor(
    message: string,
    public readonly details?: Record<string, any>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class AuthenticationError extends SembleError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly httpStatus = 401;
}

export class ValidationError extends SembleError {
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 400;
}

export class RateLimitError extends SembleError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly httpStatus = 429;
}

export class ApiConnectionError extends SembleError {
  readonly code = 'API_CONNECTION_ERROR';
  readonly httpStatus = 503;
}
```

### Error Mapping Strategy
```typescript
export class ErrorMapper {
  static mapToNodeError(error: any, node: INode): NodeApiError {
    if (error instanceof NodeApiError) {
      return error;
    }
    
    // Map specific error types
    if (error instanceof AuthenticationError) {
      return new NodeApiError(node, error, {
        message: 'Authentication failed. Please check your API credentials.',
        description: 'Verify your API token and base URL in the credentials configuration.',
      });
    }
    
    if (error instanceof RateLimitError) {
      return new NodeApiError(node, error, {
        message: 'Rate limit exceeded. Please reduce request frequency.',
        description: 'Consider increasing poll intervals or implementing exponential backoff.',
      });
    }
    
    if (error instanceof ValidationError) {
      return new NodeApiError(node, error, {
        message: `Data validation failed: ${error.message}`,
        description: 'Please check your input data and ensure all required fields are provided.',
      });
    }
    
    // Generic error mapping
    return new NodeApiError(node, error);
  }
  
  static mapApiError(error: any, context: string): SembleError {
    // Map HTTP status codes
    if (error.response?.status === 401) {
      return new AuthenticationError('Invalid API credentials');
    }
    
    if (error.response?.status === 429) {
      return new RateLimitError('API rate limit exceeded');
    }
    
    if (error.response?.status >= 500) {
      return new ApiConnectionError('Semble API server error');
    }
    
    // Map GraphQL errors
    if (error.response?.data?.errors) {
      const graphqlErrors = error.response.data.errors;
      
      if (graphqlErrors.some((e: any) => e.extensions?.code === 'GRAPHQL_VALIDATION_FAILED')) {
        return new ValidationError(`GraphQL validation failed: ${graphqlErrors.map((e: any) => e.message).join(', ')}`);
      }
    }
    
    // Generic error
    return new ApiConnectionError(`API operation failed in ${context}: ${error.message}`);
  }
}
```

### Retry Strategy
```typescript
export class RetryManager {
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      retryCondition = this.defaultRetryCondition,
    } = options;
    
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts || !retryCondition(error)) {
          throw error;
        }
        
        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt - 1),
          maxDelay,
        );
        
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }
  
  private static defaultRetryCondition(error: any): boolean {
    // Retry on network errors and 5xx status codes
    return (
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      (error.response?.status >= 500 && error.response?.status < 600)
    );
  }
  
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 🧪 Testing Architecture

### Test Structure
```typescript
// Base test utilities
export class TestUtils {
  static createMockExecuteFunction(): jest.Mocked<IExecuteFunctions> {
    return {
      getInputData: jest.fn(),
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn(),
      helpers: {
        request: jest.fn(),
      },
    } as any;
  }
  
  static createMockPollFunction(): jest.Mocked<IPollFunctions> {
    return {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn(),
      getWorkflowStaticData: jest.fn(),
      helpers: {
        request: jest.fn(),
      },
    } as any;
  }
}

// Test fixtures
export class TestFixtures {
  static readonly patients = {
    validCreate: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+44 20 7946 0958',
    },
    
    apiResponse: {
      id: 'pat_123456789',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      status: 'Active',
      dateCreated: '2024-02-20T10:30:00Z',
    },
  };
}
```

### Integration Test Framework
```typescript
export class IntegrationTestRunner {
  private static testEnvironment: TestEnvironment;
  
  static async setupTestEnvironment(): Promise<void> {
    this.testEnvironment = new TestEnvironment({
      apiUrl: process.env.TEST_API_URL!,
      apiToken: process.env.TEST_API_TOKEN!,
    });
    
    await this.testEnvironment.initialize();
  }
  
  static async teardownTestEnvironment(): Promise<void> {
    await this.testEnvironment.cleanup();
  }
  
  static async runWorkflowTest(
    workflow: WorkflowDefinition,
    testData: any[],
  ): Promise<WorkflowTestResult> {
    const execution = await this.testEnvironment.executeWorkflow(
      workflow,
      testData,
    );
    
    return {
      success: execution.finished,
      data: execution.data,
      error: execution.error,
      executionTime: execution.executionTime,
    };
  }
}
```

---

## 📈 Performance Architecture

### Performance Monitoring
```typescript
export class PerformanceMonitor {
  private static metrics = new Map<string, PerformanceMetric[]>();
  
  static startTimer(operation: string): PerformanceTimer {
    return new PerformanceTimer(operation);
  }
  
  static recordMetric(metric: PerformanceMetric): void {
    const key = `${metric.operation}:${metric.resource}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const metrics = this.metrics.get(key)!;
    metrics.push(metric);
    
    // Keep only last 100 metrics
    if (metrics.length > 100) {
      metrics.shift();
    }
  }
  
  static getAverageResponseTime(operation: string, resource: string): number {
    const key = `${operation}:${resource}`;
    const metrics = this.metrics.get(key) || [];
    
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }
}

export class PerformanceTimer {
  private startTime: number;
  
  constructor(private operation: string) {
    this.startTime = performance.now();
  }
  
  end(resource: string = 'unknown'): void {
    const duration = performance.now() - this.startTime;
    
    PerformanceMonitor.recordMetric({
      operation: this.operation,
      resource,
      duration,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Resource Optimization
```typescript
export class ResourceOptimizer {
  static optimizeQuery(query: string, options: QueryOptions): string {
    // Remove unnecessary fields
    if (options.fieldsOnly) {
      query = this.removeUnusedFields(query, options.fieldsOnly);
    }
    
    // Add pagination limits
    if (options.limit) {
      query = this.addPaginationLimit(query, options.limit);
    }
    
    // Optimize nested queries
    query = this.optimizeNestedQueries(query);
    
    return query;
  }
  
  static async batchRequests<T>(
    requests: (() => Promise<T>)[],
    batchSize: number = 5,
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(req => req()));
      results.push(...batchResults);
      
      // Small delay between batches to prevent rate limiting
      if (i + batchSize < requests.length) {
        await this.sleep(100);
      }
    }
    
    return results;
  }
  
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 🔧 Configuration Architecture

### Configuration Management
```typescript
export class ConfigManager {
  private static config: Configuration;
  
  static initialize(environment: string = 'production'): void {
    this.config = {
      api: {
        baseUrl: process.env.SEMBLE_API_URL || 'https://open.semble.io/graphql',
        timeout: parseInt(process.env.API_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS || '3'),
      },
      cache: {
        defaultTtl: parseInt(process.env.CACHE_TTL || '300000'), // 5 minutes
        maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
      },
      rateLimit: {
        requestsPerMinute: parseInt(process.env.RATE_LIMIT_RPM || '120'),
        burstLimit: parseInt(process.env.RATE_LIMIT_BURST || '10'),
      },
      polling: {
        minInterval: parseInt(process.env.MIN_POLL_INTERVAL || '300000'), // 5 minutes
        maxInterval: parseInt(process.env.MAX_POLL_INTERVAL || '86400000'), // 24 hours
      },
      environment,
    };
  }
  
  static get<T>(path: string): T {
    return this.getNestedProperty(this.config, path);
  }
  
  private static getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
```

### Feature Flags
```typescript
export class FeatureFlags {
  private static flags = new Map<string, boolean>();
  
  static setFlag(name: string, enabled: boolean): void {
    this.flags.set(name, enabled);
  }
  
  static isEnabled(name: string): boolean {
    return this.flags.get(name) ?? false;
  }
  
  static initialize(): void {
    // Load from environment or configuration
    this.setFlag('advanced-filtering', process.env.ENABLE_ADVANCED_FILTERING === 'true');
    this.setFlag('bulk-operations', process.env.ENABLE_BULK_OPERATIONS === 'true');
    this.setFlag('enhanced-caching', process.env.ENABLE_ENHANCED_CACHING === 'true');
    this.setFlag('debug-logging', process.env.ENABLE_DEBUG_LOGGING === 'true');
  }
}
```

## 📋 Architecture Principles

### Design Principles
```yaml
SOLID Principles:
  Single Responsibility: Each class has one reason to change
  Open/Closed: Open for extension, closed for modification
  Liskov Substitution: Derived classes must be substitutable
  Interface Segregation: Clients depend only on methods they use
  Dependency Inversion: Depend on abstractions, not concretions

Additional Principles:
  DRY (Don't Repeat Yourself): Eliminate code duplication
  KISS (Keep It Simple, Stupid): Prefer simple solutions
  YAGNI (You Aren't Gonna Need It): Don't add unnecessary features
  Composition over Inheritance: Prefer composition relationships
```

### Scalability Considerations
```yaml
Horizontal Scaling:
  - Stateless service design
  - Shared nothing architecture
  - Event-driven communication
  - Load balancing support

Vertical Scaling:
  - Efficient memory usage
  - CPU optimization
  - Database query optimization
  - Caching strategies

Performance:
  - Lazy loading of resources
  - Batch processing capabilities
  - Connection pooling
  - Query result caching
```

### Security Architecture
```yaml
Authentication:
  - Secure credential storage
  - Token validation
  - Session management
  - Multi-factor authentication support

Authorization:
  - Role-based access control
  - Resource-level permissions
  - API endpoint protection
  - Audit logging

Data Protection:
  - Encryption in transit (TLS)
  - Encryption at rest
  - PII data handling
  - GDPR compliance
```

## Next Steps

Explore specific architectural components:

- **[Contributing Guide](contributing.md)** - Development workflow and standards
- **[Testing Guide](testing.md)** - Comprehensive testing strategies
- **[API Reference](../nodes/overview.md)** - Node implementation details
- **[Integration Patterns](../examples/integration-patterns.md)** - System integration designs

---

**Architecture Questions?** Join our technical discussions or review the codebase for implementation examples.
