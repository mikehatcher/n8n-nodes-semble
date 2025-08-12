/**
 * @fileoverview Semble GraphQL Query Service
 * @description Handles GraphQL query building, execution, response parsing, rate limiting, and retry logic
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Services.Query
 */

import { SEMBLE_CONSTANTS } from '../core/Constants';
import { mapError } from '../core/ErrorMapper';
import { 
	SembleAPIError, 
	SembleNetworkError, 
	SembleAuthError,
	SembleValidationError 
} from '../core/SembleError';
import { 
	GraphQLQuery, 
	GraphQLResponse, 
	GraphQLError,
	SembleCredentials,
	QueryOptions,
	RateLimitState,
	RetryOptions
} from '../types/SembleTypes';
import { BaseServiceConfig } from '../types/ConfigTypes';

// =============================================================================
// INTERFACES AND TYPES
// =============================================================================

/**
 * Result interface for GraphQL query execution with comprehensive metadata
 * 
 * Provides structured results from GraphQL query execution including data,
 * errors, and detailed execution metadata for monitoring and debugging.
 * 
 * @example
 * ```typescript
 * const result: QueryResult<Patient[]> = await queryService.executeQuery(query);
 * 
 * if (result.data) {
 *   console.log('Patients:', result.data);
 *   console.log('Execution time:', result.metadata.executionTime, 'ms');
 *   console.log('Rate limit remaining:', result.metadata.rateLimitRemaining);
 * }
 * 
 * if (result.errors) {
 *   console.error('GraphQL errors:', result.errors);
 * }
 * ```
 * 
 * @template T - The expected type of the query result data
 * @interface QueryResult
 * @since 2.0.0
 */
export interface QueryResult<T = any> {
	/** The query result data, null if errors occurred */
	data: T | null;
	/** Array of GraphQL errors if any occurred */
	errors?: GraphQLError[];
	/** Additional metadata from the GraphQL response */
	extensions?: any;
	/** Execution metadata for monitoring and debugging */
	metadata: {
		/** Total execution time in milliseconds */
		executionTime: number;
		/** Number of retry attempts made */
		retryCount: number;
		/** Whether the result was served from cache */
		fromCache: boolean;
		/** Remaining API requests in current rate limit window */
		rateLimitRemaining?: number;
		/** Timestamp when rate limit window resets */
		rateLimitReset?: number;
	};
}

/**
 * Interface for building structured GraphQL queries programmatically
 * 
 * Provides a structured way to construct GraphQL queries with support for
 * fragments, directives, variables, and different operation types.
 * 
 * @example
 * ```typescript
 * const queryBuilder: QueryBuilder = {
 *   resource: 'patients',
 *   operation: 'query',
 *   fields: ['id', 'firstName', 'lastName', 'dateOfBirth'],
 *   variables: {
 *     limit: 20,
 *     offset: 0
 *   },
 *   fragments: {
 *     PatientInfo: 'on Patient { contactDetails { email phone } }'
 *   },
 *   directives: {
 *     include: { if: '$includeDetails' }
 *   }
 * };
 * 
 * const query = queryService.buildQuery(queryBuilder);
 * ```
 * 
 * @interface QueryBuilder
 * @since 2.0.0
 */
export interface QueryBuilder {
	/** The GraphQL resource/type to query (e.g., 'patients', 'bookings') */
	resource: string;
	/** The type of GraphQL operation to perform */
	operation: 'query' | 'mutation' | 'subscription';
	/** Array of field names to include in the query */
	fields: string[];
	/** Optional variables to pass to the query */
	variables?: Record<string, any>;
	/** Optional GraphQL fragments to include */
	fragments?: Record<string, string>;
	/** Optional GraphQL directives to apply */
	directives?: Record<string, any>;
}

/**
 * Configuration interface for API rate limiting behavior
 * 
 * Defines parameters for controlling the rate of API requests to respect
 * Semble API limits and prevent throttling or blocking.
 * 
 * @example
 * ```typescript
 * const rateLimitConfig: RateLimitConfig = {
 *   maxRequests: 120,        // 120 requests per window
 *   windowMs: 60000,         // 1 minute window
 *   delayMs: 500,            // 500ms delay between requests
 *   enabled: true            // Enable rate limiting
 * };
 * ```
 * 
 * @interface RateLimitConfig
 * @since 2.0.0
 */
