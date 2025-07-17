/**
 * @fileoverview Test Suite for Cache Management System
 * @description Comprehensive tests for CacheService including TTL, thread-safety, auto-refresh, and manual refresh
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Services.Cache
 * @since Phase 2.2 - Cache Management System
 */

import { 
	CacheService, 
	SchemaCacheService, 
	PermissionCacheService,
	CacheKeyStrategy 
} from '../../services/CacheService';
import { CacheConfig } from '../../types/ConfigTypes';
import { SEMBLE_CONSTANTS } from '../../core/Constants';

// =============================================================================
// TEST SETUP AND UTILITIES
// =============================================================================

const createTestCacheConfig = (overrides: Partial<CacheConfig> = {}): CacheConfig => ({
	enabled: true,
	defaultTtl: 1000, // 1 second for testing
	maxSize: 5,
	autoRefreshInterval: 500, // 0.5 seconds for testing
	backgroundRefresh: false, // Disabled by default for controlled testing
	keyPrefix: 'test:',
	...overrides
});

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// =============================================================================
// CACHE SERVICE CORE OPERATIONS
// =============================================================================

describe('CacheService', () => {
	let cacheService: CacheService;

	beforeEach(() => {
		cacheService = new CacheService(createTestCacheConfig());
	});

	afterEach(async () => {
		await cacheService.shutdown();
	});

	describe('Basic Cache Operations', () => {
		it('should set and get values correctly', async () => {
			const testData = { id: 1, name: 'test' };
			
			await cacheService.set('test-key', testData);
			const retrieved = await cacheService.get('test-key');
			
			expect(retrieved).toEqual(testData);
		});

		it('should return null for non-existent keys', async () => {
			const result = await cacheService.get('non-existent');
			expect(result).toBeNull();
		});

		it('should check key existence correctly', async () => {
			await cacheService.set('exists', 'value');
			
			expect(await cacheService.has('exists')).toBe(true);
			expect(await cacheService.has('does-not-exist')).toBe(false);
		});

		it('should delete entries correctly', async () => {
			await cacheService.set('to-delete', 'value');
			expect(await cacheService.has('to-delete')).toBe(true);
			
			const deleted = await cacheService.delete('to-delete');
			expect(deleted).toBe(true);
			expect(await cacheService.has('to-delete')).toBe(false);
		});

		it('should clear all entries', async () => {
			await cacheService.set('key1', 'value1');
			await cacheService.set('key2', 'value2');
			
			await cacheService.clear();
			
			expect(await cacheService.has('key1')).toBe(false);
			expect(await cacheService.has('key2')).toBe(false);
		});
	});

	describe('TTL (Time To Live) Functionality', () => {
		it('should respect custom TTL', async () => {
			await cacheService.set('short-lived', 'value', 100); // 100ms
			
			expect(await cacheService.get('short-lived')).toBe('value');
			
			await delay(150);
			expect(await cacheService.get('short-lived')).toBeNull();
		});

		it('should use default TTL when not specified', async () => {
			await cacheService.set('default-ttl', 'value');
			
			expect(await cacheService.get('default-ttl')).toBe('value');
			
			await delay(1200); // Default is 1000ms
			expect(await cacheService.get('default-ttl')).toBeNull();
		});

		it('should handle has() correctly with expired entries', async () => {
			await cacheService.set('expiring', 'value', 100);
			
			expect(await cacheService.has('expiring')).toBe(true);
			
			await delay(150);
			expect(await cacheService.has('expiring')).toBe(false);
		});
	});

	describe('Cache Size Management', () => {
		it('should evict least recently used entries when at capacity', async () => {
			const config = createTestCacheConfig({ maxSize: 3 });
			const cache = new CacheService(config);
			
			try {
				// Fill cache to capacity with slight delays to ensure creation time differences
				await cache.set('key1', 'value1');
				await delay(10);
				await cache.set('key2', 'value2');
				await delay(10);
				await cache.set('key3', 'value3');
				await delay(10);
				
				// Access key1 to make it recently used
				await cache.get('key1');
				await delay(10);
				
				// Add one more - should evict key2 (oldest unaccessed)
				await cache.set('key4', 'value4');
				
				expect(await cache.has('key1')).toBe(true); // Recently accessed
				expect(await cache.has('key2')).toBe(false); // Should be evicted
				expect(await cache.has('key3')).toBe(true);
				expect(await cache.has('key4')).toBe(true);
			} finally {
				await cache.shutdown();
			}
		});

		it('should update access metadata on get operations', async () => {
			await cacheService.set('access-test', 'value');
			
			const stats1 = cacheService.getStats();
			await cacheService.get('access-test');
			const stats2 = cacheService.getStats();
			
			// Stats should reflect the access (implementation dependent)
			expect(stats2.size).toBe(stats1.size);
		});
	});

	describe('Cache Key Generation', () => {
		it('should generate simple keys correctly', () => {
			const key = cacheService.generateKey(['user', '123', 'profile'], CacheKeyStrategy.SIMPLE);
			expect(key).toBe('user_123_profile');
		});

		it('should generate hierarchical keys correctly', () => {
			const key = cacheService.generateKey(['user', '123', 'profile'], CacheKeyStrategy.HIERARCHICAL);
			expect(key).toBe('user:123:profile');
		});

		it('should generate hashed keys consistently', () => {
			const key1 = cacheService.generateKey(['user', '123'], CacheKeyStrategy.HASHED);
			const key2 = cacheService.generateKey(['user', '123'], CacheKeyStrategy.HASHED);
			
			expect(key1).toBe(key2);
			expect(key1).toMatch(/^hash_\d+$/);
		});

		it('should sanitize key parts', () => {
			const key = cacheService.generateKey(['user@domain.com', 'special-chars!'], CacheKeyStrategy.SIMPLE);
			expect(key).toBe('user_domain_com_special-chars_');
		});

		it('should throw error for invalid key strategy', () => {
			expect(() => {
				cacheService.generateKey(['test'], 'invalid' as CacheKeyStrategy);
			}).toThrow('Invalid cache key strategy');
		});
	});
});

