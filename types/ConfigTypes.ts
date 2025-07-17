/**
 * TypeScript type definitions for configuration and options interfaces
 * Phase 1.1 - Foundation Layer Type Definitions
 */

import { SembleResourceType, SembleActionType, SembleTriggerEventType, SemblePollInterval } from './NodeTypes';

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

/**
 * Cache configuration options
 */
export interface CacheConfig {
	/** Enable/disable caching */
	enabled: boolean;
	/** Default TTL in seconds */
	defaultTtl: number;
	/** Maximum cache size (number of entries) */
	maxSize: number;
	/** Auto-refresh interval in seconds */
	autoRefreshInterval: number;
	/** Enable background refresh */
	backgroundRefresh: boolean;
	/** Cache key prefix */
	keyPrefix: string;
}

/**
 * Cache entry metadata
 */
export interface CacheEntryMetadata {
	/** When the entry was created */
	createdAt: number;
	/** When the entry expires */
	expiresAt: number;
	/** How many times this entry has been accessed */
	accessCount: number;
	/** Last access timestamp */
	lastAccessed: number;
	/** Whether this entry is currently being refreshed */
	refreshing: boolean;
}

/**
 * Cache entry with data and metadata
 */
export interface CacheEntry<T = any> {
	data: T;
	metadata: CacheEntryMetadata;
}

/**
 * Cache statistics
 */
export interface CacheStats {
	totalEntries: number;
	totalHits: number;
	totalMisses: number;
	hitRate: number;
	memoryUsage: number;
	oldestEntry: number;
	newestEntry: number;
}

// =============================================================================
// SERVICE CONFIGURATION
// =============================================================================

/**
 * Base service configuration
 */
export interface BaseServiceConfig {
	/** Service name for identification */
	name: string;
	/** Enable/disable the service */
	enabled: boolean;
	/** Service initialization timeout in ms */
	initTimeout: number;
	/** Service-specific configuration */
	options: Record<string, any>;
}

/**
 * Credential service configuration
 */
export interface CredentialServiceConfig extends BaseServiceConfig {
	name: 'credential';
	options: {
		/** Validate credentials on startup */
		validateOnStartup: boolean;
		/** Credential validation timeout in ms */
		validationTimeout: number;
		/** Cache valid credentials */
		cacheValidCredentials: boolean;
		/** Environment safety checks */
		environmentSafety: {
			enabled: boolean;
			allowedEnvironments: string[];
			requireEnvVariable: boolean;
		};
	};
}

/**
 * Query service configuration
 */
export interface QueryServiceConfig extends BaseServiceConfig {
	name: 'query';
	options: {
		/** Default request timeout in ms */
		requestTimeout: number;
		/** Maximum retry attempts */
		maxRetries: number;
		/** Retry delay in ms */
		retryDelay: number;
		/** Rate limiting config */
		rateLimit: {
			enabled: boolean;
			requestsPerSecond: number;
			burstLimit: number;
		};
		/** Query optimization */
		optimization: {
			enableQueryBatching: boolean;
			batchSize: number;
			batchDelay: number;
		};
	};
}

/**
 * Field discovery service configuration
 */
export interface FieldDiscoveryServiceConfig extends BaseServiceConfig {
	name: 'fieldDiscovery';
	options: {
		/** Enable introspection queries */
		enableIntrospection: boolean;
		/** Cache discovered fields */
		cacheFields: boolean;
		/** Field cache TTL in seconds */
		fieldCacheTtl: number;
		/** Auto-discover fields on schema changes */
		autoDiscovery: boolean;
		/** Introspection query timeout in ms */
		introspectionTimeout: number;
	};
}

/**
 * Permission check service configuration
 */
export interface PermissionCheckServiceConfig extends BaseServiceConfig {
	name: 'permissionCheck';
	options: {
		/** Cache permission results */
		cachePermissions: boolean;
		/** Permission cache TTL in seconds */
		permissionCacheTtl: number;
		/** Batch permission checks */
		batchPermissionChecks: boolean;
		/** Permission check timeout in ms */
		checkTimeout: number;
		/** Enable field-level permission display */
		fieldLevelDisplay: boolean;
	};
}

/**
 * Validation service configuration
 */
export interface ValidationServiceConfig extends BaseServiceConfig {
	name: 'validation';
	options: {
		/** Enable strict validation */
		strictMode: boolean;
		/** Validate field types */
		validateTypes: boolean;
		/** Validate required fields */
		validateRequired: boolean;
		/** Custom validation rules */
		customRules: Record<string, any>;
		/** Validation timeout in ms */
		validationTimeout: number;
	};
}

/**
 * Union type for all service configurations
 */
export type ServiceConfig = 
	| CredentialServiceConfig
	| QueryServiceConfig
	| FieldDiscoveryServiceConfig
	| PermissionCheckServiceConfig
	| ValidationServiceConfig;

// =============================================================================
// FIELD REGISTRY CONFIGURATION
// =============================================================================

/**
 * Field registry configuration
 */
export interface FieldRegistryConfig {
	/** Enable dynamic field loading */
	dynamicLoading: boolean;
	/** Cache field definitions */
	cacheDefinitions: boolean;
	/** Field definition cache TTL in seconds */
	definitionCacheTtl: number;
	/** Auto-refresh field definitions */
	autoRefresh: boolean;
	/** Field validation rules */
	validationRules: FieldValidationRules;
}

/**
 * Field validation rules configuration
 */
export interface FieldValidationRules {
	/** Enable field type validation */
	enforceTypes: boolean;
	/** Enable required field validation */
	enforceRequired: boolean;
	/** Enable field format validation */
	enforceFormat: boolean;
	/** Custom validation patterns */
	customPatterns: Record<string, RegExp>;
	/** Field length constraints */
	lengthConstraints: Record<string, { min?: number; max?: number }>;
}

