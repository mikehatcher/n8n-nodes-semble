/**
 * @fileoverview PermissionCheckService - Field-level permission validation
 * @description Provides permission checking, testing queries, field-level permission mapping, and permission cache management for Semble API access control
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Services.Permission
 */

import { SembleCredentials } from '../types/SembleTypes';
import { SembleQueryService } from './SembleQueryService';
import { CacheService, PermissionCacheService } from './CacheService';
import { SembleError, SembleAuthError, SemblePermissionError } from '../core/SembleError';
import { SEMBLE_CONSTANTS } from '../core/Constants';

// =============================================================================
// PERMISSION TYPES AND INTERFACES
// =============================================================================

export type PermissionLevel = 'none' | 'read' | 'write' | 'admin';

export interface FieldPermission {
	read: boolean;
	write: boolean;
	required: boolean;
	conditionalAccess?: string[];
}

export interface UserPermissions {
	userId: string;
	role: string;
	globalPermissions: PermissionLevel;
	resourcePermissions: { [resource: string]: PermissionLevel };
}

// =============================================================================
// PERMISSION TYPES AND INTERFACES
// =============================================================================

export interface PermissionCheckConfig {
	enabled: boolean;
	cachePermissions: boolean;
	cacheTtl: number;
	strictMode: boolean;
	adminBypass: boolean;
}

export interface PermissionTestResult {
	hasPermission: boolean;
	permissionLevel: PermissionLevel;
	restrictedFields: string[];
	allowedOperations: string[];
	lastChecked: Date;
	cacheHit: boolean;
}

export interface PermissionQuery {
	resource: string;
	operation: 'read' | 'write' | 'delete' | 'create';
	fields?: string[];
	userId?: string;
}

export interface FieldPermissionMap {
	[fieldName: string]: {
		read: boolean;
		write: boolean;
		required: boolean;
		conditionalAccess?: string[];
	};
}

export interface ResourcePermissions {
	resource: string;
	globalPermission: PermissionLevel;
	fieldPermissions: FieldPermissionMap;
	operations: {
		create: boolean;
		read: boolean;
		update: boolean;
		delete: boolean;
	};
	lastUpdated: Date;
}

// =============================================================================
// PERMISSION CHECK SERVICE
// =============================================================================

/**
 * Service for handling field-level permission validation and management
 */
export class PermissionCheckService {
	private config: PermissionCheckConfig;
	private queryService: SembleQueryService;
	private cacheService: PermissionCacheService;
	private permissionCache: Map<string, ResourcePermissions>;

	constructor(
		queryService: SembleQueryService,
		cacheService?: CacheService,
		config: Partial<PermissionCheckConfig> = {}
	) {
		this.config = {
			enabled: true,
			cachePermissions: true,
			cacheTtl: SEMBLE_CONSTANTS.CACHE.PERMISSION_CACHE_TTL,
			strictMode: false,
			adminBypass: true,
			...config
		};

		this.queryService = queryService;
		this.cacheService = cacheService ? 
			new PermissionCacheService({
				enabled: true,
				defaultTtl: SEMBLE_CONSTANTS.CACHE.PERMISSION_CACHE_TTL,
				maxSize: 1000,
				autoRefreshInterval: 0,
				backgroundRefresh: false,
				keyPrefix: 'permissions:'
			}) : 
			new PermissionCacheService({
				enabled: true,
				defaultTtl: SEMBLE_CONSTANTS.CACHE.PERMISSION_CACHE_TTL,
				maxSize: 1000,
				autoRefreshInterval: 0,
				backgroundRefresh: false,
				keyPrefix: 'permissions:'
			});
		this.permissionCache = new Map();
	}

	// =============================================================================
	// PERMISSION TESTING
	// =============================================================================

