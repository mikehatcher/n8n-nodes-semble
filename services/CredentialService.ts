/**
 * @fileoverview Credential validation and management service for Semble API integration
 * @description Provides credential validation, format checking, environment safety, and API connectivity testing
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Services
 * @since 2.0.0
 */

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { SembleCredentials } from '../types/NodeTypes';
import { ConfigFactory } from '../core/BaseConfig';
import { SEMBLE_CONSTANTS } from '../core/Constants';
import { SembleAPIError, SembleValidationError } from '../core/SembleError';
import { ErrorMapper } from '../core/ErrorMapper';

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Extended credentials interface with environment and safety features
 * 
 * Extends the base SembleCredentials with additional properties needed
 * for environment management, safety checks, and production safeguards.
 * 
 * @example
 * ```typescript
 * const credentials: ExtendedSembleCredentials = {
 *   environment: 'production',
 *   apiToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   baseUrl: 'https://api.semble.io/graphql',
 *   safetyMode: false,
 *   productionConfirmed: true,
 *   // Base interface properties
 *   token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   organizationId: 'org_123456'
 * };
 * ```
 * 
 * @interface ExtendedSembleCredentials
 * @extends {SembleCredentials}
 * @since 2.0.0
 */
export interface ExtendedSembleCredentials extends SembleCredentials {
	/** Target environment for API connections */
	environment: 'production' | 'staging' | 'development';
	/** API authentication token from credential form */
	apiToken: string;
	/** Complete GraphQL endpoint URL */
	baseUrl: string;
	/** Safety mode flag to prevent destructive operations in non-production */
	safetyMode?: boolean;
	/** Explicit confirmation for production environment usage */
	productionConfirmed?: boolean;
}

/**
 * Result interface for credential validation operations
 * 
 * Provides comprehensive feedback about credential validation including
 * validity status, detailed error messages, warnings, and environment-specific
 * recommendations for optimal configuration.
 * 
 * @example
 * ```typescript
 * const validation: CredentialValidationResult = {
 *   isValid: false,
 *   errors: ['Invalid API token format'],
 *   warnings: ['Using development environment'],
 *   recommendations: [
 *     'Ensure API token has sufficient permissions',
 *     'Consider enabling safety mode for non-production'
 *   ]
 * };
 * ```
 * 
 * @interface CredentialValidationResult
 * @since 2.0.0
 */
export interface CredentialValidationResult {
	/** Whether the credentials passed all validation checks */
	isValid: boolean;
	/** Array of validation error messages */
	errors: string[];
	/** Array of non-critical warning messages */
	warnings: string[];
	/** Array of environment-specific configuration recommendations */
	recommendations: string[];
}

/**
 * API connection test result
 */
export interface ConnectionTestResult {
	/** Whether connection was successful */
	success: boolean;
	/** Response time in milliseconds */
	responseTime?: number;
	/** Error message if connection failed */
	error?: string;
	/** API endpoint that was tested */
	endpoint: string;
	/** Environment that was tested */
	environment: string;
	/** Permission level detected */
	permissionLevel?: 'read' | 'write' | 'admin';
}

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
	/** Environment name */
	name: string;
	/** Default GraphQL endpoint */
	defaultEndpoint: string;
	/** Whether safety mode is required */
	requiresSafetyMode: boolean;
	/** Whether production confirmation is required */
	requiresConfirmation: boolean;
	/** Rate limiting configuration (prepared for future implementation) */
	rateLimiting: {
		enabled: boolean;
		requestsPerMinute: number;
		burstLimit: number;
	};
}

// =============================================================================
// CREDENTIAL SERVICE CLASS
// =============================================================================

/**
 * Service for managing and validating Semble API credentials
 * @class CredentialService
 * @description Handles credential validation, format checking, and API connectivity testing
 */