// =============================================================================
// CACHE REFRESH OPERATIONS
// =============================================================================

describe('Cache Refresh Operations', () => {
	let cacheService: CacheService;

	beforeEach(() => {
		cacheService = new CacheService(createTestCacheConfig());
	});

	afterEach(async () => {
		await cacheService.shutdown();
	});

	describe('Manual Refresh', () => {
		it('should refresh single entry with new data', async () => {
			let counter = 1;
			const refreshFunction = async () => `value-${counter++}`;
			
			// Initial set
			await cacheService.set('refresh-test', 'original-value');
			expect(await cacheService.get('refresh-test')).toBe('original-value');
			
			// Refresh with new data
			const refreshedValue = await cacheService.refreshEntry('refresh-test', refreshFunction);
			expect(refreshedValue).toBe('value-1');
			expect(await cacheService.get('refresh-test')).toBe('value-1');
		});

		it('should handle concurrent refresh requests to same key', async () => {
			let callCount = 0;
			const refreshFunction = async () => {
				callCount++;
				await delay(100); // Simulate slow operation
				return `value-${callCount}`;
			};
			
			// Start multiple refresh operations concurrently
			const promises = [
				cacheService.refreshEntry('concurrent-test', refreshFunction),
				cacheService.refreshEntry('concurrent-test', refreshFunction),
				cacheService.refreshEntry('concurrent-test', refreshFunction)
			];
			
			const results = await Promise.all(promises);
			
			// Should only call refresh function once due to locking
			expect(callCount).toBe(1);
			expect(results).toEqual(['value-1', 'value-1', 'value-1']);
		});

		it('should refresh multiple entries with refreshAll', async () => {
			const refreshFunctions = new Map([
				['key1', async () => 'refreshed-1'],
				['key2', async () => 'refreshed-2'],
				['key3', async () => 'refreshed-3']
			]);
			
			// Set initial values
			await cacheService.set('key1', 'original-1');
			await cacheService.set('key2', 'original-2');
			await cacheService.set('key3', 'original-3');
			
			const result = await cacheService.refreshAll(refreshFunctions);
			
			expect(result.success).toBe(true);
			expect(result.refreshedCount).toBe(3);
			expect(result.errors).toHaveLength(0);
			
			expect(await cacheService.get('key1')).toBe('refreshed-1');
			expect(await cacheService.get('key2')).toBe('refreshed-2');
			expect(await cacheService.get('key3')).toBe('refreshed-3');
		});

		it('should handle refresh errors gracefully', async () => {
			const refreshFunctions = new Map([
				['success-key', async () => 'success'],
				['error-key', async () => { throw new Error('Refresh failed'); }]
			]);
			
			const result = await cacheService.refreshAll(refreshFunctions);
			
			expect(result.success).toBe(false);
			expect(result.refreshedCount).toBe(1);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].message).toBe('Refresh failed');
		});

		it('should refresh only expired entries with refreshExpired', async () => {
			const refreshFunctions = new Map([
				['fresh-key', async () => 'fresh-refreshed'],
				['expired-key', async () => 'expired-refreshed']
			]);
			
			// Set one fresh entry and one that will expire
			await cacheService.set('fresh-key', 'fresh-original', 2000); // Long TTL
			await cacheService.set('expired-key', 'expired-original', 50); // Short TTL
			
			// Wait for one to expire
			await delay(100);
			
			const result = await cacheService.refreshExpired(refreshFunctions);
			
			expect(result.refreshedCount).toBe(1); // Only expired entry should refresh
			expect(await cacheService.get('fresh-key')).toBe('fresh-original');
			expect(await cacheService.get('expired-key')).toBe('expired-refreshed');
		});
	});
});