	/**
	 * Test permissions for a specific resource and operation
	 */
	async testPermissions(
		resource: string,
		operation: 'read' | 'write' | 'delete' | 'create',
		fields?: string[],
		userId?: string
	): Promise<PermissionTestResult> {
		const cacheKey = this.buildPermissionCacheKey(resource, operation, userId);
		
		// Check cache first
		if (this.config.cachePermissions) {
			const cached = await this.cacheService.getUserPermissions(userId || 'current', resource);
			if (cached) {
				return {
					hasPermission: this.evaluatePermission(cached, operation, fields),
					permissionLevel: cached.globalPermission,
					restrictedFields: this.getRestrictedFields(cached, operation),
					allowedOperations: this.getAllowedOperations(cached),
					lastChecked: cached.lastUpdated,
					cacheHit: true
				};
			}
		}

		// Query permissions from API
		const permissions = await this.queryResourcePermissions(resource, userId);
		
		// Cache the result
		if (this.config.cachePermissions) {
			await this.cacheService.cacheUserPermissions(userId || 'current', resource, permissions);
		}

		return {
			hasPermission: this.evaluatePermission(permissions, operation, fields),
			permissionLevel: permissions.globalPermission,
			restrictedFields: this.getRestrictedFields(permissions, operation),
			allowedOperations: this.getAllowedOperations(permissions),
			lastChecked: new Date(),
			cacheHit: false
		};
	}

	/**
	 * Check if user has permission for specific field access
	 */
	async checkFieldPermission(
		resource: string,
		fieldName: string,
		operation: 'read' | 'write',
		userId?: string
	): Promise<boolean> {
		if (!this.config.enabled) {
			return true;
		}

		const permissions = await this.getResourcePermissions(resource, userId);
		const fieldPermission = permissions.fieldPermissions[fieldName];

		if (!fieldPermission) {
			// Field not explicitly defined, check global permission
			return this.hasGlobalPermission(permissions, operation);
		}

		return operation === 'read' ? fieldPermission.read : fieldPermission.write;
	}

	/**
	 * Check multiple field permissions at once
	 */
	async checkFieldsPermissions(
		resource: string,
		fields: string[],
		operation: 'read' | 'write',
		userId?: string
	): Promise<{ [field: string]: boolean }> {
		const permissions = await this.getResourcePermissions(resource, userId);
		const results: { [field: string]: boolean } = {};

		for (const field of fields) {
			const fieldPermission = permissions.fieldPermissions[field];
			if (!fieldPermission) {
				results[field] = this.hasGlobalPermission(permissions, operation);
			} else {
				results[field] = operation === 'read' ? fieldPermission.read : fieldPermission.write;
			}
		}

		return results;
	}

	/**
	 * Validate permissions before operation and throw if insufficient
	 */
	async validatePermissions(
		resource: string,
		operation: 'read' | 'write' | 'delete' | 'create',
		fields?: string[],
		userId?: string
	): Promise<void> {
		if (!this.config.enabled) {
			return;
		}

		const result = await this.testPermissions(resource, operation, fields, userId);
		
		if (!result.hasPermission) {
			throw new SemblePermissionError(
				`Insufficient permissions for ${operation} operation on ${resource}`,
				'PERMISSION_DENIED',
				'resource',
				`Required permission level not met. Restricted fields: ${result.restrictedFields.join(', ')}`
			);
		}

		// Check field-level permissions if fields specified
		if (fields && fields.length > 0) {
			const fieldPermissions = await this.checkFieldsPermissions(resource, fields, operation === 'create' || operation === 'write' ? 'write' : 'read', userId);
			const deniedFields = Object.entries(fieldPermissions)
				.filter(([, hasPermission]) => !hasPermission)
				.map(([field]) => field);

			if (deniedFields.length > 0 && this.config.strictMode) {
				throw new SemblePermissionError(
					`Access denied to fields: ${deniedFields.join(', ')}`,
					'FIELD_ACCESS_DENIED',
					'field',
					`The following fields are restricted: ${deniedFields.join(', ')}`
				);
			}
		}
	}

	// =============================================================================
	// PERMISSION QUERIES
	// =============================================================================

