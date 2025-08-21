/**
 * @fileoverview Additional fields registry for n8n Semble integration
 * @description Central field definitions with plugin-style registration and type-safe field definitions
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Components
 * @since 2.0.0
 */

import { INodeProperties } from 'n8n-workflow';
import { SembleResourceType } from '../types/SembleTypes';
import { SembleActionType } from '../types/NodeTypes';
import { DynamicFieldDefinition, FieldRegistryEntry } from '../types/NodeTypes';

/**
 * Configuration options interface for field registry instances
 * 
 * Controls the behavior of the AdditionalFieldsRegistry including caching,
 * validation, and automatic field registration features.
 * 
 * @example
 * ```typescript
 * const registryOptions: FieldRegistryOptions = {
 *   enableCaching: true,
 *   cacheTtl: 300,              // 5 minutes
 *   enableValidation: true,
 *   autoRegisterCommon: true    // Auto-register frequently used fields
 * };
 * 
 * const registry = new AdditionalFieldsRegistry(registryOptions);
 * ```
 * 
 * @interface FieldRegistryOptions
 * @since 2.0.0
 */
export interface FieldRegistryOptions {
	/** Enable field caching to improve performance */
	enableCaching?: boolean;
	/** Cache time-to-live in seconds (default: 300) */
	cacheTtl?: number;
	/** Enable field validation during registration */
	enableValidation?: boolean;
	/** Automatically register commonly used fields */
	autoRegisterCommon?: boolean;
}

/**
 * Extended field definition interface with registry-specific metadata
 * 
 * Extends the base DynamicFieldDefinition with additional properties
 * needed for field organization, prioritization, and management within
 * the registry system.
 * 
 * @example
 * ```typescript
 * const fieldDefinition: RegisteredFieldDefinition = {
 *   name: 'customField',
 *   type: 'string',
 *   displayName: 'Custom Field',
 *   description: 'A custom field for specific use cases',
 *   category: 'patient-metadata',
 *   priority: 100,
 *   tags: ['custom', 'metadata'],
 *   conditions: {
 *     show: {
 *       resource: ['patient']
 *     }
 *   }
 * };
 * ```
 * 
 * @interface RegisteredFieldDefinition
 * @extends {DynamicFieldDefinition}
 * @since 2.0.0
 */
export interface RegisteredFieldDefinition extends DynamicFieldDefinition {
	/** Field category for logical grouping and organization */
	category?: string;
	/** Field priority for ordering */
	priority?: number;
	/** Whether field is experimental */
	experimental?: boolean;
	/** Field compatibility requirements */
	compatibility?: {
		minVersion?: string;
		maxVersion?: string;
		requiredFeatures?: string[];
	};
}

/**
 * Result interface for field registration operations
 * 
 * Provides detailed feedback about field registration attempts including
 * success status, generated field ID, and any conflicts or issues encountered.
 * 
 * @example
 * ```typescript
 * const result: FieldRegistrationResult = registry.registerField(
 *   SembleResourceType.PATIENT,
 *   SembleActionType.CREATE,
 *   fieldDefinition
 * );
 * 
 * if (result.success) {
 *   console.log('Field registered with ID:', result.fieldId);
 * } else {
 *   console.error('Registration failed:', result.message);
 *   if (result.conflicts) {
 *     console.warn('Conflicts with:', result.conflicts);
 *   }
 * }
 * ```
 * 
 * @interface FieldRegistrationResult
 * @since 2.0.0
 */
export interface FieldRegistrationResult {
	/** Whether the field registration was successful */
	success: boolean;
	fieldId: string;
	message?: string;
	conflicts?: string[];
}