export interface RateLimitConfig {
	/** Maximum number of requests allowed per time window */
	maxRequests: number;
	/** Time window duration in milliseconds */
	windowMs: number;
	/** Minimum delay between requests in milliseconds */
	delayMs: number;
	/** Whether rate limiting is enabled */
	enabled: boolean;
}

/**
 * Service configuration for SembleQueryService
 */
export interface SembleQueryConfig extends BaseServiceConfig {
	baseUrl: string;
	timeout?: number;
	retries?: Partial<RetryOptions>;
	rateLimit?: Partial<RateLimitConfig>;
	validateResponses?: boolean;
	useCompression?: boolean;
}

/**
 * Internal resolved configuration with all required fields
 */
interface ResolvedSembleQueryConfig extends BaseServiceConfig {
	baseUrl: string;
	timeout: number;
	retries: RetryOptions;
	rateLimit: RateLimitConfig;
	validateResponses: boolean;
	useCompression: boolean;
}

// =============================================================================
// SEMBLE QUERY SERVICE
// =============================================================================

/**
 * Service for executing GraphQL queries against the Semble API
 * Provides query building, execution, response parsing, rate limiting, and retry logic
 */
export class SembleQueryService {
	private config: ResolvedSembleQueryConfig;
	private credentials: SembleCredentials | null = null;
	private rateLimitState: RateLimitState;

	constructor(config: SembleQueryConfig) {
		// Set defaults first, then override with config
		const defaultRetries: RetryOptions = {
			maxAttempts: SEMBLE_CONSTANTS.RETRY.MAX_RETRIES,
			initialDelay: SEMBLE_CONSTANTS.RETRY.INITIAL_DELAY,
			maxDelay: SEMBLE_CONSTANTS.RETRY.MAX_DELAY,
			backoffMultiplier: SEMBLE_CONSTANTS.RETRY.BACKOFF_MULTIPLIER,
			retryableErrors: [...SEMBLE_CONSTANTS.RETRY.RETRYABLE_ERROR_TYPES]
		};

		const defaultRateLimit: RateLimitConfig = {
			maxRequests: 100,
			windowMs: 60000, // 1 minute
			delayMs: 100,
			enabled: true
		};

		this.config = {
			...config,
			timeout: config.timeout || SEMBLE_CONSTANTS.TIMEOUTS.REQUEST_TIMEOUT,
			retries: { ...defaultRetries, ...config.retries },
			rateLimit: { ...defaultRateLimit, ...config.rateLimit },
			validateResponses: config.validateResponses !== undefined ? config.validateResponses : true,
			useCompression: config.useCompression !== undefined ? config.useCompression : true
		};

		this.rateLimitState = {
			requests: [],
			remaining: this.config.rateLimit.maxRequests,
			resetTime: Date.now() + this.config.rateLimit.windowMs
		};
	}

	// =============================================================================
	// CREDENTIALS MANAGEMENT
	// =============================================================================

	/**
	 * Set authentication credentials for Semble API access
	 * 
	 * Configures the service with the necessary credentials for authenticating
	 * with the Semble API. Credentials must be set before executing any queries.
	 * 
	 * @example
	 * ```typescript
	 * const queryService = new SembleQueryService(config);
	 * 
	 * queryService.setCredentials({
	 *   token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
	 *   baseUrl: 'https://api.semble.io/graphql',
	 *   organizationId: 'org_123456',
	 *   environment: 'production'
	 * });
	 * 
	 * // Now ready to execute queries
	 * const result = await queryService.executeQuery(query);
	 * ```
	 * 
	 * @param credentials - The Semble API credentials object
	 * @since 2.0.0
	 */
	setCredentials(credentials: SembleCredentials): void {
		this.credentials = credentials;
	}