	/**
	 * Query resource permissions from Semble API
	 */
	private async queryResourcePermissions(resource: string, userId?: string): Promise<ResourcePermissions> {
		try {
			// Check if admin bypass is enabled and user is admin
			if (this.config.adminBypass && await this.isAdminUser(userId)) {
				return this.createAdminPermissions(resource);
			}

			// Query user permissions using GraphQL
			const query = this.buildPermissionQuery(resource, userId);
			const result = await this.queryService.executeQuery(query);

			if (result.errors) {
				throw new SemblePermissionError(
					'Failed to query permissions',
					'PERMISSION_QUERY_FAILED',
					'query',
					result.errors.map(e => e.message).join(', ')
				);
			}

			return this.parsePermissionResponse(result.data, resource);

		} catch (error: any) {
			if (error instanceof SembleError) {
				throw error;
			}
			throw new SemblePermissionError(
				`Permission query failed: ${error?.message || 'Unknown error'}`,
				'PERMISSION_QUERY_ERROR',
				'system'
			);
		}
	}

	/**
	 * Build GraphQL query for permission checking
	 */
	private buildPermissionQuery(resource: string, userId?: string): string {
		const userFilter = userId ? `, userId: "${userId}"` : '';
		
		return `
			query CheckPermissions {
				permissions(resource: "${resource}"${userFilter}) {
					resource
					globalPermission
					operations {
						create
						read
						update
						delete
					}
					fieldPermissions {
						fieldName
						read
						write
						required
						conditionalAccess
					}
				}
			}
		`;
	}

	/**
	 * Parse permission response from API
	 */
	private parsePermissionResponse(data: any, resource: string): ResourcePermissions {
		const permissions = data.permissions;
		
		if (!permissions) {
			throw new SemblePermissionError(
				'No permission data received',
				'PERMISSION_DATA_MISSING',
				'response'
			);
		}

		const fieldPermissions: FieldPermissionMap = {};
		
		if (permissions.fieldPermissions && Array.isArray(permissions.fieldPermissions)) {
			for (const field of permissions.fieldPermissions) {
				fieldPermissions[field.fieldName] = {
					read: field.read,
					write: field.write,
					required: field.required,
					conditionalAccess: field.conditionalAccess
				};
			}
		}

		return {
			resource,
			globalPermission: permissions.globalPermission as PermissionLevel,
			fieldPermissions,
			operations: permissions.operations || { create: false, read: false, update: false, delete: false },
			lastUpdated: new Date()
		};
	}

	// =============================================================================
	// PERMISSION EVALUATION
	// =============================================================================

	/**
	 * Evaluate if user has permission for operation
	 */
	private evaluatePermission(
		permissions: ResourcePermissions,
		operation: 'read' | 'write' | 'delete' | 'create',
		fields?: string[]
	): boolean {
		// Check operation-level permission
		if (!permissions.operations[operation === 'write' ? 'update' : operation]) {
			return false;
		}

		// Check global permission level
		if (!this.hasGlobalPermission(permissions, operation)) {
			return false;
		}

		// Check field-level permissions if specified
		if (fields && fields.length > 0) {
			const requiredPermission = operation === 'read' ? 'read' : 'write';
			
			for (const field of fields) {
				const fieldPermission = permissions.fieldPermissions[field];
				if (fieldPermission && !fieldPermission[requiredPermission]) {
					if (this.config.strictMode) {
						return false;
					}
				}
			}
		}

		return true;
	}

	/**
	 * Check if user has global permission for operation
	 */
	private hasGlobalPermission(permissions: ResourcePermissions, operation: string): boolean {
		const { globalPermission } = permissions;

		switch (operation) {
			case 'read':
				return ['read', 'write', 'admin'].includes(globalPermission);
			case 'write':
			case 'create':
				return ['write', 'admin'].includes(globalPermission);
			case 'delete':
				return globalPermission === 'admin';
			default:
				return false;
		}
	}

