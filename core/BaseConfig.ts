/**
 * @fileoverview Base Configuration Management System for Semble n8n Integration
 * @description Provides extensible configuration management with environment-based overrides and validation
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Core.BaseConfig
 * @since 2.0.0
 */

import { GlobalConfig, EnvironmentConfig, ConfigFactoryOptions } from '../types/ConfigTypes';
import { SEMBLE_CONSTANTS } from './Constants';

// =============================================================================
// DEFAULT CONFIGURATION VALUES
// =============================================================================

/**
 * Default global configuration - serves as the base for all environments
 */
export const DEFAULT_CONFIG: GlobalConfig = {
	version: '2.0.0',
	debug: false,
	
	// Logging configuration
	logging: {
		enabled: true,
		level: 'info',
		console: true,
		format: 'json',
		includeTimestamp: true,
		includeStackTrace: false
	},

	// Cache configuration
	cache: {
		enabled: true,
		defaultTtl: SEMBLE_CONSTANTS.CACHE.DEFAULT_TTL,
		maxSize: SEMBLE_CONSTANTS.CACHE.MAX_SIZE,
		autoRefreshInterval: SEMBLE_CONSTANTS.CACHE.AUTO_REFRESH_INTERVAL,
		backgroundRefresh: true,
		keyPrefix: 'semble:'
	},

	// Service configurations
	services: [
		{
			name: 'credential',
			enabled: true,
			initTimeout: 5000,
			options: {
				validateOnStartup: true,
				validationTimeout: 3000,
				cacheValidCredentials: true,
				environmentSafety: {
					enabled: true,
					allowedEnvironments: ['production', 'staging', 'development'],
					requireEnvVariable: true
				}
			}
		},
		{
			name: 'query',
			enabled: true,
			initTimeout: 10000,
			options: {
				requestTimeout: SEMBLE_CONSTANTS.TIMEOUTS.REQUEST_TIMEOUT,
				maxRetries: SEMBLE_CONSTANTS.RETRY.MAX_RETRIES,
				retryDelay: SEMBLE_CONSTANTS.RETRY.INITIAL_DELAY,
				rateLimit: {
					enabled: true,
					requestsPerSecond: SEMBLE_CONSTANTS.RATE_LIMIT.REQUESTS_PER_SECOND,
					burstLimit: SEMBLE_CONSTANTS.RATE_LIMIT.BURST_LIMIT
				},
				optimization: {
					enableQueryBatching: false,
					batchSize: 10,
					batchDelay: 100
				}
			}
		},
		{
			name: 'fieldDiscovery',
			enabled: true,
			initTimeout: 15000,
			options: {
				enableIntrospection: true,
				cacheFields: true,
				fieldCacheTtl: SEMBLE_CONSTANTS.CACHE.FIELD_CACHE_TTL,
				autoDiscovery: true,
				introspectionTimeout: 10000
			}
		},
		{
			name: 'permissionCheck',
			enabled: true,
			initTimeout: 5000,
			options: {
				cachePermissions: true,
				permissionCacheTtl: SEMBLE_CONSTANTS.CACHE.PERMISSION_CACHE_TTL,
				batchPermissionChecks: true,
				checkTimeout: 3000,
				fieldLevelDisplay: true
			}
		},
		{
			name: 'validation',
			enabled: true,
			initTimeout: 3000,
			options: {
				strictMode: false,
				validateTypes: true,
				validateRequired: true,
				customRules: {},
				validationTimeout: 2000
			}
		}
	],

	// Field registry configuration
	fieldRegistry: {
		dynamicLoading: true,
		cacheDefinitions: true,
		definitionCacheTtl: SEMBLE_CONSTANTS.CACHE.FIELD_CACHE_TTL,
		autoRefresh: true,
		validationRules: {
			enforceTypes: true,
			enforceRequired: true,
			enforceFormat: true,
			customPatterns: {},
			lengthConstraints: {}
		}
	},

	// Default node operation configurations
	defaultOperations: [],

	// Performance monitoring
	performance: {
		enabled: true,
		trackTiming: true,
		trackMemory: true,
		trackApiCalls: true,
		dataRetention: 86400, // 24 hours
		alertThresholds: {
			operationTimeout: 30000, // 30 seconds
			memoryUsage: 100, // 100MB
			errorRate: 0.05 // 5%
		}
	}
};

