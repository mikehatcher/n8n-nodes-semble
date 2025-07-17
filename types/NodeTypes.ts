/**
 * TypeScript type definitions for n8n-specific interfaces and extensions
 * Phase 1.1 - Foundation Layer Type Definitions
 */

import { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, INodeProperties, NodePropertyTypes } from 'n8n-workflow';
import { SembleResourceType, SembleQueryFilters } from './SembleTypes';

// =============================================================================
// EXTENDED n8n INTERFACES
// =============================================================================

/**
 * Extended IExecuteFunctions with Semble-specific helpers
 * Provides type-safe access to Semble credentials and utilities
 */
export interface ISembleExecuteFunctions extends IExecuteFunctions {
	getSembleCredentials(): Promise<SembleCredentials>;
	getSembleResource(): SembleResourceType;
	getSembleAction(): SembleActionType;
	getSembleFilters(): SembleQueryFilters;
}

/**
 * Semble credential structure
 */
export interface SembleCredentials {
	server: string;
	token: string;
	environment?: 'production' | 'staging' | 'development';
}

// =============================================================================
// NODE CONFIGURATION TYPES
// =============================================================================

/**
 * Supported action types for Semble operations
 */
export type SembleActionType = 
	| 'get' 
	| 'getMany' 
	| 'create' 
	| 'update' 
	| 'delete';

/**
 * Supported trigger event types
 */
export type SembleTriggerEventType = 
	| 'new' 
	| 'newAndUpdated';

/**
 * Polling interval options
 */
export type SemblePollInterval = 
	| '1m' 
	| '5m' 
	| '15m' 
	| '30m' 
	| '1h' 
	| '6h' 
	| '12h' 
	| '24h';

// =============================================================================
// COMPONENT CONFIGURATION TYPES
// =============================================================================

/**
 * Resource selector configuration
 */
export interface ResourceSelectorConfig {
	name: string;
	displayName: string;
	type: 'options';
	required: boolean;
	default: SembleResourceType;
	options: Array<{
		name: string;
		value: SembleResourceType;
		description?: string;
	}>;
}

/**
 * Action selector configuration
 */
export interface ActionSelectorConfig {
	name: string;
	displayName: string;
	type: 'options';
	required: boolean;
	default: SembleActionType;
	options: Array<{
		name: string;
		value: SembleActionType;
		description?: string;
	}>;
	displayOptions: {
		show: Record<string, any>;
	};
}

/**
 * Event trigger selector configuration
 */
export interface EventTriggerSelectorConfig {
	name: string;
	displayName: string;
	type: 'options';
	required: boolean;
	default: SembleTriggerEventType;
	options: Array<{
		name: string;
		value: SembleTriggerEventType;
		description?: string;
	}>;
}

/**
 * Poll interval selector configuration
 */
export interface PollIntervalSelectorConfig {
	name: string;
	displayName: string;
	type: 'options';
	required: boolean;
	default: SemblePollInterval;
	options: Array<{
		name: string;
		value: SemblePollInterval;
		description?: string;
	}>;
}

/**
 * Record limit field configuration
 */
export interface RecordLimitFieldConfig {
	name: string;
	displayName: string;
	type: 'number';
	required: boolean;
	default: number;
	placeholder: string;
	description: string;
	typeOptions: {
		minValue: number;
		maxValue?: number;
	};
}

// =============================================================================
// DYNAMIC FIELD TYPES
// =============================================================================

/**
 * Dynamic field definition
 */
export interface DynamicFieldDefinition {
	name: string;
	displayName: string;
	type: 'string' | 'number' | 'boolean' | 'dateTime' | 'options' | 'collection';
	required?: boolean;
	default?: any;
	placeholder?: string;
	description?: string;
	options?: Array<{
		name: string;
		value: any;
		description?: string;
	}>;
	displayOptions?: {
		show?: Record<string, any>;
		hide?: Record<string, any>;
	};
	typeOptions?: Record<string, any>;
}

/**
 * Field registry entry
 */
export interface FieldRegistryEntry {
	resourceType: SembleResourceType;
	actionType: SembleActionType;
	fields: DynamicFieldDefinition[];
	dependencies?: string[];
}

// =============================================================================
// NODE EXECUTION TYPES
// =============================================================================

/**
 * Semble node execution context
 */
export interface SembleExecutionContext {
	resource: SembleResourceType;
	action: SembleActionType;
	credentials: SembleCredentials;
	filters: SembleQueryFilters;
	additionalFields: Record<string, any>;
	inputData: INodeExecutionData[];
	itemIndex: number;
}

/**
 * Semble operation result
 */
export interface SembleOperationResult {
	success: boolean;
	data?: any;
	error?: {
		message: string;
		code: string;
		field?: string;
		context?: Record<string, any>;
	};
	metadata?: {
		totalCount?: number;
		hasMore?: boolean;
		processingTime?: number;
	};
}

/**
 * Bulk operation result
 */
export interface SembleBulkOperationResult {
	totalItems: number;
	successCount: number;
	errorCount: number;
	results: SembleOperationResult[];
	errors: Array<{
		itemIndex: number;
		error: SembleOperationResult['error'];
	}>;
}

// =============================================================================
// SERVICE INJECTION TYPES
// =============================================================================

/**
 * Service container type for dependency injection
 */
export interface ServiceContainer {
	get<T>(serviceName: string): T;
	register<T>(serviceName: string, serviceInstance: T): void;
	has(serviceName: string): boolean;
}

/**
 * Injectable service interface
 */
export interface InjectableService {
	readonly serviceName: string;
	initialize?(container: ServiceContainer): Promise<void>;
	dispose?(): Promise<void>;
}

// =============================================================================
// MIDDLEWARE TYPES
// =============================================================================

/**
 * Middleware function type
 */
export type MiddlewareFunction = (
context: SembleExecutionContext,
next: () => Promise<SembleOperationResult>
) => Promise<SembleOperationResult>;

/**
 * Middleware pipeline configuration
 */
export interface MiddlewarePipelineConfig {
	middlewares: MiddlewareFunction[];
	errorHandler?: (error: Error, context: SembleExecutionContext) => Promise<SembleOperationResult>;
}

// =============================================================================
// EVENT SYSTEM TYPES
// =============================================================================

/**
 * Event types for internal communication
 */
export type SembleEventType = 
	| 'cache:refresh' 
	| 'credentials:updated' 
	| 'schema:changed' 
	| 'permission:denied'
	| 'error:occurred';

/**
 * Event data structure
 */
export interface SembleEvent<T = any> {
	type: SembleEventType;
	data: T;
	timestamp: number;
	source: string;
}

/**
 * Event listener function
 */
export type EventListener<T = any> = (event: SembleEvent<T>) => void | Promise<void>;

/**
 * Event emitter interface
 */
export interface EventEmitter {
	on<T>(eventType: SembleEventType, listener: EventListener<T>): void;
	off<T>(eventType: SembleEventType, listener: EventListener<T>): void;
	emit<T>(eventType: SembleEventType, data: T, source?: string): Promise<void>;
}

// =============================================================================
// UTILITY TYPES FOR n8n INTEGRATION
// =============================================================================


/**
 * Node type description with Semble-specific extensions  
 * Note: Using INodeTypeDescription directly to avoid type conflicts
 */
export type SembleNodeTypeDescription = INodeTypeDescription;