	/**
	 * Get the currently configured credentials
	 * 
	 * Returns the credentials object that was set via setCredentials().
	 * Used for debugging and credential validation.
	 * 
	 * @example
	 * ```typescript
	 * const queryService = new SembleQueryService(config);
	 * queryService.setCredentials({ token: 'abc123', baseUrl: 'https://api.semble.io' });
	 * const creds = queryService.getCredentials();
	 * console.log('Base URL:', creds?.baseUrl);
	 * ```
	 * 
	 * @returns Current credentials object or null if none set
	 * @since 2.0.0
	 */
	getCredentials(): SembleCredentials | null {
		return this.credentials;
	}

	/**
	 * Validate that credentials are properly configured
	 * 
	 * Internal method that ensures credentials are set and contain
	 * required authentication information before making API calls.
	 * 
	 * @throws {SembleAuthError} When credentials are missing or invalid
	 * @internal
	 * @since 2.0.0
	 */
	private validateCredentials(): void {
		if (!this.credentials) {
			throw new SembleAuthError(
				'No credentials provided',
				'MISSING_CREDENTIALS',
				'unknown',
				'Please provide valid API credentials'
			);
		}

		if (!this.credentials.token && !this.credentials.apiKey) {
			throw new SembleAuthError(
				'Invalid credentials: missing token or API key',
				'INVALID_CREDENTIALS',
				'token',
				'Either token or API key must be provided'
			);
		}
	}

	// =============================================================================
	// QUERY BUILDING
	// =============================================================================

	/**
	 * Build a GraphQL query string from a query builder configuration
	 * 
	 * Constructs a complete GraphQL query including fragments, directives,
	 * and proper variable handling. Supports complex query structures.
	 * 
	 * @example
	 * ```typescript
	 * const queryService = new SembleQueryService(config);
	 * 
	 * const builder: QueryBuilder = {
	 *   resource: 'patients',
	 *   operation: 'query',
	 *   fields: ['id', 'firstName', 'lastName'],
	 *   variables: { limit: 10 }
	 * };
	 * 
	 * const query = queryService.buildQuery(builder);
	 * // Result: "query($limit: Int) { patients(limit: $limit) { id firstName lastName } }"
	 * ```
	 * 
	 * @param builder - Query builder configuration object
	 * @returns Complete GraphQL query string
	 * @throws {SembleValidationError} When builder configuration is invalid
	 * @since 2.0.0
	 */
	buildQuery(builder: QueryBuilder): string {
		try {
			const { resource, operation, fields, variables, fragments, directives } = builder;

			// Build fragments section
			const fragmentsSection = fragments 
				? Object.entries(fragments)
					.map(([name, definition]) => `fragment ${name} ${definition}`)
					.join('\n')
				: '';

			// Build directives
			const directivesStr = directives
				? Object.entries(directives)
					.map(([name, value]) => `@${name}${value ? `(${JSON.stringify(value)})` : ''}`)
					.join(' ')
				: '';

			// Build variables section
			const variablesSection = variables && Object.keys(variables).length > 0
				? `(${Object.keys(variables).map(key => `$${key}: ${this.inferGraphQLType(variables[key])}`).join(', ')})`
				: '';

			// Build fields selection
			const fieldsSelection = this.buildFieldsSelection(fields);

			// Construct the query
			const queryBody = `${operation}${variablesSection} {
				${resource}${directivesStr} {
					${fieldsSelection}
				}
			}`;

			return fragmentsSection ? `${fragmentsSection}\n${queryBody}` : queryBody;

		} catch (error) {
			throw mapError(error, {
				operation: 'query_building',
				resource: builder.resource
			});
		}
	}

	/**
	 * Build fields selection string for GraphQL query
	 */
	private buildFieldsSelection(fields: string[]): string {
		return fields.map(field => {
			// Handle nested field syntax (e.g., "user { id name }")
			if (field.includes('{')) {
				return field;
			}
			// Simple field
			return field;
		}).join('\n\t\t');
	}

