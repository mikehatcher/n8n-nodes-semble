/**
 * @fileoverview Tests for ErrorMapper and error translation utilities
 * @description Comprehensive test suite for error mapping, GraphQL error parsing, and user message generation
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Core.ErrorMapper
 * @since 2.0.0
 */

import { ErrorMapper, defaultErrorMapper, mapError, processFieldPermissions } from '../../core/ErrorMapper';
import { 
    SembleError, 
    SembleAPIError, 
    SembleAuthError, 
    SemblePermissionError, 
    SembleValidationError,
    ErrorContext 
} from '../../core/SembleError';

describe('ErrorMapper', () => {
    let errorMapper: ErrorMapper;

    beforeEach(() => {
        errorMapper = new ErrorMapper();
        jest.clearAllMocks();
    });

    describe('Constructor and Configuration', () => {
        it('should create ErrorMapper with default configuration', () => {
            const mapper = new ErrorMapper();
            expect(mapper).toBeInstanceOf(ErrorMapper);
        });

        it('should create ErrorMapper with custom configuration', () => {
            const customConfig = {
                includeStackTrace: true,
                includeContext: false,
                simplifyMessages: false,
                logErrors: false
            };
            
            const mapper = new ErrorMapper(customConfig);
            expect(mapper).toBeInstanceOf(ErrorMapper);
        });
    });

    describe('Error Mapping - Core Functionality', () => {
        it('should return SembleError instances as-is', () => {
            const originalError = new SembleError('Test error', 'TEST_CODE');
            const mappedError = errorMapper.mapError(originalError);
            
            expect(mappedError).toBe(originalError);
        });

        it('should map generic errors to SembleError', () => {
            const genericError = new Error('Generic error message');
            const mappedError = errorMapper.mapError(genericError);
            
            expect(mappedError).toBeInstanceOf(SembleError);
            expect(mappedError.message).toBe('Generic error message');
            expect(mappedError.code).toBe('UNKNOWN_ERROR');
            expect(mappedError.category).toBe('unknown');
        });

        it('should handle errors without message', () => {
            const errorWithoutMessage = {};
            const mappedError = errorMapper.mapError(errorWithoutMessage);
            
            expect(mappedError).toBeInstanceOf(SembleError);
            expect(mappedError.message).toBe('Unknown error occurred');
            expect(mappedError.code).toBe('UNKNOWN_ERROR');
        });

        it('should include context in mapped errors', () => {
            const context: ErrorContext = {
                operation: 'fetchPatients',
                resource: 'patients',
                userId: 'user123'
            };

            const error = new Error('Test error');
            const mappedError = errorMapper.mapError(error, context);
            
            expect(mappedError.context).toEqual(context);
        });
    });

    describe('GraphQL Error Mapping', () => {
        it('should map GraphQL permission errors', () => {
            const graphqlError = {
                message: 'Access denied for field',
                extensions: {
                    code: 'FORBIDDEN',
                    permission: 'patients.read',
                    field: 'medicalHistory'
                }
            };

            const mappedError = errorMapper.mapGraphQLError(graphqlError);
            
            expect(mappedError).toBeInstanceOf(SemblePermissionError);
            expect(mappedError.message).toContain('patients.read');
            expect(mappedError.message).toContain('medicalHistory');
        });

        it('should map GraphQL validation errors', () => {
            const graphqlError = {
                message: 'Invalid input data',
                extensions: {
                    code: 'BAD_USER_INPUT',
                    field: 'email',
                    value: 'invalid-email',
                    constraints: ['must be valid email']
                }
            };

            const mappedError = errorMapper.mapGraphQLError(graphqlError);
            
            expect(mappedError).toBeInstanceOf(SembleValidationError);
            expect(mappedError.message).toBe('Invalid input data');
        });

        it('should map GraphQL authentication errors', () => {
            const graphqlError = {
                message: 'Authentication required',
                extensions: {
                    code: 'UNAUTHENTICATED'
                }
            };

            const mappedError = errorMapper.mapGraphQLError(graphqlError);
            
            expect(mappedError).toBeInstanceOf(SembleAuthError);
            expect(mappedError.code).toBe('UNAUTHENTICATED');
        });

        it('should map generic GraphQL errors to SembleAPIError', () => {
            const graphqlError = {
                message: 'Unknown GraphQL error',
                extensions: {
                    code: 'INTERNAL_ERROR'
                }
            };

            const mappedError = errorMapper.mapGraphQLError(graphqlError);
            
            expect(mappedError).toBeInstanceOf(SembleAPIError);
            expect(mappedError.code).toBe('INTERNAL_ERROR');
        });
    });

    describe('HTTP Error Mapping', () => {
        it('should map 401 errors to authentication errors', () => {
            const httpError = {
                status: 401,
                response: {
                    status: 401,
                    data: { message: 'Invalid API key' }
                }
            };

            const mappedError = errorMapper.mapHttpError(httpError);
            
            expect(mappedError).toBeInstanceOf(SembleAuthError);
            expect(mappedError.code).toBe('AUTHENTICATION_FAILED');
            expect(mappedError.message).toContain('Authentication failed');
        });

        it('should map 403 errors to permission errors', () => {
            const httpError = {
                status: 403,
                response: {
                    status: 403,
                    data: { message: 'Insufficient permissions' }
                }
            };

            const mappedError = errorMapper.mapHttpError(httpError);
            
            expect(mappedError).toBeInstanceOf(SemblePermissionError);
            expect(mappedError.message).toContain('Access denied');
        });

        it('should map 404 errors to API errors', () => {
            const context: ErrorContext = { resource: 'patients' };
            const httpError = {
                status: 404,
                response: {
                    status: 404,
                    data: { message: 'Patient not found' }
                }
            };

            const mappedError = errorMapper.mapHttpError(httpError, context);
            
            expect(mappedError).toBeInstanceOf(SembleAPIError);
            expect(mappedError.code).toBe('RESOURCE_NOT_FOUND');
            expect(mappedError.message).toContain('patients');
        });

        it('should map 429 errors to rate limit errors', () => {
            const httpError = {
                status: 429,
                response: {
                    status: 429,
                    data: { message: 'Rate limit exceeded' }
                }
            };

            const mappedError = errorMapper.mapHttpError(httpError);
            
            expect(mappedError).toBeInstanceOf(SembleAPIError);
            expect(mappedError.code).toBe('RATE_LIMIT_EXCEEDED');
            expect(mappedError.message).toContain('rate limit');
        });

        it('should map 500+ errors to server errors', () => {
            const httpError = {
                status: 500,
                response: {
                    status: 500,
                    data: { message: 'Internal server error' }
                }
            };

            const mappedError = errorMapper.mapHttpError(httpError);
            
            expect(mappedError).toBeInstanceOf(SembleAPIError);
            expect(mappedError.code).toBe('SERVER_ERROR');
            expect(mappedError.message).toContain('server error');
        });

        it('should handle HTTP errors without response', () => {
            const httpError = {
                status: 500
            };

            const mappedError = errorMapper.mapHttpError(httpError);
            
            expect(mappedError).toBeInstanceOf(SembleAPIError);
            expect(mappedError.code).toBe('SERVER_ERROR');
        });
    });

    describe('Field Permission Processing', () => {
        it('should process field permissions in data', () => {
            const data = {
                patient: {
                    id: '123',
                    name: 'John Doe',
                    medicalHistory: 'restricted'
                }
            };

            const errors = [
                {
                    message: 'Access denied',
                    path: ['patient', 'medicalHistory'],
                    extensions: {
                        code: 'PERMISSION_DENIED',
                        permission: 'patients.read_medical_history',
                        field: 'medicalHistory'
                    }
                }
            ];

            const processedData = errorMapper.processFieldPermissions(data, errors);
            
            expect(processedData.patient.id).toBe('123');
            expect(processedData.patient.name).toBe('John Doe');
            expect(processedData.patient.medicalHistory).toHaveProperty('__MISSING_PERMISSION__', 'patients.read_medical_history');
            expect(processedData.patient.medicalHistory).toHaveProperty('__FIELD_NAME__', 'medicalHistory');
            expect(processedData.patient.medicalHistory).toHaveProperty('__ERROR_MESSAGE__');
        });

        it('should handle nested array paths in field permissions', () => {
            const data = {
                patients: [
                    { id: '1', name: 'John', medicalHistory: 'data1' },
                    { id: '2', name: 'Jane', medicalHistory: 'data2' }
                ]
            };

            const errors = [
                {
                    message: 'Access denied',
                    path: ['patients', 0, 'medicalHistory'],
                    extensions: {
                        code: 'PERMISSION_DENIED',
                        permission: 'patients.read_medical_history',
                        field: 'medicalHistory'
                    }
                }
            ];

            const processedData = errorMapper.processFieldPermissions(data, errors);
            
            expect(processedData.patients[0].medicalHistory).toHaveProperty('__MISSING_PERMISSION__', 'patients.read_medical_history');
            expect(processedData.patients[1].medicalHistory).toBe('data2');
        });

        it('should return original data when no errors', () => {
            const data = { patient: { id: '123', name: 'John Doe' } };
            const processedData = errorMapper.processFieldPermissions(data, []);
            
            expect(processedData).toEqual(data);
        });
    });

    describe('Convenience Functions', () => {
        it('should provide defaultErrorMapper instance', () => {
            expect(defaultErrorMapper).toBeInstanceOf(ErrorMapper);
        });

        it('should provide mapError convenience function', () => {
            const error = new Error('Test error');
            const mappedError = mapError(error);
            
            expect(mappedError).toBeInstanceOf(SembleError);
            expect(mappedError.message).toBe('Test error');
        });

        it('should provide processFieldPermissions convenience function', () => {
            const data = { test: 'data' };
            const processedData = processFieldPermissions(data, []);
            
            expect(processedData).toEqual(data);
        });
    });

    describe('Error Context Handling', () => {
        it('should preserve context through error mapping chain', () => {
            const context: ErrorContext = {
                operation: 'fetchPatients',
                resource: 'patients',
                userId: 'user123',
                requestId: 'req456',
                metadata: { source: 'test' }
            };

            const error = new Error('Test error');
            const mappedError = errorMapper.mapError(error, context);
            
            expect(mappedError.context).toEqual(context);
        });

        it('should handle missing context gracefully', () => {
            const error = new Error('Test error');
            const mappedError = errorMapper.mapError(error);
            
            expect(mappedError.context).toEqual({});
        });

        it('should merge context with error-specific information', () => {
            const context: ErrorContext = {
                operation: 'fetchPatients',
                userId: 'user123'
            };

            const httpError = {
                status: 404,
                response: { status: 404, data: { message: 'Not found' } }
            };

            const mappedError = errorMapper.mapHttpError(httpError, context);
            
            expect(mappedError.context).toEqual(context);
        });
    });
});
