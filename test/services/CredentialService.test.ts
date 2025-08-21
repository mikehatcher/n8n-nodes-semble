/**
 * @fileoverview Unit tests for CredentialService
 * @description Tests credential validation, retrieval, and JWT token handling
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Services
 */

import {
  CredentialService,
  CredentialValidationResult,
} from '../../services/CredentialService';
import { SembleValidationError } from '../../core/SembleError';
import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { SembleCredentials } from '../../types/NodeTypes';

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
		it('should validate valid credentials successfully', () => {
			const credentials: SembleCredentials = {
				server: 'https://open.semble.io/graphql',
				token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token',
			};

			const result = credentialService.validateCredentialFormat(credentials);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject credentials with missing required fields', () => {
			const credentials: SembleCredentials = {
				server: '',
				token: '',
			};

			const result = credentialService.validateCredentialFormat(credentials);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('API token is required');
			expect(result.errors).toContain('GraphQL endpoint URL is required');
		});

		it('should validate URL format correctly', () => {
			const credentials: SembleCredentials = {
				server: 'invalid-url',
				token: 'valid.jwt.token',
			};

			const result = credentialService.validateCredentialFormat(credentials);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('GraphQL endpoint URL is not valid');
		});

		it('should validate token format and warn about invalid JWT', () => {
			const credentials: SembleCredentials = {
				server: 'https://open.semble.io/graphql',
				token: 'invalid-token-format',
			};

			const result = credentialService.validateCredentialFormat(credentials);

			expect(result.isValid).toBe(true); // Token format warnings don't make credentials invalid
expect(result.warnings).toContain('API token does not appear to be in valid JWT format');
});

it('should handle valid JWT token format', () => {
const credentials: SembleCredentials = {
server: 'https://open.semble.io/graphql',
token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
};

const result = credentialService.validateCredentialFormat(credentials);

expect(result.isValid).toBe(true);
expect(result.warnings.some(w => w.includes('JWT format'))).toBe(false);
});

it('should validate HTTPS URLs with GraphQL endpoint', () => {
const credentials: SembleCredentials = {
server: 'https://api.example.com/graphql',
token: 'valid.jwt.token',
};

const result = credentialService.validateCredentialFormat(credentials);

expect(result.isValid).toBe(true);
expect(result.errors.some(e => e.includes('not valid'))).toBe(false);
});

it('should reject HTTP URLs (non-secure)', () => {
const credentials: SembleCredentials = {
server: 'http://api.example.com/graphql',
token: 'valid.jwt.token',
};

const result = credentialService.validateCredentialFormat(credentials);

expect(result.isValid).toBe(false);
expect(result.errors).toContain('GraphQL endpoint URL is not valid');
});

it('should reject URLs without GraphQL path', () => {
const credentials: SembleCredentials = {
server: 'https://api.example.com/api',
token: 'valid.jwt.token',
};

const result = credentialService.validateCredentialFormat(credentials);

expect(result.isValid).toBe(false);
expect(result.errors).toContain('GraphQL endpoint URL is not valid');
});
});

// =============================================================================
// CREDENTIAL RETRIEVAL TESTS
// =============================================================================

describe('getCredentials', () => {
it('should successfully retrieve and validate credentials', async () => {
const mockCredentials = {
apiToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token',
baseUrl: 'https://open.semble.io/graphql',
};

const mockExecuteFunctions = {
getCredentials: jest.fn().mockResolvedValue(mockCredentials),
} as unknown as IExecuteFunctions;

const result = await credentialService.getCredentials(mockExecuteFunctions);

expect(result.server).toBe(mockCredentials.baseUrl);
expect(result.token).toBe(mockCredentials.apiToken);
});

it('should throw error when credentials are missing', async () => {
const mockExecuteFunctions = {
getCredentials: jest.fn().mockResolvedValue(null),
} as unknown as IExecuteFunctions;

await expect(credentialService.getCredentials(mockExecuteFunctions))
.rejects
.toThrow(SembleValidationError);
});

it('should throw error when validation fails', async () => {
const mockCredentials = {
apiToken: '', // Invalid - empty token
baseUrl: 'https://open.semble.io/graphql',
};

const mockExecuteFunctions = {
getCredentials: jest.fn().mockResolvedValue(mockCredentials),
} as unknown as IExecuteFunctions;

await expect(credentialService.getCredentials(mockExecuteFunctions))
.rejects
.toThrow(SembleValidationError);
});

it('should handle getCredentials with ILoadOptionsFunctions', async () => {
const mockCredentials = {
apiToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token',
baseUrl: 'https://open.semble.io/graphql',
};

const mockLoadOptionsFunctions = {
getCredentials: jest.fn().mockResolvedValue(mockCredentials),
} as unknown as ILoadOptionsFunctions;

const result = await credentialService.getCredentials(mockLoadOptionsFunctions);

expect(result.server).toBe(mockCredentials.baseUrl);
expect(result.token).toBe(mockCredentials.apiToken);
});

it('should validate credentials after retrieval', async () => {
const mockCredentials = {
apiToken: 'invalid-token-format',
baseUrl: 'https://open.semble.io/graphql',
};

const mockExecuteFunctions = {
getCredentials: jest.fn().mockResolvedValue(mockCredentials),
} as unknown as IExecuteFunctions;

// Should not throw because token format warnings don't invalidate credentials
			const result = await credentialService.getCredentials(mockExecuteFunctions);
			
			expect(result.server).toBe(mockCredentials.baseUrl);
			expect(result.token).toBe(mockCredentials.apiToken);
		});
	});

	// =============================================================================
	// EDGE CASE TESTS
	// =============================================================================

	describe('edge cases', () => {
		it('should handle whitespace-only credentials', () => {
			const credentials: SembleCredentials = {
				server: '   ',
				token: '   ',
			};

			const result = credentialService.validateCredentialFormat(credentials);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('API token is required');
			expect(result.errors).toContain('GraphQL endpoint URL is required');
		});

		it('should handle null/undefined values gracefully', () => {
			const credentials: SembleCredentials = {
				server: null as any,
				token: undefined as any,
			};

			const result = credentialService.validateCredentialFormat(credentials);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('API token is required');
			expect(result.errors).toContain('GraphQL endpoint URL is required');
		});

		it('should provide helpful validation results structure', () => {
			const credentials: SembleCredentials = {
				server: 'https://open.semble.io/graphql',
				token: 'invalid-format',
			};

			const result = credentialService.validateCredentialFormat(credentials);

			expect(result).toHaveProperty('isValid');
			expect(result).toHaveProperty('errors');
			expect(result).toHaveProperty('warnings');
			expect(result).toHaveProperty('recommendations');
			expect(Array.isArray(result.errors)).toBe(true);
			expect(Array.isArray(result.warnings)).toBe(true);
			expect(Array.isArray(result.recommendations)).toBe(true);
		});
	});
});
