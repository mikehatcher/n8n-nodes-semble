/**
 * @fileoverview Constants and Static Values for Semble n8n Integration
 * @description Centralized constants including API endpoints, timeouts, validation patterns, and system defaults
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Core.Constants
 * @since 2.0.0
 */

// =============================================================================
// MAIN CONSTANTS OBJECT
// =============================================================================

/**
 * Central constants object containing all static values for the Semble integration
 */
export const SEMBLE_CONSTANTS = {
	
	// =============================================================================
	// API CONFIGURATION
	// =============================================================================
	API: {
		// GraphQL endpoint paths
		ENDPOINTS: {
			GRAPHQL: '/graphql',
			INTROSPECTION: '/graphql?introspection=true',
			HEALTH: '/health',
			VERSION: '/version'
		},

		// HTTP headers
		HEADERS: {
			CONTENT_TYPE: 'application/json',
			ACCEPT: 'application/json',
			USER_AGENT: 'n8n-nodes-semble/2.0.0',
			AUTHORIZATION_PREFIX: 'Bearer ',
			API_KEY_HEADER: 'X-API-Key'
		},

		// HTTP status codes
		STATUS_CODES: {
			OK: 200,
			CREATED: 201,
			NO_CONTENT: 204,
			BAD_REQUEST: 400,
			UNAUTHORIZED: 401,
			FORBIDDEN: 403,
			NOT_FOUND: 404,
			CONFLICT: 409,
			UNPROCESSABLE_ENTITY: 422,
			TOO_MANY_REQUESTS: 429,
			INTERNAL_SERVER_ERROR: 500,
			BAD_GATEWAY: 502,
			SERVICE_UNAVAILABLE: 503,
			GATEWAY_TIMEOUT: 504
		},

		// API version information
		VERSION: {
			CURRENT: '2.0.0',
			MINIMUM_SUPPORTED: '1.0.0',
			GRAPHQL_VERSION: '15.0.0'
		}
	},

	// =============================================================================
	// TIMEOUT CONFIGURATION
	// =============================================================================
	TIMEOUTS: {
		// Request timeouts (in milliseconds)
		REQUEST_TIMEOUT: 30000, // 30 seconds
		CONNECT_TIMEOUT: 10000, // 10 seconds
		READ_TIMEOUT: 20000, // 20 seconds

		// Operation timeouts
		OPERATION_TIMEOUT: 45000, // 45 seconds
		BATCH_OPERATION_TIMEOUT: 120000, // 2 minutes
		INTROSPECTION_TIMEOUT: 15000, // 15 seconds

		// Service initialization timeouts
		SERVICE_INIT_TIMEOUT: 10000, // 10 seconds
		CREDENTIAL_VALIDATION_TIMEOUT: 5000, // 5 seconds
		PERMISSION_CHECK_TIMEOUT: 3000, // 3 seconds

		// Cache timeouts
		CACHE_OPERATION_TIMEOUT: 1000, // 1 second
		CACHE_WARMUP_TIMEOUT: 30000 // 30 seconds
	},

	// =============================================================================
	// RETRY CONFIGURATION
	// =============================================================================
	RETRY: {
		// Maximum number of retry attempts
		MAX_RETRIES: 3,
		MAX_RETRIES_CRITICAL: 5,
		MAX_RETRIES_NON_CRITICAL: 2,

		// Retry delays (in milliseconds)
		INITIAL_DELAY: 1000, // 1 second
		MAX_DELAY: 10000, // 10 seconds
		BACKOFF_MULTIPLIER: 2, // Exponential backoff

		// Retry conditions
		RETRYABLE_STATUS_CODES: [429, 500, 502, 503, 504],
		RETRYABLE_ERROR_TYPES: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'],

		// Jitter configuration
		ENABLE_JITTER: true,
		JITTER_FACTOR: 0.1 // 10% jitter
	},

	// =============================================================================
	// RATE LIMITING
	// =============================================================================
	RATE_LIMIT: {
		// Requests per time period
		REQUESTS_PER_SECOND: 10,
		REQUESTS_PER_MINUTE: 600,
		REQUESTS_PER_HOUR: 36000,

		// Burst limits
		BURST_LIMIT: 20,
		BURST_WINDOW: 1000, // 1 second

		// Rate limit headers
		HEADERS: {
			LIMIT: 'X-RateLimit-Limit',
			REMAINING: 'X-RateLimit-Remaining',
			RESET: 'X-RateLimit-Reset',
			RETRY_AFTER: 'Retry-After'
		}
	},

	// =============================================================================
	// CACHING CONFIGURATION
	// =============================================================================
	CACHE: {
		// Cache TTL values (in seconds)
		DEFAULT_TTL: 3600, // 1 hour
		SHORT_TTL: 300, // 5 minutes
		MEDIUM_TTL: 1800, // 30 minutes
		LONG_TTL: 86400, // 24 hours

		// Specific cache TTLs
		CREDENTIAL_CACHE_TTL: 1800, // 30 minutes
		PERMISSION_CACHE_TTL: 900, // 15 minutes
		FIELD_CACHE_TTL: 3600, // 1 hour
		INTROSPECTION_CACHE_TTL: 86400, // 24 hours

		// Cache size limits
		MAX_SIZE: 1000, // Maximum number of cached items
		MAX_MEMORY: 100 * 1024 * 1024, // 100MB

		// Cache refresh settings
		AUTO_REFRESH_INTERVAL: 3600, // 1 hour
		STALE_WHILE_REVALIDATE: 300, // 5 minutes

		// Cache key prefixes
		KEY_PREFIXES: {
			CREDENTIAL: 'cred:',
			PERMISSION: 'perm:',
			FIELD: 'field:',
			INTROSPECTION: 'intro:',
			OPERATION: 'op:',
			TEMP: 'temp:'
		}
	},

	// =============================================================================
	// VALIDATION PATTERNS
	// =============================================================================
	VALIDATION: {
		// Regular expressions for validation
		PATTERNS: {
			EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
			PHONE: /^\+?[\d\s\-\(\)]{10,}$/,
			URL: /^https?:\/\/.+/,
			UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			UUID_OR_NUMERIC_ID: /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|\d+|[a-zA-Z0-9\-_]+)$/i,
			DATE_ISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
			DATE: /^\d{4}-\d{2}-\d{2}$/,
			GRAPHQL_NAME: /^[_a-zA-Z][_a-zA-Z0-9]*$/,
			FIELD_PATH: /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)*$/
		},

		// String length constraints
		LENGTHS: {
			MIN_PASSWORD: 8,
			MAX_PASSWORD: 128,
			MAX_EMAIL: 254,
			MAX_NAME: 100,
			MAX_DESCRIPTION: 1000,
			MAX_QUERY_LENGTH: 10000,
			MAX_FIELD_NAME: 50
		},

		// Numeric constraints
		NUMERIC: {
			MIN_PORT: 1,
			MAX_PORT: 65535,
			MIN_TIMEOUT: 1000, // 1 second
			MAX_TIMEOUT: 300000, // 5 minutes
			MIN_CACHE_SIZE: 10,
			MAX_CACHE_SIZE: 10000
		}
	},

	// =============================================================================
	// FIELD DEFINITIONS AND OPTIONS
	// =============================================================================
	FIELDS: {
		// Phone type options
		PHONE_TYPES: ['mobile', 'home', 'work', 'other'],

		// Gender options
		GENDER_OPTIONS: ['male', 'female', 'non-binary', 'other', 'prefer-not-to-say'],

		// Sex options (biological)
		SEX_OPTIONS: ['male', 'female', 'intersex'],

		// Booking status options
		BOOKING_STATUS_OPTIONS: ['confirmed', 'pending', 'cancelled', 'completed', 'no-show'],

		// Appointment types
		APPOINTMENT_TYPES: ['consultation', 'follow-up', 'procedure', 'screening', 'emergency'],

		// Communication preferences
		COMMUNICATION_PREFERENCES: ['email', 'sms', 'phone', 'post', 'none']
	},

	// =============================================================================
	// ERROR CODES AND MESSAGES
	// =============================================================================
	ERRORS: {
		// Error categories
		CATEGORIES: {
			AUTHENTICATION: 'AUTHENTICATION',
			AUTHORIZATION: 'AUTHORIZATION',
			VALIDATION: 'VALIDATION',
			NETWORK: 'NETWORK',
			SERVER: 'SERVER',
			CLIENT: 'CLIENT',
			CONFIGURATION: 'CONFIGURATION',
			TIMEOUT: 'TIMEOUT',
			RATE_LIMIT: 'RATE_LIMIT'
		},

		// Common error codes
		CODES: {
			INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
			EXPIRED_TOKEN: 'EXPIRED_TOKEN',
			INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
			INVALID_INPUT: 'INVALID_INPUT',
			RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
			NETWORK_ERROR: 'NETWORK_ERROR',
			SERVER_ERROR: 'SERVER_ERROR',
			TIMEOUT_ERROR: 'TIMEOUT_ERROR',
			RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
			CONFIGURATION_ERROR: 'CONFIGURATION_ERROR'
		},

		// Default error messages
		MESSAGES: {
			GENERIC: 'An unexpected error occurred',
			AUTHENTICATION_FAILED: 'Authentication failed',
			AUTHORIZATION_FAILED: 'Insufficient permissions',
			VALIDATION_FAILED: 'Input validation failed',
			NETWORK_UNAVAILABLE: 'Network connection unavailable',
			SERVER_UNAVAILABLE: 'Server temporarily unavailable',
			TIMEOUT_EXCEEDED: 'Operation timeout exceeded',
			RATE_LIMIT_HIT: 'Rate limit exceeded, please try again later',
			CONFIGURATION_INVALID: 'Invalid configuration provided'
		}
	},

	// =============================================================================
	// LOGGING CONFIGURATION
	// =============================================================================
	LOGGING: {
		// Log levels
		LEVELS: {
			ERROR: 'error',
			WARN: 'warn',
			INFO: 'info',
			DEBUG: 'debug',
			TRACE: 'trace'
		},

		// Log categories
		CATEGORIES: {
			API: 'api',
			AUTH: 'auth',
			CACHE: 'cache',
			CONFIG: 'config',
			PERFORMANCE: 'performance',
			VALIDATION: 'validation',
			OPERATION: 'operation'
		},

		// Default log format
		DEFAULT_FORMAT: 'json',
		TIMESTAMP_FORMAT: 'ISO',

		// Log retention
		MAX_LOG_SIZE: 10 * 1024 * 1024, // 10MB
		MAX_LOG_FILES: 5,
		LOG_ROTATION: 'daily'
	},

	// =============================================================================
	// PERFORMANCE MONITORING
	// =============================================================================
	PERFORMANCE: {
		// Monitoring intervals (in milliseconds)
		MONITOR_INTERVAL: 60000, // 1 minute
		MEMORY_CHECK_INTERVAL: 30000, // 30 seconds
		HEALTH_CHECK_INTERVAL: 300000, // 5 minutes

		// Performance thresholds
		THRESHOLDS: {
			WARNING_RESPONSE_TIME: 5000, // 5 seconds
			CRITICAL_RESPONSE_TIME: 10000, // 10 seconds
			WARNING_MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
			CRITICAL_MEMORY_USAGE: 100 * 1024 * 1024, // 100MB
			WARNING_ERROR_RATE: 0.05, // 5%
			CRITICAL_ERROR_RATE: 0.1 // 10%
		},

		// Metric collection
		METRICS: {
			COLLECT_TIMING: true,
			COLLECT_MEMORY: true,
			COLLECT_COUNTERS: true,
			COLLECT_ERRORS: true,
			COLLECT_CACHE_STATS: true
		}
	},

	// =============================================================================
	// SECURITY CONFIGURATION
	// =============================================================================
	SECURITY: {
		// Token settings
		TOKEN_EXPIRY_BUFFER: 300, // 5 minutes buffer before expiry
		TOKEN_REFRESH_THRESHOLD: 0.8, // Refresh when 80% of lifetime used

		// Encryption settings
		ENCRYPTION_ALGORITHM: 'aes-256-gcm',
		KEY_DERIVATION_ITERATIONS: 100000,
		SALT_LENGTH: 32,
		IV_LENGTH: 16,

		// Security headers
		HEADERS: {
			CONTENT_SECURITY_POLICY: "default-src 'self'",
			X_FRAME_OPTIONS: 'DENY',
			X_CONTENT_TYPE_OPTIONS: 'nosniff',
			REFERRER_POLICY: 'strict-origin-when-cross-origin'
		}
	},

	// =============================================================================
	// NODE-SPECIFIC CONFIGURATION
	// =============================================================================
	NODE: {
		// Default node colors
		COLORS: {
			PRIMARY: '#FF6B6B',
			SECONDARY: '#4ECDC4',
			SUCCESS: '#45B7D1',
			WARNING: '#FFA07A',
			ERROR: '#FF6B6B'
		},

		// Node categories
		CATEGORIES: ['Semble'],

		// Default node settings
		DEFAULTS: {
			CONTINUE_ON_FAIL: false,
			ALWAYS_OUTPUT_DATA: false,
			RETRY_ON_FAIL: false,
			MAX_TRIES: 3
		},

		// Resource constraints
		RESOURCES: {
			MAX_ITEMS_PER_OPERATION: 1000,
			MAX_CONCURRENT_OPERATIONS: 5,
			MAX_MEMORY_PER_OPERATION: 50 * 1024 * 1024 // 50MB
		}
	},

	// =============================================================================
	// FIELD DISCOVERY CONFIGURATION
	// =============================================================================
	FIELD_DISCOVERY: {
		// Discovery modes
		MODES: {
			INTROSPECTION: 'introspection',
			RUNTIME: 'runtime',
			HYBRID: 'hybrid'
		},

		// Field types
		TYPES: {
			SCALAR: 'scalar',
			OBJECT: 'object',
			LIST: 'list',
			ENUM: 'enum',
			INTERFACE: 'interface',
			UNION: 'union'
		},

		// Discovery limits
		MAX_DEPTH: 5,
		MAX_FIELDS_PER_TYPE: 100,
		MAX_TYPES: 500,

		// Caching for field discovery
		CACHE_DISCOVERY_RESULTS: true,
		DISCOVERY_CACHE_TTL: 3600 // 1 hour
	}
} as const;

