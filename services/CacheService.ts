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
	 * Set a value in the cache with TTL
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
	 * Get a value from the cache
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
	 * Check if a key exists and is not expired
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
	 * Delete a specific cache entry
	 */
	async delete(key: string): Promise<boolean> {
		const normalizedKey = this.normalizeKey(key);
		return this.cache.delete(normalizedKey);
	}

	/**
	 * Clear all cache entries
	 */
	async clear(): Promise<void> {
		this.cache.clear();
	}

	// =============================================================================
	// CACHE KEY MANAGEMENT
	// =============================================================================

	/**
	 * Generate cache key using specified strategy
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
	 * Normalize cache key with prefix
	 */
	private normalizeKey(key: string): string {
		return `${this.config.keyPrefix}${key}`;
	}

	/**
	 * Sanitize individual key parts
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
