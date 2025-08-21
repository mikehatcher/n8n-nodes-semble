/**
 * @fileoverview EventSystem.ts
 * @description Type-safe event system for decoupled component communication. Provides event emitter/listener pattern with async event handling.
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Core.EventSystem
 * @since 2.0.0
 */

import { SembleError } from './SembleError';

/**
 * Base event interface
 */
export interface BaseEvent {
    type: string;
    timestamp: number;
    source: string;
    id: string;
}

/**
 * Event listener function type
 */
export type EventListener<T extends BaseEvent = BaseEvent> = (event: T) => Promise<void> | void;

/**
 * Event listener registration
 */
export interface EventRegistration<T extends BaseEvent = BaseEvent> {
    id: string;
    type: string;
    listener: EventListener<T>;
    once: boolean;
    priority: number;
    source?: string;
}

/**
 * Event system interface
 */
export interface IEventSystem {
    emit<T extends BaseEvent>(event: T): Promise<void>;
    on<T extends BaseEvent>(type: string, listener: EventListener<T>, options?: EventListenerOptions): string;
    off(type: string, listenerId: string): boolean;
    once<T extends BaseEvent>(type: string, listener: EventListener<T>, options?: EventListenerOptions): string;
    clear(): void;
    getListeners(type: string): EventRegistration[];
}

/**
 * Event listener options
 */
export interface EventListenerOptions {
    priority?: number;
    source?: string;
}

/**
 * Predefined Semble event types
 */
export interface SembleEvents {
    'service.registered': ServiceRegisteredEvent;
    'service.resolved': ServiceResolvedEvent;
    'cache.hit': CacheHitEvent;
    'cache.miss': CacheMissEvent;
    'cache.invalidated': CacheInvalidatedEvent;
    'api.request': ApiRequestEvent;
    'api.response': ApiResponseEvent;
    'api.error': ApiErrorEvent;
    'field.discovered': FieldDiscoveredEvent;
    'field.validated': FieldValidatedEvent;
    'permission.checked': PermissionCheckedEvent;
    'schema.registered': SchemaRegisteredEvent;
    'schema.updated': SchemaUpdatedEvent;
    'node.executed': NodeExecutedEvent;
    'trigger.polled': TriggerPolledEvent;
}

/**
 * Service events
 */
export interface ServiceRegisteredEvent extends BaseEvent {
    type: 'service.registered';
    serviceName: string;
    lifetime: string;
}

export interface ServiceResolvedEvent extends BaseEvent {
    type: 'service.resolved';
    serviceName: string;
    scope?: string;
}

/**
 * Cache events
 */
export interface CacheHitEvent extends BaseEvent {
    type: 'cache.hit';
    key: string;
    ttl: number;
}

export interface CacheMissEvent extends BaseEvent {
    type: 'cache.miss';
    key: string;
}

export interface CacheInvalidatedEvent extends BaseEvent {
    type: 'cache.invalidated';
    key: string;
    reason: string;
}

/**
 * API events
 */
export interface ApiRequestEvent extends BaseEvent {
    type: 'api.request';
    endpoint: string;
    method: string;
    query?: string;
}

export interface ApiResponseEvent extends BaseEvent {
    type: 'api.response';
    endpoint: string;
    statusCode: number;
    duration: number;
}

export interface ApiErrorEvent extends BaseEvent {
    type: 'api.error';
    endpoint: string;
    error: string;
    statusCode?: number;
}

/**
 * Field and validation events
 */
export interface FieldDiscoveredEvent extends BaseEvent {
    type: 'field.discovered';
    resourceType: string;
    fieldCount: number;
}

export interface FieldValidatedEvent extends BaseEvent {
    type: 'field.validated';
    fieldName: string;
    isValid: boolean;
    errors?: string[];
}

export interface PermissionCheckedEvent extends BaseEvent {
    type: 'permission.checked';
    resourceType: string;
    operation: string;
    hasPermission: boolean;
}

/**
 * Schema events
 */
export interface SchemaRegisteredEvent extends BaseEvent {
    type: 'schema.registered';
    schemaName: string;
    version: string;
}

export interface SchemaUpdatedEvent extends BaseEvent {
    type: 'schema.updated';
    schemaName: string;
    oldVersion: string;
    newVersion: string;
}

/**
 * Node execution events
 */