// =============================================================================
// ENVIRONMENT-SPECIFIC CONSTANTS
// =============================================================================

/**
 * Development environment constants
 */
export const DEV_CONSTANTS = {
	DEBUG: true,
	LOG_LEVEL: 'debug',
	ENABLE_INTROSPECTION: true,
	CACHE_TTL_MULTIPLIER: 0.1, // Shorter cache times in dev
	TIMEOUT_MULTIPLIER: 2, // Longer timeouts in dev
	RATE_LIMIT_MULTIPLIER: 10 // More lenient rate limits in dev
} as const;

/**
 * Production environment constants
 */
export const PROD_CONSTANTS = {
	DEBUG: false,
	LOG_LEVEL: 'warn',
	ENABLE_INTROSPECTION: false,
	CACHE_TTL_MULTIPLIER: 1, // Standard cache times in prod
	TIMEOUT_MULTIPLIER: 1, // Standard timeouts in prod
	RATE_LIMIT_MULTIPLIER: 1 // Standard rate limits in prod
} as const;

// =============================================================================
// UTILITY FUNCTIONS FOR CONSTANTS
// =============================================================================

/**
 * Get environment-specific constant multiplier
 */
export function getEnvironmentMultiplier(environment: string, type: 'cache' | 'timeout' | 'rateLimit'): number {
	const envConstants = environment === 'production' ? PROD_CONSTANTS : DEV_CONSTANTS;
	
	switch (type) {
		case 'cache':
			return envConstants.CACHE_TTL_MULTIPLIER;
		case 'timeout':
			return envConstants.TIMEOUT_MULTIPLIER;
		case 'rateLimit':
			return envConstants.RATE_LIMIT_MULTIPLIER;
		default:
			return 1;
	}
}