export class CredentialService {
	/**
	 * Environment configurations for different Semble environments
	 * @private
	 * @static
	 */
	private static readonly ENVIRONMENT_CONFIGS: Record<string, EnvironmentConfig> = {
		production: {
			name: 'Production',
			defaultEndpoint: 'https://open.semble.io/graphql',
			requiresSafetyMode: false,
			requiresConfirmation: true,
			rateLimiting: {
				enabled: true,
				requestsPerMinute: 120,
				burstLimit: 10,
			},
		},
		staging: {
			name: 'Staging',
			defaultEndpoint: 'https://staging.semble.io/graphql',
			requiresSafetyMode: true,
			requiresConfirmation: false,
			rateLimiting: {
				enabled: true,
				requestsPerMinute: 240,
				burstLimit: 20,
			},
		},
		development: {
			name: 'Development',
			defaultEndpoint: 'https://dev.semble.io/graphql',
			requiresSafetyMode: true,
			requiresConfirmation: false,
			rateLimiting: {
				enabled: false,
				requestsPerMinute: 480,
				burstLimit: 50,
			},
		},
	};

	/**
	 * Get validated credentials from n8n's credential system
	 * @param executeFunctions - n8n execution context
	 * @returns Promise resolving to validated credentials
	 * @throws {ValidationError} When credentials are invalid or missing
	 */
	public async getCredentials(
		executeFunctions: IExecuteFunctions | ILoadOptionsFunctions,
	): Promise<ExtendedSembleCredentials> {
		try {
			// Get credentials from n8n
			const credentials = await executeFunctions.getCredentials('sembleApi');
			
			if (!credentials) {
				throw new SembleValidationError('No Semble API credentials configured');
			}

			// Map to our extended interface
			const mappedCredentials: ExtendedSembleCredentials = {
				server: credentials.baseUrl as string,
				token: credentials.apiToken as string,
				environment: credentials.environment as 'production' | 'staging' | 'development',
				apiToken: credentials.apiToken as string,
				baseUrl: credentials.baseUrl as string,
				safetyMode: credentials.safetyMode as boolean,
				productionConfirmed: credentials.productionConfirmed as boolean,
			};

			// Validate credential format
			const validationResult = this.validateCredentialFormat(mappedCredentials);
			if (!validationResult.isValid) {
				throw new SembleValidationError(
					`Invalid credentials: ${validationResult.errors.join(', ')}`,
				);
			}

			return mappedCredentials;
		} catch (error) {
			if (error instanceof SembleValidationError) {
				throw error;
			}
			throw new SembleAPIError(
				'Failed to retrieve credentials',
				'CREDENTIAL_RETRIEVAL_ERROR',
				undefined,
				{ 
					operation: 'getCredentials',
					metadata: { originalError: error },
				},
			);
		}
	}

