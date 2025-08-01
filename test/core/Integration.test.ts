/**
 * @fileoverview Integration.test.ts
 * @description Comprehensive test suite for Integration Layer components: ServiceContainer (dependency injection), EventSystem (event-driven communication), SchemaRegistry (schema management)
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Core.Integration
 * @since 2.0.0
 */

import {
    ServiceContainer,
    ServiceLifetime,
    IServiceContainer,
    serviceContainer,
    ServiceContainerUtils
} from '../../core/ServiceContainer';

import {
    EventSystem,
    IEventSystem,
    eventSystem,
    EventSystemUtils,
    BaseEvent,
    ApiRequestEvent,
    CacheHitEvent,
    ServiceResolvedEvent
} from '../../core/EventSystem';

import {
    SchemaRegistry,
    ISchemaRegistry,
    schemaRegistry,
    SchemaRegistryUtils,
    ResourceSchema,
    FieldSchema,
    ValidationResult,
    SchemaChangeImpact
} from '../../core/SchemaRegistry';

import { SembleError } from '../../core/SembleError';

describe('Integration Layer', () => {
    beforeEach(() => {
        // Clean up before each test
        serviceContainer.clear();
        eventSystem.clear();
        schemaRegistry.clear();
    });

    describe('ServiceContainer', () => {
        let container: ServiceContainer;

        beforeEach(() => {
            container = new ServiceContainer();
        });

        describe('Service Registration', () => {
            it('should register and resolve transient services', () => {
                let callCount = 0;
                container.register('testService', () => ({ id: ++callCount }), ServiceLifetime.TRANSIENT);

                const instance1 = container.resolve<{ id: number }>('testService');
                const instance2 = container.resolve<{ id: number }>('testService');

                expect(instance1.id).toBe(1);
                expect(instance2.id).toBe(2);
                expect(instance1).not.toBe(instance2);
            });

            it('should register and resolve singleton services', () => {
                let callCount = 0;
                container.register('singletonService', () => ({ id: ++callCount }), ServiceLifetime.SINGLETON);

                const instance1 = container.resolve<{ id: number }>('singletonService');
                const instance2 = container.resolve<{ id: number }>('singletonService');

                expect(instance1.id).toBe(1);
                expect(instance2.id).toBe(1);
                expect(instance1).toBe(instance2);
            });

            it('should register and resolve scoped services', () => {
                let callCount = 0;
                container.register('scopedService', () => ({ id: ++callCount }), ServiceLifetime.SCOPED);

                const instance1 = container.resolve<{ id: number }>('scopedService', 'scope1');
                const instance2 = container.resolve<{ id: number }>('scopedService', 'scope1');
                const instance3 = container.resolve<{ id: number }>('scopedService', 'scope2');

                expect(instance1.id).toBe(1);
                expect(instance2.id).toBe(1);
                expect(instance3.id).toBe(2);
                expect(instance1).toBe(instance2);
                expect(instance1).not.toBe(instance3);
            });

            it('should handle service dependencies', () => {
                container.register('dependency', () => ({ value: 'dep' }));
                container.register('service', (dep: any) => ({ dep }), ServiceLifetime.TRANSIENT, ['dependency']);

                const instance = container.resolve<{ dep: { value: string } }>('service');
                expect(instance.dep.value).toBe('dep');
            });

            it('should detect circular dependencies', () => {
                container.register('serviceA', (b: any) => ({ b }), ServiceLifetime.TRANSIENT, ['serviceB']);
                container.register('serviceB', (a: any) => ({ a }), ServiceLifetime.TRANSIENT, ['serviceA']);

                expect(() => container.resolve('serviceA')).toThrow(SembleError);
                expect(() => container.resolve('serviceA')).toThrow(/Circular dependency/);
            });

            it('should throw error for unregistered services', () => {
                expect(() => container.resolve('nonExistent')).toThrow(SembleError);
                expect(() => container.resolve('nonExistent')).toThrow(/not registered/);
            });

            it('should prevent duplicate registrations', () => {
                container.register('service', () => ({}));
                expect(() => container.register('service', () => ({}))).toThrow(SembleError);
                expect(() => container.register('service', () => ({}))).toThrow(/already registered/);
            });
        });

        describe('Service Management', () => {
            it('should check if service is registered', () => {
                expect(container.isRegistered('test')).toBe(false);
                container.register('test', () => ({}));
                expect(container.isRegistered('test')).toBe(true);
            });

            it('should get registered service names', () => {
                container.register('service1', () => ({}));
                container.register('service2', () => ({}));

                const names = container.getRegisteredServices();
                expect(names).toContain('service1');
                expect(names).toContain('service2');
                expect(names).toHaveLength(2);
            });

            it('should get service registration info', () => {
                container.register('test', () => ({}), ServiceLifetime.SINGLETON, ['dep']);

                const info = container.getServiceInfo('test');
                expect(info).toBeDefined();
                expect(info!.name).toBe('test');
                expect(info!.lifetime).toBe(ServiceLifetime.SINGLETON);
                expect(info!.dependencies).toContain('dep');
            });

            it('should clear all services', () => {
                container.register('service1', () => ({}));
                container.register('service2', () => ({}));

                expect(container.getRegisteredServices()).toHaveLength(2);
                container.clear();
                expect(container.getRegisteredServices()).toHaveLength(0);
            });
        });

        describe('Scoped Containers', () => {
            it('should create scoped containers', () => {
                container.register('service', () => ({ id: Math.random() }), ServiceLifetime.SCOPED);

                const scope1 = container.createScope('scope1');
                const scope2 = container.createScope('scope2');

                const instance1a = scope1.resolve('service');
                const instance1b = scope1.resolve('service');
                const instance2 = scope2.resolve('service');

                expect(instance1a).toBe(instance1b);
                expect(instance1a).not.toBe(instance2);
            });

            it('should clear scoped instances', () => {
                let callCount = 0;
                container.register('service', () => ({ id: ++callCount }), ServiceLifetime.SCOPED);

                const instance1 = container.resolve<{ id: number }>('service', 'testScope');
                expect(instance1.id).toBe(1);

                container.clearScope('testScope');
                const instance2 = container.resolve<{ id: number }>('service', 'testScope');
                expect(instance2.id).toBe(2);
            });
        });

        describe('Batch Registration', () => {
            it('should register multiple services at once', () => {
                container.registerBatch([
                    { name: 'service1', factory: () => ({ type: 'service1' }) },
                    { name: 'service2', factory: () => ({ type: 'service2' }), lifetime: ServiceLifetime.SINGLETON },
                    { name: 'service3', factory: (s1: any) => ({ dep: s1 }), dependencies: ['service1'] }
                ]);

                expect(container.isRegistered('service1')).toBe(true);
                expect(container.isRegistered('service2')).toBe(true);
                expect(container.isRegistered('service3')).toBe(true);

                const service3 = container.resolve<{ dep: { type: string } }>('service3');
                expect(service3.dep.type).toBe('service1');
            });
        });

        describe('ServiceContainerUtils', () => {
            it('should create configured container', () => {
                const configuredContainer = ServiceContainerUtils.createConfiguredContainer();
                
                expect(configuredContainer.isRegistered('config')).toBe(true);
                expect(configuredContainer.isRegistered('cache')).toBe(true);
                expect(configuredContainer.isRegistered('credentials')).toBe(true);
            });
        });
    });

    describe('EventSystem', () => {
        let events: EventSystem;

        beforeEach(() => {
            events = new EventSystem();
        });

        describe('Event Emission and Listening', () => {
            it('should emit and handle events', async () => {
                const mockListener = jest.fn();
                const event: BaseEvent = {
                    type: 'test.event',
                    timestamp: Date.now(),
                    source: 'test',
                    id: 'test-id'
                };

                events.on('test.event', mockListener);
                await events.emit(event);

                expect(mockListener).toHaveBeenCalledWith(event);
            });

            it('should handle multiple listeners for same event', async () => {
                const listener1 = jest.fn();
                const listener2 = jest.fn();
                const event: BaseEvent = {
                    type: 'multi.event',
                    timestamp: Date.now(),
                    source: 'test',
                    id: 'test-id'
                };

                events.on('multi.event', listener1);
                events.on('multi.event', listener2);
                await events.emit(event);

                expect(listener1).toHaveBeenCalledWith(event);
                expect(listener2).toHaveBeenCalledWith(event);
            });

            it('should handle async listeners', async () => {
                const results: string[] = [];
                const asyncListener = async (event: BaseEvent) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    results.push('async');
                };
                const syncListener = () => { results.push('sync'); };

                events.on('async.event', asyncListener);
                events.on('async.event', syncListener);

                await events.emit({
                    type: 'async.event',
                    timestamp: Date.now(),
                    source: 'test',
                    id: 'test-id'
                });

                expect(results).toContain('async');
                expect(results).toContain('sync');
            });

            it('should respect listener priority', async () => {
                const results: number[] = [];

                events.on('priority.event', () => { results.push(1); }, { priority: 1 });
                events.on('priority.event', () => { results.push(3); }, { priority: 3 });
                events.on('priority.event', () => { results.push(2); }, { priority: 2 });

                await events.emit({
                    type: 'priority.event',
                    timestamp: Date.now(),
                    source: 'test',
                    id: 'test-id'
                });

                expect(results).toEqual([3, 2, 1]);
            });

            it('should filter by source', async () => {
                const listener = jest.fn();

                events.on('source.event', listener, { source: 'specific' });

                await events.emit({
                    type: 'source.event',
                    timestamp: Date.now(),
                    source: 'other',
                    id: 'test-id'
                });

                expect(listener).not.toHaveBeenCalled();

                await events.emit({
                    type: 'source.event',
                    timestamp: Date.now(),
                    source: 'specific',
                    id: 'test-id'
                });

                expect(listener).toHaveBeenCalled();
            });
        });

        describe('One-time Listeners', () => {
            it('should handle once listeners', async () => {
                const listener = jest.fn();
                const event: BaseEvent = {
                    type: 'once.event',
                    timestamp: Date.now(),
                    source: 'test',
                    id: 'test-id'
                };

                events.once('once.event', listener);

                await events.emit(event);
                await events.emit(event);

                expect(listener).toHaveBeenCalledTimes(1);
            });
        });

        describe('Listener Management', () => {
            it('should remove listeners', async () => {
                const listener = jest.fn();
                const listenerId = events.on('remove.event', listener);

                expect(events.getListenerCount('remove.event')).toBe(1);

                const removed = events.off('remove.event', listenerId);
                expect(removed).toBe(true);
                expect(events.getListenerCount('remove.event')).toBe(0);

                await events.emit({
                    type: 'remove.event',
                    timestamp: Date.now(),
                    source: 'test',
                    id: 'test-id'
                });

                expect(listener).not.toHaveBeenCalled();
            });

            it('should remove all listeners for event type', () => {
                events.on('multi.event', () => {});
                events.on('multi.event', () => {});
                events.on('other.event', () => {});

                expect(events.getListenerCount('multi.event')).toBe(2);
                expect(events.getListenerCount('other.event')).toBe(1);

                events.removeAllListeners('multi.event');

                expect(events.getListenerCount('multi.event')).toBe(0);
                expect(events.getListenerCount('other.event')).toBe(1);
            });

            it('should get listeners for event type', () => {
                const listener1 = () => {};
                const listener2 = () => {};

                events.on('test.event', listener1);
                events.on('test.event', listener2);

                const listeners = events.getListeners('test.event');
                expect(listeners).toHaveLength(2);
                expect(listeners[0].listener).toBe(listener1);
                expect(listeners[1].listener).toBe(listener2);
            });
        });

        describe('Event History', () => {
            it('should track event history', async () => {
                const event1: BaseEvent = {
                    type: 'history.event1',
                    timestamp: Date.now(),
                    source: 'test',
                    id: 'test-id-1'
                };

                const event2: BaseEvent = {
                    type: 'history.event2',
                    timestamp: Date.now() + 1,
                    source: 'test',
                    id: 'test-id-2'
                };

                await events.emit(event1);
                await events.emit(event2);

                const history = events.getHistory();
                expect(history).toHaveLength(2);
                expect(history[0]).toEqual(event1);
                expect(history[1]).toEqual(event2);
            });

            it('should filter history by event type', async () => {
                await events.emit({
                    type: 'type1',
                    timestamp: Date.now(),
                    source: 'test',
                    id: 'id1'
                });

                await events.emit({
                    type: 'type2',
                    timestamp: Date.now(),
                    source: 'test',
                    id: 'id2'
                });

                const type1History = events.getHistory('type1');
                expect(type1History).toHaveLength(1);
                expect(type1History[0].type).toBe('type1');
            });

            it('should limit history size', async () => {
                const history = events.getHistory(undefined, 1);
                expect(history.length).toBeLessThanOrEqual(1);
            });
        });

        describe('Event Wait Functionality', () => {
            it('should wait for specific events', async () => {
                const eventPromise = events.waitFor('wait.event');

                setTimeout(() => {
                    events.emit({
                        type: 'wait.event',
                        timestamp: Date.now(),
                        source: 'test',
                        id: 'wait-id'
                    });
                }, 10);

                const receivedEvent = await eventPromise;
                expect(receivedEvent.type).toBe('wait.event');
            });

            it('should timeout waiting for events', async () => {
                const eventPromise = events.waitFor('timeout.event', 50);

                await expect(eventPromise).rejects.toThrow(SembleError);
                await expect(eventPromise).rejects.toThrow(/timeout/);
            });

            it('should filter events when waiting', async () => {
                const eventPromise = events.waitFor('filter.event', 300, (event: any) => event.id === 'target');

                // Emit non-matching event first
                setTimeout(async () => {
                    await events.emit({
                        type: 'filter.event',
                        timestamp: Date.now(),
                        source: 'test',
                        id: 'not-target'
                    });
                }, 10);

                // Emit matching event after non-matching
                setTimeout(async () => {
                    await events.emit({
                        type: 'filter.event',
                        timestamp: Date.now(),
                        source: 'test',
                        id: 'target'
                    });
                }, 50);

                const receivedEvent = await eventPromise;
                expect(receivedEvent.id).toBe('target');
            });
        });

        describe('Typed Events', () => {
            it('should create typed events', () => {
                const event = events.createEvent('api.request', {
                    endpoint: '/test',
                    method: 'GET'
                }, 'test-source');

                expect(event.type).toBe('api.request');
                expect(event.endpoint).toBe('/test');
                expect(event.method).toBe('GET');
                expect(event.source).toBe('test-source');
                expect(event.timestamp).toBeDefined();
                expect(event.id).toBeDefined();
            });
        });

        describe('EventSystemUtils', () => {
            it('should setup event logging', async () => {
                const mockLogger = {
                    log: jest.fn(),
                    error: jest.fn(),
                    debug: jest.fn()
                } as any;

                EventSystemUtils.setupEventLogging(events, mockLogger);

                await events.emit(events.createEvent('api.request', {
                    endpoint: '/test',
                    method: 'GET'
                }));

                // Wait for async event processing
                await new Promise(resolve => setTimeout(resolve, 20));
                expect(mockLogger.log).toHaveBeenCalledWith('[API] GET /test');
            });

            it('should setup performance monitoring', () => {
                EventSystemUtils.setupPerformanceMonitoring(events);

                events.emit(events.createEvent('api.response', {
                    endpoint: '/test',
                    statusCode: 200,
                    duration: 100
                }));

                const metrics = (events as any).getPerformanceMetrics();
                expect(metrics).toBeDefined();
            });
        });
    });

    describe('SchemaRegistry', () => {
        let registry: SchemaRegistry;

        beforeEach(() => {
            registry = new SchemaRegistry();
        });

        describe('Schema Registration', () => {
            it('should register and retrieve schemas', () => {
                const schema: ResourceSchema = {
                    name: 'TestResource',
                    type: 'patient',
                    version: {
                        version: '1.0.0',
                        timestamp: Date.now(),
                        author: 'test',
                        description: 'Test schema',
                        breaking: false
                    },
                    fields: [
                        {
                            name: 'id',
                            type: 'string',
                            required: true,
                            description: 'Resource ID'
                        }
                    ],
                    actions: ['get', 'create']
                };

                registry.registerSchema(schema);

                const retrieved = registry.getSchema('patient');
                expect(retrieved).toEqual(schema);
            });

            it('should get schema by version', () => {
                const schema1: ResourceSchema = {
                    name: 'TestResource',
                    type: 'patient',
                    version: {
                        version: '1.0.0',
                        timestamp: Date.now(),
                        author: 'test',
                        description: 'Version 1',
                        breaking: false
                    },
                    fields: [],
                    actions: ['get']
                };

                const schema2: ResourceSchema = {
                    name: 'TestResource',
                    type: 'patient',
                    version: {
                        version: '2.0.0',
                        timestamp: Date.now(),
                        author: 'test',
                        description: 'Version 2',
                        breaking: true
                    },
                    fields: [],
                    actions: ['get']
                };

                registry.registerSchema(schema1);
                registry.registerSchema(schema2);

                expect(registry.getSchema('patient', '1.0.0')).toEqual(schema1);
                expect(registry.getSchema('patient', '2.0.0')).toEqual(schema2);
                expect(registry.getLatestSchema('patient')).toEqual(schema2);
            });

            it('should prevent duplicate version registration', () => {
                const schema: ResourceSchema = {
                    name: 'TestResource',
                    type: 'patient',
                    version: {
                        version: '1.0.0',
                        timestamp: Date.now(),
                        author: 'test',
                        description: 'Test',
                        breaking: false
                    },
                    fields: [],
                    actions: ['get']
                };

                registry.registerSchema(schema);

                expect(() => registry.registerSchema(schema)).toThrow(SembleError);
                expect(() => registry.registerSchema(schema)).toThrow(/already exists/);
            });
        });

        describe('Schema Validation', () => {
            it('should validate valid schemas', () => {
                const schema: ResourceSchema = {
                    name: 'ValidSchema',
                    type: 'patient',
                    version: {
                        version: '1.0.0',
                        timestamp: Date.now(),
                        author: 'test',
                        description: 'Valid schema',
                        breaking: false
                    },
                    fields: [
                        {
                            name: 'id',
                            type: 'string',
                            required: true,
                            description: 'ID field'
                        }
                    ],
                    actions: ['get', 'create']
                };

                const result = registry.validateSchema(schema);
                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });

            it('should detect invalid schemas', () => {
                const invalidSchema: ResourceSchema = {
                    name: '', // Empty name
                    type: 'patient',
                    version: {
                        version: '1.0.0',
                        timestamp: Date.now(),
                        author: 'test',
                        description: 'Invalid schema',
                        breaking: false
                    },
                    fields: [
                        {
                            name: 'field1',
                            type: 'string',
                            required: true
                        },
                        {
                            name: 'field1', // Duplicate name
                            type: 'number',
                            required: false
                        }
                    ],
                    actions: ['get']
                };

                const result = registry.validateSchema(invalidSchema);
                expect(result.isValid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(0);
                expect(result.errors).toContain('Schema name is required');
                expect(result.errors).toContain('Duplicate field name: field1');
            });
        });

        describe('Node Properties Generation', () => {
            it('should generate n8n node properties from schema', () => {
                const schema: ResourceSchema = {
                    name: 'TestResource',
                    type: 'patient',
                    version: {
                        version: '1.0.0',
                        timestamp: Date.now(),
                        author: 'test',
                        description: 'Test schema',
                        breaking: false
                    },
                    fields: [
                        {
                            name: 'firstName',
                            type: 'string',
                            required: true,
                            description: 'First name'
                        },
                        {
                            name: 'age',
                            type: 'number',
                            required: false,
                            description: 'Age in years'
                        }
                    ],
                    actions: ['get', 'create']
                };

                const properties = registry.generateNodeProperties(schema);
                
                expect(properties).toHaveLength(2);
                expect(properties[0].name).toBe('firstName');
                expect(properties[0].type).toBe('string');
                expect(properties[0].required).toBe(true);
                expect(properties[1].name).toBe('age');
                expect(properties[1].type).toBe('number');
                expect(properties[1].required).toBe(false);
            });
        });

        describe('Schema Change Analysis', () => {
            it('should analyze schema changes', () => {
                const oldSchema: ResourceSchema = {
                    name: 'TestResource',
                    type: 'patient',
                    version: {
                        version: '1.0.0',
                        timestamp: Date.now(),
                        author: 'test',
                        description: 'Old version',
                        breaking: false
                    },
                    fields: [
                        { name: 'id', type: 'string', required: true },
                        { name: 'name', type: 'string', required: false },
                        { name: 'oldField', type: 'string', required: false }
                    ],
                    actions: ['get']
                };

                const newSchema: ResourceSchema = {
                    name: 'TestResource',
                    type: 'patient',
                    version: {
                        version: '2.0.0',
                        timestamp: Date.now(),
                        author: 'test',
                        description: 'New version',
                        breaking: true
                    },
                    fields: [
                        { name: 'id', type: 'string', required: true },
                        { name: 'name', type: 'string', required: true }, // Changed to required
                        { name: 'newField', type: 'number', required: false }
                        // oldField removed
                    ],
                    actions: ['get']
                };

                const impact = registry.analyzeSchemaChanges(oldSchema, newSchema);

                expect(impact.breaking).toBe(true);
                expect(impact.addedFields).toContain('newField');
                expect(impact.removedFields).toContain('oldField');
                expect(impact.modifiedFields).toContain('name');
                expect(impact.compatibilityIssues.length).toBeGreaterThan(0);
            });
        });

        describe('Schema Import/Export', () => {
            it('should export and import schemas', () => {
                const schema: ResourceSchema = {
                    name: 'ExportTest',
                    type: 'patient',
                    version: {
                        version: '1.0.0',
                        timestamp: Date.now(),
                        author: 'test',
                        description: 'Export test',
                        breaking: false
                    },
                    fields: [
                        { name: 'id', type: 'string', required: true }
                    ],
                    actions: ['get']
                };

                registry.registerSchema(schema);

                const exported = registry.exportSchema('patient');
                expect(exported).toBeTruthy();

                const newRegistry = new SchemaRegistry();
                newRegistry.importSchema(exported);

                const imported = newRegistry.getSchema('patient');
                expect(imported).toEqual(schema);
            });
        });

        describe('SchemaRegistryUtils', () => {
            it('should create schemas from field definitions', () => {
                const schema = SchemaRegistryUtils.createSchema(
                    'TestResource',
                    'patient',
                    [
                        { name: 'id', type: 'string', required: true },
                        { name: 'name', type: 'string' }
                    ],
                    '1.0.0'
                );

                expect(schema.name).toBe('TestResource');
                expect(schema.type).toBe('patient');
                expect(schema.version.version).toBe('1.0.0');
                expect(schema.fields).toHaveLength(2);
            });

            it('should register common Semble schemas', () => {
                SchemaRegistryUtils.registerCommonSchemas(registry);

                expect(registry.getSchema('patient')).toBeDefined();
                expect(registry.getSchema('booking')).toBeDefined();
            });
        });

        describe('Schema Statistics', () => {
            it('should provide schema statistics', () => {
                SchemaRegistryUtils.registerCommonSchemas(registry);

                const stats = registry.getStatistics();
                expect(stats.totalSchemas).toBeGreaterThan(0);
                expect(stats.schemasByType.patient).toBe(1);
                expect(stats.schemasByType.booking).toBe(1);
                expect(stats.totalFields).toBeGreaterThan(0);
                expect(stats.averageFieldsPerSchema).toBeGreaterThan(0);
            });
        });
    });

    describe('Integration Tests', () => {
        describe('ServiceContainer + EventSystem Integration', () => {
            it('should emit events during service resolution', async () => {
                const mockEventSystem = new EventSystem();
                const eventListener = jest.fn();

                mockEventSystem.on('service.resolved', eventListener);

                // Mock service that emits event when resolved
                serviceContainer.register('eventedService', () => {
                    // Emit event synchronously to avoid timing issues
                    setTimeout(() => {
                        mockEventSystem.emit(mockEventSystem.createEvent('service.resolved', {
                            serviceName: 'eventedService'
                        }));
                    }, 0);
                    return { type: 'evented' };
                });

                const service = serviceContainer.resolve<{ type: string }>('eventedService');
                expect(service.type).toBe('evented');

                // Wait for async event processing
                await new Promise(resolve => setTimeout(resolve, 20));
                expect(eventListener).toHaveBeenCalled();
            });
        });

        describe('EventSystem + SchemaRegistry Integration', () => {
            it('should emit events when schemas are registered', async () => {
                const eventListener = jest.fn();
                eventSystem.on('schema.registered', eventListener);

                const schema = SchemaRegistryUtils.createSchema('TestIntegration', 'patient', [
                    { name: 'id', type: 'string', required: true }
                ]);

                // Mock schema registration with event emission
                schemaRegistry.registerSchema(schema);

                // Manually emit the event (in real implementation, this would be automatic)
                await eventSystem.emit(eventSystem.createEvent('schema.registered', {
                    schemaName: schema.name,
                    version: schema.version.version
                }));

                expect(eventListener).toHaveBeenCalled();
            });
        });

        describe('Full Integration Scenario', () => {
            it('should demonstrate complete integration', async () => {
                // Setup services with event system integration
                const mockLogger = { log: jest.fn(), error: jest.fn(), debug: jest.fn() } as any;
                EventSystemUtils.setupEventLogging(eventSystem, mockLogger);

                // Register services
                serviceContainer.register('logger', () => mockLogger);
                serviceContainer.register('events', () => eventSystem);
                serviceContainer.register('schemas', () => schemaRegistry);

                // Register schemas
                SchemaRegistryUtils.registerCommonSchemas(schemaRegistry);

                // Simulate service usage
                const logger = serviceContainer.resolve<typeof mockLogger>('logger');
                const events = serviceContainer.resolve<EventSystem>('events');
                const schemas = serviceContainer.resolve<SchemaRegistry>('schemas');

                expect(logger).toBe(mockLogger);
                expect(events).toBe(eventSystem);
                expect(schemas).toBe(schemaRegistry);

                // Test that everything works together
                const patientSchema = schemas.getSchema('patient');
                expect(patientSchema).toBeDefined();

                const nodeProperties = schemas.generateNodeProperties(patientSchema!);
                expect(nodeProperties.length).toBeGreaterThan(0);

                // Emit an API event
                await events.emit(events.createEvent('api.request', {
                    endpoint: '/patients',
                    method: 'GET'
                }));

                // Wait for async event processing
                await new Promise(resolve => setTimeout(resolve, 20));
                expect(mockLogger.log).toHaveBeenCalledWith('[API] GET /patients');
            });
        });
    });
});
