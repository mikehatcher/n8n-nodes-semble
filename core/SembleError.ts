/**
 * @fileoverview Custom error hierarchy for Semble API integration with structured error handling
 * @description Comprehensive error classes for GraphQL, API, validation, authentication, and permission errors
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Core.SembleError
 * @since 2.0.0
 */

/**
 * Error severity levels for categorization and logging
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error categories for classification and handling
 */
export type ErrorCategory = 'network' | 'authentication' | 'permission' | 'validation' | 'configuration' | 'api' | 'unknown';

/**
 * Additional context information for error tracking and debugging
 */
export interface ErrorContext {
    operation?: string;
    resource?: string;
    userId?: string;
    timestamp?: Date;
    requestId?: string;
    metadata?: Record<string, any>;
}

/**
 * Base error class for all Semble-related errors
 * 
 * Provides standardized error handling with:
 * - Structured error codes for programmatic handling
 * - Severity classification for logging and alerting
 * - Rich context information for debugging
 * - Category-based error organization
 * - Integration with n8n error handling patterns
 */
export class SembleError extends Error {
    public readonly code: string;
    public readonly category: ErrorCategory;
    public readonly severity: ErrorSeverity;
    public readonly context: ErrorContext;
    public readonly timestamp: Date;

    constructor(
        message: string,
        code: string = 'SEMBLE_ERROR',
        context: ErrorContext = {},
        category: ErrorCategory = 'unknown',
        severity: ErrorSeverity = 'medium'
    ) {
        super(message);
        this.name = 'SembleError';
        this.code = code;
        this.category = category;
        this.severity = severity;
        this.context = context;
        this.timestamp = new Date();

        // Maintain proper stack trace for V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, SembleError);
        }
    }

    /**
     * Converts error to JSON for logging and serialization
     */
    public toJSON(): Record<string, any> {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            category: this.category,
            severity: this.severity,
            context: this.context,
            timestamp: this.timestamp.toISOString(),
            stack: this.stack
        };
    }

    /**
     * Generates user-friendly error message
     */
    public getUserMessage(): string {
        return this.message;
    }

    /**
     * Checks if error is retryable based on category and code
     */
    public isRetryable(): boolean {
        // Network errors and rate limits are typically retryable
        if (this.category === 'network' || this.code === 'RATE_LIMIT_EXCEEDED') {
            return true;
        }

        // Authentication and permission errors are not retryable
        if (this.category === 'authentication' || this.category === 'permission') {
            return false;
        }

        // Configuration and validation errors are not retryable
        if (this.category === 'configuration' || this.category === 'validation') {
            return false;
        }

        // API errors may be retryable depending on status
        return false;
    }
}

/**
 * API-specific errors from Semble GraphQL endpoints
 * 
 * Handles errors returned by the Semble API including:
 * - HTTP status code mapping
 * - GraphQL error parsing
 * - Rate limiting information
 * - Server error details
 */
export class SembleAPIError extends SembleError {
    public readonly statusCode?: number;
    public readonly response?: any;

    constructor(
        message: string,
        code: string = 'API_ERROR',
        statusCode?: number,
        context: ErrorContext = {},
        response?: any
    ) {
        super(message, code, context, 'api', SembleAPIError.getSeverityFromStatus(statusCode));
        this.name = 'SembleAPIError';
        this.statusCode = statusCode;
        this.response = response;
    }

    private static getSeverityFromStatus(statusCode?: number): ErrorSeverity {
        if (!statusCode) return 'medium';
        
        if (statusCode >= 500) return 'high';
        if (statusCode === 429) return 'medium'; // Rate limiting
        if (statusCode >= 400) return 'low';
        
        return 'medium';
    }

    public isRetryable(): boolean {
        // Rate limiting is retryable
        if (this.statusCode === 429) return true;
        
        // Server errors may be retryable
        if (this.statusCode && this.statusCode >= 500) return true;
        
        // Client errors are not retryable
        return false;
    }
}

/**
 * Authentication and authorization errors
 * 
 * Covers scenarios including:
 * - Invalid API keys
 * - Expired tokens
 * - Missing authentication headers
 * - OAuth flow errors
 */
export class SembleAuthError extends SembleError {
    public readonly credential: string;
    public readonly hint?: string;

