/**
 * @fileoverview Error mapping and translation utilities for Semble API integration
 * @description Transforms Semble API errors into user-friendly messages with GraphQL error parsing and permission handling
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Core.ErrorMapper
 * @since 2.0.0
 */

import { 
    SembleError, 
    SembleAPIError, 
    SembleValidationError, 
    SembleConfigError, 
    SembleAuthError,
    SemblePermissionError,
    ErrorContext 
} from './SembleError';
import { 
    SembleGraphQLError, 
    SemblePermissionError as PermissionErrorType,
    SembleNetworkError 
} from '../types/SembleTypes';

/**
 * Configuration for error mapping behavior
 */
export interface ErrorMapperConfig {
    includeStackTrace: boolean;
    includeContext: boolean;
    simplifyMessages: boolean;
    logErrors: boolean;
}

/**
 * Default error mapper configuration
 */
export const DEFAULT_ERROR_MAPPER_CONFIG: ErrorMapperConfig = {
    includeStackTrace: false,
    includeContext: true,
    simplifyMessages: true,
    logErrors: true
};

/**
 * Error mapping and translation utilities
 * 
 * Provides comprehensive error handling for:
 * - GraphQL error parsing and transformation
 * - Permission error mapping with field-level granularity
 * - User-friendly message generation
 * - Error categorization and severity assessment
 * - Integration with n8n error handling patterns
 */
export class ErrorMapper {
    private config: ErrorMapperConfig;

    constructor(config: Partial<ErrorMapperConfig> = {}) {
        this.config = { ...DEFAULT_ERROR_MAPPER_CONFIG, ...config };
    }

    /**
     * Maps any error to appropriate SembleError subclass
     */
    public mapError(error: any, context: ErrorContext = {}): SembleError {
        if (error instanceof SembleError) {
            return error;
        }

        // Handle GraphQL errors
        if (this.isGraphQLError(error)) {
            return this.mapGraphQLError(error, context);
        }

        // Handle HTTP/Network errors
        if (this.isHttpError(error)) {
            return this.mapHttpError(error, context);
        }

        // Handle validation errors
        if (this.isValidationError(error)) {
            return this.mapValidationError(error, context);
        }

        // Handle permission errors
        if (this.isPermissionError(error)) {
            return this.mapPermissionError(error, context);
        }

        // Default to generic SembleError
        return new SembleError(
            this.sanitizeMessage(error.message || 'Unknown error occurred'),
            'UNKNOWN_ERROR',
            context
        );
    }

    /**
     * Maps GraphQL errors from Semble API responses
     */
    public mapGraphQLError(error: SembleGraphQLError | any, context: ErrorContext = {}): SembleError {
        const message = error.message || 'GraphQL operation failed';
        const code = error.extensions?.code || 'GRAPHQL_ERROR';

        // Handle permission-specific GraphQL errors
        if (error.extensions?.permission) {
            return new SemblePermissionError(
                this.generatePermissionMessage(error.extensions.permission, error.extensions.field),
                error.extensions.permission,
                error.extensions.field,
                context.operation,
                context
            );
        }

        // Handle validation errors from GraphQL
        if (code === 'BAD_USER_INPUT' || code === 'VALIDATION_ERROR') {
            return new SembleValidationError(
                message,
                error.extensions?.field,
                error.extensions?.value,
                error.extensions?.constraints,
                context
            );
        }

        // Handle authentication errors
        if (code === 'UNAUTHENTICATED' || code === 'FORBIDDEN') {
            return new SembleAuthError(
                message,
                code,
                'api_key',
                'Please check your API credentials and permissions',
                context
            );
        }

        // Generic API error
        return new SembleAPIError(
            message,
            code,
            undefined,
            context,
            error
        );
    }

    /**
     * Maps HTTP errors to appropriate SembleError types
     */
    public mapHttpError(error: any, context: ErrorContext = {}): SembleError {
        const statusCode = error.response?.status || error.status || 500;
        const message = this.getHttpErrorMessage(statusCode, error);
        const responseData = error.response?.data || error.data;

        // Authentication errors
        if (statusCode === 401) {
            return new SembleAuthError(
                'Authentication failed - please check your API credentials',
                'AUTHENTICATION_FAILED',
                'api_key',
                'Verify your API key is correct and has not expired',
                context
            );
        }

        // Permission errors
        if (statusCode === 403) {
            return new SemblePermissionError(
                'Access denied - insufficient permissions',
                'unknown',
                undefined,
                context.operation,
                context
            );
        }

        // Not found errors
        if (statusCode === 404) {
            return new SembleAPIError(
                `Resource not found: ${context.resource || 'Unknown resource'}`,
                'RESOURCE_NOT_FOUND',
                statusCode,
                context,
                responseData
            );
        }

        // Rate limiting
        if (statusCode === 429) {
            return new SembleAPIError(
                'API rate limit exceeded - please try again later',
                'RATE_LIMIT_EXCEEDED',
                statusCode,
                context,
                responseData
            );
        }

        // Server errors
        if (statusCode >= 500) {
            return new SembleAPIError(
                'Semble API server error - please try again',
                'SERVER_ERROR',
                statusCode,
                context,
                responseData
            );
        }

        // Generic API error
        return new SembleAPIError(
            message,
            'HTTP_ERROR',
            statusCode,
            context,
            responseData
        );
    }

