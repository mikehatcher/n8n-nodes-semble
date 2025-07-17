/**
 * @fileoverview Tests for BaseConfig and configuration management system
 * @description Comprehensive test suite for configuration validation, environment handling, and factory patterns
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Core.BaseConfig
 * @since 2.0.0
 */

import { 
    BaseConfig, 
    ConfigFactory, 
    DEFAULT_CONFIG,
    DEVELOPMENT_CONFIG,
    STAGING_CONFIG,
    PRODUCTION_CONFIG,
    getEnvironmentConfig,
    createEnvironmentConfig,
    getConfigValue,
    isFeatureEnabled
} from './BaseConfigStub';
import { GlobalConfig } from '../../types/ConfigTypes';

describe('BaseConfig', () => {
	beforeEach(() => {
		// Reset ConfigFactory singleton before each test
		(ConfigFactory as any).instance = null;
	});

	describe('DEFAULT_CONFIG', () => {
		it('should have valid default configuration structure', () => {
			expect(DEFAULT_CONFIG).toBeDefined();
			expect(DEFAULT_CONFIG.version).toBe('2.0.0');
			expect(typeof DEFAULT_CONFIG.debug).toBe('boolean');
			expect(DEFAULT_CONFIG.logging).toBeDefined();
			expect(DEFAULT_CONFIG.cache).toBeDefined();
			expect(Array.isArray(DEFAULT_CONFIG.services)).toBe(true);
			expect(DEFAULT_CONFIG.fieldRegistry).toBeDefined();
			expect(DEFAULT_CONFIG.defaultOperations).toBeDefined();
			expect(DEFAULT_CONFIG.performance).toBeDefined();
		});

		it('should have correct logging configuration', () => {
			expect(DEFAULT_CONFIG.logging.level).toBe('info');
			expect(DEFAULT_CONFIG.logging.enabledModules).toContain('core');
			expect(DEFAULT_CONFIG.logging.enabledModules).toContain('services');
		});

		it('should have correct cache configuration', () => {
			expect(DEFAULT_CONFIG.cache.enabled).toBe(true);
			expect(DEFAULT_CONFIG.cache.defaultTtl).toBeGreaterThan(0);
			expect(DEFAULT_CONFIG.cache.maxSize).toBeGreaterThan(0);
		});

		it('should include all required services', () => {
			const serviceNames = DEFAULT_CONFIG.services.map(s => s.name);
			expect(serviceNames).toContain('credential');
			expect(serviceNames).toContain('validation');
			expect(serviceNames).toContain('query');
			expect(serviceNames).toContain('fieldDiscovery');
			expect(serviceNames).toContain('permissionCheck');
		});

		it('should have valid performance configuration', () => {
			expect(DEFAULT_CONFIG.performance.enabled).toBe(true);
			expect(DEFAULT_CONFIG.performance.alertThresholds.operationTimeout).toBeGreaterThan(0);
			expect(DEFAULT_CONFIG.performance.alertThresholds.memoryUsage).toBeGreaterThan(0);
		});
	});

	describe('Environment Configurations', () => {
		describe('DEVELOPMENT_CONFIG', () => {
			it('should have development-specific overrides', () => {
				expect(DEVELOPMENT_CONFIG.debug).toBe(true);
				expect(DEVELOPMENT_CONFIG.logging.level).toBe('debug');
			});

			it('should have development features enabled', () => {
				expect(DEVELOPMENT_CONFIG.performance.trackTiming).toBe(true);
				expect(DEVELOPMENT_CONFIG.performance.trackMemory).toBe(true);
			});
		});

		describe('STAGING_CONFIG', () => {
			it('should have staging-specific overrides', () => {
				expect(STAGING_CONFIG.debug).toBe(false);
				expect(STAGING_CONFIG.logging.level).toBe('warn');
			});

			it('should have selective features enabled', () => {
				expect(STAGING_CONFIG.performance.trackTiming).toBe(true);
				expect(STAGING_CONFIG.performance.trackMemory).toBe(false);
			});
		});

		describe('PRODUCTION_CONFIG', () => {
			it('should have production-specific overrides', () => {
				expect(PRODUCTION_CONFIG.debug).toBe(false);
				expect(PRODUCTION_CONFIG.logging.level).toBe('error');
			});

			it('should have production performance settings', () => {
				expect(PRODUCTION_CONFIG.cache.defaultTtl).toBe(1800000);
				expect(PRODUCTION_CONFIG.performance.dataRetention).toBe(86400000);
			});

			it('should have minimal features enabled', () => {
				expect(PRODUCTION_CONFIG.performance.trackTiming).toBe(false);
				expect(PRODUCTION_CONFIG.performance.trackMemory).toBe(false);
			});
		});
	});

	describe('ConfigFactory', () => {
		it('should be a singleton', () => {
			const factory1 = ConfigFactory.getInstance();
			const factory2 = ConfigFactory.getInstance();
			expect(factory1).toBe(factory2);
		});

		it('should create configuration with environment overrides', () => {
			const factory = ConfigFactory.getInstance();
			const config = factory.createConfig({
environment: 'development'
});

			expect(config.debug).toBe(true);
			expect(config.logging.level).toBe('debug');
		});

		it('should apply runtime overrides', () => {
			const factory = ConfigFactory.getInstance();
			const config = factory.createConfig({
environment: 'production',
overrides: {
debug: true,
logging: {
level: 'info'
}
}
});

			expect(config.debug).toBe(true);
			expect(config.logging.level).toBe('info');
		});

		it('should validate configuration when enabled', () => {
			const factory = ConfigFactory.getInstance();
			
			// This should not throw with valid config
			expect(() => {
				factory.createConfig({
environment: 'development',
validation: {
enabled: true,
strictMode: true,
throwOnValidationError: true
}
});
			}).not.toThrow();
		});

		it('should return current configuration', () => {
			const factory = ConfigFactory.getInstance();
			const config = factory.createConfig({ environment: 'development' });
			const currentConfig = factory.getCurrentConfig();
			
			expect(currentConfig).toBe(config);
		});
	});

	describe('Utility Functions', () => {
		describe('getEnvironmentConfig', () => {
			it('should return correct config for development', () => {
				const config = getEnvironmentConfig('development');
				expect(config.debug).toBe(true);
				expect(config.logging.level).toBe('debug');
			});

			it('should return correct config for staging', () => {
				const config = getEnvironmentConfig('staging');
				expect(config.debug).toBe(false);
				expect(config.logging.level).toBe('warn');
			});

			it('should return correct config for production', () => {
				const config = getEnvironmentConfig('production');
				expect(config.debug).toBe(false);
				expect(config.logging.level).toBe('error');
			});

			it('should handle environment aliases', () => {
				const devConfig = getEnvironmentConfig('dev');
				const prodConfig = getEnvironmentConfig('prod');
				
				expect(devConfig.debug).toBe(true);
				expect(prodConfig.debug).toBe(false);
			});

			it('should throw error for unknown environment', () => {
				expect(() => {
					getEnvironmentConfig('unknown' as any);
				}).toThrow('Unknown environment: unknown');
			});
		});

		describe('createEnvironmentConfig', () => {
			it('should create development configuration', () => {
				const config = createEnvironmentConfig('development');
				expect(config.debug).toBe(true);
				expect(config.logging.level).toBe('debug');
			});

			it('should create production configuration', () => {
				const config = createEnvironmentConfig('production');
				expect(config.debug).toBe(false);
				expect(config.logging.level).toBe('error');
			});

			it('should apply runtime overrides', () => {
				const config = createEnvironmentConfig('production', {
debug: true
});
				expect(config.debug).toBe(true);
			});
		});

		describe('getConfigValue', () => {
			const testConfig = createEnvironmentConfig('development');

			it('should get top-level config value', () => {
				expect(getConfigValue(testConfig, 'debug')).toBe(true);
				expect(getConfigValue(testConfig, 'version')).toBe('2.0.0');
			});

			it('should get nested config value', () => {
				expect(getConfigValue(testConfig, 'logging.level')).toBe('debug');
				expect(getConfigValue(testConfig, 'cache.enabled')).toBe(true);
			});

			it('should get deeply nested config value', () => {
				expect(getConfigValue(testConfig, 'performance.alertThresholds.operationTimeout')).toBeDefined();
			});

			it('should return undefined for non-existent path', () => {
				expect(getConfigValue(testConfig, 'nonExistent')).toBeUndefined();
				expect(getConfigValue(testConfig, 'logging.nonExistent')).toBeUndefined();
			});
		});

		describe('isFeatureEnabled', () => {
			it('should return true for enabled development features', () => {
				expect(isFeatureEnabled('development', 'debug')).toBe(true);
				expect(isFeatureEnabled('development', 'trackTiming')).toBe(true);
			});

			it('should return false for disabled production features', () => {
				expect(isFeatureEnabled('production', 'debug')).toBe(false);
				expect(isFeatureEnabled('production', 'trackTiming')).toBe(false);
			});

			it('should return false for unknown environment', () => {
				expect(isFeatureEnabled('unknown' as any, 'debug')).toBe(false);
			});

			it('should return false for unknown feature', () => {
				expect(isFeatureEnabled('development', 'unknownFeature' as any)).toBe(false);
			});
		});
	});

	describe('Configuration Validation', () => {
		// Skip the complex validation test until Phase 1.3 Error Management is implemented
		it.skip('should validate service configuration', () => {
			// This test will be implemented in Phase 1.3 when we have proper error management
		});

		it('should validate cache configuration', () => {
			const factory = ConfigFactory.getInstance();
			
			// Valid cache config should not throw
			expect(() => {
				factory.createConfig({
environment: 'development',
overrides: {
cache: {
enabled: true,
defaultTtl: 1000,
maxSize: 100
}
},
validation: {
enabled: true,
strictMode: true,
throwOnValidationError: true
}
});
			}).not.toThrow();
		});

		it('should validate performance thresholds', () => {
			const factory = ConfigFactory.getInstance();
			
			// Valid performance config should not throw
			expect(() => {
				factory.createConfig({
environment: 'development',
overrides: {
performance: {
enabled: true,
alertThresholds: {
operationTimeout: 5000,
memoryUsage: 100,
errorRate: 0.1
}
}
},
validation: {
enabled: true,
strictMode: true,
throwOnValidationError: true
}
});
			}).not.toThrow();
		});
	});
});
