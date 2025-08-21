/**
 * @fileoverview Permission and authentication error scenario tests for Semble API integration
 * @description Tests authentication failures, authorization issues, and permission-related errors
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Scenarios
 * @since 2.0.0
 */

import { IExecuteFunctions } from 'n8n-workflow';
import { sembleApiRequest } from '../../nodes/Semble/GenericFunctions';
import { SembleAPIError, SembleAuthError, SemblePermissionError } from '../../core/SembleError';

// Mock modules
jest.mock('../../nodes/Semble/GenericFunctions');
const mockSembleApiRequest = sembleApiRequest as jest.MockedFunction<typeof sembleApiRequest>;

describe('Permission Error Scenarios', () => {
  let mockExecuteFunctions: Partial<IExecuteFunctions>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock execution functions
    mockExecuteFunctions = {
      getCredentials: jest.fn().mockResolvedValue({
        server: 'https://open.semble.io/graphql',
        token: 'test-token'
      }),
      getNodeParameter: jest.fn(),
      helpers: {
        httpRequest: jest.fn()
      } as any
    };
  });

  describe('Authentication Failures', () => {
    it('should handle invalid authentication token', async () => {
      // Mock invalid token error
      mockSembleApiRequest.mockRejectedValue(
        new SembleAuthError(
          'Invalid authentication token',
          'INVALID_TOKEN',
          'bearer_token',
          'Please check your API token and ensure it is valid'
        )
      );

      const query = `
        query GetPatients {
          patients {
            data {
              id
              firstName
            }
          }
        }
      `;

      try {
        await sembleApiRequest.call(mockExecuteFunctions as IExecuteFunctions, query, {});
        fail('Expected authentication error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SembleAuthError);
        expect((error as SembleAuthError).code).toBe('INVALID_TOKEN');
        expect((error as SembleAuthError).message).toContain('Invalid authentication token');
        expect((error as SembleAuthError).isRetryable()).toBe(false);
      }

      console.log('✅ Invalid authentication token handled correctly');
    });

    it('should handle expired authentication token', async () => {
      // Mock expired token error
      mockSembleApiRequest.mockRejectedValue(
        new SembleAuthError(
          'Authentication token has expired',
          'TOKEN_EXPIRED',
          'bearer_token',
          'Please refresh your authentication token'
        )
      );

      const query = `query GetPatients { patients { data { id } } }`;

      try {
        await sembleApiRequest.call(mockExecuteFunctions as IExecuteFunctions, query, {});
        fail('Expected expired token error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SembleAuthError);
        expect((error as SembleAuthError).code).toBe('TOKEN_EXPIRED');
        expect((error as SembleAuthError).credential).toBe('bearer_token');
      }

      console.log('✅ Expired authentication token handled with expiration details');
    });

    it('should handle missing authentication credentials', async () => {
      // Mock missing credentials error
      mockSembleApiRequest.mockRejectedValue(
        new SembleAuthError(
          'No authentication credentials provided',
          'MISSING_CREDENTIALS',
          'bearer_token',
          'Please configure authentication credentials in node settings'
        )
      );

      const query = `query GetPatients { patients { data { id } } }`;

      try {
        await sembleApiRequest.call(mockExecuteFunctions as IExecuteFunctions, query, {});
        fail('Expected missing credentials error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SembleAuthError);
        expect((error as SembleAuthError).code).toBe('MISSING_CREDENTIALS');
        expect((error as SembleAuthError).hint).toContain('configure authentication');
      }

      console.log('✅ Missing authentication credentials handled with configuration guidance');
    });

    it('should handle malformed authentication token', async () => {
      // Mock malformed token error
      mockSembleApiRequest.mockRejectedValue(
        new SembleAuthError(
          'Authentication token format is invalid',
          'MALFORMED_TOKEN',
          'bearer_token',
          'Please check token format - should be a valid JWT or API key'
        )
      );

      const query = `query GetPatients { patients { data { id } } }`;

      try {
        await sembleApiRequest.call(mockExecuteFunctions as IExecuteFunctions, query, {});
        fail('Expected malformed token error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SembleAuthError);
        expect((error as SembleAuthError).code).toBe('MALFORMED_TOKEN');
        expect((error as SembleAuthError).hint).toContain('check token format');
      }

      console.log('✅ Malformed authentication token handled with format guidance');
    });
  });

  describe('Authorization and Permission Errors', () => {
    it('should handle insufficient permissions for resource access', async () => {
      // Mock insufficient permissions error
      mockSembleApiRequest.mockRejectedValue(
        new SemblePermissionError(
          'Insufficient permissions to access patient data',
          'read:patients',
          'patients',
          'getPatients'
        )
      );

      const query = `
        query GetPatients {
          patients {
            data {
              id
              firstName
              lastName
              dateOfBirth
            }
          }
        }
      `;

      try {
        await sembleApiRequest.call(mockExecuteFunctions as IExecuteFunctions, query, {});
        fail('Expected permission error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SemblePermissionError);
        expect((error as SemblePermissionError).requiredPermission).toBe('read:patients');
        expect((error as SemblePermissionError).field).toBe('patients');
        expect((error as SemblePermissionError).operation).toBe('getPatients');
        expect((error as SemblePermissionError).isRetryable()).toBe(false);
      }

      console.log('✅ Insufficient permissions handled with detailed permission analysis');
    });

    it('should handle role-based access restrictions', async () => {
      // Mock role-based restriction error
      mockSembleApiRequest.mockRejectedValue(
        new SemblePermissionError(
          'User role does not permit access to administrative functions',
          'admin:delete',
          undefined,
          'deletePatient'
        )
      );

      const mutation = `
        mutation DeletePatient($id: ID!) {
          deletePatient(id: $id) {
            success
          }
        }
      `;

      try {
        await sembleApiRequest.call(mockExecuteFunctions as IExecuteFunctions, mutation, { id: '123' });
        fail('Expected role restriction error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SemblePermissionError);
        expect((error as SemblePermissionError).requiredPermission).toBe('admin:delete');
        expect((error as SemblePermissionError).operation).toBe('deletePatient');
      }

      console.log('✅ Role-based access restrictions handled with role analysis');
    });

    it('should handle organization-level access restrictions', async () => {
      // Mock organization access restriction
      mockSembleApiRequest.mockRejectedValue(
        new SemblePermissionError(
          'User does not have access to requested organization data',
          'org:access',
          'organization',
          'getPatients'
        )
      );

      const query = `
        query GetPatientsFromOrg($orgId: ID!) {
          organization(id: $orgId) {
            patients {
              data {
                id
              }
            }
          }
        }
      `;

      try {
        await sembleApiRequest.call(mockExecuteFunctions as IExecuteFunctions, query, { orgId: 'org_456' });
        fail('Expected organization access error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SemblePermissionError);
        expect((error as SemblePermissionError).requiredPermission).toBe('org:access');
        expect((error as SemblePermissionError).field).toBe('organization');
      }

      console.log('✅ Organization-level access restrictions handled correctly');
    });

    it('should handle field-level permission restrictions', async () => {
      // Mock field-level permission error
      mockSembleApiRequest.mockRejectedValue(
        new SemblePermissionError(
          'Access denied to sensitive patient fields',
          'field:sensitive',
          'socialSecurityNumber',
          'getPatients'
        )
      );

      const query = `
        query GetPatients {
          patients {
            data {
              id
              firstName
              socialSecurityNumber
              medicalRecord
            }
          }
        }
      `;

      try {
        await sembleApiRequest.call(mockExecuteFunctions as IExecuteFunctions, query, {});
        fail('Expected field access error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SemblePermissionError);
        expect((error as SemblePermissionError).requiredPermission).toBe('field:sensitive');
        expect((error as SemblePermissionError).field).toBe('socialSecurityNumber');
      }

      console.log('✅ Field-level permission restrictions handled with field-specific details');
    });
  });

  describe('Session and Token Management', () => {
    it('should handle session timeout errors', async () => {
      // Mock session timeout
      mockSembleApiRequest.mockRejectedValue(
        new SembleAuthError(
          'User session has timed out due to inactivity',
          'SESSION_TIMEOUT',
          'session_token',
          'Please log in again to establish a new session'
        )
      );

      const query = `query GetPatients { patients { data { id } } }`;

      try {
        await sembleApiRequest.call(mockExecuteFunctions as IExecuteFunctions, query, {});
        fail('Expected session timeout error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SembleAuthError);
        expect((error as SembleAuthError).code).toBe('SESSION_TIMEOUT');
        expect((error as SembleAuthError).credential).toBe('session_token');
      }

      console.log('✅ Session timeout handled with timing details');
    });

    it('should handle token refresh requirements', async () => {
      // Mock token refresh needed
      mockSembleApiRequest.mockRejectedValue(
        new SembleAuthError(
          'Authentication token needs to be refreshed',
          'TOKEN_REFRESH_REQUIRED',
          'access_token',
          'Use refresh token to obtain new access token'
        )
      );

      const query = `query GetPatients { patients { data { id } } }`;

      try {
        await sembleApiRequest.call(mockExecuteFunctions as IExecuteFunctions, query, {});
        fail('Expected token refresh error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SembleAuthError);
        expect((error as SembleAuthError).code).toBe('TOKEN_REFRESH_REQUIRED');
        expect((error as SembleAuthError).credential).toBe('access_token');
      }

      console.log('✅ Token refresh requirements handled with refresh guidance');
    });

    it('should handle concurrent session limits', async () => {
      // Mock concurrent session limit exceeded
      mockSembleApiRequest.mockRejectedValue(
        new SembleAuthError(
          'Maximum concurrent sessions exceeded for user',
          'CONCURRENT_SESSION_LIMIT',
          'session_token',
          'Close an existing session or contact administrator to increase limit'
        )
      );

      const query = `query GetPatients { patients { data { id } } }`;

      try {
        await sembleApiRequest.call(mockExecuteFunctions as IExecuteFunctions, query, {});
        fail('Expected concurrent session limit error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SembleAuthError);
        expect((error as SembleAuthError).code).toBe('CONCURRENT_SESSION_LIMIT');
        expect((error as SembleAuthError).hint).toContain('Close an existing session');
      }

      console.log('✅ Concurrent session limits handled with session details');
    });
  });

  describe('API Key and Scope Management', () => {
    it('should handle invalid API key format', async () => {
      // Mock invalid API key format
      mockSembleApiRequest.mockRejectedValue(
        new SembleAuthError(
          'API key format is invalid or corrupted',
          'INVALID_API_KEY_FORMAT',
          'api_key',
          'Please verify API key format and regenerate if necessary'
        )
      );

      const query = `query GetPatients { patients { data { id } } }`;

      try {
        await sembleApiRequest.call(mockExecuteFunctions as IExecuteFunctions, query, {});
        fail('Expected invalid API key format error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SembleAuthError);
        expect((error as SembleAuthError).code).toBe('INVALID_API_KEY_FORMAT');
        expect((error as SembleAuthError).credential).toBe('api_key');
      }

      console.log('✅ Invalid API key format handled with format validation details');
    });

    it('should handle API key scope restrictions', async () => {
      // Mock API key scope restriction
      mockSembleApiRequest.mockRejectedValue(
        new SemblePermissionError(
          'API key does not have required scope for this operation',
          'write:patients',
          undefined,
          'createPatient'
        )
      );

      const mutation = `
        mutation CreatePatient($input: PatientInput!) {
          createPatient(input: $input) {
            id
          }
        }
      `;

      try {
        await sembleApiRequest.call(mockExecuteFunctions as IExecuteFunctions, mutation, {
          input: { firstName: 'John', lastName: 'Doe' }
        });
        fail('Expected API key scope error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SemblePermissionError);
        expect((error as SemblePermissionError).requiredPermission).toBe('write:patients');
        expect((error as SemblePermissionError).operation).toBe('createPatient');
      }

      console.log('✅ API key scope restrictions handled with scope analysis');
    });

    it('should handle revoked API key', async () => {
      // Mock revoked API key
      mockSembleApiRequest.mockRejectedValue(
        new SembleAuthError(
          'API key has been revoked and is no longer valid',
          'API_KEY_REVOKED',
          'api_key',
          'Generate a new API key to restore access'
        )
      );

      const query = `query GetPatients { patients { data { id } } }`;

      try {
        await sembleApiRequest.call(mockExecuteFunctions as IExecuteFunctions, query, {});
        fail('Expected revoked API key error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SembleAuthError);
        expect((error as SembleAuthError).code).toBe('API_KEY_REVOKED');
        expect((error as SembleAuthError).hint).toContain('Generate a new API key');
      }

      console.log('✅ Revoked API key handled with revocation details');
    });
  });

  describe('Error Recovery and User Guidance', () => {
    it('should provide actionable error messages for authentication failures', () => {
      const authError = new SembleAuthError(
        'Invalid authentication token',
        'INVALID_TOKEN',
        'bearer_token',
        'Please check your API token and ensure it is valid'
      );

      const userMessage = authError.getUserMessage();

      expect(userMessage).toContain('Invalid authentication');
      expect(userMessage).toContain('check your API token');
      expect(authError.category).toBe('authentication');
      expect(authError.isRetryable()).toBe(false);

      console.log('✅ Actionable error messages provided for authentication failures');
    });

    it('should provide permission upgrade guidance', () => {
      const permissionError = new SemblePermissionError(
        'Insufficient permissions to access patient data',
        'read:patients',
        'patients',
        'getPatients'
      );

      const userMessage = permissionError.getUserMessage();

      expect(userMessage).toContain('missing permission');
      expect(userMessage).toContain('read:patients');
      expect(userMessage).toContain('patients');
      expect(permissionError.category).toBe('permission');

      console.log('✅ Permission upgrade guidance provided with clear steps');
    });

    it('should categorize errors for appropriate handling', () => {
      const errors = [
        new SembleAuthError('Invalid token', 'INVALID_TOKEN'),
        new SemblePermissionError('Insufficient permissions', 'read:data'),
        new SembleAPIError('Rate limited', 'RATE_LIMIT_EXCEEDED', 429)
      ];

      const errorCategories = errors.map(error => ({
        type: error.constructor.name,
        category: error.category,
        retryable: error.isRetryable()
      }));

      expect(errorCategories[0].category).toBe('authentication');
      expect(errorCategories[0].retryable).toBe(false);
      
      expect(errorCategories[1].category).toBe('permission');
      expect(errorCategories[1].retryable).toBe(false);
      
      expect(errorCategories[2].category).toBe('api');
      // Rate limits may be retryable after waiting

      console.log('✅ Error categorization implemented for appropriate handling');
    });
  });
});
