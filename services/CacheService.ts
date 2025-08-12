/**
 * @fileoverview Centralized caching system for n8n Semble node
 * @description High-performance caching layer with TTL, auto-refresh, and invalidation support for API responses, user sessions, and computed data
 * @author Mike Hatcher
 * @website https://progenious.com
 * @since Cache Management System
 * @namespace N8nNodesSemble.Services
 */

import { CacheConfig, CacheEntryMetadata } from '../types/ConfigTypes';
import { SembleError, SembleValidationError } from '../core/SembleError';
import { mapError } from '../core/ErrorMapper';
import { SEMBLE_CONSTANTS } from '../core/Constants';

// =============================================================================
// CACHE ENTRY TYPES
// =============================================================================

/**
 * Generic cache entry with metadata
 */
interface CacheEntry<T = any> {
	/** The cached data */
	data: T;
	/** Entry metadata for management */
	metadata: CacheEntryMetadata;
}

/**
 * Cache key generation strategies
 */
export enum CacheKeyStrategy {
	SIMPLE = 'simple',
	HIERARCHICAL = 'hierarchical',
	HASHED = 'hashed'
}

/**
 * Cache refresh result
 */
interface CacheRefreshResult {
	/** Whether the refresh was successful */
	success: boolean;
	/** Number of entries refreshed */
	refreshedCount: number;
	/** Any errors encountered during refresh */
	errors: Error[];
	/** Time taken for refresh operation */
	durationMs: number;
}

// =============================================================================
// CACHE SERVICE CLASS
// =============================================================================

/**
 * Thread-safe in-memory cache service with TTL and auto-refresh capabilities
 */
export class CacheService {
	private readonly cache = new Map<string, CacheEntry>();
	private readonly config: CacheConfig;
	private readonly refreshLocks = new Set<string>();
	private autoRefreshTimer?: NodeJS.Timeout;
	private isShuttingDown = false;

	constructor(config: CacheConfig) {
		this.config = {
			...config,
			keyPrefix: config.keyPrefix || SEMBLE_CONSTANTS.CACHE.KEY_PREFIXES.TEMP
		};
		
		if (this.config.backgroundRefresh && this.config.autoRefreshInterval > 0) {
			this.startAutoRefresh();
		}
	}

	// =============================================================================
	// CORE CACHE OPERATIONS
	// =============================================================================

	/**
	 * Store a value in the cache with optional TTL override
	 * 
	 * Stores data in the cache with automatic expiration handling and capacity management.
	 * If the cache is at capacity, least recently used entries are evicted to make space.
	 * 
	 * @example
	 * ```typescript
	 * const cache = new CacheService(config);
	 * 
	 * // Store with default TTL
	 * await cache.set('user:123', { name: 'John', email: 'john@example.com' });
	 * 
	 * // Store with custom TTL (5 minutes)
	 * await cache.set('temp:session', sessionData, 300);
	 * 
	 * // Store complex data structures
	 * await cache.set('api:response', { data: [...], metadata: {...} });
	 * ```
	 * 
	 * @param key - The cache key to store under
	 * @param value - The value to cache (any serializable type)
	 * @param ttl - Optional TTL in seconds (uses default if not provided)
	 * @returns Promise that resolves when value is stored
	 * @throws {SembleError} When cache write operation fails
	 * @since 2.0.0
	 */
	async set<T>(key: string, value: T, ttl?: number): Promise<void> {
		try {
			const normalizedKey = this.normalizeKey(key);
			const effectiveTtl = ttl || this.config.defaultTtl;
			const now = Date.now();
			
			// Check if we're at capacity and need to evict
			if (this.cache.size >= this.config.maxSize && !this.cache.has(normalizedKey)) {
				this.evictLeastRecentlyUsed();
			}

			const entry: CacheEntry<T> = {
				data: value,
				metadata: {
					createdAt: now,
					expiresAt: now + effectiveTtl,
					accessCount: 0,
					// Don't set lastAccessed on creation - only on actual access
					refreshing: false
				}
			};

			this.cache.set(normalizedKey, entry);
		} catch (error) {
			throw mapError(error, {
				operation: 'cache_write',
				resource: key
			});
		}
	}

	/**
	 * Retrieve a value from the cache by key
	 * 
	 * Automatically updates access metadata and handles expiration.
	 * Returns null if the key doesn't exist or has expired.
	 * 
	 * @example
	 * ```typescript
	 * const cache = new CacheService(config);
	 * const userdata = await cache.get<User>('user:123');
	 * if (userdata) {
	 *   console.log('Found user:', userdata.name);
	 * }
	 * ```
	 * 
	 * @param key - The cache key to retrieve
	 * @returns Promise resolving to cached value or null if not found/expired
	 * @throws {SembleError} When cache read operation fails
	 * @since 2.0.0
	 */
	async get<T>(key: string): Promise<T | null> {
		try {
			const normalizedKey = this.normalizeKey(key);
			const entry = this.cache.get(normalizedKey);

			if (!entry) {
				return null;
			}

			const now = Date.now();

			// Check if entry has expired
			if (now > entry.metadata.expiresAt) {
				this.cache.delete(normalizedKey);
				return null;
			}

			// Update access metadata
			entry.metadata.accessCount++;
			entry.metadata.lastAccessed = now;

			return entry.data as T;
		} catch (error) {
			throw mapError(error, {
				operation: 'cache_read',
				resource: key
			});
		}
	}

