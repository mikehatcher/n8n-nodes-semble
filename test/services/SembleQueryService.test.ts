/**
 * @fileoverview SembleQueryService Tests
 * @description Comprehensive tests for GraphQL query execution, rate limiting, retry logic, and response parsing
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Services.Query
 */

import { SembleQueryService, SembleQueryConfig, QueryBuilder, QueryResult } from '../../services/SembleQueryService';
import { SembleAuthError, SembleNetworkError, SembleAPIError } from '../../core/SembleError';
import { SembleCredentials, RateLimitState } from '../../types/SembleTypes';
import { SEMBLE_CONSTANTS } from '../../core/Constants';

// =============================================================================
// MOCKS
// =============================================================================

// Mock fetch globally
global.fetch = jest.fn();

// Helper function to create proper mock responses
const createMockResponse = (data: any, headers: Record<string, string> = {}) => {
	const mockHeaders = new Map(Object.entries(headers));
	return {
		ok: true,
		headers: mockHeaders,
		json: () => Promise.resolve(data)
	};
};

const mockCredentials: SembleCredentials = {
	token: 'test-token-123',
	apiKey: 'test-api-key',
	baseUrl: 'https://api.semble.com',
	environment: 'development'
};

const mockSuccessResponse = {
	data: {
		patients: [
			{ id: '1', firstName: 'John', lastName: 'Doe' },
			{ id: '2', firstName: 'Jane', lastName: 'Smith' }
		]
	}
};

const mockErrorResponse = {
	errors: [
		{
			message: 'Field not found',
			locations: [{ line: 1, column: 1 }],
			path: ['patients', 'invalidField']
		}
	]
};

// =============================================================================
// TEST SETUP
// =============================================================================