	/**
	 * Get restricted fields for operation
	 */
	private getRestrictedFields(permissions: ResourcePermissions, operation: 'read' | 'write' | 'delete' | 'create'): string[] {
		const restrictedFields: string[] = [];
		const requiredPermission = operation === 'read' ? 'read' : 'write';

		for (const [fieldName, fieldPermission] of Object.entries(permissions.fieldPermissions)) {
			if (!fieldPermission[requiredPermission]) {
				restrictedFields.push(fieldName);
			}
		}

		return restrictedFields;
	}

	/**
	 * Get allowed operations for resource
	 */
	private getAllowedOperations(permissions: ResourcePermissions): string[] {
		const allowed: string[] = [];
		
		if (permissions.operations.read) allowed.push('read');
		if (permissions.operations.create) allowed.push('create');
		if (permissions.operations.update) allowed.push('update');
		if (permissions.operations.delete) allowed.push('delete');

		return allowed;
	}

	// =============================================================================
	// UTILITY METHODS
	// =============================================================================

	/**
	 * Get cached or fetch resource permissions
	 */
	private async getResourcePermissions(resource: string, userId?: string): Promise<ResourcePermissions> {
		const cacheKey = `${resource}-${userId || 'current'}`;
		
		if (this.permissionCache.has(cacheKey)) {
			const cached = this.permissionCache.get(cacheKey)!;
			const isExpired = Date.now() - cached.lastUpdated.getTime() > this.config.cacheTtl;
			
			if (!isExpired) {
				return cached;
			}
		}

		const permissions = await this.queryResourcePermissions(resource, userId);
		this.permissionCache.set(cacheKey, permissions);
		
		return permissions;
	}

	/**
	 * Check if user is admin
	 */
	private async isAdminUser(userId?: string): Promise<boolean> {
		try {
			const query = `
				query CheckAdminStatus {
					currentUser ${userId ? `(id: "${userId}")` : ''} {
						role
						permissions
					}
				}
			`;
			
			const result = await this.queryService.executeQuery(query);
			
			if (result.errors || !result.data?.currentUser) {
				return false;
			}

			const user = result.data.currentUser;
			return user.role === 'admin' || user.permissions?.includes('admin');
		} catch {
			return false;
		}
	}

	/**
	 * Create admin permissions for resource
	 */
	private createAdminPermissions(resource: string): ResourcePermissions {
		return {
			resource,
			globalPermission: 'admin',
			fieldPermissions: {},
			operations: {
				create: true,
				read: true,
				update: true,
				delete: true
			},
			lastUpdated: new Date()
		};
	}

	/**
	 * Build cache key for permissions
	 */
	private buildPermissionCacheKey(resource: string, operation: string, userId?: string): string {
		return `permission:${resource}:${operation}:${userId || 'current'}`;
	}

	/**
	 * Clear permission cache
	 */
	async clearCache(resource?: string, userId?: string): Promise<void> {
		if (resource && userId) {
			const cacheKey = `${resource}-${userId}`;
			this.permissionCache.delete(cacheKey);
			await this.cacheService.delete(`permission:${userId}:${resource}`);
		} else if (resource) {
			// Clear all permissions for resource
			for (const key of this.permissionCache.keys()) {
				if (key.startsWith(`${resource}-`)) {
					this.permissionCache.delete(key);
				}
			}
		} else {
			// Clear all permissions
			this.permissionCache.clear();
			// Note: Full cache clear would require access to the underlying cache service
		}
	}

	/**
	 * Get service configuration
	 */
	getConfig(): PermissionCheckConfig {
		return { ...this.config };
	}

	/**
	 * Update service configuration
	 */
	updateConfig(config: Partial<PermissionCheckConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Get permission statistics
	 */
	getStats(): { cacheSize: number; config: PermissionCheckConfig } {
		return {
			cacheSize: this.permissionCache.size,
			config: this.getConfig()
		};
	}
}

// =============================================================================
// EXPORT DEFAULT INSTANCE
// =============================================================================

export default PermissionCheckService;