/**
 * Dynamic field registry for managing additional n8n node properties
 * 
 * Provides a centralized system for registering, managing, and loading
 * dynamic field definitions for Semble n8n nodes. Supports field caching,
 * validation, conflict detection, and automatic registration of common fields.
 * 
 * Features:
 * - Dynamic field registration per resource/action combination
 * - Field conflict detection and resolution
 * - Intelligent caching with configurable TTL
 * - Automatic registration of commonly used fields
 * - Validation and type checking for field definitions
 * - Support for conditional field display logic
 * 
 * @example
 * ```typescript
 * const registry = new AdditionalFieldsRegistry({
 *   enableCaching: true,
 *   cacheTtl: 300,
 *   autoRegisterCommon: true
 * });
 * 
 * // Register a custom field
 * const result = registry.registerField(
 *   SembleResourceType.PATIENT,
 *   SembleActionType.CREATE,
 *   {
 *     name: 'customField',
 *     type: 'string',
 *     displayName: 'Custom Field',
 *     description: 'A custom field for patient creation'
 *   }
 * );
 * 
 * // Load fields for a specific resource/action
 * const fields = await registry.loadFields(
 *   SembleResourceType.PATIENT,
 *   SembleActionType.CREATE
 * );
 * ```
 * 
 * @class AdditionalFieldsRegistry
 * @since 2.0.0
 * @description Manages dynamic field registration and loading for n8n nodes
 */
export class AdditionalFieldsRegistry {
	private readonly registry: Map<string, FieldRegistryEntry> = new Map();
	private readonly fieldDefinitions: Map<string, RegisteredFieldDefinition> = new Map();
	private readonly options: FieldRegistryOptions;
	private readonly cache: Map<string, { data: INodeProperties[]; timestamp: number }> = new Map();

	/**
	 * Create a new additional fields registry instance
	 * 
	 * Initializes the registry with the specified options and automatically
	 * registers common fields if enabled.
	 * 
	 * @param options - Configuration options for the registry
	 * @since 2.0.0
	 */
	constructor(options: FieldRegistryOptions = {}) {
		this.options = {
			enableCaching: true,
			cacheTtl: 300, // 5 minutes
			enableValidation: true,
			autoRegisterCommon: true,
			...options,
		};

		if (this.options.autoRegisterCommon) {
			this.registerCommonFields();
		}
	}

	/**
	 * Register a new field definition for a specific resource and action
	 * 
	 * Adds a new field definition to the registry with conflict detection
	 * and validation. Fields are scoped to specific resource/action combinations
	 * to avoid conflicts and ensure proper field loading.
	 * 
	 * @example
	 * ```typescript
	 * const registry = new AdditionalFieldsRegistry();
	 * 
	 * const result = registry.registerField(
	 *   SembleResourceType.PATIENT,
	 *   SembleActionType.UPDATE,
	 *   {
	 *     name: 'emergencyContact',
	 *     type: 'string',
	 *     displayName: 'Emergency Contact',
	 *     description: 'Patient emergency contact information',
	 *     required: false
	 *   }
	 * );
	 * 
	 * if (result.success) {
	 *   console.log('Field registered:', result.fieldId);
	 * } else {
	 *   console.error('Registration failed:', result.message);
	 * }
	 * ```
	 * 
	 * @param resourceType - The Semble resource type (patient, booking, etc.)
	 * @param actionType - The action type (create, update, delete, etc.)
	 * @param fieldDefinition - The field definition to register
	 * @returns Registration result with success status and metadata
	 * @since 2.0.0
	 */
	public registerField(
		resourceType: SembleResourceType,
		actionType: SembleActionType,
		fieldDefinition: RegisteredFieldDefinition,
	): FieldRegistrationResult {
		const fieldId = this.generateFieldId(resourceType, actionType, fieldDefinition.name);

		// Check for conflicts
		const conflicts = this.checkFieldConflicts(resourceType, actionType, fieldDefinition);
		if (conflicts.length > 0) {
			return {
				success: false,
				fieldId,
				message: 'Field registration conflicts detected',
				conflicts,
			};
		}

		// Validate field definition
		if (this.options.enableValidation && !this.validateFieldDefinition(fieldDefinition)) {
			return {
				success: false,
				fieldId,
				message: 'Field definition validation failed',
			};
		}

		// Register the field
		this.fieldDefinitions.set(fieldId, fieldDefinition);

		// Update registry entry
		const registryKey = this.generateRegistryKey(resourceType, actionType);
		let entry = this.registry.get(registryKey);

		if (!entry) {
			entry = {
				resourceType,
				actionType,
				fields: [],
			};
		}

		entry.fields.push(fieldDefinition);
		this.registry.set(registryKey, entry);

		// Clear cache for this resource/action combination
		this.clearCacheForKey(registryKey);

		return {
			success: true,
			fieldId,
			message: 'Field registered successfully',
		};
	}