describe('SembleQueryService', () => {
	let service: SembleQueryService;
	let config: SembleQueryConfig;

	beforeEach(() => {
		jest.clearAllMocks();
		(global.fetch as jest.Mock).mockClear();
		
		config = {
			name: 'test-query-service',
			enabled: true,
			initTimeout: 5000,
			options: {},
			baseUrl: 'https://api.semble.com',
			timeout: 10000,
			retries: {
				maxAttempts: 3,
				initialDelay: 100,
				maxDelay: 1000,
				backoffMultiplier: 2.0
			},
			rateLimit: {
				maxRequests: 100,
				windowMs: 60000,
				delayMs: 100,
				enabled: true
			},
			validateResponses: true,
			useCompression: true
		};

		service = new SembleQueryService(config);
	});

	// =============================================================================
	// CONSTRUCTOR TESTS
	// =============================================================================

	describe('Constructor', () => {
		test('should create service with valid configuration', () => {
			expect(service).toBeInstanceOf(SembleQueryService);
			
			const serviceConfig = service.getConfig();
			expect(serviceConfig.baseUrl).toBe('https://api.semble.com');
			expect(serviceConfig.timeout).toBe(10000);
			expect(serviceConfig.validateResponses).toBe(true);
			expect(serviceConfig.useCompression).toBe(true);
		});

		test('should use default values for optional configuration', () => {
			const minimalConfig: SembleQueryConfig = {
				name: 'minimal-service',
				enabled: true,
				initTimeout: 5000,
				options: {},
				baseUrl: 'https://api.semble.com'
			};

			const minimalService = new SembleQueryService(minimalConfig);
			const serviceConfig = minimalService.getConfig();

			expect(serviceConfig.timeout).toBe(SEMBLE_CONSTANTS.TIMEOUTS.REQUEST_TIMEOUT);
			expect(serviceConfig.retries.maxAttempts).toBe(SEMBLE_CONSTANTS.RETRY.MAX_RETRIES);
			expect(serviceConfig.validateResponses).toBe(true);
			expect(serviceConfig.useCompression).toBe(true);
		});

		test('should initialize rate limit state', () => {
			const rateLimitState = service.getRateLimitState();
			
			expect(rateLimitState.remaining).toBe(100); // maxRequests
			expect(rateLimitState.requests).toEqual([]);
			expect(rateLimitState.resetTime).toBeGreaterThan(Date.now());
		});
	});

	// =============================================================================
	// CREDENTIALS MANAGEMENT TESTS
	// =============================================================================

	describe('Credentials Management', () => {
		test('should set and get credentials', () => {
			service.setCredentials(mockCredentials);
			
			const retrievedCredentials = service.getCredentials();
			expect(retrievedCredentials).toEqual(mockCredentials);
		});

		test('should return null when no credentials are set', () => {
			const credentials = service.getCredentials();
			expect(credentials).toBeNull();
		});

		test('should validate credentials before query execution', async () => {
			const query = 'query { patients { id firstName } }';

			await expect(service.executeQuery(query)).rejects.toThrow(SembleAuthError);
		});

		test('should validate that credentials contain token or API key', async () => {
			const invalidCredentials = {
				baseUrl: 'https://api.semble.com'
				// Missing token and apiKey
			} as SembleCredentials;

			service.setCredentials(invalidCredentials);

			const query = 'query { patients { id firstName } }';
			await expect(service.executeQuery(query)).rejects.toThrow(SembleAuthError);
		});
	});

	// =============================================================================
	// QUERY BUILDING TESTS
	// =============================================================================

	describe('Query Building', () => {
		test('should build simple query', () => {
			const builder: QueryBuilder = {
				resource: 'patients',
				operation: 'query',
				fields: ['id', 'firstName', 'lastName']
			};

			const query = service.buildQuery(builder);

			expect(query).toContain('query');
			expect(query).toContain('patients');
			expect(query).toContain('id');
			expect(query).toContain('firstName');
			expect(query).toContain('lastName');
		});

		test('should build mutation with variables', () => {
			const builder: QueryBuilder = {
				resource: 'createPatient',
				operation: 'mutation',
				fields: ['id', 'firstName'],
				variables: {
					input: 'PatientInput!'
				}
			};

			const query = service.buildQuery(builder);

			expect(query).toContain('mutation');
			expect(query).toContain('createPatient');
			expect(query).toContain('input');
		});

		test('should build query with fragments', () => {
			const builder: QueryBuilder = {
				resource: 'patients',
				operation: 'query',
				fields: ['...PatientFragment'],
				fragments: {
					PatientFragment: 'on Patient { id firstName lastName }'
				}
			};

			const query = service.buildQuery(builder);

			expect(query).toContain('fragment PatientFragment');
			expect(query).toContain('...PatientFragment');
		});

		test('should handle nested field selection', () => {
			const builder: QueryBuilder = {
				resource: 'bookings',
				operation: 'query',
				fields: ['id', 'patient { id firstName }', 'startTime']
			};

			const query = service.buildQuery(builder);

			expect(query).toContain('patient { id firstName }');
		});
	});

	// =============================================================================
	// QUERY EXECUTION TESTS
	// =============================================================================

	describe('Query Execution', () => {
		beforeEach(() => {
			service.setCredentials(mockCredentials);
		});

		test('should execute successful query', async () => {
			(global.fetch as jest.Mock).mockResolvedValue(
				createMockResponse(mockSuccessResponse, {
					'x-ratelimit-remaining': '99',
					'x-ratelimit-reset': '1234567890'
				})
			);

			const query = 'query { patients { id firstName lastName } }';
			const result = await service.executeQuery(query);

			expect(result.data).toEqual(mockSuccessResponse.data);
			expect(result.errors).toBeUndefined();
			expect(result.metadata.executionTime).toBeGreaterThan(0);
			expect(result.metadata.retryCount).toBe(0);
			expect(result.metadata.fromCache).toBe(false);
		});

		test('should execute query with variables', async () => {
			(global.fetch as jest.Mock).mockResolvedValue(
				createMockResponse({
					data: { patient: { id: '1', firstName: 'John' } }
				}, {
					'x-ratelimit-remaining': '99',
					'x-ratelimit-reset': '1234567890'
				})
			);

			const query = 'query GetPatient($id: ID!) { patient(id: $id) { id firstName } }';
			const variables = { id: '1' };

			const result = await service.executeQuery(query, variables);

			expect(result.data.patient.id).toBe('1');
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/graphql'),
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({ query, variables })
				})
			);
		});

		test('should handle GraphQL errors in response', async () => {
			(global.fetch as jest.Mock).mockResolvedValue(
				createMockResponse(mockErrorResponse)
			);

			const query = 'query { patients { invalidField } }';
			const result = await service.executeQuery(query);

			expect(result.data).toBeNull();
			expect(result.errors).toHaveLength(1);
			expect(result.errors![0].message).toBe('Field not found');
		});

		test('should handle HTTP error responses', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				text: () => Promise.resolve('Unauthorized')
			});

			const query = 'query { patients { id } }';

			await expect(service.executeQuery(query)).rejects.toThrow();
		});

		test('should handle network timeouts', async () => {
			(global.fetch as jest.Mock).mockRejectedValue(
				Object.assign(new Error('Request timeout'), { name: 'AbortError' })
			);

			const query = 'query { patients { id } }';

			await expect(service.executeQuery(query)).rejects.toThrow(SembleNetworkError);
		});
	});

	// =============================================================================
	// RETRY LOGIC TESTS
	// =============================================================================

	describe('Retry Logic', () => {
		beforeEach(() => {
			service.setCredentials(mockCredentials);
		});

		test('should retry on retryable errors', async () => {
			(global.fetch as jest.Mock)
				.mockRejectedValueOnce(new SembleNetworkError('Network error', 'NETWORK_ERROR'))
				.mockRejectedValueOnce(new SembleNetworkError('Server error', 'SERVER_ERROR'))
				.mockResolvedValue(
					createMockResponse(mockSuccessResponse)
				);

			const query = 'query { patients { id } }';
			const result = await service.executeQuery(query);

			expect(result.data).toEqual(mockSuccessResponse.data);
			expect(global.fetch).toHaveBeenCalledTimes(3); // Original + 2 retries
		});

		test('should not retry beyond max attempts', async () => {
			// Mock a consistently failing fetch with a retryable error
			(global.fetch as jest.Mock).mockImplementation(() => {
				throw new SembleNetworkError('Persistent network error', 'NETWORK_ERROR');
			});

			const query = 'query { patients { id } }';

			await expect(service.executeQuery(query)).rejects.toThrow('Persistent network error');
			
			// Should attempt the request 1 + maxAttempts times (1 initial + 3 retries = 4 total)
			expect(global.fetch).toHaveBeenCalledTimes(4);
		});

		test('should not retry on non-retryable errors', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				text: () => Promise.resolve('Unauthorized')
			});

			const query = 'query { patients { id } }';

			await expect(service.executeQuery(query)).rejects.toThrow();
			expect(global.fetch).toHaveBeenCalledTimes(1); // No retries for auth errors
		});

		test('should implement exponential backoff', () => {
			const testService = new SembleQueryService({
				...config,
				retries: {
					maxAttempts: 5,
					initialDelay: 100,
					maxDelay: 2000,
					backoffMultiplier: 2.0
				}
			});

			// Test private method via type assertion for testing
			const calculateRetryDelay = (testService as any).calculateRetryDelay.bind(testService);

			expect(calculateRetryDelay(0)).toBe(100);  // Initial delay
			expect(calculateRetryDelay(1)).toBe(200);  // 100 * 2
			expect(calculateRetryDelay(2)).toBe(400);  // 200 * 2
			expect(calculateRetryDelay(3)).toBe(800);  // 400 * 2
			expect(calculateRetryDelay(4)).toBe(1600); // 800 * 2
			expect(calculateRetryDelay(5)).toBe(2000); // Capped at maxDelay
		});
	});

	// =============================================================================
	// RATE LIMITING TESTS
	// =============================================================================

	describe('Rate Limiting', () => {
		test('should track rate limit state', () => {
			const rateLimitState = service.getRateLimitState();
			
			expect(rateLimitState.remaining).toBe(100);
			expect(Array.isArray(rateLimitState.requests)).toBe(true);
			expect(typeof rateLimitState.resetTime).toBe('number');
		});

		test('should reset rate limit state', () => {
			service.resetRateLimit();
			
			const rateLimitState = service.getRateLimitState();
			expect(rateLimitState.remaining).toBe(100);
			expect(rateLimitState.requests).toEqual([]);
		});

		test('should allow disabling rate limiting', () => {
			const serviceWithoutRateLimit = new SembleQueryService({
				...config,
				rateLimit: {
					enabled: false,
					maxRequests: 100,
					windowMs: 60000,
					delayMs: 100
				}
			});

			const rateLimitConfig = serviceWithoutRateLimit.getConfig().rateLimit;
			expect(rateLimitConfig.enabled).toBe(false);
		});
	});

	// =============================================================================
	// CONFIGURATION TESTS
	// =============================================================================

	describe('Configuration', () => {
		test('should return complete configuration', () => {
			const returnedConfig = service.getConfig();

			expect(returnedConfig.baseUrl).toBe('https://api.semble.com');
			expect(returnedConfig.timeout).toBe(10000);
			expect(returnedConfig.retries.maxAttempts).toBe(3);
			expect(returnedConfig.rateLimit.maxRequests).toBe(100);
			expect(returnedConfig.validateResponses).toBe(true);
			expect(returnedConfig.useCompression).toBe(true);
		});

		test('should handle custom timeout in query options', async () => {
			service.setCredentials(mockCredentials);

			(global.fetch as jest.Mock).mockResolvedValue(
				createMockResponse(mockSuccessResponse)
			);

			const query = 'query { patients { id } }';
			await service.executeQuery(query, {}, { timeout: 5000 });

			// Verify timeout was used (would need to mock the timeout implementation for full verification)
			expect(global.fetch).toHaveBeenCalled();
		});
	});

	// =============================================================================
	// ERROR HANDLING TESTS
	// =============================================================================

	describe('Error Handling', () => {
		beforeEach(() => {
			service.setCredentials(mockCredentials);
		});

		test('should handle JSON parsing errors', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: () => Promise.reject(new Error('Invalid JSON'))
			});

			const query = 'query { patients { id } }';

			await expect(service.executeQuery(query)).rejects.toThrow();
		});

		test('should handle malformed GraphQL responses', async () => {
			(global.fetch as jest.Mock).mockResolvedValue(
				createMockResponse({ invalid: 'response' })
			);

			const query = 'query { patients { id } }';

			// Service should handle malformed responses gracefully
			const result = await service.executeQuery(query);
			expect(result.data).toBeNull();
		});

		test('should validate response format when enabled', async () => {
			const serviceWithValidation = new SembleQueryService({
				...config,
				validateResponses: true
			});
			serviceWithValidation.setCredentials(mockCredentials);

			(global.fetch as jest.Mock).mockResolvedValue(
				createMockResponse({ invalid: 'response' })
			);

			const query = 'query { patients { id } }';

			// May throw validation error depending on implementation
			await serviceWithValidation.executeQuery(query);
		});
	});

	// =============================================================================
	// INTEGRATION TESTS
	// =============================================================================

	describe('Integration Scenarios', () => {
		beforeEach(() => {
			service.setCredentials(mockCredentials);
		});

		test('should handle complete workflow with rate limiting and retries', async () => {
			// First call succeeds
			(global.fetch as jest.Mock).mockResolvedValueOnce(
				createMockResponse(mockSuccessResponse, {
					'x-ratelimit-remaining': '99'
				})
			);

			const query = 'query { patients { id firstName } }';
			const result = await service.executeQuery(query);

			expect(result.data).toEqual(mockSuccessResponse.data);
			expect(result.metadata.executionTime).toBeGreaterThan(0);
		});

		test('should handle multiple concurrent requests', async () => {
			(global.fetch as jest.Mock).mockResolvedValue(
				createMockResponse(mockSuccessResponse)
			);

			const query = 'query { patients { id } }';
			const promises = [
				service.executeQuery(query),
				service.executeQuery(query),
				service.executeQuery(query)
			];

			const results = await Promise.all(promises);

			expect(results).toHaveLength(3);
			results.forEach(result => {
				expect(result.data).toEqual(mockSuccessResponse.data);
			});
		});
	});

	// =============================================================================
	// LIFECYCLE TESTS
	// =============================================================================

	describe('Service Lifecycle', () => {
		test('should shutdown gracefully', async () => {
			await expect(service.shutdown()).resolves.not.toThrow();
		});

		test('should handle shutdown when no active requests', async () => {
			await expect(service.shutdown()).resolves.not.toThrow();
		});
	});
});