	/**
	 * Check if a cache key exists and has not expired
	 * 
	 * Automatically removes expired entries during the check.
	 * This is more efficient than get() when you only need existence.
	 * 
	 * @example
	 * ```typescript
	 * const cache = new CacheService(config);
	 * if (await cache.has('user:123')) {
	 *   console.log('User data is cached');
	 * }
	 * ```
	 * 
	 * @param key - The cache key to check
	 * @returns Promise resolving to true if key exists and is valid
	 * @since 2.0.0
	 */
	async has(key: string): Promise<boolean> {
		const normalizedKey = this.normalizeKey(key);
		const entry = this.cache.get(normalizedKey);

		if (!entry) {
			return false;
		}

		// Check expiration
		const now = Date.now();
		if (now > entry.metadata.expiresAt) {
			this.cache.delete(normalizedKey);
			return false;
		}

		return true;
	}

	/**
	 * Remove a specific cache entry
	 * 
	 * Deletes the cache entry for the given key if it exists.
	 * 
	 * @example
	 * ```typescript
	 * const cache = new CacheService(config);
	 * const wasDeleted = await cache.delete('user:123');
	 * console.log(`Entry ${wasDeleted ? 'was' : 'was not'} deleted`);
	 * ```
	 * 
	 * @param key - The cache key to delete
	 * @returns Promise resolving to true if entry was deleted, false if not found
	 * @since 2.0.0
	 */
	async delete(key: string): Promise<boolean> {
		const normalizedKey = this.normalizeKey(key);
		return this.cache.delete(normalizedKey);
	}

	/**
	 * Clear all cache entries
	 * 
	 * Removes all cached data and resets the cache to empty state.
	 * This operation cannot be undone.
	 * 
	 * @example
	 * ```typescript
	 * const cache = new CacheService(config);
	 * await cache.clear();
	 * console.log('Cache cleared');
	 * ```
	 * 
	 * @returns Promise that resolves when cache is cleared
	 * @since 2.0.0
	 */
	async clear(): Promise<void> {
		this.cache.clear();
	}

	// =============================================================================
	// CACHE KEY MANAGEMENT
	// =============================================================================

	/**
	 * Generate a cache key using the specified strategy
	 * 
	 * Creates cache keys using different strategies for different use cases:
	 * - SIMPLE: Basic underscore-separated keys (fast)
	 * - HIERARCHICAL: Colon-separated keys (organized) 
	 * - HASHED: Hash-based keys (fixed length)
	 * 
	 * @example
	 * ```typescript
	 * const cache = new CacheService(config);
	 * 
	 * // Hierarchical key
	 * const key1 = cache.generateKey(['user', '123', 'profile'], CacheKeyStrategy.HIERARCHICAL);
	 * // Result: "user:123:profile"
	 * 
	 * // Hashed key
	 * const key2 = cache.generateKey(['very', 'long', 'key', 'parts'], CacheKeyStrategy.HASHED);
	 * // Result: "hash_123456789"
	 * ```
	 * 
	 * @param parts - Array of key parts to combine
	 * @param strategy - The strategy to use for key generation (default: HIERARCHICAL)
	 * @returns Generated cache key string
	 * @throws {SembleValidationError} When invalid strategy is provided
	 * @since 2.0.0
	 */
	generateKey(parts: string[], strategy: CacheKeyStrategy = CacheKeyStrategy.HIERARCHICAL): string {
		const sanitizedParts = parts.map(part => this.sanitizeKeyPart(part));

		switch (strategy) {
			case CacheKeyStrategy.SIMPLE:
				return sanitizedParts.join('_');
			
			case CacheKeyStrategy.HIERARCHICAL:
				return sanitizedParts.join(':');
			
			case CacheKeyStrategy.HASHED:
				const combined = sanitizedParts.join('|');
				// Simple hash for demo - in production might use crypto
				let hash = 0;
				for (let i = 0; i < combined.length; i++) {
					const char = combined.charCodeAt(i);
					hash = ((hash << 5) - hash) + char;
					hash = hash & hash; // Convert to 32-bit integer
				}
				return `hash_${Math.abs(hash)}`;
			
			default:
				throw new SembleValidationError(
					'Invalid cache key strategy',
					'strategy',
					strategy,
					[`Must be one of: ${Object.values(CacheKeyStrategy).join(', ')}`]
				);
		}
	}

