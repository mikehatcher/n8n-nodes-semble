/**
 * @fileoverview Core exports for Phase 4.1 Integration Layer
 * @description Central export point for all dependency injection, event system, and schema registry components
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Core
 * @since 2.0.0
 */

// Service Container - Dependency Injection
export { ServiceContainer, ServiceContainerUtils, ServiceLifetime } from './ServiceContainer';
export type { 
	IServiceContainer, 
	ServiceRegistration
} from './ServiceContainer';

// Event System - Decoupled Communication
export { EventSystem, EventSystemUtils } from './EventSystem';
export type { 
	BaseEvent, 
	EventListener, 
	EventRegistration, 
	IEventSystem,
	EventListenerOptions,
	ServiceRegisteredEvent,
	ServiceResolvedEvent,
	CacheHitEvent,
	CacheMissEvent,
	CacheInvalidatedEvent,
	ApiRequestEvent,
	ApiResponseEvent,
	ApiErrorEvent,
	FieldDiscoveredEvent,
	FieldValidatedEvent,
	PermissionCheckedEvent,
	SchemaRegisteredEvent,
	SchemaUpdatedEvent,
	NodeExecutedEvent,
	TriggerPolledEvent
} from './EventSystem';

// Schema Registry - Field Definition Management
export { SchemaRegistry, SchemaRegistryUtils } from './SchemaRegistry';
export type { 
	ISchemaRegistry, 
	SchemaVersion,
	FieldSchema,
	FieldValidationRule,
	FieldConditionalRule,
	ResourceSchema,
	ValidationResult,
	SchemaChangeImpact
} from './SchemaRegistry';

// Middleware Pipeline - Request/Response Processing
export { MiddlewarePipeline, MiddlewarePipelineUtils } from './MiddlewarePipeline';
export type {
	PipelineContext,
	MiddlewareFunction,
	MiddlewareRegistration,
	PipelineOptions,
	PipelineResult,
	MiddlewareRegisteredEvent,
	MiddlewareUnregisteredEvent,
	MiddlewareToggledEvent,
	MiddlewareClearedEvent,
	PipelineStartedEvent,
	PipelineCompletedEvent,
	PipelineFailedEvent,
	PipelineMiddlewareErrorEvent
} from './MiddlewarePipeline';

// Base Configuration and Error Management (from Phase 1)
export {
    DEFAULT_CONFIG,
    ConfigFactory,
    getEnvironmentConfig,
    createEnvironmentConfig,
    getConfigValue,
    isFeatureEnabled
} from './BaseConfig';

export {
    SEMBLE_CONSTANTS,
    API_CONSTANTS,
    TIMEOUT_CONSTANTS,
    RETRY_CONSTANTS,
    CACHE_CONSTANTS,
    VALIDATION_CONSTANTS,
    FIELD_CONSTANTS,
    ERROR_CONSTANTS
} from './Constants';

export {
    ErrorMapper
} from './ErrorMapper';

export {
    SembleError
} from './SembleError';
