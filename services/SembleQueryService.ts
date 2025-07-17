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
 * Query execution result with metadata
 */
export interface QueryResult<T = any> {
	data: T | null;
	errors?: GraphQLError[];
	extensions?: any;
	metadata: {
		executionTime: number;
		retryCount: number;
		fromCache: boolean;
		rateLimitRemaining?: number;
		rateLimitReset?: number;
	};
}

/**
 * Query builder interface for constructing GraphQL queries
 */
export interface QueryBuilder {
	resource: string;
	operation: 'query' | 'mutation' | 'subscription';
	fields: string[];
	variables?: Record<string, any>;
	fragments?: Record<string, string>;
	directives?: Record<string, any>;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
	maxRequests: number;
	windowMs: number;
	delayMs: number;
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
	 * Set credentials for API authentication
	 */
	setCredentials(credentials: SembleCredentials): void {
		this.credentials = credentials;
	}

	/**
	 * Get current credentials
	 */
	getCredentials(): SembleCredentials | null {
		return this.credentials;
	}

	/**
	 * Validate that credentials are set and valid
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
	 * Build a GraphQL query string from a query builder
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
	 * Execute a GraphQL query with retry logic and rate limiting
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