// =============================================================================
// NODE OPERATION CONFIGURATION
// =============================================================================

/**
 * Configuration for individual node operations
 */
export interface NodeOperationConfig {
	/** Resource type this config applies to */
	resourceType: SembleResourceType;
	/** Action type this config applies to */
	actionType: SembleActionType;
	/** Default field values */
	defaults: Record<string, any>;
	/** Field visibility rules */
	fieldVisibility: FieldVisibilityConfig;
	/** Validation requirements */
	validation: OperationValidationConfig;
	/** Performance settings */
	performance: OperationPerformanceConfig;
}

/**
 * Field visibility configuration
 */
export interface FieldVisibilityConfig {
	/** Always show these fields */
	alwaysShow: string[];
	/** Always hide these fields */
	alwaysHide: string[];
	/** Conditionally show fields based on other field values */
	conditionalShow: Record<string, {
		dependsOn: string;
		values: any[];
	}>;
	/** Permission-based field visibility */
	permissionBased: Record<string, string>; // field -> required permission
}

/**
 * Operation validation configuration
 */
export interface OperationValidationConfig {
	/** Required fields for this operation */
	requiredFields: string[];
	/** Optional fields for this operation */
	optionalFields: string[];
	/** Field dependencies (field -> depends on these fields) */
	fieldDependencies: Record<string, string[]>;
	/** Custom validation functions */
	customValidators: Record<string, string>; // field -> validator function name
}

/**
 * Operation performance configuration
 */
export interface OperationPerformanceConfig {
	/** Expected operation duration in ms */
	expectedDuration: number;
	/** Timeout for this operation in ms */
	timeout: number;
	/** Whether this operation can be batched */
	batchable: boolean;
	/** Maximum batch size if batchable */
	maxBatchSize?: number;
	/** Whether to cache results */
	cacheable: boolean;
	/** Cache TTL if cacheable */
	cacheTtl?: number;
}

// =============================================================================
// TRIGGER CONFIGURATION
// =============================================================================

/**
 * Trigger node configuration
 */
export interface TriggerConfig {
	/** Resource type to monitor */
	resourceType: SembleResourceType;
	/** Event type to trigger on */
	eventType: SembleTriggerEventType;
	/** Polling interval */
	pollInterval: SemblePollInterval;
	/** Additional filters */
	filters: TriggerFilterConfig;
	/** State management */
	stateManagement: TriggerStateConfig;
}

/**
 * Trigger filter configuration
 */
export interface TriggerFilterConfig {
	/** Date range filters */
	dateFilters: {
		enabled: boolean;
		field: string; // which date field to filter on
		lookback: number; // how far back to look in seconds
	};
	/** Status filters */
	statusFilters: {
		enabled: boolean;
		allowedStatuses: string[];
	};
	/** Custom field filters */
	customFilters: Record<string, any>;
}

/**
 * Trigger state configuration
 */
export interface TriggerStateConfig {
	/** Enable state persistence */
	persistState: boolean;
	/** State storage key */
	stateKey: string;
	/** How long to keep state in seconds */
	stateRetention: number;
	/** Enable deduplication */
	enableDeduplication: boolean;
	/** Deduplication field */
	deduplicationField: string;
}

// =============================================================================
// GLOBAL CONFIGURATION
// =============================================================================

/**
 * Global node package configuration
 */
export interface GlobalConfig {
	/** Package version */
	version: string;
	/** Debug mode */
	debug: boolean;
	/** Logging configuration */
	logging: LoggingConfig;
	/** Cache configuration */
	cache: CacheConfig;
	/** Service configurations */
	services: ServiceConfig[];
	/** Field registry configuration */
	fieldRegistry: FieldRegistryConfig;
	/** Default node operation configs */
	defaultOperations: NodeOperationConfig[];
	/** Performance monitoring */
	performance: PerformanceConfig;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
	/** Enable logging */
	enabled: boolean;
	/** Log level */
	level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
	/** Log to console */
	console: boolean;
	/** Log format */
	format: 'json' | 'text';
	/** Include timestamps */
	includeTimestamp: boolean;
	/** Include stack traces for errors */
	includeStackTrace: boolean;
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
	/** Enable performance monitoring */
	enabled: boolean;
	/** Track operation timing */
	trackTiming: boolean;
	/** Track memory usage */
	trackMemory: boolean;
	/** Track API call metrics */
	trackApiCalls: boolean;
	/** Performance data retention in seconds */
	dataRetention: number;
	/** Performance alert thresholds */
	alertThresholds: {
		operationTimeout: number;
		memoryUsage: number;
		errorRate: number;
	};
}

// =============================================================================
// ENVIRONMENT-SPECIFIC CONFIGURATION
// =============================================================================

/**
 * Environment-specific configuration overrides
 */
export interface EnvironmentConfig {
	/** Environment name */
	environment: 'development' | 'staging' | 'production';
	/** Configuration overrides */
	overrides: Partial<GlobalConfig>;
	/** Environment-specific secrets */
	secrets: Record<string, string>;
	/** Feature flags */
	features: Record<string, boolean>;
}

/**
 * Configuration factory options
 */
export interface ConfigFactoryOptions {
	/** Base configuration */
	baseConfig: GlobalConfig;
	/** Environment overrides */
	environmentConfig?: EnvironmentConfig;
	/** Runtime overrides */
	runtimeOverrides?: Partial<GlobalConfig>;
	/** Validation options */
	validation: {
		enabled: boolean;
		strictMode: boolean;
		throwOnValidationError: boolean;
	};
}
