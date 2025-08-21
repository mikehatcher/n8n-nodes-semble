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
import { SembleAPIError, SembleValidationError } from '../core/SembleError';

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Result interface for credential validation operations
 * 
 * Provides comprehensive feedback about credential validation including
 * validity status, detailed error messages, warnings, and configuration
 * recommendations for optimal setup.

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
	/** Array of configuration recommendations */
	recommendations: string[];
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
	 * Get validated credentials from n8n's credential system
	 * @param executeFunctions - n8n execution context
	 * @returns Promise resolving to validated credentials
	 * @throws {ValidationError} When credentials are invalid or missing
	 */
	public async getCredentials(
		executeFunctions: IExecuteFunctions | ILoadOptionsFunctions,
	): Promise<SembleCredentials> {
		try {
			// Get credentials from n8n
			const credentials = await executeFunctions.getCredentials('sembleApi');
			
			if (!credentials) {
				throw new SembleValidationError('No Semble API credentials configured');
			}

			// Map to our interface
			const mappedCredentials: SembleCredentials = {
				server: credentials.baseUrl as string,
				token: credentials.apiToken as string,
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
		credentials: SembleCredentials,
	): CredentialValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];
		const recommendations: string[] = [];

		// Validate required fields
		if (!credentials.token?.trim()) {
			errors.push('API token is required');
		}

		if (!credentials.server?.trim()) {
			errors.push('GraphQL endpoint URL is required');
		}

		// Validate API token format (JWT-like structure)
		if (credentials.token && !this.isValidTokenFormat(credentials.token)) {
			warnings.push('API token does not appear to be in valid JWT format');
		}

		// Validate URL format
		if (credentials.server && !this.isValidUrl(credentials.server)) {
			errors.push('GraphQL endpoint URL is not valid');
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			recommendations,
		};
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
}