    /**
     * Maps validation errors
     */
    public mapValidationError(error: any, context: ErrorContext = {}): SembleValidationError {
        return new SembleValidationError(
            error.message || 'Validation failed',
            error.field,
            error.value,
            error.constraints || [error.message],
            context
        );
    }

    /**
     * Maps permission errors with field-level granularity
     */
    public mapPermissionError(error: PermissionErrorType | any, context: ErrorContext = {}): SemblePermissionError {
        const permission = error.requiredPermission || 'unknown';
        const field = error.field || context.metadata?.field;
        
        return new SemblePermissionError(
            this.generatePermissionMessage(permission, field),
            permission,
            field,
            context.operation,
            context
        );
    }

    /**
     * Generates user-friendly permission error messages
     */
    private generatePermissionMessage(permission: string, field?: string): string {
        const baseMessage = `Access denied - missing permission: ${permission}`;
        
        if (field) {
            return `${baseMessage} for field '${field}'`;
        }
        
        return baseMessage;
    }

    /**
     * Gets appropriate HTTP error message based on status code
     */
    private getHttpErrorMessage(statusCode: number, error: any): string {
        const defaultMessages: Record<number, string> = {
            400: 'Bad request - please check your input data',
            401: 'Authentication failed - invalid credentials',
            403: 'Access denied - insufficient permissions',
            404: 'Resource not found',
            409: 'Conflict - resource already exists or is in use',
            422: 'Validation failed - please check your input data',
            429: 'Rate limit exceeded - please try again later',
            500: 'Internal server error - please try again',
            502: 'Bad gateway - service temporarily unavailable',
            503: 'Service unavailable - please try again later',
            504: 'Gateway timeout - request took too long'
        };

        return error.message || 
               defaultMessages[statusCode] || 
               `HTTP error ${statusCode}`;
    }

    /**
     * Sanitizes error messages for user display
     */
    private sanitizeMessage(message: string): string {
        if (!this.config.simplifyMessages) {
            return message;
        }

        // Remove technical stack traces and internal references
        return message
            .replace(/at .*\(.*\)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Type guards for error detection
     */
    private isGraphQLError(error: any): boolean {
        return error && (
            error.extensions ||
            (error.message && error.locations) ||
            error.path
        );
    }

    private isHttpError(error: any): boolean {
        return error && (
            error.response?.status ||
            error.status ||
            error.statusCode
        );
    }

    private isValidationError(error: any): boolean {
        return error && (
            error.name === 'ValidationError' ||
            error.code === 'VALIDATION_ERROR' ||
            (error.field && error.constraints)
        );
    }

    private isPermissionError(error: any): boolean {
        return error && (
            error.code === 'PERMISSION_DENIED' ||
            error.name === 'PermissionError' ||
            error.requiredPermission ||
            error.__MISSING_PERMISSION__
        );
    }

    /**
     * Processes field-level permission errors for response sanitization
     * Replaces restricted fields with permission error objects while maintaining schema structure
     */
    public processFieldPermissions(data: any, errors: SembleGraphQLError[] = []): any {
        if (!data || typeof data !== 'object') {
            return data;
        }

        // Find permission errors in GraphQL response
        const permissionErrors = errors.filter(error => 
            error.extensions?.code === 'PERMISSION_DENIED'
        );

        if (permissionErrors.length === 0) {
            return data;
        }

        // Clone data to avoid mutation
        const processedData = JSON.parse(JSON.stringify(data));

        // Replace restricted fields with permission error objects
        permissionErrors.forEach(error => {
            if (error.path && error.extensions?.field) {
                this.setNestedProperty(
                    processedData,
                    error.path,
                    SemblePermissionError.createFieldPlaceholder(
                        error.extensions.field,
                        error.extensions.permission || 'unknown'
                    )
                );
            }
        });

        return processedData;
    }

    /**
     * Sets nested property value following GraphQL error path
     */
    private setNestedProperty(obj: any, path: Array<string | number>, value: any): void {
        let current = obj;
        
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            if (!(key in current)) {
                current[key] = typeof path[i + 1] === 'number' ? [] : {};
            }
            current = current[key];
        }
        
        current[path[path.length - 1]] = value;
    }

    /**
     * Logs errors based on configuration
     */
    private logError(error: SembleError): void {
        if (!this.config.logErrors) {
            return;
        }

        const logData = {
            message: error.message,
            code: error.code,
            category: error.category,
            severity: error.severity,
            ...(this.config.includeContext && { context: error.context }),
            ...(this.config.includeStackTrace && { stack: error.stack })
        };

        // Use appropriate log level based on severity
        switch (error.severity) {
            case 'critical':
                console.error('[SEMBLE CRITICAL]', logData);
                break;
            case 'high':
                console.error('[SEMBLE ERROR]', logData);
                break;
            case 'medium':
                console.warn('[SEMBLE WARNING]', logData);
                break;
            case 'low':
                console.info('[SEMBLE INFO]', logData);
                break;
        }
    }
}

/**
 * Default error mapper instance
 */
export const defaultErrorMapper = new ErrorMapper();

/**
 * Convenience function for quick error mapping
 */
export function mapError(error: any, context: ErrorContext = {}): SembleError {
    return defaultErrorMapper.mapError(error, context);
}

/**
 * Convenience function for processing field permissions
 */
export function processFieldPermissions(data: any, errors: SembleGraphQLError[] = []): any {
    return defaultErrorMapper.processFieldPermissions(data, errors);
}