/**
 * Apply environment multiplier to a value
 */
export function applyEnvironmentMultiplier(value: number, environment: string, type: 'cache' | 'timeout' | 'rateLimit'): number {
	const multiplier = getEnvironmentMultiplier(environment, type);
	return Math.round(value * multiplier);
}

/**
 * Get timeout value for environment
 */
export function getEnvironmentTimeout(baseTimeout: number, environment: string): number {
	return applyEnvironmentMultiplier(baseTimeout, environment, 'timeout');
}

/**
 * Get cache TTL for environment
 */
export function getEnvironmentCacheTtl(baseTtl: number, environment: string): number {
	return applyEnvironmentMultiplier(baseTtl, environment, 'cache');
}

/**
 * Check if feature is enabled for environment
 */
export function isEnvironmentFeatureEnabled(environment: string, feature: keyof typeof DEV_CONSTANTS): boolean {
	const envConstants = environment === 'production' ? PROD_CONSTANTS : DEV_CONSTANTS;
	return envConstants[feature] === true;
}

// Export individual constant groups for convenient importing
export const API_CONSTANTS = SEMBLE_CONSTANTS.API;
export const TIMEOUT_CONSTANTS = SEMBLE_CONSTANTS.TIMEOUTS;
export const RETRY_CONSTANTS = SEMBLE_CONSTANTS.RETRY;
export const CACHE_CONSTANTS = SEMBLE_CONSTANTS.CACHE;
export const VALIDATION_CONSTANTS = SEMBLE_CONSTANTS.VALIDATION;
export const VALIDATION_PATTERNS = SEMBLE_CONSTANTS.VALIDATION.PATTERNS;
export const FIELD_CONSTANTS = SEMBLE_CONSTANTS.FIELDS;
export const ERROR_CONSTANTS = SEMBLE_CONSTANTS.ERRORS;
export const LOGGING_CONSTANTS = SEMBLE_CONSTANTS.LOGGING;
export const PERFORMANCE_CONSTANTS = SEMBLE_CONSTANTS.PERFORMANCE;
export const SECURITY_CONSTANTS = SEMBLE_CONSTANTS.SECURITY;
export const NODE_CONSTANTS = SEMBLE_CONSTANTS.NODE;
export const FIELD_DISCOVERY_CONSTANTS = SEMBLE_CONSTANTS.FIELD_DISCOVERY;