	/**
	 * Infer GraphQL type from JavaScript value
	 */
	private inferGraphQLType(value: any): string {
		if (typeof value === 'string') return 'String';
		if (typeof value === 'number') return Number.isInteger(value) ? 'Int' : 'Float';
		if (typeof value === 'boolean') return 'Boolean';
		if (Array.isArray(value)) return `[${this.inferGraphQLType(value[0])}]`;
		return 'JSON'; // Fallback for complex objects
	}

	// =============================================================================
	// QUERY EXECUTION
	// =============================================================================

	/**
	 * Execute a GraphQL query with comprehensive error handling and retry logic
	 * 
	 * This is the main method for executing GraphQL queries against the Semble API.
	 * Includes automatic retry logic, rate limiting, response validation, and
	 * detailed error reporting.
	 * 
	 * @example
	 * ```typescript
	 * const queryService = new SembleQueryService(config);
	 * queryService.setCredentials(credentials);
	 * 
	 * const result = await queryService.executeQuery<Patient[]>(
	 *   `query GetPatients($limit: Int) {
	 *     patients(limit: $limit) {
	 *       data { id firstName lastName }
	 *       pageInfo { hasNextPage }
	 *     }
	 *   }`,
	 *   { limit: 10 },
	 *   { timeout: 30000 }
	 * );
	 * 
	 * console.log('Patients:', result.data);
	 * ```
	 * 
	 * @param query - The GraphQL query string
	 * @param variables - Optional variables for the query
	 * @param options - Query execution options (timeout, retry settings, etc.)
	 * @returns Promise resolving to query result with data and metadata
	 * @throws {SembleAuthError} When authentication fails
	 * @throws {SembleValidationError} When query validation fails
	 * @throws {SembleRateLimitError} When rate limits are exceeded
	 * @throws {SembleError} For other API errors
	 * @since 2.0.0
	 */
	async executeQuery<T = any>(
		query: string, 
		variables?: Record<string, any>, 
		options: QueryOptions = {}
	): Promise<QueryResult<T>> {
		const startTime = Date.now();
		const retryCount = 0;
		
		try {
			// Validate credentials
			this.validateCredentials();

			// Apply rate limiting
			await this.applyRateLimit();

			// Execute with retries
			const result = await this.executeWithRetry<T>(query, variables, options, retryCount);

			return {
				...result,
				metadata: {
					...result.metadata,
					executionTime: Date.now() - startTime,
					retryCount
				}
			};

		} catch (error) {
			throw mapError(error, {
				operation: 'query_execution'
			});
		}
	}

	/**
	 * Execute query with retry logic
	 */
	private async executeWithRetry<T>(
		query: string,
		variables?: Record<string, any>,
		options: QueryOptions = {},
		retryCount = 0
	): Promise<QueryResult<T>> {
		try {
			return await this.performRequest<T>(query, variables, options);
		} catch (error) {
			// Check if error is retryable and we haven't exceeded max attempts
			if (this.isRetryableError(error) && retryCount < this.config.retries.maxAttempts) {
				const delay = this.calculateRetryDelay(retryCount);
				await this.sleep(delay);
				return this.executeWithRetry(query, variables, options, retryCount + 1);
			}
			throw error;
		}
	}