	/**
	 * Validate credential format and structure
	 * @param credentials - Credentials to validate
	 * @returns Validation result with errors and recommendations
	 */
	public validateCredentialFormat(
		credentials: ExtendedSembleCredentials,
	): CredentialValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];
		const recommendations: string[] = [];

		// Validate required fields
		if (!credentials.apiToken?.trim()) {
			errors.push('API token is required');
		}

		if (!credentials.baseUrl?.trim()) {
			errors.push('GraphQL endpoint URL is required');
		}

		if (!credentials.environment) {
			errors.push('Environment selection is required');
		}

		// Validate API token format (JWT-like structure)
		if (credentials.apiToken && !this.isValidTokenFormat(credentials.apiToken)) {
			warnings.push('API token does not appear to be in valid JWT format');
		}

		// Validate URL format
		if (credentials.baseUrl && !this.isValidUrl(credentials.baseUrl)) {
			errors.push('GraphQL endpoint URL is not valid');
		}

		// Environment-specific validation
		if (credentials.environment) {
			const envConfig = this.getEnvironmentConfig(credentials.environment);
			
			// Production environment checks
			if (credentials.environment === 'production') {
				if (!credentials.productionConfirmed) {
					errors.push('Production environment requires explicit confirmation');
				}
				recommendations.push('⚠️ Using PRODUCTION environment - all operations affect live data');
			}

			// Non-production safety checks
			if (envConfig.requiresSafetyMode && !credentials.safetyMode) {
				warnings.push(`Safety mode recommended for ${envConfig.name} environment`);
			}

			// Endpoint validation against environment
			if (credentials.baseUrl && credentials.baseUrl !== envConfig.defaultEndpoint) {
				warnings.push(
					`Custom endpoint detected. Expected: ${envConfig.defaultEndpoint}`,
				);
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			recommendations,
		};
	}

	/**
	 * Test API connectivity and detect permission levels
	 * @param credentials - Credentials to test
	 * @returns Promise resolving to connection test result
	 */
	public async testConnection(
		credentials: ExtendedSembleCredentials,
	): Promise<ConnectionTestResult> {
		const startTime = Date.now();
		
		try {
			// Prepare the connection test (this is where future rate limiting will be integrated)
			const testQuery = {
				query: 'query TestConnection { __schema { types { name } } }',
			};

			// This is a placeholder for the actual HTTP request
			// This will be replaced with the actual SembleQueryService
			const response = await this.performConnectionTest(credentials, testQuery);
			
			const responseTime = Date.now() - startTime;

			// TODO: Add permission level detection based on introspection results
			// This will be implemented with PermissionCheckService

			return {
				success: true,
				responseTime,
				endpoint: credentials.baseUrl,
				environment: credentials.environment,
				permissionLevel: 'read', // Placeholder - will be properly detected later
			};
		} catch (error) {
			const responseTime = Date.now() - startTime;
			
			return {
				success: false,
				responseTime,
				endpoint: credentials.baseUrl,
				environment: credentials.environment,
				error: new ErrorMapper().mapError(error).message,
			};
		}
	}

	/**
	 * Get environment-specific configuration
	 * @param environment - Environment name
	 * @returns Environment configuration
	 * @throws {ValidationError} When environment is not recognised
	 */
	public getEnvironmentConfig(environment: string): EnvironmentConfig {
		const config = CredentialService.ENVIRONMENT_CONFIGS[environment];
		if (!config) {
			throw new SembleValidationError(`Unsupported environment: ${environment}`);
		}
		return config;
	}

	/**
	 * Get list of supported environments
	 * @returns Array of environment names
	 */
	public getSupportedEnvironments(): string[] {
		return Object.keys(CredentialService.ENVIRONMENT_CONFIGS);
	}

	// =============================================================================
	// PRIVATE HELPER METHODS
	// =============================================================================

	/**
	 * Validate API token format (basic JWT structure check)
	 * @param token - Token to validate
	 * @returns True if token appears to be valid JWT format
	 * @private
	 */
	private isValidTokenFormat(token: string): boolean {
		// Basic JWT format: three base64 segments separated by dots
		const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
		return jwtPattern.test(token.trim());
	}

	/**
	 * Validate URL format
	 * @param url - URL to validate
	 * @returns True if URL is valid
	 * @private
	 */
	private isValidUrl(url: string): boolean {
		try {
			const urlObj = new URL(url);
			return urlObj.protocol === 'https:' && urlObj.pathname.includes('graphql');
		} catch {
			return false;
		}
	}

	/**
	 * Perform actual connection test (placeholder for future integration)
	 * @param credentials - Credentials to use
	 * @param query - GraphQL query to execute
	 * @returns Promise resolving to API response
	 * @private
	 * @todo Replace with SembleQueryService in future version
	 */
	private async performConnectionTest(
		credentials: ExtendedSembleCredentials,
		query: object,
	): Promise<any> {
		// This is a placeholder implementation
		// In the future, this will be replaced with:
		// return await this.sembleQueryService.executeQuery(credentials, query);
		
		// For now, simulate a successful connection test
		// This allows the service to be tested without requiring actual API calls
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve({
					data: {
						__schema: {
							types: [{ name: 'Patient' }, { name: 'Booking' }],
						},
					},
				});
			}, 100); // Simulate network delay
		});
	}
}