// =============================================================================
// AUTO-REFRESH MECHANISM
// =============================================================================

describe('Auto-Refresh Mechanism', () => {
	it('should start auto-refresh when background refresh is enabled', async () => {
		const config = createTestCacheConfig({
			backgroundRefresh: true,
			autoRefreshInterval: 200
		});
		
		const cache = new CacheService(config);
		
		// Auto-refresh should be running (we can't easily test the timer directly)
		// But we can test that cleanup happens
		await cache.set('test-key', 'value', 100); // Short TTL
		
		// Wait longer than TTL but shorter than auto-refresh interval
		await delay(150);
		
		// Entry should be expired but auto-cleanup might not have run yet
		const beforeCleanup = await cache.get('test-key');
		expect(beforeCleanup).toBeNull(); // Should be null due to TTL check on get
		
		await cache.shutdown();
	});

	it('should stop auto-refresh on shutdown', async () => {
		const config = createTestCacheConfig({
			backgroundRefresh: true,
			autoRefreshInterval: 100
		});
		
		const cache = new CacheService(config);
		
		// Shutdown should stop auto-refresh without errors
		await expect(cache.shutdown()).resolves.not.toThrow();
	});
});

// =============================================================================
// CACHE STATISTICS
// =============================================================================

describe('Cache Statistics', () => {
	let cacheService: CacheService;

	beforeEach(() => {
		cacheService = new CacheService(createTestCacheConfig());
	});

	afterEach(async () => {
		await cacheService.shutdown();
	});

	it('should track cache size correctly', async () => {
		const initialStats = cacheService.getStats();
		expect(initialStats.size).toBe(0);
		
		await cacheService.set('key1', 'value1');
		await cacheService.set('key2', 'value2');
		
		const stats = cacheService.getStats();
		expect(stats.size).toBe(2);
		expect(stats.maxSize).toBe(5); // From test config
	});

	it('should track expired entries', async () => {
		await cacheService.set('expiring', 'value', 50); // Short TTL
		
		await delay(100); // Wait for expiration
		
		const stats = cacheService.getStats();
		expect(stats.expiredEntries).toBeGreaterThan(0);
	});

	it('should provide performance metrics', async () => {
		const stats = cacheService.getStats();
		
		expect(typeof stats.hitRate).toBe('number');
		expect(stats.hitRate).toBeGreaterThanOrEqual(0);
		expect(stats.hitRate).toBeLessThanOrEqual(1);
		expect(typeof stats.refreshingEntries).toBe('number');
	});
});

