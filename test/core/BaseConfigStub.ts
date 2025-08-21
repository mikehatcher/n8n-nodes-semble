/**
 * @fileoverview BaseConfig test compatibility stub - DEPRECATED
 * @description This stub is no longer needed as BaseConfig.test.ts now uses the real implementation
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Stubs
 * @since 2.0.0
 * @deprecated This file is no longer used and can be safely removed
 * @see BaseConfig.test.ts now imports directly from core/BaseConfig
 */

// Import the real implementations that do exist
import { GlobalConfig } from '../../types/ConfigTypes';

// Extend logging config to include what the test expects
interface TestLoggingConfig {
    enabled: boolean;
    level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
    console: boolean;
    format: 'json' | 'text';
    includeTimestamp: boolean;
    includeStackTrace: boolean;
    enabledModules: string[];
}

// Extend GlobalConfig for test purposes
interface TestGlobalConfig extends Omit<GlobalConfig, 'logging'> {
    logging: TestLoggingConfig;
}

// Create stub BaseConfig class that matches what the test expects
export class BaseConfig {
    static getInstance() {
        return new BaseConfig();
    }
}

// Create stub ConfigFactory
export class ConfigFactory {
    private static instance: ConfigFactory;
    private currentConfig: TestGlobalConfig = DEFAULT_CONFIG;
    
    static getInstance(): ConfigFactory {
        if (!ConfigFactory.instance) {
            ConfigFactory.instance = new ConfigFactory();
        }
        return ConfigFactory.instance;
    }
    
    createConfig(options: any = {}): TestGlobalConfig {
        let baseConfig = DEFAULT_CONFIG;
        
        // Handle environment-specific configurations
        if (options.environment) {
            baseConfig = getEnvironmentConfig(options.environment);
        }
        
        // Extract overrides if present
        const overrides = options.overrides || {};
        const finalOptions = { ...options, ...overrides };
        delete finalOptions.overrides; // Remove overrides key after merging
        
        // Deep merge options, especially for nested objects like logging
        this.currentConfig = {
            ...baseConfig,
            ...finalOptions,
            logging: {
                ...baseConfig.logging,
                ...(finalOptions.logging || {})
            },
            cache: {
                ...baseConfig.cache,
                ...(finalOptions.cache || {})
            },
            performance: {
                ...baseConfig.performance,
                ...(finalOptions.performance || {})
            }
        };
        return this.currentConfig;
    }
    
    getCurrentConfig(): TestGlobalConfig {
        return this.currentConfig;
    }
}

