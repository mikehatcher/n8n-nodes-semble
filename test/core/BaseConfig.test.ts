/**
 * @fileoverview Comprehensive tests for BaseConfig system
 * @description Tests configuration management, environment overrides, validation, and utilities
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Core.BaseConfig
 * @since 2.0.0
 */

import {
	DEFAULT_CONFIG,
	DEVELOPMENT_CONFIG,
	STAGING_CONFIG,
	PRODUCTION_CONFIG,
	ConfigFactory,
	getEnvironmentConfig,
	createEnvironmentConfig,
	getConfigValue,
	isFeatureEnabled
} from '../../core/BaseConfig';
import { GlobalConfig, EnvironmentConfig, ConfigFactoryOptions } from '../../types/ConfigTypes';
import { SEMBLE_CONSTANTS } from '../../core/Constants';

describe('BaseConfig', () => {
	
	describe('DEFAULT_CONFIG', () => {
		it('should have all required properties', () => {
			expect(DEFAULT_CONFIG).toBeDefined();
			expect(DEFAULT_CONFIG.version).toBe('2.0.0');
			expect(DEFAULT_CONFIG.debug).toBe(false);
			
			// Core sections
			expect(DEFAULT_CONFIG.logging).toBeDefined();
			expect(DEFAULT_CONFIG.cache).toBeDefined();
			expect(DEFAULT_CONFIG.services).toBeDefined();
			expect(DEFAULT_CONFIG.fieldRegistry).toBeDefined();
			expect(DEFAULT_CONFIG.performance).toBeDefined();
		});

		it('should have valid logging configuration', () => {
			const { logging } = DEFAULT_CONFIG;
			
			expect(logging.enabled).toBe(true);
			expect(logging.level).toBe('info');
			expect(logging.console).toBe(true);
			expect(logging.format).toBe('json');
			expect(logging.includeTimestamp).toBe(true);
			expect(logging.includeStackTrace).toBe(false);
		});

		it('should have valid cache configuration', () => {
			const { cache } = DEFAULT_CONFIG;
			
			expect(cache.enabled).toBe(true);
			expect(cache.defaultTtl).toBe(SEMBLE_CONSTANTS.CACHE.DEFAULT_TTL);
			expect(cache.maxSize).toBe(SEMBLE_CONSTANTS.CACHE.MAX_SIZE);
			expect(cache.autoRefreshInterval).toBe(SEMBLE_CONSTANTS.CACHE.AUTO_REFRESH_INTERVAL);
			expect(cache.backgroundRefresh).toBe(true);
			expect(cache.keyPrefix).toBe('semble:');
		});

		it('should have all required services configured', () => {
			const { services } = DEFAULT_CONFIG;
			const serviceNames = services.map(s => s.name);
			
			expect(serviceNames).toContain('credential');
			expect(serviceNames).toContain('query');
			expect(serviceNames).toContain('fieldDiscovery');
			expect(serviceNames).toContain('permissionCheck');
			expect(serviceNames).toContain('validation');
			
			// Each service should have required properties
			services.forEach(service => {
				expect(service.name).toBeDefined();
				expect(typeof service.enabled).toBe('boolean');
				expect(typeof service.initTimeout).toBe('number');
				expect(service.options).toBeDefined();
			});
		});

		it('should have valid credential service configuration', () => {
			const credService = DEFAULT_CONFIG.services.find(s => s.name === 'credential');
			expect(credService).toBeDefined();
			expect(credService!.enabled).toBe(true);
			
			const options = credService!.options;
			expect(options.validateOnStartup).toBe(true);
			expect(options.validationTimeout).toBe(3000);
			expect(options.cacheValidCredentials).toBe(true);
			expect(options.environmentSafety.enabled).toBe(true);
		});

		it('should have valid query service configuration', () => {
			const queryService = DEFAULT_CONFIG.services.find(s => s.name === 'query');
			expect(queryService).toBeDefined();
			expect(queryService!.enabled).toBe(true);
			
			const options = queryService!.options;
			expect(options.requestTimeout).toBe(SEMBLE_CONSTANTS.TIMEOUTS.REQUEST_TIMEOUT);
			expect(options.maxRetries).toBe(SEMBLE_CONSTANTS.RETRY.MAX_RETRIES);
			expect(options.rateLimit.enabled).toBe(true);
		});

		it('should have valid performance configuration', () => {
			const { performance } = DEFAULT_CONFIG;
			
			expect(performance.enabled).toBe(true);
			expect(performance.trackTiming).toBe(true);
			expect(performance.trackMemory).toBe(true);
			expect(performance.trackApiCalls).toBe(true);
			expect(performance.dataRetention).toBe(86400);
			
			const thresholds = performance.alertThresholds;
			expect(thresholds.operationTimeout).toBe(30000);
			expect(thresholds.memoryUsage).toBe(100);
			expect(thresholds.errorRate).toBe(0.05);
		});
	});

	describe('Environment Configurations', () => {
		
		describe('DEVELOPMENT_CONFIG', () => {
			it('should have development-specific overrides', () => {
				expect(DEVELOPMENT_CONFIG.environment).toBe('development');
				expect(DEVELOPMENT_CONFIG.overrides.debug).toBe(true);
				expect(DEVELOPMENT_CONFIG.overrides.logging!.level).toBe('debug');
				expect(DEVELOPMENT_CONFIG.overrides.logging!.format).toBe('text');
				expect(DEVELOPMENT_CONFIG.overrides.logging!.includeStackTrace).toBe(true);
			});

			it('should have development cache settings', () => {
				const cache = DEVELOPMENT_CONFIG.overrides.cache!;
				expect(cache.defaultTtl).toBe(300); // 5 minutes
				expect(cache.maxSize).toBe(100);
				expect(cache.backgroundRefresh).toBe(false);
				expect(cache.keyPrefix).toBe('semble:dev:');
			});

			it('should have development features enabled', () => {
				const features = DEVELOPMENT_CONFIG.features;
				expect(features.enableDetailedLogging).toBe(true);
				expect(features.enablePerformanceDebugging).toBe(true);
				expect(features.enableCacheDebugging).toBe(true);
			});
		});

		describe('STAGING_CONFIG', () => {
			it('should have staging-specific overrides', () => {
				expect(STAGING_CONFIG.environment).toBe('staging');
				expect(STAGING_CONFIG.overrides.debug).toBe(false);
				expect(STAGING_CONFIG.overrides.logging!.level).toBe('info');
				expect(STAGING_CONFIG.overrides.logging!.format).toBe('json');
			});

			it('should have staging cache settings', () => {
				const cache = STAGING_CONFIG.overrides.cache!;
				expect(cache.defaultTtl).toBe(1800); // 30 minutes
				expect(cache.maxSize).toBe(500);
				expect(cache.keyPrefix).toBe('semble:staging:');
			});
		});

		describe('PRODUCTION_CONFIG', () => {
			it('should have production-specific overrides', () => {
				expect(PRODUCTION_CONFIG.environment).toBe('production');
				expect(PRODUCTION_CONFIG.overrides.debug).toBe(false);
				expect(PRODUCTION_CONFIG.overrides.logging!.level).toBe('warn');
				expect(PRODUCTION_CONFIG.overrides.logging!.console).toBe(false);
			});

			it('should have production cache settings', () => {
				const cache = PRODUCTION_CONFIG.overrides.cache!;
				expect(cache.defaultTtl).toBe(3600); // 1 hour
				expect(cache.maxSize).toBe(1000);
				expect(cache.keyPrefix).toBe('semble:prod:');
			});

			it('should have production performance settings', () => {
				const performance = PRODUCTION_CONFIG.overrides.performance!;
				expect(performance.trackMemory).toBe(false); // Disabled for performance
				expect(performance.alertThresholds!.operationTimeout).toBe(15000);
				expect(performance.alertThresholds!.errorRate).toBe(0.01); // 1%
			});

			it('should have production features disabled', () => {
				const features = PRODUCTION_CONFIG.features;
				expect(features.enableDetailedLogging).toBe(false);
				expect(features.enablePerformanceDebugging).toBe(false);
				expect(features.enableCacheDebugging).toBe(false);
			});
		});
	});

	describe('ConfigFactory', () => {
		let factory: ConfigFactory;

		beforeEach(() => {
			factory = ConfigFactory.getInstance();
		});

		describe('Singleton Pattern', () => {
			it('should return the same instance', () => {
				const factory1 = ConfigFactory.getInstance();
				const factory2 = ConfigFactory.getInstance();
				expect(factory1).toBe(factory2);
			});
		});

		describe('createConfig', () => {
			it('should create configuration with base config only', () => {
				const options: ConfigFactoryOptions = {
					baseConfig: DEFAULT_CONFIG,
					validation: {
						enabled: false,
						strictMode: false,
						throwOnValidationError: false
					}
				};

				const config = factory.createConfig(options);
				expect(config).toEqual(DEFAULT_CONFIG);
			});

			it('should apply environment overrides', () => {
				const options: ConfigFactoryOptions = {
					baseConfig: DEFAULT_CONFIG,
					environmentConfig: DEVELOPMENT_CONFIG,
					validation: {
						enabled: false,
						strictMode: false,
						throwOnValidationError: false
					}
				};

				const config = factory.createConfig(options);
				expect(config.debug).toBe(true); // From dev override
				expect(config.logging.level).toBe('debug'); // From dev override
				expect(config.version).toBe('2.0.0'); // From base config
			});

			it('should apply runtime overrides', () => {
				const runtimeOverrides: Partial<GlobalConfig> = {
					debug: true,
					cache: {
						enabled: false,
						defaultTtl: 123,
						maxSize: 456,
						autoRefreshInterval: 789,
						backgroundRefresh: false,
						keyPrefix: 'test:'
					}
				};

				const options: ConfigFactoryOptions = {
					baseConfig: DEFAULT_CONFIG,
					runtimeOverrides,
					validation: {
						enabled: false,
						strictMode: false,
						throwOnValidationError: false
					}
				};

				const config = factory.createConfig(options);
				expect(config.debug).toBe(true);
				expect(config.cache.enabled).toBe(false);
				expect(config.cache.defaultTtl).toBe(123);
				expect(config.cache.keyPrefix).toBe('test:');
			});

			it('should merge configurations in correct order', () => {
				const runtimeOverrides: Partial<GlobalConfig> = {
					debug: false, // This should override environment config
					logging: {
						enabled: true,
						level: 'error',
						console: true,
						format: 'json',
						includeTimestamp: true,
						includeStackTrace: false
					}
				};

				const options: ConfigFactoryOptions = {
					baseConfig: DEFAULT_CONFIG,
					environmentConfig: DEVELOPMENT_CONFIG,
					runtimeOverrides,
					validation: {
						enabled: false,
						strictMode: false,
						throwOnValidationError: false
					}
				};

				const config = factory.createConfig(options);
				expect(config.debug).toBe(false); // Runtime override wins
				expect(config.logging.level).toBe('error'); // Runtime override wins
				expect(config.version).toBe('2.0.0'); // From base config
			});
		});

		describe('Configuration Validation', () => {
			it('should validate configuration when enabled', () => {
				const options: ConfigFactoryOptions = {
					baseConfig: DEFAULT_CONFIG,
					validation: {
						enabled: true,
						strictMode: false,
						throwOnValidationError: false
					}
				};

				expect(() => factory.createConfig(options)).not.toThrow();
			});

			it('should throw error on invalid configuration when throwOnValidationError is true', () => {
				const invalidConfig = {
					...DEFAULT_CONFIG,
					version: '' // Invalid - empty version
				};

				const options: ConfigFactoryOptions = {
					baseConfig: invalidConfig,
					validation: {
						enabled: true,
						strictMode: false,
						throwOnValidationError: true
					}
				};

				expect(() => factory.createConfig(options)).toThrow('Configuration validation failed');
			});

			it('should validate service configurations', () => {
				const invalidConfig = {
					...DEFAULT_CONFIG,
					services: [
						{
							name: '', // Invalid - empty name
							enabled: true,
							initTimeout: 5000,
							options: {}
						}
					]
				};

				const options: ConfigFactoryOptions = {
					baseConfig: invalidConfig as any,
					validation: {
						enabled: true,
						strictMode: false,
						throwOnValidationError: true
					}
				};

				expect(() => factory.createConfig(options)).toThrow();
			});

			it('should validate cache configuration', () => {
				const invalidConfig = {
					...DEFAULT_CONFIG,
					cache: {
						...DEFAULT_CONFIG.cache,
						defaultTtl: -1 // Invalid - negative TTL
					}
				};

				const options: ConfigFactoryOptions = {
					baseConfig: invalidConfig,
					validation: {
						enabled: true,
						strictMode: false,
						throwOnValidationError: true
					}
				};

				expect(() => factory.createConfig(options)).toThrow();
			});

			it('should validate performance thresholds', () => {
				const invalidConfig = {
					...DEFAULT_CONFIG,
					performance: {
						...DEFAULT_CONFIG.performance,
						alertThresholds: {
							...DEFAULT_CONFIG.performance.alertThresholds,
							errorRate: 1.5 // Invalid - > 1
						}
					}
				};

				const options: ConfigFactoryOptions = {
					baseConfig: invalidConfig,
					validation: {
						enabled: true,
						strictMode: false,
						throwOnValidationError: true
					}
				};

				expect(() => factory.createConfig(options)).toThrow();
			});
		});

		describe('getCurrentConfig', () => {
			it('should return null when no config has been created', () => {
				// Create a fresh instance to ensure clean state
				const freshFactory = new (ConfigFactory as any)();
				expect(freshFactory.getCurrentConfig()).toBeNull();
			});

			it('should return current config after creation', () => {
				const options: ConfigFactoryOptions = {
					baseConfig: DEFAULT_CONFIG,
					validation: {
						enabled: false,
						strictMode: false,
						throwOnValidationError: false
					}
				};

				const config = factory.createConfig(options);
				expect(factory.getCurrentConfig()).toBe(config);
			});
		});
	});

	describe('Configuration Utilities', () => {
		
		describe('getEnvironmentConfig', () => {
			it('should return development config for dev environments', () => {
				expect(getEnvironmentConfig('development')).toBe(DEVELOPMENT_CONFIG);
				expect(getEnvironmentConfig('dev')).toBe(DEVELOPMENT_CONFIG);
			});

			it('should return staging config for staging environments', () => {
				expect(getEnvironmentConfig('staging')).toBe(STAGING_CONFIG);
				expect(getEnvironmentConfig('stage')).toBe(STAGING_CONFIG);
			});

			it('should return production config for production environments', () => {
				expect(getEnvironmentConfig('production')).toBe(PRODUCTION_CONFIG);
				expect(getEnvironmentConfig('prod')).toBe(PRODUCTION_CONFIG);
			});

			it('should be case insensitive', () => {
				expect(getEnvironmentConfig('DEVELOPMENT')).toBe(DEVELOPMENT_CONFIG);
				expect(getEnvironmentConfig('Production')).toBe(PRODUCTION_CONFIG);
			});

			it('should throw error for unknown environment', () => {
				expect(() => getEnvironmentConfig('unknown')).toThrow('Unknown environment: unknown');
			});
		});

		describe('createEnvironmentConfig', () => {
			it('should create development configuration', () => {
				const config = createEnvironmentConfig('development');
				expect(config.debug).toBe(true);
				expect(config.logging.level).toBe('debug');
				expect(config.cache.keyPrefix).toBe('semble:dev:');
			});

			it('should create production configuration', () => {
				const config = createEnvironmentConfig('production');
				expect(config.debug).toBe(false);
				expect(config.logging.level).toBe('warn');
				expect(config.cache.keyPrefix).toBe('semble:prod:');
			});

			it('should apply runtime overrides to environment config', () => {
				const overrides: Partial<GlobalConfig> = {
					debug: false,
					logging: {
						enabled: true,
						level: 'error',
						console: true,
						format: 'json',
						includeTimestamp: true,
						includeStackTrace: false
					}
				};

				const config = createEnvironmentConfig('development', overrides);
				expect(config.debug).toBe(false); // Override applied
				expect(config.logging.level).toBe('error'); // Override applied
				expect(config.logging.format).toBe('json'); // From override
			});

			it('should use strict validation for production', () => {
				// This should not throw for valid configuration
				expect(() => createEnvironmentConfig('production')).not.toThrow();
			});
		});

		describe('getConfigValue', () => {
			it('should get top-level values', () => {
				expect(getConfigValue(DEFAULT_CONFIG, 'version')).toBe('2.0.0');
				expect(getConfigValue(DEFAULT_CONFIG, 'debug')).toBe(false);
			});

			it('should get nested values', () => {
				expect(getConfigValue(DEFAULT_CONFIG, 'logging.level')).toBe('info');
				expect(getConfigValue(DEFAULT_CONFIG, 'cache.defaultTtl')).toBe(SEMBLE_CONSTANTS.CACHE.DEFAULT_TTL);
				expect(getConfigValue(DEFAULT_CONFIG, 'performance.alertThresholds.errorRate')).toBe(0.05);
			});

			it('should return undefined for non-existent paths', () => {
				expect(getConfigValue(DEFAULT_CONFIG, 'nonexistent')).toBeUndefined();
				expect(getConfigValue(DEFAULT_CONFIG, 'logging.nonexistent')).toBeUndefined();
				expect(getConfigValue(DEFAULT_CONFIG, 'nonexistent.nested.path')).toBeUndefined();
			});

			it('should handle empty path', () => {
				// getConfigValue with empty string should return undefined due to path.split('.')[0] being ''
				expect(getConfigValue(DEFAULT_CONFIG, '')).toBeUndefined();
			});
		});

		describe('isFeatureEnabled', () => {
			it('should return true for enabled development features', () => {
				expect(isFeatureEnabled('development', 'enableDetailedLogging')).toBe(true);
				expect(isFeatureEnabled('development', 'enablePerformanceDebugging')).toBe(true);
				expect(isFeatureEnabled('development', 'enableCacheDebugging')).toBe(true);
			});

			it('should return false for disabled production features', () => {
				expect(isFeatureEnabled('production', 'enableDetailedLogging')).toBe(false);
				expect(isFeatureEnabled('production', 'enablePerformanceDebugging')).toBe(false);
				expect(isFeatureEnabled('production', 'enableCacheDebugging')).toBe(false);
			});

			it('should return false for non-existent features', () => {
				expect(isFeatureEnabled('development', 'nonExistentFeature')).toBe(false);
				expect(isFeatureEnabled('production', 'anotherNonExistentFeature')).toBe(false);
			});

			it('should return false for unknown environments', () => {
				expect(isFeatureEnabled('unknown', 'enableDetailedLogging')).toBe(false);
			});

			it('should be case insensitive for environment names', () => {
				expect(isFeatureEnabled('DEVELOPMENT', 'enableDetailedLogging')).toBe(true);
				expect(isFeatureEnabled('Production', 'enableDetailedLogging')).toBe(false);
			});
		});
	});

	describe('Deep Merge Functionality', () => {
		it('should deep merge nested objects in configuration', () => {
			const factory = ConfigFactory.getInstance();
			const baseConfig = {
				...DEFAULT_CONFIG,
				cache: {
					enabled: true,
					defaultTtl: 1000,
					maxSize: 100,
					autoRefreshInterval: 3600,
					backgroundRefresh: true,
					keyPrefix: 'base:'
				}
			};

			const overrides: Partial<GlobalConfig> = {
				cache: {
					enabled: true,
					defaultTtl: 2000,
					maxSize: 100,
					autoRefreshInterval: 3600,
					backgroundRefresh: true,
					keyPrefix: 'override:'
				}
			};

			const options: ConfigFactoryOptions = {
				baseConfig,
				runtimeOverrides: overrides,
				validation: {
					enabled: false,
					strictMode: false,
					throwOnValidationError: false
				}
			};

			const config = factory.createConfig(options);
			
			// Should have overridden values
			expect(config.cache.defaultTtl).toBe(2000);
			expect(config.cache.keyPrefix).toBe('override:');
			
			// Should preserve base values not overridden
			expect(config.cache.enabled).toBe(true);
			expect(config.cache.maxSize).toBe(100);
			expect(config.cache.backgroundRefresh).toBe(true);
		});
	});

	describe('Edge Cases and Error Handling', () => {
		it('should handle empty configurations gracefully', () => {
			const factory = ConfigFactory.getInstance();
			const emptyConfig = {} as GlobalConfig;

			const options: ConfigFactoryOptions = {
				baseConfig: emptyConfig,
				validation: {
					enabled: false,
					strictMode: false,
					throwOnValidationError: false
				}
			};

			expect(() => factory.createConfig(options)).not.toThrow();
		});

		it('should handle undefined overrides', () => {
			const factory = ConfigFactory.getInstance();

			const options: ConfigFactoryOptions = {
				baseConfig: DEFAULT_CONFIG,
				environmentConfig: undefined,
				runtimeOverrides: undefined,
				validation: {
					enabled: false,
					strictMode: false,
					throwOnValidationError: false
				}
			};

			const config = factory.createConfig(options);
			expect(config).toEqual(DEFAULT_CONFIG);
		});
	});
});