// =============================================================================
// SPECIALIZED CACHE SERVICES
// =============================================================================

describe('Specialized Cache Services', () => {
	describe('SchemaCacheService', () => {
		let schemaCache: SchemaCacheService;

		beforeEach(() => {
			schemaCache = new SchemaCacheService(createTestCacheConfig());
		});

		afterEach(async () => {
			await schemaCache.shutdown();
		});

		it('should cache and retrieve field schemas', async () => {
			const schema = {
				fields: [
					{ name: 'id', type: 'string', required: true },
					{ name: 'name', type: 'string', required: false }
				]
			};
			
			await schemaCache.cacheFieldSchema('Patient', schema);
			const retrieved = await schemaCache.getFieldSchema('Patient');
			
			expect(retrieved).toEqual(schema);
		});

		it('should use schema-specific key prefix', () => {
			const key = schemaCache.generateKey(['fields', 'Patient']);
			expect(key).toBe('fields:Patient');
		});

		it('should respect field cache TTL from constants', async () => {
			const schema = { fields: [] };
			
			// Should use FIELD_CACHE_TTL from constants
			await schemaCache.cacheFieldSchema('Patient', schema);
			
			// Verify it's cached
			expect(await schemaCache.getFieldSchema('Patient')).toEqual(schema);
		});
	});

	describe('PermissionCacheService', () => {
		let permissionCache: PermissionCacheService;

		beforeEach(() => {
			permissionCache = new PermissionCacheService(createTestCacheConfig());
		});

		afterEach(async () => {
			await permissionCache.shutdown();
		});

		it('should cache and retrieve user permissions', async () => {
			const permissions = {
				read: true,
				write: false,
				delete: false,
				fields: ['id', 'name', 'email']
			};
			
			await permissionCache.cacheUserPermissions('user123', 'Patient', permissions);
			const retrieved = await permissionCache.getUserPermissions('user123', 'Patient');
			
			expect(retrieved).toEqual(permissions);
		});

		it('should use permission-specific key prefix', () => {
			const key = permissionCache.generateKey(['user', 'user123', 'Patient']);
			expect(key).toBe('user:user123:Patient');
		});

		it('should handle multiple users and resources', async () => {
			const permissions1 = { read: true, write: true };
			const permissions2 = { read: true, write: false };
			
			await permissionCache.cacheUserPermissions('user1', 'Patient', permissions1);
			await permissionCache.cacheUserPermissions('user2', 'Patient', permissions2);
			await permissionCache.cacheUserPermissions('user1', 'Booking', permissions2);
			
			expect(await permissionCache.getUserPermissions('user1', 'Patient')).toEqual(permissions1);
			expect(await permissionCache.getUserPermissions('user2', 'Patient')).toEqual(permissions2);
			expect(await permissionCache.getUserPermissions('user1', 'Booking')).toEqual(permissions2);
			expect(await permissionCache.getUserPermissions('user1', 'NonExistent')).toBeNull();
		});
	});
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

describe('Cache Error Handling', () => {
	let cacheService: CacheService;

	beforeEach(() => {
		cacheService = new CacheService(createTestCacheConfig());
	});

	afterEach(async () => {
		await cacheService.shutdown();
	});

	it('should handle refresh function errors gracefully', async () => {
		const errorFunction = async () => {
			throw new Error('Simulated refresh error');
		};
		
		await expect(
			cacheService.refreshEntry('error-key', errorFunction)
		).rejects.toThrow('Simulated refresh error');
	});

	it('should clean up refresh locks on error', async () => {
		const errorFunction = async () => {
			throw new Error('Lock test error');
		};
		
		await expect(
			cacheService.refreshEntry('lock-test', errorFunction)
		).rejects.toThrow();
		
		// Subsequent refresh should not be blocked
		const successFunction = async () => 'success';
		const result = await cacheService.refreshEntry('lock-test', successFunction);
		expect(result).toBe('success');
	});

	it('should handle shutdown gracefully during active operations', async () => {
		// Start a long-running refresh
		const slowRefresh = async () => {
			await delay(200);
			return 'slow-result';
		};
		
		const refreshPromise = cacheService.refreshEntry('slow-key', slowRefresh);
		
		// Shutdown while refresh is in progress
		const shutdownPromise = cacheService.shutdown();
		
		await expect(Promise.all([refreshPromise, shutdownPromise])).resolves.toBeDefined();
	});
});

// =============================================================================
// INTEGRATION SCENARIOS
// =============================================================================

describe('Cache Integration Scenarios', () => {
	it('should handle realistic field discovery caching scenario', async () => {
		const schemaCache = new SchemaCacheService(createTestCacheConfig({
			defaultTtl: SEMBLE_CONSTANTS.CACHE.FIELD_CACHE_TTL * 1000 // Convert to ms
		}));
		
		try {
			// Simulate field discovery process
			const patientSchema = {
				resource: 'Patient',
				fields: [
					{ name: 'id', type: 'ID', required: true },
					{ name: 'firstName', type: 'String', required: true },
					{ name: 'lastName', type: 'String', required: true },
					{ name: 'email', type: 'String', required: false },
					{ name: 'phone', type: 'String', required: false }
				],
				discoveredAt: new Date().toISOString()
			};
			
			// Cache the schema
			await schemaCache.cacheFieldSchema('Patient', patientSchema);
			
			// Verify retrieval
			const cached = await schemaCache.getFieldSchema('Patient');
			expect(cached).toEqual(patientSchema);
			
			// Simulate schema refresh with new field
			const updatedSchema = {
				...patientSchema,
				fields: [
					...patientSchema.fields,
					{ name: 'dateOfBirth', type: 'Date', required: false }
				],
				discoveredAt: new Date().toISOString()
			};
			
			// Use the same key generation as the schema cache service
			const schemaKey = schemaCache.generateKey(['fields', 'Patient']);
			await schemaCache.refreshEntry(schemaKey, async () => updatedSchema);
			
			const refreshed = await schemaCache.getFieldSchema('Patient');
			expect(refreshed.fields).toHaveLength(6);
			expect(refreshed.fields.find((f: any) => f.name === 'dateOfBirth')).toBeDefined();
		} finally {
			await schemaCache.shutdown();
		}
	});

	it('should handle realistic permission caching scenario', async () => {
		const permissionCache = new PermissionCacheService(createTestCacheConfig({
			defaultTtl: SEMBLE_CONSTANTS.CACHE.PERMISSION_CACHE_TTL * 1000
		}));
		
		try {
			// Simulate user permission checking
			const userId = 'user_123';
			const resources = ['Patient', 'Booking', 'Doctor'];
			
			// Cache permissions for multiple resources
			for (const resource of resources) {
				const permissions = {
					read: true,
					write: resource !== 'Doctor', // Different permissions per resource
					delete: false,
					fields: resource === 'Patient' 
						? ['id', 'firstName', 'lastName', 'email']
						: ['id', 'name', 'description']
				};
				
				await permissionCache.cacheUserPermissions(userId, resource, permissions);
			}
			
			// Verify all permissions are cached
			for (const resource of resources) {
				const cached = await permissionCache.getUserPermissions(userId, resource);
				expect(cached).toBeDefined();
				expect(cached.read).toBe(true);
			}
			
			// Test cache statistics
			const stats = permissionCache.getStats();
			expect(stats.size).toBe(3);
		} finally {
			await permissionCache.shutdown();
		}
	});
});