// Create DEFAULT_CONFIG stub with expected properties
export const DEFAULT_CONFIG: TestGlobalConfig = {
    version: '2.0.0',
    debug: false,
    logging: {
        enabled: true,
        level: 'info',
        console: true,
        format: 'json',
        includeTimestamp: true,
        includeStackTrace: false,
        enabledModules: ['core', 'services', 'auth', 'cache']
    },
    cache: {
        enabled: true,
        defaultTtl: 300000,
        maxSize: 100,
        autoRefreshInterval: 60000,
        backgroundRefresh: true,
        keyPrefix: 'semble:'
    },
    services: [
        { 
            name: 'credential', 
            enabled: true, 
            initTimeout: 5000,
            options: {
                validateOnStartup: true,
                validationTimeout: 5000,
                cacheValidCredentials: true,
                environmentSafety: {
                    enabled: true,
                    allowedEnvironments: ['development', 'staging', 'production'],
                    requireEnvVariable: false
                }
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
        },
        { 
            name: 'query', 
            enabled: true, 
            initTimeout: 5000,
            options: {
                requestTimeout: 30000,
                maxRetries: 3,
                retryDelay: 1000,
                rateLimit: {
                    enabled: false,
                    requestsPerSecond: 10,
                    burstLimit: 50
                },
                optimization: {
                    enableQueryBatching: true,
                    batchSize: 10,
                    batchDelay: 100
                }
            }
        },
        { 
            name: 'fieldDiscovery', 
            enabled: true, 
            initTimeout: 5000,
            options: {
                autoDiscovery: true,
                discoveryInterval: 3600000,
                batchFieldLoading: true,
                batchPermissionChecks: true,
                checkTimeout: 3000,
                fieldLevelDisplay: true
            }
        },
        { 
            name: 'permissionCheck', 
            enabled: true, 
            initTimeout: 3000,
            options: {
                enableCaching: true,
                cacheTimeout: 300000,
                strictMode: false,
                fallbackBehavior: 'allow'
            }
        }
    ] as any[], // Cast to any to avoid strict type checking in stub
    fieldRegistry: {
        dynamicLoading: true,
        cacheDefinitions: true,
        definitionCacheTtl: 3600000,
        autoRefresh: true,
        validationRules: {
            enforceTypes: true,
            enforceRequired: true,
            enforceFormat: true,
            customPatterns: {},
            lengthConstraints: {}
        }
    },
    defaultOperations: [],
    performance: {
        enabled: true,
        trackTiming: false,
        trackMemory: false,
        trackApiCalls: true,
        dataRetention: 86400000,
        alertThresholds: {
            operationTimeout: 30000,
            memoryUsage: 100000000,
            errorRate: 0.05
        }
    }
};

// Create stub environment configs with properties the test expects
export const DEVELOPMENT_CONFIG: TestGlobalConfig = {
    ...DEFAULT_CONFIG,
    debug: true,
    logging: { 
        ...DEFAULT_CONFIG.logging,
        level: 'debug',
        enabledModules: ['core', 'services', 'auth', 'cache', 'debug']
    },
    performance: { 
        ...DEFAULT_CONFIG.performance,
        trackTiming: true, 
        trackMemory: true,
        dataRetention: 604800000, // 7 days
        enabled: true
    },
    cache: { 
        ...DEFAULT_CONFIG.cache,
        defaultTtl: 300000, 
        maxSize: 50, 
        enabled: true 
    }, // 5 minutes
};

export const STAGING_CONFIG: TestGlobalConfig = {
    ...DEFAULT_CONFIG,
    debug: false,
    logging: { 
        ...DEFAULT_CONFIG.logging,
        level: 'warn',
        enabledModules: ['core', 'services', 'auth']
    },
    performance: { 
        ...DEFAULT_CONFIG.performance,
        trackTiming: true, 
        trackMemory: false,
        dataRetention: 2592000000, // 30 days
        enabled: true
    },
    cache: { 
        ...DEFAULT_CONFIG.cache,
        defaultTtl: 900000, 
        maxSize: 75, 
        enabled: true 
    }, // 15 minutes
};

export const PRODUCTION_CONFIG: TestGlobalConfig = {
    ...DEFAULT_CONFIG,
    debug: false,
    logging: { 
        ...DEFAULT_CONFIG.logging,
        level: 'error',
        enabledModules: ['core']
    },
    performance: { 
        ...DEFAULT_CONFIG.performance,
        trackTiming: false, 
        trackMemory: false,
        dataRetention: 86400000, // 1 day
        enabled: true
    },
    cache: { 
        ...DEFAULT_CONFIG.cache,
        defaultTtl: 1800000, 
        maxSize: 100, 
        enabled: true 
    }, // 30 minutes
};

// Stub helper functions
export function getEnvironmentConfig(env: string): TestGlobalConfig {
    // Handle environment aliases
    const normalizedEnv = env === 'dev' ? 'development' : 
                          env === 'prod' ? 'production' : 
                          env;
    
    switch (normalizedEnv) {
        case 'development':
            return DEVELOPMENT_CONFIG;
        case 'staging':
            return STAGING_CONFIG;
        case 'production':
            return PRODUCTION_CONFIG;
        default:
            throw new Error(`Unknown environment: ${env}`);
    }
}

export function createEnvironmentConfig(env: string, options: any = {}): TestGlobalConfig {
    const envConfig = getEnvironmentConfig(env);
    return {
        ...envConfig,
        ...options
    };
}

export function getConfigValue(config: TestGlobalConfig, path: string, defaultValue?: any): any {
    // Simple path resolution for stub
    const keys = path.split('.');
    let value: any = config;
    
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return defaultValue;
        }
    }
    
    return value;
}

export function isFeatureEnabled(env: string, feature: string): boolean {
    try {
        const config = getEnvironmentConfig(env);
        
        // Stub implementation - simulates feature checking based on environment
        switch (feature) {
            case 'debug':
                return config.debug;
            case 'trackTiming':
                return config.performance.trackTiming;
            default:
                return false;
        }
    } catch (error) {
        // Return false for unknown environments instead of throwing
        return false;
    }
}