// =============================================================================
// ENVIRONMENT-SPECIFIC CONFIGURATIONS
// =============================================================================

/**
 * Development environment configuration overrides
 */
export const DEVELOPMENT_CONFIG: EnvironmentConfig = {
	environment: 'development',
	overrides: {
		debug: true,
		logging: {
			enabled: true,
			level: 'debug',
			console: true,
			format: 'text',
			includeTimestamp: true,
			includeStackTrace: true
		},
		cache: {
			enabled: true,
			defaultTtl: 300, // 5 minutes for dev
			maxSize: 100,
			autoRefreshInterval: 1800, // 30 minutes
			backgroundRefresh: false,
			keyPrefix: 'semble:dev:'
		},
		performance: {
			enabled: true,
			trackTiming: true,
			trackMemory: true,
			trackApiCalls: true,
			dataRetention: 3600, // 1 hour in dev
			alertThresholds: {
				operationTimeout: 60000, // 60 seconds for dev
				memoryUsage: 200, // 200MB for dev
				errorRate: 0.1 // 10% for dev
			}
		}
	},
	secrets: {},
	features: {
		enableDetailedLogging: true,
		enablePerformanceDebugging: true,
		enableCacheDebugging: true
	}
};

/**
 * Staging environment configuration overrides
 */
export const STAGING_CONFIG: EnvironmentConfig = {
	environment: 'staging',
	overrides: {
		debug: false,
		logging: {
			enabled: true,
			level: 'info',
			console: true,
			format: 'json',
			includeTimestamp: true,
			includeStackTrace: true
		},
		cache: {
			enabled: true,
			defaultTtl: 1800, // 30 minutes for staging
			maxSize: 500,
			autoRefreshInterval: 7200, // 2 hours
			backgroundRefresh: true,
			keyPrefix: 'semble:staging:'
		}
	},
	secrets: {},
	features: {
		enableDetailedLogging: true,
		enablePerformanceDebugging: false,
		enableCacheDebugging: false
	}
};

/**
 * Production environment configuration overrides
 */
export const PRODUCTION_CONFIG: EnvironmentConfig = {
	environment: 'production',
	overrides: {
		debug: false,
		logging: {
			enabled: true,
			level: 'warn',
			console: false,
			format: 'json',
			includeTimestamp: true,
			includeStackTrace: false
		},
		cache: {
			enabled: true,
			defaultTtl: 3600, // 1 hour for production
			maxSize: 1000,
			autoRefreshInterval: 86400, // 24 hours
			backgroundRefresh: true,
			keyPrefix: 'semble:prod:'
		},
		performance: {
			enabled: true,
			trackTiming: true,
			trackMemory: false, // Disable memory tracking in prod for performance
			trackApiCalls: true,
			dataRetention: 86400, // 24 hours
			alertThresholds: {
				operationTimeout: 15000, // 15 seconds for prod
				memoryUsage: 50, // 50MB for prod
				errorRate: 0.01 // 1% for prod
			}
		}
	},
	secrets: {},
	features: {
		enableDetailedLogging: false,
		enablePerformanceDebugging: false,
		enableCacheDebugging: false
	}
};

// =============================================================================
// CONFIGURATION FACTORY
// =============================================================================

/**
 * Configuration factory class for creating and managing configurations
 */
export class ConfigFactory {
	private static instance: ConfigFactory;
	private currentConfig: GlobalConfig | null = null;

	private constructor() {}

	/**
	 * Get singleton instance of ConfigFactory
	 */
	public static getInstance(): ConfigFactory {
		if (!ConfigFactory.instance) {
			ConfigFactory.instance = new ConfigFactory();
		}
		return ConfigFactory.instance;
	}

	/**
	 * Create configuration based on environment and options
	 */
	public createConfig(options: ConfigFactoryOptions): GlobalConfig {
		let config = { ...options.baseConfig };

		// Apply environment-specific overrides
		if (options.environmentConfig) {
			config = this.mergeConfigurations(config, options.environmentConfig.overrides);
		}

		// Apply runtime overrides
		if (options.runtimeOverrides) {
			config = this.mergeConfigurations(config, options.runtimeOverrides);
		}

		// Validate configuration if enabled
		if (options.validation.enabled) {
			this.validateConfiguration(config, options.validation);
		}

		this.currentConfig = config;
		return config;
	}

