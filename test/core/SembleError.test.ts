/**
 * @fileoverview Tests for SembleError and error hierarchy classes
 * @description Comprehensive test suite for error creation, categorization, and serialization
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Core.SembleError
 * @since 2.0.0
 */

import { 
    SembleError, 
    SembleAPIError, 
    SembleAuthError, 
    SemblePermissionError, 
    SembleValidationError,
    SembleConfigError,
    SembleNetworkError,
    SembleErrorFactory,
    ValidationError,
    ErrorContext 
} from '../../core/SembleError';

describe('SembleError Hierarchy', () => {
    describe('SembleError Base Class', () => {
        it('should create error with default values', () => {
            const error = new SembleError('Test error message');
            
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(SembleError);
            expect(error.message).toBe('Test error message');
            expect(error.code).toBe('SEMBLE_ERROR');
            expect(error.category).toBe('unknown');
            expect(error.severity).toBe('medium');
            expect(error.context).toEqual({});
            expect(error.timestamp).toBeInstanceOf(Date);
            expect(error.name).toBe('SembleError');
        });

        it('should create error with custom values', () => {
            const context: ErrorContext = {
                operation: 'fetchPatients',
                resource: 'patients',
                userId: 'user123'
            };

            const error = new SembleError(
                'Custom error message',
                'CUSTOM_CODE',
                context,
                'api',
                'high'
            );
            
            expect(error.message).toBe('Custom error message');
            expect(error.code).toBe('CUSTOM_CODE');
            expect(error.category).toBe('api');
            expect(error.severity).toBe('high');
            expect(error.context).toBe(context);
        });

        it('should serialize to JSON correctly', () => {
            const context: ErrorContext = {
                operation: 'test',
                metadata: { source: 'jest' }
            };

            const error = new SembleError(
                'JSON test error',
                'JSON_TEST',
                context,
                'validation',
                'low'
            );
            
            const json = error.toJSON();
            
            expect(json).toEqual({
                name: 'SembleError',
                message: 'JSON test error',
                code: 'JSON_TEST',
                category: 'validation',
                severity: 'low',
                context: context,
                timestamp: error.timestamp.toISOString(),
                stack: error.stack
            });
        });

        it('should handle empty context', () => {
            const error = new SembleError('Test message');
            expect(error.context).toEqual({});
        });

        it('should maintain proper stack trace', () => {
            const error = new SembleError('Stack trace test');
            expect(error.stack).toBeDefined();
            expect(error.stack).toContain('SembleError');
        });
    });

    describe('SembleAPIError', () => {
        it('should create API error with status code', () => {
            const error = new SembleAPIError(
                'API error occurred',
                'API_ERROR',
                404
            );
            
            expect(error).toBeInstanceOf(SembleError);
            expect(error).toBeInstanceOf(SembleAPIError);
            expect(error.message).toBe('API error occurred');
            expect(error.code).toBe('API_ERROR');
            expect(error.category).toBe('api');
            expect(error.severity).toBe('low');
            expect(error.statusCode).toBe(404);
        });

        it('should create API error with response data', () => {
            const responseData = { error: 'Not found', details: 'Resource missing' };
            const context: ErrorContext = { resource: 'patients' };
            
            const error = new SembleAPIError(
                'Resource not found',
                'NOT_FOUND',
                404,
                context,
                responseData
            );
            
            expect(error.statusCode).toBe(404);
            expect(error.response).toBe(responseData);
            expect(error.context).toBe(context);
        });

        it('should handle undefined status code', () => {
            const error = new SembleAPIError('Unknown API error', 'UNKNOWN');
            expect(error.statusCode).toBeUndefined();
        });

        it('should serialize with API-specific fields', () => {
            const error = new SembleAPIError('API test', 'API_TEST', 500);
            const json = error.toJSON();
            
            expect(json.category).toBe('api');
            expect(json.code).toBe('API_TEST');
            // Note: statusCode and response are not serialized in base toJSON
        });
    });

    describe('SembleAuthError', () => {
        it('should create authentication error', () => {
            const error = new SembleAuthError(
                'Authentication failed',
                'AUTH_FAILED',
                'api_key',
                'Please check your credentials'
            );
            
            expect(error).toBeInstanceOf(SembleError);
            expect(error).toBeInstanceOf(SembleAuthError);
            expect(error.message).toBe('Authentication failed');
            expect(error.code).toBe('AUTH_FAILED');
            expect(error.category).toBe('authentication');
            expect(error.severity).toBe('high');
            expect(error.credential).toBe('api_key');
            expect(error.hint).toBe('Please check your credentials');
        });

        it('should create auth error with context', () => {
            const context: ErrorContext = { 
                operation: 'login',
                userId: 'user123' 
            };
            
            const error = new SembleAuthError(
                'Token expired',
                'TOKEN_EXPIRED',
                'bearer_token',
                'Please refresh your token',
                context
            );
            
            expect(error.context).toBe(context);
        });

        it('should serialize with auth-specific fields', () => {
            const error = new SembleAuthError(
                'Auth test',
                'AUTH_TEST',
                'oauth',
                'Test suggestion'
            );
            
            const json = error.toJSON();
            
            expect(json.category).toBe('authentication');
            expect(json.severity).toBe('high');
            expect(json.code).toBe('AUTH_TEST');
            // Note: credential and hint are not serialized in base toJSON
        });
    });

    describe('SemblePermissionError', () => {
        it('should create permission error', () => {
            const error = new SemblePermissionError(
                'Access denied',
                'patients.read',
                'medicalHistory',
                'fetchPatients'
            );
            
            expect(error).toBeInstanceOf(SembleError);
            expect(error).toBeInstanceOf(SemblePermissionError);
            expect(error.message).toBe('Access denied');
            expect(error.code).toBe('PERMISSION_DENIED');
            expect(error.category).toBe('permission');
            expect(error.severity).toBe('medium');
            expect(error.requiredPermission).toBe('patients.read');
            expect(error.field).toBe('medicalHistory');
            expect(error.operation).toBe('fetchPatients');
        });

        it('should create permission error with context', () => {
            const context: ErrorContext = { 
                userId: 'user123',
                resource: 'patients' 
            };
            
            const error = new SemblePermissionError(
                'Field access denied',
                'patients.write',
                'status',
                'updatePatient',
                context
            );
            
            expect(error.context).toBe(context);
        });

        it('should handle optional field and operation', () => {
            const error = new SemblePermissionError(
                'General access denied',
                'admin.access'
            );
            
            expect(error.field).toBeUndefined();
            expect(error.operation).toBeUndefined();
        });

        it('should create field placeholder', () => {
            const placeholder = SemblePermissionError.createFieldPlaceholder(
                'medicalHistory',
                'patients.read_medical'
            );
            
            expect(placeholder).toEqual({
                __MISSING_PERMISSION__: 'patients.read_medical',
                __FIELD_NAME__: 'medicalHistory',
                __ERROR_MESSAGE__: "Access denied for field 'medicalHistory' - missing permission 'patients.read_medical'"
            });
        });

        it('should serialize with permission-specific fields', () => {
            const error = new SemblePermissionError(
                'Permission test',
                'test.permission',
                'testField',
                'testOperation'
            );
            
            const json = error.toJSON();
            
            expect(json.category).toBe('permission');
            expect(json.code).toBe('PERMISSION_DENIED');
            // Note: requiredPermission, field, operation are not serialized in base toJSON
        });
    });

    describe('SembleValidationError', () => {
        it('should create validation error', () => {
            const error = new SembleValidationError(
                'Invalid email format',
                'email',
                'invalid-email',
                ['must be valid email']
            );
            
            expect(error).toBeInstanceOf(SembleError);
            expect(error).toBeInstanceOf(SembleValidationError);
            expect(error.message).toBe('Invalid email format');
            expect(error.category).toBe('validation');
            expect(error.severity).toBe('low');
            expect(error.field).toBe('email');
            expect(error.value).toBe('invalid-email');
            expect(error.constraints).toEqual(['must be valid email']);
        });

        it('should create validation error with context', () => {
            const context: ErrorContext = { 
                operation: 'createPatient',
                resource: 'patients' 
            };
            
            const error = new SembleValidationError(
                'Required field missing',
                'firstName',
                undefined,
                ['field is required'],
                context
            );
            
            expect(error.context).toBe(context);
            expect(error.value).toBeUndefined();
        });

        it('should handle undefined constraints', () => {
            const error = new SembleValidationError(
                'Validation failed',
                'testField',
                'testValue'
            );
            
            expect(error.constraints).toEqual([]);
        });

        it('should serialize with validation-specific fields', () => {
            const error = new SembleValidationError(
                'Validation test',
                'testField',
                'testValue',
                ['test constraint']
            );
            
            const json = error.toJSON();
            
            expect(json.category).toBe('validation');
            expect(json.code).toBe('VALIDATION_ERROR');
            // Note: field, value, constraints are not serialized in base toJSON
        });
    });

    describe('SembleConfigError', () => {
        it('should create configuration error', () => {
            const error = new SembleConfigError(
                'Invalid configuration',
                'apiKey',
                'string',
                123
            );
            
            expect(error).toBeInstanceOf(SembleError);
            expect(error).toBeInstanceOf(SembleConfigError);
            expect(error.message).toBe('Invalid configuration');
            expect(error.category).toBe('configuration');
            expect(error.severity).toBe('high');
            expect(error.configKey).toBe('apiKey');
            expect(error.expectedType).toBe('string');
            expect(error.actualValue).toBe(123);
        });

        it('should create config error with context', () => {
            const context: ErrorContext = { 
                operation: 'initialization',
                metadata: { source: 'env' }
            };
            
            const error = new SembleConfigError(
                'Missing required config',
                'baseUrl',
                'string',
                undefined,
                context
            );
            
            expect(error.context).toBe(context);
        });

        it('should handle optional config parameters', () => {
            const error = new SembleConfigError(
                'Config error',
                'timeout'
            );
            
            expect(error.expectedType).toBeUndefined();
            expect(error.actualValue).toBeUndefined();
        });

        it('should serialize with config-specific fields', () => {
            const error = new SembleConfigError(
                'Config test',
                'testKey',
                'string',
                'testValue'
            );
            
            const json = error.toJSON();
            
            expect(json.category).toBe('configuration');
            expect(json.severity).toBe('high');
            expect(json.code).toBe('CONFIG_ERROR');
            // Note: configKey, expectedType, actualValue are not serialized in base toJSON
        });
    });

    describe('Error Inheritance and Type Checking', () => {
        it('should maintain proper inheritance chain', () => {
            const apiError = new SembleAPIError('API test', 'TEST');
            
            expect(apiError instanceof Error).toBe(true);
            expect(apiError instanceof SembleError).toBe(true);
            expect(apiError instanceof SembleAPIError).toBe(true);
        });

        it('should distinguish between error types', () => {
            const apiError = new SembleAPIError('API error', 'API_TEST');
            const authError = new SembleAuthError('Auth error', 'AUTH_TEST', 'token');
            const permError = new SemblePermissionError('Perm error', 'PERM_TEST');
            const validError = new SembleValidationError('Valid error', 'field');
            const configError = new SembleConfigError('Config error', 'key');
            
            expect(apiError instanceof SembleAPIError).toBe(true);
            expect(apiError instanceof SembleAuthError).toBe(false);
            
            expect(authError instanceof SembleAuthError).toBe(true);
            expect(authError instanceof SembleAPIError).toBe(false);
            
            expect(permError instanceof SemblePermissionError).toBe(true);
            expect(permError instanceof SembleValidationError).toBe(false);
            
            expect(validError instanceof SembleValidationError).toBe(true);
            expect(validError instanceof SembleConfigError).toBe(false);
            
            expect(configError instanceof SembleConfigError).toBe(true);
            expect(configError instanceof SemblePermissionError).toBe(false);
        });
    });

    describe('Error Context Handling', () => {
        it('should preserve complex context objects', () => {
            const complexContext: ErrorContext = {
                operation: 'complexOperation',
                resource: 'patients',
                userId: 'user123',
                requestId: 'req-456',
                timestamp: new Date('2023-01-01T10:00:00Z'),
                metadata: {
                    source: 'api',
                    version: '2.0.0',
                    nested: {
                        property: 'value'
                    }
                }
            };
            
            const error = new SembleError('Complex context test', 'COMPLEX_TEST', complexContext);
            
            expect(error.context).toEqual(complexContext);
            expect(error.context.metadata?.nested?.property).toBe('value');
        });

        it('should handle context in JSON serialization', () => {
            const context: ErrorContext = {
                operation: 'jsonTest',
                metadata: { key: 'value' }
            };
            
            const error = new SembleError('JSON context test', 'JSON_CONTEXT', context);
            const json = error.toJSON();
            
            expect(json.context).toEqual(context);
        });
    });

    describe('Error Timestamps', () => {
        it('should set timestamp on creation', () => {
            const before = new Date();
            const error = new SembleError('Timestamp test');
            const after = new Date();
            
            expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('should maintain timestamp in serialization', () => {
            const error = new SembleError('Serialization timestamp test');
            const json = error.toJSON();
            
            expect(json.timestamp).toBe(error.timestamp.toISOString());
        });
    });

    describe('Error Method Testing - isRetryable()', () => {
        describe('SembleError base isRetryable', () => {
            it('should return true for network errors', () => {
                const error = new SembleError('Network error', 'NETWORK_ERROR', {}, 'network');
                expect(error.isRetryable()).toBe(true);
            });

            it('should return true for rate limit errors', () => {
                const error = new SembleError('Rate limited', 'RATE_LIMIT_EXCEEDED');
                expect(error.isRetryable()).toBe(true);
            });

            it('should return false for authentication errors', () => {
                const error = new SembleError('Auth failed', 'AUTH_ERROR', {}, 'authentication');
                expect(error.isRetryable()).toBe(false);
            });

            it('should return false for permission errors', () => {
                const error = new SembleError('Permission denied', 'PERMISSION_ERROR', {}, 'permission');
                expect(error.isRetryable()).toBe(false);
            });

            it('should return false for configuration errors', () => {
                const error = new SembleError('Config invalid', 'CONFIG_ERROR', {}, 'configuration');
                expect(error.isRetryable()).toBe(false);
            });

            it('should return false for validation errors', () => {
                const error = new SembleError('Validation failed', 'VALIDATION_ERROR', {}, 'validation');
                expect(error.isRetryable()).toBe(false);
            });

            it('should return false for unknown API errors', () => {
                const error = new SembleError('API error', 'API_ERROR', {}, 'api');
                expect(error.isRetryable()).toBe(false);
            });
        });

        describe('SembleAPIError isRetryable', () => {
            it('should return true for rate limiting (429)', () => {
                const error = new SembleAPIError('Rate limited', 'RATE_LIMITED', 429);
                expect(error.isRetryable()).toBe(true);
            });

            it('should return true for server errors (500+)', () => {
                const error500 = new SembleAPIError('Internal server error', 'SERVER_ERROR', 500);
                const error502 = new SembleAPIError('Bad gateway', 'BAD_GATEWAY', 502);
                const error503 = new SembleAPIError('Service unavailable', 'SERVICE_UNAVAILABLE', 503);
                
                expect(error500.isRetryable()).toBe(true);
                expect(error502.isRetryable()).toBe(true);
                expect(error503.isRetryable()).toBe(true);
            });

            it('should return false for client errors (400-499)', () => {
                const error400 = new SembleAPIError('Bad request', 'BAD_REQUEST', 400);
                const error401 = new SembleAPIError('Unauthorized', 'UNAUTHORIZED', 401);
                const error404 = new SembleAPIError('Not found', 'NOT_FOUND', 404);
                
                expect(error400.isRetryable()).toBe(false);
                expect(error401.isRetryable()).toBe(false);
                expect(error404.isRetryable()).toBe(false);
            });

            it('should return false for no status code', () => {
                const error = new SembleAPIError('Unknown API error', 'API_ERROR');
                expect(error.isRetryable()).toBe(false);
            });
        });

        describe('SembleAuthError isRetryable', () => {
            it('should return false for all auth errors', () => {
                const error = new SembleAuthError('Auth failed', 'AUTH_FAILED', 'token');
                expect(error.isRetryable()).toBe(false);
            });
        });

        describe('SemblePermissionError isRetryable', () => {
            it('should return false for all permission errors', () => {
                const error = new SemblePermissionError('Access denied', 'PERMISSION_DENIED');
                expect(error.isRetryable()).toBe(false);
            });
        });

        describe('SembleValidationError isRetryable', () => {
            it('should return false for all validation errors', () => {
                const error = new SembleValidationError('Validation failed', 'field');
                expect(error.isRetryable()).toBe(false);
            });
        });

        describe('SembleConfigError isRetryable', () => {
            it('should return false for all config errors', () => {
                const error = new SembleConfigError('Config invalid', 'key');
                expect(error.isRetryable()).toBe(false);
            });
        });
    });

    describe('Error Method Testing - getUserMessage()', () => {
        describe('SembleAuthError getUserMessage', () => {
            it('should return message with hint', () => {
                const error = new SembleAuthError(
                    'Authentication failed',
                    'AUTH_FAILED',
                    'api_key',
                    'Please check your credentials'
                );
                
                expect(error.getUserMessage()).toBe('Authentication failed Please check your credentials');
            });

            it('should return message without hint', () => {
                const error = new SembleAuthError(
                    'Authentication failed',
                    'AUTH_FAILED',
                    'api_key'
                );
                
                expect(error.getUserMessage()).toBe('Authentication failed');
            });
        });

        describe('SemblePermissionError getUserMessage', () => {
            it('should return message with field and operation', () => {
                const error = new SemblePermissionError(
                    'Access denied',
                    'patients.read',
                    'medicalHistory',
                    'fetchPatients'
                );
                
                expect(error.getUserMessage()).toBe(
                    "Access denied: missing permission 'patients.read' for field 'medicalHistory' in operation 'fetchPatients'"
                );
            });

            it('should return message with field only', () => {
                const error = new SemblePermissionError(
                    'Access denied',
                    'patients.read',
                    'medicalHistory'
                );
                
                expect(error.getUserMessage()).toBe(
                    "Access denied: missing permission 'patients.read' for field 'medicalHistory'"
                );
            });

            it('should return message with operation only', () => {
                const error = new SemblePermissionError(
                    'Access denied',
                    'patients.read',
                    undefined,
                    'fetchPatients'
                );
                
                expect(error.getUserMessage()).toBe(
                    "Access denied: missing permission 'patients.read' in operation 'fetchPatients'"
                );
            });

            it('should return message with permission only', () => {
                const error = new SemblePermissionError(
                    'Access denied',
                    'patients.read'
                );
                
                expect(error.getUserMessage()).toBe(
                    "Access denied: missing permission 'patients.read'"
                );
            });
        });

        describe('SembleValidationError getUserMessage', () => {
            it('should return message with field and constraints', () => {
                const error = new SembleValidationError(
                    'Validation failed',
                    'email',
                    'invalid-email',
                    ['must be valid email', 'must not be empty']
                );
                
                expect(error.getUserMessage()).toBe(
                    "Validation failed for 'email': must be valid email, must not be empty"
                );
            });

            it('should return original message without field or constraints', () => {
                const error = new SembleValidationError('Validation failed');
                
                expect(error.getUserMessage()).toBe('Validation failed');
            });

            it('should return original message without constraints', () => {
                const error = new SembleValidationError(
                    'Validation failed',
                    'email',
                    'test@example.com',
                    []
                );
                
                expect(error.getUserMessage()).toBe('Validation failed');
            });
        });

        describe('SembleConfigError getUserMessage', () => {
            it('should return message with config key', () => {
                const error = new SembleConfigError(
                    'Invalid configuration',
                    'apiKey'
                );
                
                expect(error.getUserMessage()).toBe(
                    "Configuration error for 'apiKey': Invalid configuration"
                );
            });

            it('should return original message without config key', () => {
                const error = new SembleConfigError('Invalid configuration');
                
                expect(error.getUserMessage()).toBe('Invalid configuration');
            });
        });
    });

    describe('SembleAPIError getSeverityFromStatus', () => {
        it('should return high severity for server errors (500+)', () => {
            const error500 = new SembleAPIError('Server error', 'SERVER_ERROR', 500);
            const error503 = new SembleAPIError('Service unavailable', 'SERVICE_UNAVAILABLE', 503);
            
            expect(error500.severity).toBe('high');
            expect(error503.severity).toBe('high');
        });

        it('should return medium severity for rate limiting (429)', () => {
            const error = new SembleAPIError('Rate limited', 'RATE_LIMITED', 429);
            expect(error.severity).toBe('medium');
        });

        it('should return low severity for client errors (400-499)', () => {
            const error400 = new SembleAPIError('Bad request', 'BAD_REQUEST', 400);
            const error404 = new SembleAPIError('Not found', 'NOT_FOUND', 404);
            
            expect(error400.severity).toBe('low');
            expect(error404.severity).toBe('low');
        });

        it('should return medium severity for no status code', () => {
            const error = new SembleAPIError('Unknown error', 'UNKNOWN');
            expect(error.severity).toBe('medium');
        });

        it('should return medium severity for success codes (200-299)', () => {
            const error200 = new SembleAPIError('Unexpected success', 'SUCCESS', 200);
            const error201 = new SembleAPIError('Unexpected created', 'CREATED', 201);
            
            expect(error200.severity).toBe('medium');
            expect(error201.severity).toBe('medium');
        });
    });

    describe('SembleNetworkError', () => {
        it('should create network error with default values', () => {
            const error = new SembleNetworkError('Network connection failed');
            
            expect(error).toBeInstanceOf(SembleError);
            expect(error).toBeInstanceOf(SembleNetworkError);
            expect(error.message).toBe('Network connection failed');
            expect(error.code).toBe('NETWORK_ERROR');
            expect(error.category).toBe('network');
            expect(error.severity).toBe('medium');
            expect(error.originalError).toBeUndefined();
            expect(error.url).toBeUndefined();
            expect(error.timeout).toBeUndefined();
        });

        it('should create network error with all parameters', () => {
            const originalError = new Error('Connection refused');
            const context: ErrorContext = { operation: 'fetchData' };
            
            const error = new SembleNetworkError(
                'Failed to connect to API',
                'ECONNREFUSED',
                originalError,
                'https://api.semble.io/graphql',
                5000,
                context
            );
            
            expect(error.message).toBe('Failed to connect to API');
            expect(error.code).toBe('ECONNREFUSED');
            expect(error.originalError).toBe(originalError);
            expect(error.url).toBe('https://api.semble.io/graphql');
            expect(error.timeout).toBe(5000);
            expect(error.context).toBe(context);
        });

        it('should return user-friendly message', () => {
            const error = new SembleNetworkError('Technical network details');
            
            expect(error.getUserMessage()).toBe(
                'Network connection error - please check your internet connection and try again'
            );
        });

        it('should be retryable', () => {
            const error = new SembleNetworkError('Network error');
            expect(error.isRetryable()).toBe(true);
        });

        it('should handle different network error codes', () => {
            const econnrefused = new SembleNetworkError('Connection refused', 'ECONNREFUSED');
            const enotfound = new SembleNetworkError('Host not found', 'ENOTFOUND');
            const timeout = new SembleNetworkError('Request timeout', 'TIMEOUT');
            
            expect(econnrefused.code).toBe('ECONNREFUSED');
            expect(enotfound.code).toBe('ENOTFOUND');
            expect(timeout.code).toBe('TIMEOUT');
            
            expect(econnrefused.isRetryable()).toBe(true);
            expect(enotfound.isRetryable()).toBe(true);
            expect(timeout.isRetryable()).toBe(true);
        });
    });

    describe('SembleErrorFactory', () => {
        describe('createError', () => {
            it('should return existing SembleError unchanged', () => {
                const originalError = new SembleError('Original error', 'ORIGINAL');
                const result = SembleErrorFactory.createError(originalError);
                
                expect(result).toBe(originalError);
            });

            it('should create SembleAPIError from HTTP error with response', () => {
                const httpError = {
                    message: 'Request failed',
                    response: { status: 404, data: { error: 'Not found' } }
                };
                
                const result = SembleErrorFactory.createError(httpError);
                
                expect(result).toBeInstanceOf(SembleAPIError);
                expect(result.message).toBe('Request failed');
                expect((result as SembleAPIError).statusCode).toBe(404);
                expect((result as SembleAPIError).response).toBe(httpError.response);
            });

            it('should create SembleAPIError from error with status', () => {
                const statusError = {
                    message: 'Bad request',
                    status: 400
                };
                
                const result = SembleErrorFactory.createError(statusError);
                
                expect(result).toBeInstanceOf(SembleAPIError);
                expect((result as SembleAPIError).statusCode).toBe(400);
            });

            it('should create SembleAPIError from error with statusCode', () => {
                const statusCodeError = {
                    message: 'Server error',
                    statusCode: 500
                };
                
                const result = SembleErrorFactory.createError(statusCodeError);
                
                expect(result).toBeInstanceOf(SembleAPIError);
                expect((result as SembleAPIError).statusCode).toBe(500);
            });

            it('should create SembleNetworkError from connection errors', () => {
                const econnrefusedError = { code: 'ECONNREFUSED', message: 'Connection refused' };
                const enotfoundError = { code: 'ENOTFOUND', message: 'Host not found' };
                const timeoutError = { code: 'TIMEOUT', message: 'Request timeout' };
                
                const result1 = SembleErrorFactory.createError(econnrefusedError);
                const result2 = SembleErrorFactory.createError(enotfoundError);
                const result3 = SembleErrorFactory.createError(timeoutError);
                
                expect(result1).toBeInstanceOf(SembleNetworkError);
                expect(result2).toBeInstanceOf(SembleNetworkError);
                expect(result3).toBeInstanceOf(SembleNetworkError);
                
                expect(result1.code).toBe('ECONNREFUSED');
                expect(result2.code).toBe('ENOTFOUND');
                expect(result3.code).toBe('TIMEOUT');
            });

            it('should create SembleValidationError from validation errors', () => {
                const validationError = {
                    name: 'ValidationError',
                    message: 'Validation failed',
                    field: 'email',
                    value: 'invalid',
                    constraints: ['must be valid email']
                };
                
                const result = SembleErrorFactory.createError(validationError);
                
                expect(result).toBeInstanceOf(SembleValidationError);
                expect((result as SembleValidationError).field).toBe('email');
                expect((result as SembleValidationError).value).toBe('invalid');
                expect((result as SembleValidationError).constraints).toEqual(['must be valid email']);
            });

            it('should create SembleValidationError from VALIDATION_ERROR code', () => {
                const validationError = {
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed'
                };
                
                const result = SembleErrorFactory.createError(validationError);
                
                expect(result).toBeInstanceOf(SembleValidationError);
            });

            it('should create SemblePermissionError from permission errors', () => {
                const permissionError = {
                    code: 'PERMISSION_DENIED',
                    message: 'Access denied',
                    requiredPermission: 'patients.read',
                    field: 'medicalHistory'
                };
                const context: ErrorContext = { operation: 'fetchPatients' };
                
                const result = SembleErrorFactory.createError(permissionError, context);
                
                expect(result).toBeInstanceOf(SemblePermissionError);
                expect((result as SemblePermissionError).requiredPermission).toBe('patients.read');
                expect((result as SemblePermissionError).field).toBe('medicalHistory');
                expect((result as SemblePermissionError).operation).toBe('fetchPatients');
            });

            it('should create SembleAuthError from authentication errors', () => {
                const authError1 = {
                    code: 'UNAUTHENTICATED',
                    message: 'Authentication failed',
                    credential: 'api_key',
                    hint: 'Check your token'
                };
                
                const authError2 = {
                    name: 'AuthenticationError',
                    message: 'Invalid credentials'
                };
                
                const result1 = SembleErrorFactory.createError(authError1);
                const result2 = SembleErrorFactory.createError(authError2);
                
                expect(result1).toBeInstanceOf(SembleAuthError);
                expect(result2).toBeInstanceOf(SembleAuthError);
                
                expect((result1 as SembleAuthError).credential).toBe('api_key');
                expect((result1 as SembleAuthError).hint).toBe('Check your token');
            });

            it('should create generic SembleError for unknown errors', () => {
                const unknownError = {
                    message: 'Something went wrong'
                };
                
                const result = SembleErrorFactory.createError(unknownError);
                
                expect(result).toBeInstanceOf(SembleError);
                expect(result.message).toBe('Something went wrong');
                expect(result.code).toBe('UNKNOWN_ERROR');
            });

            it('should handle errors without message', () => {
                const noMessageError = { code: 'CUSTOM_ERROR' };
                
                const result = SembleErrorFactory.createError(noMessageError);
                
                expect(result.message).toBe('Unknown error occurred');
                expect(result.code).toBe('CUSTOM_ERROR');
            });

            it('should apply context to created errors', () => {
                const context: ErrorContext = {
                    operation: 'testOperation',
                    userId: 'user123'
                };
                
                const error = { message: 'Test error' };
                const result = SembleErrorFactory.createError(error, context);
                
                expect(result.context).toBe(context);
            });
        });

        describe('createConfigError', () => {
            it('should create configuration error with all parameters', () => {
                const error = SembleErrorFactory.createConfigError(
                    'apiKey',
                    'API key is required',
                    'string',
                    undefined
                );
                
                expect(error).toBeInstanceOf(SembleConfigError);
                expect(error.message).toBe('API key is required');
                expect(error.configKey).toBe('apiKey');
                expect(error.expectedType).toBe('string');
                expect(error.actualValue).toBeUndefined();
            });

            it('should create configuration error with minimal parameters', () => {
                const error = SembleErrorFactory.createConfigError(
                    'timeout',
                    'Invalid timeout value'
                );
                
                expect(error).toBeInstanceOf(SembleConfigError);
                expect(error.configKey).toBe('timeout');
                expect(error.expectedType).toBeUndefined();
                expect(error.actualValue).toBeUndefined();
            });
        });

        describe('createPermissionError', () => {
            it('should create permission error with all parameters', () => {
                const error = SembleErrorFactory.createPermissionError(
                    'patients.read',
                    'medicalHistory',
                    'fetchPatients'
                );
                
                expect(error).toBeInstanceOf(SemblePermissionError);
                expect(error.requiredPermission).toBe('patients.read');
                expect(error.field).toBe('medicalHistory');
                expect(error.operation).toBe('fetchPatients');
                expect(error.message).toBe(
                    "Access denied: missing permission 'patients.read' for field 'medicalHistory' in operation 'fetchPatients'"
                );
            });

            it('should create permission error with minimal parameters', () => {
                const error = SembleErrorFactory.createPermissionError('admin.access');
                
                expect(error.requiredPermission).toBe('admin.access');
                expect(error.field).toBeUndefined();
                expect(error.operation).toBeUndefined();
                expect(error.message).toBe(
                    "Access denied: missing permission 'admin.access'"
                );
            });
        });
    });

    describe('ValidationError (Extended)', () => {
        it('should create validation error with field errors', () => {
            const fieldErrors = [
                { field: 'email', message: 'Invalid email format', value: 'invalid-email' },
                { field: 'age', message: 'Must be positive number', value: -5 }
            ];
            
            const error = new ValidationError('Multiple validation errors', fieldErrors);
            
            expect(error).toBeInstanceOf(SembleError);
            expect(error).toBeInstanceOf(ValidationError);
            expect(error.name).toBe('ValidationError');
            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.category).toBe('validation');
            expect(error.severity).toBe('high');
            expect(error.fieldErrors).toBe(fieldErrors);
        });

        it('should create validation error with empty field errors', () => {
            const error = new ValidationError('General validation error');
            
            expect(error.fieldErrors).toEqual([]);
        });

        it('should create validation error with context', () => {
            const context: ErrorContext = { operation: 'createPatient' };
            const error = new ValidationError('Validation failed', [], context);
            
            expect(error.context).toBe(context);
        });

        it('should get field errors for specific field', () => {
            const fieldErrors = [
                { field: 'email', message: 'Invalid format' },
                { field: 'email', message: 'Must not be empty' },
                { field: 'age', message: 'Must be positive' }
            ];
            
            const error = new ValidationError('Multiple errors', fieldErrors);
            const emailErrors = error.getFieldErrors('email');
            
            expect(emailErrors).toHaveLength(2);
            expect(emailErrors[0].message).toBe('Invalid format');
            expect(emailErrors[1].message).toBe('Must not be empty');
        });

        it('should return empty array for non-existent field', () => {
            const error = new ValidationError('Test error', []);
            const fieldErrors = error.getFieldErrors('nonExistent');
            
            expect(fieldErrors).toEqual([]);
        });

        it('should check if field has errors', () => {
            const fieldErrors = [
                { field: 'email', message: 'Invalid format' },
                { field: 'age', message: 'Must be positive' }
            ];
            
            const error = new ValidationError('Multiple errors', fieldErrors);
            
            expect(error.hasFieldError('email')).toBe(true);
            expect(error.hasFieldError('age')).toBe(true);
            expect(error.hasFieldError('name')).toBe(false);
        });

        it('should get detailed message with field errors', () => {
            const fieldErrors = [
                { field: 'email', message: 'Invalid format' },
                { field: 'age', message: 'Must be positive' }
            ];
            
            const error = new ValidationError('Validation failed', fieldErrors);
            const detailedMessage = error.getDetailedMessage();
            
            expect(detailedMessage).toBe(
                'Validation failed - Field errors: email: Invalid format; age: Must be positive'
            );
        });

        it('should return basic message when no field errors', () => {
            const error = new ValidationError('General validation error');
            const detailedMessage = error.getDetailedMessage();
            
            expect(detailedMessage).toBe('General validation error');
        });

        it('should handle field errors without values', () => {
            const fieldErrors = [
                { field: 'email', message: 'Required field' }
            ];
            
            const error = new ValidationError('Validation failed', fieldErrors);
            
            expect(error.fieldErrors[0].value).toBeUndefined();
        });
    });
});