    constructor(
        message: string,
        code: string = 'AUTH_ERROR',
        credential: string = 'unknown',
        hint?: string,
        context: ErrorContext = {}
    ) {
        super(message, code, context, 'authentication', 'high');
        this.name = 'SembleAuthError';
        this.credential = credential;
        this.hint = hint;
    }

    public getUserMessage(): string {
        let message = this.message;
        if (this.hint) {
            message += ` ${this.hint}`;
        }
        return message;
    }

    public isRetryable(): boolean {
        return false; // Authentication errors require manual intervention
    }
}

/**
 * Permission-specific errors with field-level granularity
 * 
 * Handles Semble's permission system including:
 * - Field-level access restrictions
 * - Operation-specific permissions
 * - Role-based access control
 * - Permission inheritance
 */
export class SemblePermissionError extends SembleError {
    public readonly requiredPermission: string;
    public readonly field?: string;
    public readonly operation?: string;

    constructor(
        message: string,
        requiredPermission: string,
        field?: string,
        operation?: string,
        context: ErrorContext = {}
    ) {
        super(message, 'PERMISSION_DENIED', context, 'permission', 'medium');
        this.name = 'SemblePermissionError';
        this.requiredPermission = requiredPermission;
        this.field = field;
        this.operation = operation;
    }

    public getUserMessage(): string {
        let message = `Access denied: missing permission '${this.requiredPermission}'`;
        
        if (this.field) {
            message += ` for field '${this.field}'`;
        }
        
        if (this.operation) {
            message += ` in operation '${this.operation}'`;
        }
        
        return message;
    }

    public isRetryable(): boolean {
        return false; // Permission errors require administrative changes
    }

    /**
     * Creates a placeholder object for restricted fields
     */
    public static createFieldPlaceholder(field: string, permission: string): object {
        return {
            __MISSING_PERMISSION__: permission,
            __FIELD_NAME__: field,
            __ERROR_MESSAGE__: `Access denied for field '${field}' - missing permission '${permission}'`
        };
    }
}

/**
 * Data validation errors with field-specific details
 * 
 * Covers input validation scenarios:
 * - Required field validation
 * - Format validation (email, phone, etc.)
 * - Range and constraint validation
 * - Custom business rule validation
 */
export class SembleValidationError extends SembleError {
    public readonly field?: string;
    public readonly value?: any;
    public readonly constraints: string[];

    constructor(
        message: string,
        field?: string,
        value?: any,
        constraints: string[] = [],
        context: ErrorContext = {}
    ) {
        super(message, 'VALIDATION_ERROR', context, 'validation', 'low');
        this.name = 'SembleValidationError';
        this.field = field;
        this.value = value;
        this.constraints = constraints;
    }

    public getUserMessage(): string {
        if (this.field && this.constraints.length > 0) {
            return `Validation failed for '${this.field}': ${this.constraints.join(', ')}`;
        }
        return this.message;
    }

    public isRetryable(): boolean {
        return false; // Validation errors require input correction
    }
}

/**
 * Configuration-related errors
 * 
 * Handles setup and configuration issues:
 * - Missing required configuration
 * - Invalid configuration values
 * - Environment-specific issues
 * - Integration setup problems
 */
export class SembleConfigError extends SembleError {
    public readonly configKey?: string;
    public readonly expectedType?: string;
    public readonly actualValue?: any;

    constructor(
        message: string,
        configKey?: string,
        expectedType?: string,
        actualValue?: any,
        context: ErrorContext = {}
    ) {
        super(message, 'CONFIG_ERROR', context, 'configuration', 'high');
        this.name = 'SembleConfigError';
        this.configKey = configKey;
        this.expectedType = expectedType;
        this.actualValue = actualValue;
    }

    public getUserMessage(): string {
        if (this.configKey) {
            return `Configuration error for '${this.configKey}': ${this.message}`;
        }
        return this.message;
    }

    public isRetryable(): boolean {
        return false; // Configuration errors require manual fixes
    }
}

/**
 * Network and connectivity errors
 * 
 * Covers communication issues:
 * - Connection timeouts
 * - DNS resolution failures
 * - SSL/TLS errors
 * - Proxy and firewall issues
 */
export class SembleNetworkError extends SembleError {
    public readonly originalError?: Error;
    public readonly url?: string;
    public readonly timeout?: number;