export interface NodeExecutedEvent extends BaseEvent {
    type: 'node.executed';
    nodeType: string;
    operation: string;
    duration: number;
    success: boolean;
}

export interface TriggerPolledEvent extends BaseEvent {
    type: 'trigger.polled';
    resourceType: string;
    itemsFound: number;
    duration: number;
}

/**
 * Event system implementation
 */
export class EventSystem implements IEventSystem {
    private listeners = new Map<string, EventRegistration<any>[]>();
    private eventHistory: BaseEvent[] = [];
    private maxHistorySize = 1000;

    /**
     * Emit an event to all registered listeners
     */
    async emit<T extends BaseEvent>(event: T): Promise<void> {
        // Add to history
        this.addToHistory(event);

        // Get listeners for this event type
        const eventListeners = this.listeners.get(event.type) || [];
        
        if (eventListeners.length === 0) {
            return;
        }

        // Sort by priority (higher priority first)
        const sortedListeners = [...eventListeners].sort((a, b) => b.priority - a.priority);

        // Execute listeners
        const promises: Promise<void>[] = [];
        
        for (const registration of sortedListeners) {
            // Filter by source if specified
            if (registration.source && registration.source !== event.source) {
                continue;
            }

            try {
                const result = registration.listener(event);
                if (result instanceof Promise) {
                    promises.push(result);
                }

                // Remove one-time listeners
                if (registration.once) {
                    this.removeListener(event.type, registration.id);
                }
            } catch (error) {
                // Log error but don't stop other listeners
                console.error(`Event listener error for ${event.type}:`, error);
            }
        }

        // Wait for all async listeners
        if (promises.length > 0) {
            await Promise.allSettled(promises);
        }
    }

    /**
     * Register an event listener
     */
    on<T extends BaseEvent>(
        type: string,
        listener: EventListener<T>,
        options: EventListenerOptions = {}
    ): string {
        const registration: EventRegistration<T> = {
            id: this.generateListenerId(),
            type,
            listener,
            once: false,
            priority: options.priority || 0,
            source: options.source
        };

        this.addListener(type, registration);
        return registration.id;
    }

    /**
     * Register a one-time event listener
     */
    once<T extends BaseEvent>(
        type: string,
        listener: EventListener<T>,
        options: EventListenerOptions = {}
    ): string {
        const registration: EventRegistration<T> = {
            id: this.generateListenerId(),
            type,
            listener,
            once: true,
            priority: options.priority || 0,
            source: options.source
        };

        this.addListener(type, registration);
        return registration.id;
    }

    /**
     * Remove an event listener
     */
    off(type: string, listenerId: string): boolean {
        return this.removeListener(type, listenerId);
    }

    /**
     * Remove all listeners for an event type
     */
    removeAllListeners(type: string): void {
        this.listeners.delete(type);
    }

    /**
     * Get all listeners for an event type
     */
    getListeners(type: string): EventRegistration[] {
        return [...(this.listeners.get(type) || [])];
    }

    /**
     * Get all registered event types
     */
    getEventTypes(): string[] {
        return Array.from(this.listeners.keys());
    }

    /**
     * Clear all listeners and history
     */
    clear(): void {
        this.listeners.clear();
        this.eventHistory = [];
    }

    /**
     * Get event history
     */
    getHistory(type?: string, limit?: number): BaseEvent[] {
        let events = this.eventHistory;
        
        if (type) {
            events = events.filter(e => e.type === type);
        }
        
        if (limit) {
            events = events.slice(-limit);
        }
        
        return [...events];
    }

    /**
     * Get listener count for an event type
     */
    getListenerCount(type: string): number {
        return (this.listeners.get(type) || []).length;
    }

    /**
     * Wait for a specific event
     */
    waitFor<T extends BaseEvent>(
        type: string,
        timeout?: number,
        filter?: (event: T) => boolean
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            let timeoutId: NodeJS.Timeout | undefined;
            let listenerId: string;

            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                this.off(type, listenerId);
            };

            // Set timeout if specified
            if (timeout) {
                timeoutId = setTimeout(() => {
                    cleanup();
                    reject(new SembleError(`Event '${type}' timeout after ${timeout}ms`));
                }, timeout);
            }