	/**
	 * Normalize cache key by adding the configured prefix
	 * 
	 * Internal method that ensures all cache keys are properly prefixed
	 * to avoid collisions with other cache instances.
	 * 
	 * @param key - The raw cache key
	 * @returns Normalized key with prefix
	 * @internal
	 * @since 2.0.0
	 */
	private normalizeKey(key: string): string {
		return `${this.config.keyPrefix}${key}`;
	}

	/**
	 * Sanitize individual key parts for safe cache usage
	 * 
	 * Removes special characters and limits length to prevent
	 * cache key issues and ensure consistent behavior.
	 * 
	 * @param part - The key part to sanitize
	 * @returns Sanitized key part (max 50 characters, alphanumeric + underscore/dash)
	 * @internal
	 * @since 2.0.0
	 */
	private sanitizeKeyPart(part: string): string {
		return part
			.replace(/[^a-zA-Z0-9_-]/g, '_')
			.substring(0, 50); // Limit length
	}

	// =============================================================================
	// CACHE REFRESH OPERATIONS
	// =============================================================================

	/**
	 * Refresh a specific cache entry with new data
	 * 
	 * Updates cache entry by calling the provided refresh function.
	 * Prevents concurrent refreshes of the same key and handles errors gracefully.
	 * 
	 * @example
	 * ```typescript
	 * const cache = new CacheService(config);
	 * 
	 * const freshUserData = await cache.refreshEntry(
	 *   'user:123',
	 *   async () => {
	 *     const response = await api.getUser(123);
	 *     return response.data;
	 *   },
	 *   300 // 5 minute TTL
	 * );
	 * ```
	 * 
	 * @param key - The cache key to refresh
	 * @param refreshFunction - Async function that returns fresh data
	 * @param ttl - Optional TTL in seconds (uses default if not provided)
	 * @returns Promise resolving to the refreshed data
	 * @throws {SembleError} When refresh operation fails
	 * @since 2.0.0
	 */
	async refreshEntry<T>(key: string, refreshFunction: () => Promise<T>, ttl?: number): Promise<T> {
		const normalizedKey = this.normalizeKey(key);

		// Prevent concurrent refreshes of the same key
		if (this.refreshLocks.has(normalizedKey)) {
			// Wait for existing refresh to complete
			while (this.refreshLocks.has(normalizedKey)) {
				await new Promise(resolve => setTimeout(resolve, 50));
			}
			// Return the refreshed value
			const cached = await this.get<T>(key);
			if (cached !== null) {
				return cached;
			}
		}

		try {
			this.refreshLocks.add(normalizedKey);

			// Mark entry as refreshing if it exists
			const existingEntry = this.cache.get(normalizedKey);
			if (existingEntry) {
				existingEntry.metadata.refreshing = true;
			}

			// Execute refresh function
			const newData = await refreshFunction();

			// Update cache with new data
			await this.set(key, newData, ttl);

			return newData;

		} catch (error) {
			throw mapError(error, {
				operation: 'cache_refresh',
				resource: key
			});
		} finally {
			this.refreshLocks.delete(normalizedKey);
			
			// Clear refreshing flag
			const entry = this.cache.get(normalizedKey);
			if (entry) {
				entry.metadata.refreshing = false;
			}
		}
	}

	/**
	 * Force refresh all cache entries
	 */
	async refreshAll(refreshFunctions: Map<string, () => Promise<any>>): Promise<CacheRefreshResult> {
		const startTime = Date.now();
		const errors: Error[] = [];
		let refreshedCount = 0;

		for (const [key, refreshFunction] of refreshFunctions.entries()) {
			try {
				await this.refreshEntry(key, refreshFunction);
				refreshedCount++;
			} catch (error) {
				errors.push(error as Error);
			}
		}

		return {
			success: errors.length === 0,
			refreshedCount,
			errors,
			durationMs: Date.now() - startTime
		};
	}

	/**
	 * Refresh expired entries only
	 */
	async refreshExpired(refreshFunctions: Map<string, () => Promise<any>>): Promise<CacheRefreshResult> {
		const startTime = Date.now();
		const errors: Error[] = [];
		let refreshedCount = 0;
		const now = Date.now();

		for (const [key, refreshFunction] of refreshFunctions.entries()) {
			const normalizedKey = this.normalizeKey(key);
			const entry = this.cache.get(normalizedKey);

			// Skip if not expired
			if (entry && now <= entry.metadata.expiresAt) {
				continue;
			}

			try {
				await this.refreshEntry(key, refreshFunction);
				refreshedCount++;
			} catch (error) {
				errors.push(error as Error);
			}
		}

		return {
			success: errors.length === 0,
			refreshedCount,
			errors,
			durationMs: Date.now() - startTime
		};
	}