    constructor(
        message: string,
        code: string = 'NETWORK_ERROR',
        originalError?: Error,
        url?: string,
        timeout?: number,
        context: ErrorContext = {}
    ) {
        super(message, code, context, 'network', 'medium');
        this.name = 'SembleNetworkError';
        this.originalError = originalError;
        this.url = url;
        this.timeout = timeout;
    }

    public getUserMessage(): string {
        return 'Network connection error - please check your internet connection and try again';
    }

    public isRetryable(): boolean {
        return true; // Network errors are typically retryable
    }
}

/**
 * Error factory for creating appropriate error types based on input
 */
export class SembleErrorFactory {
    /**
     * Creates appropriate SembleError subclass based on error characteristics
     */
    public static createError(
        error: any,
        context: ErrorContext = {}
    ): SembleError {
        // Already a SembleError
        if (error instanceof SembleError) {
            return error;
        }

        // HTTP/API errors
        if (error.response || error.status || error.statusCode) {
            const statusCode = error.response?.status || error.status || error.statusCode;
            return new SembleAPIError(
                error.message || 'API request failed',
                'API_ERROR',
                statusCode,
                context,
                error.response
            );
        }

        // Network errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'TIMEOUT') {
            return new SembleNetworkError(
                error.message || 'Network error',
                error.code,
                error,
                undefined,
                undefined,
                context
            );
        }

        // Validation errors
        if (error.name === 'ValidationError' || error.code === 'VALIDATION_ERROR') {
            return new SembleValidationError(
                error.message || 'Validation failed',
                error.field,
                error.value,
                error.constraints || [],
                context
            );
        }

        // Permission errors
        if (error.code === 'PERMISSION_DENIED' || error.requiredPermission) {
            return new SemblePermissionError(
                error.message || 'Permission denied',
                error.requiredPermission || 'unknown',
                error.field,
                context.operation,
                context
            );
        }

        // Authentication errors
        if (error.code === 'UNAUTHENTICATED' || error.name === 'AuthenticationError') {
            return new SembleAuthError(
                error.message || 'Authentication failed',
                error.code || 'AUTH_ERROR',
                error.credential || 'unknown',
                error.hint,
                context
            );
        }

        // Default to generic SembleError
        return new SembleError(
            error.message || 'Unknown error occurred',
            error.code || 'UNKNOWN_ERROR',
            context
        );
    }

    /**
     * Creates a configuration error with standardized messaging
     */
    public static createConfigError(
        key: string,
        issue: string,
        expectedType?: string,
        actualValue?: any
    ): SembleConfigError {
        return new SembleConfigError(
            issue,
            key,
            expectedType,
            actualValue
        );
    }

    /**
     * Creates a permission error with field-level details
     */
    public static createPermissionError(
        permission: string,
        field?: string,
        operation?: string
    ): SemblePermissionError {
        let message = `Access denied: missing permission '${permission}'`;
        if (field) message += ` for field '${field}'`;
        if (operation) message += ` in operation '${operation}'`;

        return new SemblePermissionError(
            message,
            permission,
            field,
            operation
        );
    }
}

/**
 * Validation-specific error with field-level validation failure details
 */
export class ValidationError extends SembleError {
    public readonly fieldErrors: Array<{ field: string; message: string; value?: any }>;

    constructor(
        message: string,
        fieldErrors: Array<{ field: string; message: string; value?: any }> = [],
        context?: ErrorContext
    ) {
        super(
            message,
            'VALIDATION_ERROR',
            context || {},
            'validation',
            'high'
        );
        this.fieldErrors = fieldErrors;
        this.name = 'ValidationError';
    }

    /**
     * Get validation errors for a specific field
     */
    public getFieldErrors(fieldName: string): Array<{ field: string; message: string; value?: any }> {
        return this.fieldErrors.filter(error => error.field === fieldName);
    }

    /**
     * Check if a specific field has validation errors
     */
    public hasFieldError(fieldName: string): boolean {
        return this.fieldErrors.some(error => error.field === fieldName);
    }

    /**
     * Get formatted error message with field details
     */
    public getDetailedMessage(): string {
        if (this.fieldErrors.length === 0) {
            return this.message;
        }

        const fieldMessages = this.fieldErrors
            .map(error => `${error.field}: ${error.message}`)
            .join('; ');

        return `${this.message} - Field errors: ${fieldMessages}`;
    }
}