	/**
	 * Get fields for specific resource and action
	 */
	public getFields(
		resourceType: SembleResourceType,
		actionType: SembleActionType,
		context?: Record<string, any>,
	): INodeProperties[] {
		const registryKey = this.generateRegistryKey(resourceType, actionType);

		// Check cache first
		if (this.options.enableCaching) {
			const cached = this.cache.get(registryKey);
			if (cached && this.isCacheValid(cached.timestamp)) {
				return cached.data;
			}
		}

		const entry = this.registry.get(registryKey);
		if (!entry) {
			return [];
		}

		// Convert field definitions to node properties
		const properties = this.convertToNodeProperties(entry.fields, context);

		// Cache the result
		if (this.options.enableCaching) {
			this.cache.set(registryKey, {
				data: properties,
				timestamp: Date.now(),
			});
		}

		return properties;
	}

	/**
	 * Unregister a field
	 */
	public unregisterField(
		resourceType: SembleResourceType,
		actionType: SembleActionType,
		fieldName: string,
	): boolean {
		const fieldId = this.generateFieldId(resourceType, actionType, fieldName);
		const registryKey = this.generateRegistryKey(resourceType, actionType);

		// Remove from field definitions
		this.fieldDefinitions.delete(fieldId);

		// Remove from registry entry
		const entry = this.registry.get(registryKey);
		if (entry) {
			entry.fields = entry.fields.filter((field) => field.name !== fieldName);
			this.registry.set(registryKey, entry);
		}

		// Clear cache
		this.clearCacheForKey(registryKey);

		return true;
	}

	/**
	 * Get all registered fields for a resource type
	 */
	public getResourceFields(resourceType: SembleResourceType): FieldRegistryEntry[] {
		const entries: FieldRegistryEntry[] = [];

		for (const [key, entry] of this.registry.entries()) {
			if (entry.resourceType === resourceType) {
				entries.push(entry);
			}
		}

		return entries;
	}

	/**
	 * Clear all registry data
	 */
	public clear(): void {
		this.registry.clear();
		this.fieldDefinitions.clear();
		this.cache.clear();
	}

	/**
	 * Cleanup method (simplified for timestamp-based caching)
	 */
	public cleanup(): void {
		// No timers to clean up with timestamp-based caching
		// This method is kept for API compatibility
	}

	/**
	 * Check if cache entry is still valid
	 */
	private isCacheValid(timestamp: number): boolean {
		const ttlMs = (this.options.cacheTtl || 300) * 1000;
		return Date.now() - timestamp < ttlMs;
	}

	/**
	 * Get registry statistics
	 */
	public getStats(): {
		registryEntries: number;
		fieldDefinitions: number;
		cachedEntries: number;
		resourceTypes: SembleResourceType[];
	} {
		const resourceTypes = Array.from(
			new Set(Array.from(this.registry.values()).map((entry) => entry.resourceType)),
		);

		return {
			registryEntries: this.registry.size,
			fieldDefinitions: this.fieldDefinitions.size,
			cachedEntries: this.cache.size,
			resourceTypes,
		};
	}

	/**
	 * Register common fields used across multiple operations
	 */
	private registerCommonFields(): void {
		// Record limit field for GET operations
		this.registerField('patient', 'getMany', {
			name: 'limit',
			displayName: 'Limit',
			type: 'number',
			default: 50,
			description: 'Maximum number of records to return',
			category: 'pagination',
			priority: 100,
		});

		this.registerField('booking', 'getMany', {
			name: 'limit',
			displayName: 'Limit',
			type: 'number',
			default: 50,
			description: 'Maximum number of records to return',
			category: 'pagination',
			priority: 100,
		});

		// Return all field
		this.registerField('patient', 'getMany', {
			name: 'returnAll',
			displayName: 'Return All',
			type: 'boolean',
			default: false,
			description: 'Whether to return all records (ignores limit)',
			category: 'pagination',
			priority: 90,
		});

		// Additional fields collection
		this.registerField('patient', 'create', {
			name: 'additionalFields',
			displayName: 'Additional Fields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			description: 'Additional fields to include in the request',
			category: 'advanced',
			priority: 10,
		});
	}