            // Register listener - use regular on() instead of once() for filtering
            listenerId = this.on(type, (event: T) => {
                if (filter && !filter(event)) {
                    return; // Don't resolve, keep listening
                }
                
                cleanup();
                resolve(event);
            });
        });
    }

    /**
     * Add listener to registry
     */
    private addListener<T extends BaseEvent>(type: string, registration: EventRegistration<T>): void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        
        this.listeners.get(type)!.push(registration);
    }

    /**
     * Remove listener from registry
     */
    private removeListener(type: string, listenerId: string): boolean {
        const listeners = this.listeners.get(type);
        if (!listeners) {
            return false;
        }

        const index = listeners.findIndex(l => l.id === listenerId);
        if (index === -1) {
            return false;
        }

        listeners.splice(index, 1);
        
        // Clean up empty arrays
        if (listeners.length === 0) {
            this.listeners.delete(type);
        }

        return true;
    }

    /**
     * Generate unique listener ID
     */
    private generateListenerId(): string {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add event to history
     */
    private addToHistory(event: BaseEvent): void {
        this.eventHistory.push(event);
        
        // Trim history if too large
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
    }

    /**
     * Create typed event helper
     */
    createEvent<K extends keyof SembleEvents>(
        type: K,
        data: Omit<SembleEvents[K], keyof BaseEvent>,
        source: string = 'unknown'
    ): SembleEvents[K] {
        return {
            type,
            timestamp: Date.now(),
            source,
            id: this.generateListenerId(),
            ...data
        } as SembleEvents[K];
    }
}

/**
 * Default event system instance
 */
export const eventSystem = new EventSystem();

/**
 * Event decorators for automatic event emission
 */
export function EmitEvent(eventType: string, source?: string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const startTime = Date.now();
            let success = true;
            let error: any = null;

            try {
                const result = await method.apply(this, args);
                return result;
            } catch (err) {
                success = false;
                error = err;
                throw err;
            } finally {
                const duration = Date.now() - startTime;
                
                // Emit event with execution info
                const event = eventSystem.createEvent('node.executed' as any, {
                    nodeType: target.constructor.name,
                    operation: propertyName,
                    duration,
                    success
                }, source || 'decorator');

                await eventSystem.emit(event);
            }
        };

        return descriptor;
    };
}

/**
 * Utility functions for common event patterns
 */
export class EventSystemUtils {
    /**
     * Set up logging for all events
     */
    static setupEventLogging(eventSystem: EventSystem, logger = console): void {
        eventSystem.on<ApiRequestEvent>('api.request', (event) => {
            logger.log(`[API] ${event.method} ${event.endpoint}`);
        });

        eventSystem.on<ApiErrorEvent>('api.error', (event) => {
            logger.error(`[API Error] ${event.endpoint}: ${event.error}`);
        });

        eventSystem.on<CacheHitEvent>('cache.hit', (event) => {
            logger.debug(`[Cache Hit] ${event.key}`);
        });

        eventSystem.on<ServiceResolvedEvent>('service.resolved', (event) => {
            logger.debug(`[Service] Resolved ${event.serviceName}`);
        });
    }

    /**
     * Set up performance monitoring
     */
    static setupPerformanceMonitoring(eventSystem: EventSystem): void {
        const performanceMetrics = new Map<string, number[]>();

        eventSystem.on<ApiResponseEvent>('api.response', (event) => {
            const key = `api.${event.endpoint}`;
            if (!performanceMetrics.has(key)) {
                performanceMetrics.set(key, []);
            }
            performanceMetrics.get(key)!.push(event.duration);
        });

        eventSystem.on<NodeExecutedEvent>('node.executed', (event) => {
            const key = `node.${event.nodeType}.${event.operation}`;
            if (!performanceMetrics.has(key)) {
                performanceMetrics.set(key, []);
            }
            performanceMetrics.get(key)!.push(event.duration);
        });

        // Expose metrics getter
        (eventSystem as any).getPerformanceMetrics = () => {
            const result: Record<string, {
                count: number;
                avg: number;
                min: number;
                max: number;
            }> = {};

            for (const [key, values] of performanceMetrics) {
                result[key] = {
                    count: values.length,
                    avg: values.reduce((a, b) => a + b, 0) / values.length,
                    min: Math.min(...values),
                    max: Math.max(...values)
                };
            }

            return result;
        };
    }
}