	/**
	 * Perform the actual HTTP request
	 */
	private async performRequest<T>(
		query: string,
		variables?: Record<string, any>,
		options: QueryOptions = {}
	): Promise<QueryResult<T>> {
		try {
			const url = `${this.config.baseUrl}${SEMBLE_CONSTANTS.API.ENDPOINTS.GRAPHQL}`;
			const headers = this.buildRequestHeaders();
			const body = JSON.stringify({ query, variables });

			const response = await this.fetchWithTimeout(url, {
				method: 'POST',
				headers,
				body,
				timeout: options.timeout || this.config.timeout
			});

			// Check response status
			if (!response.ok) {
				await this.handleErrorResponse(response);
			}

			// Parse response
			const result = await response.json() as GraphQLResponse<T>;

			// Validate response
			if (this.config.validateResponses) {
				this.validateResponse(result);
			}

			// Extract rate limit headers
			const rateLimitRemaining = this.extractRateLimitInfo(response);

			return {
				data: result.data || null,
				errors: result.errors,
				extensions: result.extensions,
				metadata: {
					executionTime: 0, // Will be set by caller
					retryCount: 0, // Will be set by caller
					fromCache: false,
					...rateLimitRemaining
				}
			};

		} catch (error) {
			if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
				throw new SembleNetworkError(
					'Request timed out',
					'TIMEOUT'
				);
			}
			throw error;
		}
	}

	/**
	 * Build HTTP headers for request
	 */
	private buildRequestHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': SEMBLE_CONSTANTS.API.HEADERS.CONTENT_TYPE,
			'Accept': SEMBLE_CONSTANTS.API.HEADERS.ACCEPT,
			'User-Agent': SEMBLE_CONSTANTS.API.HEADERS.USER_AGENT
		};

		// Add authentication
		if (this.credentials?.token) {
			headers['Authorization'] = `${SEMBLE_CONSTANTS.API.HEADERS.AUTHORIZATION_PREFIX}${this.credentials.token}`;
		}

		if (this.credentials?.apiKey) {
			headers[SEMBLE_CONSTANTS.API.HEADERS.API_KEY_HEADER] = this.credentials.apiKey;
		}

		// Add compression if enabled
		if (this.config.useCompression) {
			headers['Accept-Encoding'] = 'gzip, deflate';
		}

		return headers;
	}

	/**
	 * Fetch with timeout support
	 */
	private async fetchWithTimeout(url: string, options: any): Promise<Response> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), options.timeout);

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal
			});
			return response;
		} finally {
			clearTimeout(timeoutId);
		}
	}

	// =============================================================================
	// RATE LIMITING
	// =============================================================================

	/**
	 * Apply rate limiting to requests
	 */
	private async applyRateLimit(): Promise<void> {
		if (!this.config.rateLimit.enabled) {
			return;
		}

		const now = Date.now();

		// Reset window if needed
		if (now >= this.rateLimitState.resetTime) {
			this.rateLimitState.requests = [];
			this.rateLimitState.remaining = this.config.rateLimit.maxRequests;
			this.rateLimitState.resetTime = now + this.config.rateLimit.windowMs;
		}

		// Remove old requests outside the window
		this.rateLimitState.requests = this.rateLimitState.requests.filter(
			time => now - time < this.config.rateLimit.windowMs
		);

		// Check if we're at the limit
		if (this.rateLimitState.requests.length >= this.config.rateLimit.maxRequests) {
			const oldestRequest = Math.min(...this.rateLimitState.requests);
			const waitTime = this.config.rateLimit.windowMs - (now - oldestRequest);
			
			// Use generic API error for rate limiting since we don't have a specific rate limit error
			throw new SembleAPIError(
				'Rate limit exceeded',
				'RATE_LIMIT_EXCEEDED'
			);
		}

		// Add current request
		this.rateLimitState.requests.push(now);
		this.rateLimitState.remaining = this.config.rateLimit.maxRequests - this.rateLimitState.requests.length;

		// Add delay between requests if configured
		if (this.config.rateLimit.delayMs > 0) {
			await this.sleep(this.config.rateLimit.delayMs);
		}
	}

	// =============================================================================
	// ERROR HANDLING
	// =============================================================================

	/**
	 * Handle error responses from the API
	 */
	private async handleErrorResponse(response: Response): Promise<never> {
		const status = response.status;
		let errorData: any = {};

		try {
			errorData = await response.json();
		} catch {
			// If we can't parse JSON, use the status text
			errorData = { message: response.statusText };
		}

		switch (status) {
			case SEMBLE_CONSTANTS.API.STATUS_CODES.UNAUTHORIZED:
				throw new SembleAuthError(
					errorData.message || 'Authentication failed',
					'UNAUTHORIZED',
					'token',
					'Please check your API credentials'
				);

			case SEMBLE_CONSTANTS.API.STATUS_CODES.FORBIDDEN:
				throw new SembleAuthError(
					errorData.message || 'Access forbidden',
					'FORBIDDEN',
					'permission',
					'You do not have permission to access this resource'
				);

			case SEMBLE_CONSTANTS.API.STATUS_CODES.NOT_FOUND:
				throw new SembleAPIError(
					errorData.message || 'Resource not found',
					'NOT_FOUND',
					status
				);

			case SEMBLE_CONSTANTS.API.STATUS_CODES.UNPROCESSABLE_ENTITY:
				throw new SembleValidationError(
					errorData.message || 'Validation failed',
					'request',
					errorData,
					errorData.errors || ['Invalid request data']
				);

			case SEMBLE_CONSTANTS.API.STATUS_CODES.TOO_MANY_REQUESTS:
				throw new SembleAPIError(
					errorData.message || 'Rate limit exceeded',
					'RATE_LIMIT_EXCEEDED',
					status
				);

			default:
				if (status >= 500) {
					throw new SembleNetworkError(
						errorData.message || 'Server error',
						'SERVER_ERROR'
					);
				}

				throw new SembleAPIError(
					errorData.message || 'API request failed',
					'API_ERROR',
					status
				);
		}
	}

	/**
	 * Validate GraphQL response structure
	 */
	private validateResponse<T>(result: GraphQLResponse<T>): void {
		if (!result || typeof result !== 'object') {
			throw new SembleValidationError(
				'Invalid response format',
				'response',
				result,
				['Expected object with data and/or errors properties']
			);
		}

		if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
			// GraphQL errors are not necessarily fatal, but we should check for critical ones
			const criticalErrors = result.errors.filter(error => 
				error.extensions?.code === 'UNAUTHENTICATED' ||
				error.extensions?.code === 'FORBIDDEN'
			);

			if (criticalErrors.length > 0) {
				throw new SembleAuthError(
					criticalErrors[0].message,
					criticalErrors[0].extensions?.code || 'GRAPHQL_ERROR',
					'token',
					'GraphQL authentication error'
				);
			}
		}
	}

	/**
	 * Check if an error is retryable
	 */
	private isRetryableError(error: any): boolean {
		if (error instanceof SembleNetworkError) {
			return this.config.retries.retryableErrors.includes(error.code);
		}

		if (error instanceof SembleAPIError) {
			return this.config.retries.retryableErrors.includes(error.code);
		}

		// Network-level errors are generally retryable
		if (error instanceof Error && error.name === 'TypeError' && error.message.includes('fetch')) {
			return true;
		}

		return false;
	}

	/**
	 * Calculate retry delay with exponential backoff
	 */
	private calculateRetryDelay(retryCount: number): number {
		const delay = this.config.retries.initialDelay * 
			Math.pow(this.config.retries.backoffMultiplier, retryCount);
		return Math.min(delay, this.config.retries.maxDelay);
	}

	/**
	 * Extract rate limit information from response headers
	 */
	private extractRateLimitInfo(response: Response): { rateLimitRemaining?: number; rateLimitReset?: number } {
		const remaining = response.headers.get('X-RateLimit-Remaining');
		const reset = response.headers.get('X-RateLimit-Reset');

		return {
			rateLimitRemaining: remaining ? parseInt(remaining) : undefined,
			rateLimitReset: reset ? parseInt(reset) : undefined
		};
	}

	// =============================================================================
	// UTILITY METHODS
	// =============================================================================

	/**
	 * Sleep for specified milliseconds
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Get service configuration
	 */
	getConfig(): ResolvedSembleQueryConfig {
		return { ...this.config };
	}

	/**
	 * Get current rate limit state
	 */
	getRateLimitState(): RateLimitState {
		return { ...this.rateLimitState };
	}

	/**
	 * Reset rate limit state (useful for testing)
	 */
	resetRateLimit(): void {
		this.rateLimitState = {
			requests: [],
			remaining: this.config.rateLimit.maxRequests,
			resetTime: Date.now() + this.config.rateLimit.windowMs
		};
	}

	/**
	 * Shutdown the service and cleanup resources
	 */
	async shutdown(): Promise<void> {
		// Reset state
		this.credentials = null;
		this.resetRateLimit();
	}
}
