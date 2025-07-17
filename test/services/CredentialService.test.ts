/**
 * @fileoverview Unit tests for CredentialService
 * @description Comprehensive tests for credential validation, format checking, and connection testing
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Services
 * @since 2.0.0
 */

import { 
	CredentialService, 
	ExtendedSembleCredentials, 
	CredentialValidationResult,
	ConnectionTestResult,
	EnvironmentConfig 
} from '../../services/CredentialService';
import { SembleValidationError, SembleAPIError } from '../../core/SembleError';
import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

// =============================================================================
// TEST SETUP
// =============================================================================

describe('CredentialService', () => {
	let credentialService: CredentialService;

	beforeEach(() => {
		credentialService = new CredentialService();
	});

	// =============================================================================
	// CREDENTIAL VALIDATION TESTS
	// =============================================================================

	describe('validateCredentialFormat', () => {
		it('should validate valid credentials', () => {
			const credentials: ExtendedSembleCredentials = {
				server: 'https://open.semble.io/graphql',
				token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
				environment: 'development',
				apiToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
				baseUrl: 'https://open.semble.io/graphql',
				safetyMode: true,
			};

			const result = credentialService.validateCredentialFormat(credentials);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject credentials with missing required fields', () => {
			const credentials: ExtendedSembleCredentials = {
				server: '',
				token: '',
				environment: 'development',
				apiToken: '',
				baseUrl: '',
			};

			const result = credentialService.validateCredentialFormat(credentials);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('API token is required');
			expect(result.errors).toContain('GraphQL endpoint URL is required');
		});

		it('should warn about invalid token format', () => {
			const credentials: ExtendedSembleCredentials = {
				server: 'https://open.semble.io/graphql',
				token: 'invalid-token',
				environment: 'development',
				apiToken: 'invalid-token',
				baseUrl: 'https://open.semble.io/graphql',
			};

			const result = credentialService.validateCredentialFormat(credentials);

			expect(result.isValid).toBe(true); // Still valid, just a warning
			expect(result.warnings).toContain('API token does not appear to be in valid JWT format');
		});

		it('should require production confirmation for production environment', () => {
			const credentials: ExtendedSembleCredentials = {
				server: 'https://open.semble.io/graphql',
				token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
				environment: 'production',
				apiToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
				baseUrl: 'https://open.semble.io/graphql',
				productionConfirmed: false,
			};

			const result = credentialService.validateCredentialFormat(credentials);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Production environment requires explicit confirmation');
		});

		it('should warn about custom endpoints for known environments', () => {
			const credentials: ExtendedSembleCredentials = {
				server: 'https://custom.endpoint.com/graphql',
				token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
				environment: 'development',
				apiToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
				baseUrl: 'https://custom.endpoint.com/graphql',
			};

			const result = credentialService.validateCredentialFormat(credentials);

			expect(result.isValid).toBe(true);
			expect(result.warnings).toContain('Custom endpoint detected. Expected: https://dev.semble.io/graphql');
		});

		it('should reject invalid URLs', () => {
			const credentials: ExtendedSembleCredentials = {
				server: 'not-a-url',
				token: 'valid-token',
				environment: 'development',
				apiToken: 'valid-token',
				baseUrl: 'not-a-url',
			};

			const result = credentialService.validateCredentialFormat(credentials);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('GraphQL endpoint URL is not valid');
		});

		it('should require HTTPS and GraphQL path in URLs', () => {
			const credentials: ExtendedSembleCredentials = {
				server: 'http://insecure.com/api',
				token: 'valid-token',
				environment: 'development',
				apiToken: 'valid-token',
				baseUrl: 'http://insecure.com/api',
			};

			const result = credentialService.validateCredentialFormat(credentials);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('GraphQL endpoint URL is not valid');
		});
	});

	// =============================================================================
	// ENVIRONMENT CONFIGURATION TESTS
	// =============================================================================

	describe('getEnvironmentConfig', () => {
		it('should return valid config for production environment', () => {
			const config = credentialService.getEnvironmentConfig('production');

			expect(config.name).toBe('Production');
			expect(config.defaultEndpoint).toBe('https://open.semble.io/graphql');
			expect(config.requiresConfirmation).toBe(true);
			expect(config.rateLimiting.requestsPerMinute).toBe(120);
		});

		it('should return valid config for staging environment', () => {
			const config = credentialService.getEnvironmentConfig('staging');

			expect(config.name).toBe('Staging');
			expect(config.defaultEndpoint).toBe('https://staging.semble.io/graphql');
			expect(config.requiresSafetyMode).toBe(true);
			expect(config.rateLimiting.requestsPerMinute).toBe(240);
		});

		it('should return valid config for development environment', () => {
			const config = credentialService.getEnvironmentConfig('development');

			expect(config.name).toBe('Development');
			expect(config.defaultEndpoint).toBe('https://dev.semble.io/graphql');
			expect(config.requiresSafetyMode).toBe(true);
			expect(config.rateLimiting.enabled).toBe(false);
		});

		it('should throw error for unsupported environment', () => {
			expect(() => {
				credentialService.getEnvironmentConfig('invalid');
			}).toThrow(SembleValidationError);
		});
	});

	describe('getSupportedEnvironments', () => {
		it('should return list of supported environments', () => {
			const environments = credentialService.getSupportedEnvironments();

			expect(environments).toContain('production');
			expect(environments).toContain('staging');
			expect(environments).toContain('development');
			expect(environments).toHaveLength(3);
		});
	});

	// =============================================================================
	// CONNECTION TESTING TESTS
	// =============================================================================

	describe('testConnection', () => {
		const validCredentials: ExtendedSembleCredentials = {
			server: 'https://open.semble.io/graphql',
			token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
			environment: 'development',
			apiToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
			baseUrl: 'https://open.semble.io/graphql',
		};

		it('should return success for valid connection', async () => {
			const result = await credentialService.testConnection(validCredentials);

			expect(result.success).toBe(true);
			expect(result.endpoint).toBe('https://open.semble.io/graphql');
			expect(result.environment).toBe('development');
			expect(result.responseTime).toBeGreaterThan(0);
			expect(result.permissionLevel).toBeDefined();
		});

		it('should include response time measurement', async () => {
			const result = await credentialService.testConnection(validCredentials);

			expect(result.responseTime).toBeGreaterThan(0);
			expect(result.responseTime).toBeLessThan(5000); // Should be reasonably fast
		});

		it('should handle connection failures gracefully', async () => {
			const invalidCredentials: ExtendedSembleCredentials = {
				...validCredentials,
				baseUrl: 'https://invalid.endpoint.com/graphql',
			};

			// Mock the private method to simulate failure
			const originalMethod = (credentialService as any).performConnectionTest;
			(credentialService as any).performConnectionTest = jest.fn().mockRejectedValue(
				new Error('Connection failed')
			);

			const result = await credentialService.testConnection(invalidCredentials);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.endpoint).toBe('https://invalid.endpoint.com/graphql');

			// Restore original method
			(credentialService as any).performConnectionTest = originalMethod;
		});
	});

	// =============================================================================
	// CREDENTIAL RETRIEVAL TESTS
	// =============================================================================

	describe('getCredentials', () => {
		const mockExecuteFunctions = {
			getCredentials: jest.fn(),
		} as unknown as IExecuteFunctions;

		beforeEach(() => {
			jest.clearAllMocks();
		});

		it('should retrieve and validate credentials successfully', async () => {
			const mockCredentials = {
				environment: 'development',
				apiToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
				baseUrl: 'https://open.semble.io/graphql',
				safetyMode: true,
			};

			(mockExecuteFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			const result = await credentialService.getCredentials(mockExecuteFunctions);

			expect(result.environment).toBe('development');
			expect(result.apiToken).toBe(mockCredentials.apiToken);
			expect(result.baseUrl).toBe(mockCredentials.baseUrl);
			expect(result.server).toBe(mockCredentials.baseUrl);
			expect(result.token).toBe(mockCredentials.apiToken);
		});

		it('should throw error when no credentials are configured', async () => {
			(mockExecuteFunctions.getCredentials as jest.Mock).mockResolvedValue(null);

			await expect(credentialService.getCredentials(mockExecuteFunctions))
				.rejects
				.toThrow(SembleValidationError);
		});

		it('should throw error when credentials are invalid', async () => {
			const invalidCredentials = {
				environment: 'development',
				apiToken: '', // Invalid: empty token
				baseUrl: 'invalid-url', // Invalid: not a valid URL
			};

			(mockExecuteFunctions.getCredentials as jest.Mock).mockResolvedValue(invalidCredentials);

			await expect(credentialService.getCredentials(mockExecuteFunctions))
				.rejects
				.toThrow(SembleValidationError);
		});

		it('should handle credential retrieval errors', async () => {
			(mockExecuteFunctions.getCredentials as jest.Mock).mockRejectedValue(
				new Error('Credential retrieval failed')
			);

			await expect(credentialService.getCredentials(mockExecuteFunctions))
				.rejects
				.toThrow(SembleAPIError);
		});
	});

	// =============================================================================
	// INTEGRATION TESTS
	// =============================================================================

	describe('integration scenarios', () => {
		it('should handle complete credential workflow', async () => {
			const mockExecuteFunctions = {
				getCredentials: jest.fn().mockResolvedValue({
					environment: 'development',
					apiToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
					baseUrl: 'https://open.semble.io/graphql',
					safetyMode: true,
				}),
			} as unknown as IExecuteFunctions;

			// 1. Get credentials
			const credentials = await credentialService.getCredentials(mockExecuteFunctions);
			expect(credentials).toBeDefined();

			// 2. Validate format
			const validation = credentialService.validateCredentialFormat(credentials);
			expect(validation.isValid).toBe(true);

			// 3. Get environment config
			const envConfig = credentialService.getEnvironmentConfig(credentials.environment);
			expect(envConfig.name).toBe('Development');

			// 4. Test connection
			const connectionTest = await credentialService.testConnection(credentials);
			expect(connectionTest.success).toBe(true);
		});
	});
});
