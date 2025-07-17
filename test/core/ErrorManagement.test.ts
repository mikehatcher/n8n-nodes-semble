/**
 * @fileoverview Comprehensive tests for error management system including SembleError hierarchy and ErrorMapper
 * @description Tests error creation, mapping, translation, and field-level permission handling
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Core.ErrorManagement
 * @since Phase 1.3 - Error Management System
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
    ErrorContext,
    ErrorSeverity,
    ErrorCategory
} from '../../core/SembleError';

import {
    ErrorMapper,
    mapError,
    processFieldPermissions,
    DEFAULT_ERROR_MAPPER_CONFIG
} from '../../core/ErrorMapper';

import { SembleGraphQLError, SemblePermissionError as PermissionErrorType } from '../../types/SembleTypes';

describe('SembleError Base Class', () => {
    it('should create error with default values', () => {
        const error = new SembleError('Test message');
        
        expect(error.name).toBe('SembleError');
        expect(error.message).toBe('Test message');
        expect(error.code).toBe('SEMBLE_ERROR');
        expect(error.category).toBe('unknown');
        expect(error.severity).toBe('medium');
        expect(error.context).toEqual({});
        expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should serialize to JSON correctly', () => {
        const context = { operation: 'test' };
        const error = new SembleError('Test', 'TEST_CODE', context, 'api', 'low');
        const json = error.toJSON();

        expect(json.name).toBe('SembleError');
        expect(json.message).toBe('Test');
        expect(json.code).toBe('TEST_CODE');
        expect(json.category).toBe('api');
        expect(json.severity).toBe('low');
        expect(json.context).toEqual(context);
        expect(json.timestamp).toBeDefined();
        expect(json.stack).toBeDefined();
    });
});

describe('SembleAPIError', () => {
    it('should create API error with status code', () => {
        const error = new SembleAPIError('API failed', 'API_ERROR', 404);
        
        expect(error.name).toBe('SembleAPIError');
        expect(error.statusCode).toBe(404);
        expect(error.category).toBe('api');
        expect(error.severity).toBe('low'); // 4xx errors are low severity
    });
});

describe('ErrorMapper', () => {
    let errorMapper: ErrorMapper;

    beforeEach(() => {
        errorMapper = new ErrorMapper();
    });

    it('should use default configuration', () => {
        const mapper = new ErrorMapper();
        expect(mapper['config']).toEqual(DEFAULT_ERROR_MAPPER_CONFIG);
    });

    it('should return existing SembleError unchanged', () => {
        const sembleError = new SembleError('Test');
        const result = errorMapper.mapError(sembleError);
        
        expect(result).toBe(sembleError);
    });
});