	// =============================================================================
	// AUTO-REFRESH MECHANISM
	// =============================================================================

	/**
	 * Start automatic background refresh
	 */
	private startAutoRefresh(): void {
		if (this.autoRefreshTimer) {
			return;
		}

		this.autoRefreshTimer = setInterval(async () => {
			if (this.isShuttingDown) {
				return;
			}

			try {
				// This would be implemented with actual refresh functions
				// For now, just clean up expired entries
				await this.cleanupExpired();
			} catch (error) {
				// Log error but don't stop auto-refresh
				console.error('Auto-refresh error:', error);
			}
		}, this.config.autoRefreshInterval);
	}

	/**
	 * Stop automatic background refresh
	 */
	stopAutoRefresh(): void {
		if (this.autoRefreshTimer) {
			clearInterval(this.autoRefreshTimer);
			this.autoRefreshTimer = undefined;
		}
	}

	/**
	 * Clean up expired entries
	 */
	private async cleanupExpired(): Promise<number> {
		const now = Date.now();
		let removedCount = 0;

		for (const [key, entry] of this.cache.entries()) {
			if (now > entry.metadata.expiresAt) {
				this.cache.delete(key);
				removedCount++;
			}
		}

		return removedCount;
	}

	// =============================================================================
	// CACHE MANAGEMENT
	// =============================================================================

	/**
	 * Get cache statistics
	 */
	getStats(): {
		size: number;
		maxSize: number;
		hitRate: number;
		expiredEntries: number;
		refreshingEntries: number;
	} {
		const now = Date.now();
		let expiredCount = 0;
		let refreshingCount = 0;
		let totalAccesses = 0;
		let totalHits = 0;

		for (const entry of this.cache.values()) {
			if (now > entry.metadata.expiresAt) {
				expiredCount++;
			}
			if (entry.metadata.refreshing) {
				refreshingCount++;
			}
			totalAccesses += entry.metadata.accessCount;
			if (entry.metadata.accessCount > 0) {
				totalHits++;
			}
		}

		return {
			size: this.cache.size,
			maxSize: this.config.maxSize,
			hitRate: totalAccesses > 0 ? totalHits / totalAccesses : 0,
			expiredEntries: expiredCount,
			refreshingEntries: refreshingCount
		};
	}

	/**
	 * Evict least recently used entry
	 */
	private evictLeastRecentlyUsed(): void {
		let oldestKey: string | null = null;
		let oldestTime = Date.now();

		for (const [key, entry] of this.cache.entries()) {
			// Use lastAccessed if available, otherwise fall back to createdAt
			const accessTime = entry.metadata.lastAccessed || entry.metadata.createdAt;
			if (accessTime <= oldestTime) { // Changed < to <= to handle equal times
				oldestTime = accessTime;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
		}
	}

	/**
	 * Shutdown the cache service
	 */
	async shutdown(): Promise<void> {
		this.isShuttingDown = true;
		this.stopAutoRefresh();
		
		// Wait for any ongoing refreshes to complete
		while (this.refreshLocks.size > 0) {
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		
		this.cache.clear();
	}
}

// =============================================================================
// SPECIALIZED CACHE SERVICES
// =============================================================================

/**
 * Schema cache service for field definitions
 */
export class SchemaCacheService extends CacheService {
	constructor(config: CacheConfig) {
		super({
			...config,
			keyPrefix: 'schema:'
		});
	}

	/**
	 * Cache field schema for a resource
	 */
	async cacheFieldSchema(resource: string, schema: any, ttl?: number): Promise<void> {
		const key = this.generateKey(['fields', resource]);
		await this.set(key, schema, ttl || SEMBLE_CONSTANTS.CACHE.FIELD_CACHE_TTL);
	}

	/**
	 * Get cached field schema for a resource
	 */
	async getFieldSchema(resource: string): Promise<any | null> {
		const key = this.generateKey(['fields', resource]);
		return await this.get(key);
	}
}

/**
 * Permission cache service for access control
 */
export class PermissionCacheService extends CacheService {
	constructor(config: CacheConfig) {
		super({
			...config,
			keyPrefix: 'permissions:'
		});
	}

	/**
	 * Cache user permissions for a resource
	 */
	async cacheUserPermissions(userId: string, resource: string, permissions: any, ttl?: number): Promise<void> {
		const key = this.generateKey(['user', userId, resource]);
		await this.set(key, permissions, ttl || SEMBLE_CONSTANTS.CACHE.PERMISSION_CACHE_TTL);
	}

	/**
	 * Get cached user permissions for a resource
	 */
	async getUserPermissions(userId: string, resource: string): Promise<any | null> {
		const key = this.generateKey(['user', userId, resource]);
		return await this.get(key);
	}
}