	/**
	 * Get current active configuration
	 */
	public getCurrentConfig(): GlobalConfig | null {
		return this.currentConfig;
	}

	/**
	 * Deep merge two configuration objects
	 */
	private mergeConfigurations(base: GlobalConfig, overrides: Partial<GlobalConfig>): GlobalConfig {
		const result = { ...base } as any;

		for (const [key, value] of Object.entries(overrides)) {
			if (value !== undefined) {
				if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
					// Deep merge objects
					result[key] = {
						...(result[key] as any),
						...value
					};
				} else {
					// Direct assignment for primitives and arrays
					result[key] = value as any;
				}
			}
		}

		return result as GlobalConfig;
	}

	/**
	 * Validate configuration structure and values
	 */
	private validateConfiguration(config: GlobalConfig, validation: ConfigFactoryOptions['validation']): void {
		const errors: string[] = [];

		// Basic structure validation
		if (!config.version) {
			errors.push('Configuration version is required');
		}

		if (!config.logging) {
			errors.push('Logging configuration is required');
		}

		if (!config.cache) {
			errors.push('Cache configuration is required');
		}

		if (!Array.isArray(config.services)) {
			errors.push('Services configuration must be an array');
		}

		// Validate service configurations
		config.services.forEach((service, index) => {
			if (!service.name) {
				errors.push(`Service at index ${index} must have a name`);
			}
			if (typeof service.enabled !== 'boolean') {
				errors.push(`Service "${service.name}" must have a boolean enabled flag`);
			}
		});

		// Validate cache configuration
		if (config.cache.enabled) {
			if (config.cache.defaultTtl <= 0) {
				errors.push('Cache defaultTtl must be positive');
			}
			if (config.cache.maxSize <= 0) {
				errors.push('Cache maxSize must be positive');
			}
		}

		// Performance thresholds validation
		if (config.performance.enabled) {
			const thresholds = config.performance.alertThresholds;
			if (thresholds.operationTimeout <= 0) {
				errors.push('Operation timeout threshold must be positive');
			}
			if (thresholds.memoryUsage <= 0) {
				errors.push('Memory usage threshold must be positive');
			}
			if (thresholds.errorRate < 0 || thresholds.errorRate > 1) {
				errors.push('Error rate threshold must be between 0 and 1');
			}
		}

		// Handle validation errors
		if (errors.length > 0) {
			const errorMessage = `Configuration validation failed:\n${errors.join('\n')}`;
			
			if (validation.throwOnValidationError) {
				throw new Error(errorMessage);
			} else {
				console.warn('Configuration validation warnings:', errorMessage);
			}
		}
	}
}

// =============================================================================
// CONFIGURATION UTILITIES
// =============================================================================

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig(environment: string): EnvironmentConfig {
	switch (environment.toLowerCase()) {
		case 'development':
		case 'dev':
			return DEVELOPMENT_CONFIG;
		case 'staging':
		case 'stage':
			return STAGING_CONFIG;
		case 'production':
		case 'prod':
			return PRODUCTION_CONFIG;
		default:
			throw new Error(`Unknown environment: ${environment}`);
	}
}

/**
 * Create configuration for specific environment
 */
export function createEnvironmentConfig(environment: string, runtimeOverrides?: Partial<GlobalConfig>): GlobalConfig {
	const factory = ConfigFactory.getInstance();
	const envConfig = getEnvironmentConfig(environment);

	return factory.createConfig({
baseConfig: DEFAULT_CONFIG,
environmentConfig: envConfig,
runtimeOverrides,
validation: {
enabled: true,
strictMode: environment === 'production',
throwOnValidationError: environment === 'production'
}
});
}

/**
 * Get configuration value by path (e.g., 'cache.defaultTtl')
 */
export function getConfigValue<T = any>(config: GlobalConfig, path: string): T | undefined {
	return path.split('.').reduce((obj: any, key: string) => obj?.[key], config);
}

/**
 * Check if a feature is enabled in the current environment
 */
export function isFeatureEnabled(environment: string, featureName: string): boolean {
	try {
		const envConfig = getEnvironmentConfig(environment);
		return envConfig.features[featureName] === true;
	} catch {
		return false;
	}
}

/**
 * Export for easy access to default configuration
 */
export default DEFAULT_CONFIG;