	/**
	 * Generate unique field ID
	 */
	private generateFieldId(
		resourceType: SembleResourceType,
		actionType: SembleActionType,
		fieldName: string,
	): string {
		return `${resourceType}:${actionType}:${fieldName}`;
	}

	/**
	 * Generate registry key
	 */
	private generateRegistryKey(
		resourceType: SembleResourceType,
		actionType: SembleActionType,
	): string {
		return `${resourceType}:${actionType}`;
	}

	/**
	 * Check for field conflicts
	 */
	private checkFieldConflicts(
		resourceType: SembleResourceType,
		actionType: SembleActionType,
		fieldDefinition: RegisteredFieldDefinition,
	): string[] {
		const conflicts: string[] = [];
		const registryKey = this.generateRegistryKey(resourceType, actionType);
		const entry = this.registry.get(registryKey);

		if (entry) {
			const existingField = entry.fields.find((field) => field.name === fieldDefinition.name);
			if (existingField) {
				conflicts.push(`Field '${fieldDefinition.name}' already exists for ${resourceType}:${actionType}`);
			}
		}

		return conflicts;
	}

	/**
	 * Validate field definition
	 */
	private validateFieldDefinition(fieldDefinition: RegisteredFieldDefinition): boolean {
		// Basic validation
		if (!fieldDefinition.name || !fieldDefinition.type) {
			return false;
		}

		// Name validation (must be valid JavaScript identifier)
		const nameRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
		if (!nameRegex.test(fieldDefinition.name)) {
			return false;
		}

		// Type validation
		const validTypes = ['string', 'number', 'boolean', 'dateTime', 'options', 'collection'];
		if (!validTypes.includes(fieldDefinition.type)) {
			return false;
		}

		return true;
	}

	/**
	 * Convert field definitions to node properties
	 */
	private convertToNodeProperties(
		fields: DynamicFieldDefinition[],
		context?: Record<string, any>,
	): INodeProperties[] {
		return fields
			.sort((a, b) => {
				const priorityA = (a as RegisteredFieldDefinition).priority || 50;
				const priorityB = (b as RegisteredFieldDefinition).priority || 50;
				return priorityB - priorityA; // Higher priority first
			})
			.map((field) => {
				const property: INodeProperties = {
					displayName: field.displayName || field.name,
					name: field.name,
					type: field.type as any,
					default: field.default,
					description: field.description,
				};

				// Add conditional display options if specified
				if (field.displayOptions) {
					property.displayOptions = field.displayOptions;
				}

				// Add type options if specified
				if (field.typeOptions) {
					property.typeOptions = field.typeOptions;
				}

				// Add options for dropdown types
				if (field.options && field.type === 'options') {
					property.options = field.options;
				}

				return property;
			});
	}

	/**
	 * Clear cache for specific key
	 */
	private clearCacheForKey(key: string): void {
		this.cache.delete(key);
	}
}

/**
 * Default additional fields registry instance
 */
export const defaultFieldsRegistry = new AdditionalFieldsRegistry();

/**
 * Convenience function to register a field
 */
export function registerField(
	resourceType: SembleResourceType,
	actionType: SembleActionType,
	fieldDefinition: RegisteredFieldDefinition,
): FieldRegistrationResult {
	return defaultFieldsRegistry.registerField(resourceType, actionType, fieldDefinition);
}

/**
 * Convenience function to get fields
 */
export function getAdditionalFields(
	resourceType: SembleResourceType,
	actionType: SembleActionType,
	context?: Record<string, any>,
): INodeProperties[] {
	return defaultFieldsRegistry.getFields(resourceType, actionType, context);
}
