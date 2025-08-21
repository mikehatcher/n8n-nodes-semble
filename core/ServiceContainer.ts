/**
 * @fileoverview ServiceContainer.ts
 * @description Dependency injection container for clean architecture and testability. Provides service registration, resolution, and lifecycle management.
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Core.ServiceContainer
 * @since 2.0.0
 */

import { SembleError } from './SembleError';

/**
 * Service lifecycle types
 */
export enum ServiceLifetime {
    SINGLETON = 'singleton',
    TRANSIENT = 'transient',
    SCOPED = 'scoped'
}

/**
 * Service registration configuration
 */
export interface ServiceRegistration<T = any> {
    name: string;
    factory: (...dependencies: any[]) => T;
    lifetime: ServiceLifetime;
    dependencies?: string[];
    instance?: T;
    scope?: string;
}

/**
 * Service container interface for dependency injection
 */
export interface IServiceContainer {
    register<T>(name: string, factory: (...deps: any[]) => T, lifetime?: ServiceLifetime, dependencies?: string[]): void;
    resolve<T>(name: string, scope?: string): T;
    isRegistered(name: string): boolean;
    clear(): void;
    createScope(scopeName: string): IServiceContainer;
}

/**
 * Dependency injection container implementation
 * Supports singleton, transient, and scoped service lifetimes
 */
export class ServiceContainer implements IServiceContainer {
    private services = new Map<string, ServiceRegistration>();
    private singletonInstances = new Map<string, any>();
    private scopedInstances = new Map<string, Map<string, any>>();
    private resolutionStack: string[] = [];

    /**
     * Register a service with the container
     */
    register<T>(
        name: string,
        factory: (...dependencies: any[]) => T,
        lifetime: ServiceLifetime = ServiceLifetime.TRANSIENT,
        dependencies: string[] = []
    ): void {
        if (this.services.has(name)) {
            throw new SembleError(`Service '${name}' is already registered`);
        }

        this.services.set(name, {
            name,
            factory,
            lifetime,
            dependencies
        });
    }

    /**
     * Register a singleton service
     */
    registerSingleton<T>(
        name: string,
        factory: (...dependencies: any[]) => T,
        dependencies: string[] = []
    ): void {
        this.register(name, factory, ServiceLifetime.SINGLETON, dependencies);
    }

    /**
     * Register a transient service
     */
    registerTransient<T>(
        name: string,
        factory: (...dependencies: any[]) => T,
        dependencies: string[] = []
    ): void {
        this.register(name, factory, ServiceLifetime.TRANSIENT, dependencies);
    }

    /**
     * Register a scoped service
     */
    registerScoped<T>(
        name: string,
        factory: (...dependencies: any[]) => T,
        dependencies: string[] = []
    ): void {
        this.register(name, factory, ServiceLifetime.SCOPED, dependencies);
    }

    /**
     * Resolve a service by name
     */
    resolve<T>(name: string, scope?: string): T {
        // Check for circular dependencies
        if (this.resolutionStack.includes(name)) {
            const cycle = [...this.resolutionStack, name].join(' -> ');
            throw new SembleError(`Circular dependency detected: ${cycle}`);
        }

        const registration = this.services.get(name);
        if (!registration) {
            throw new SembleError(`Service '${name}' is not registered`);
        }

        this.resolutionStack.push(name);

        try {
            switch (registration.lifetime) {
                case ServiceLifetime.SINGLETON:
                    return this.resolveSingleton<T>(registration);

                case ServiceLifetime.SCOPED:
                    return this.resolveScoped<T>(registration, scope || 'default');

                case ServiceLifetime.TRANSIENT:
                default:
                    return this.resolveTransient<T>(registration, scope);
            }
        } finally {
            this.resolutionStack.pop();
        }
    }

    /**
     * Resolve singleton service
     */
    private resolveSingleton<T>(registration: ServiceRegistration<T>): T {
        if (this.singletonInstances.has(registration.name)) {
            return this.singletonInstances.get(registration.name) as T;
        }

        const dependencies = this.resolveDependencies(registration.dependencies || []);
        const instance = registration.factory(...dependencies);
        
        this.singletonInstances.set(registration.name, instance);
        return instance;
    }

    /**
     * Resolve scoped service
     */
    private resolveScoped<T>(registration: ServiceRegistration<T>, scope: string): T {
        if (!this.scopedInstances.has(scope)) {
            this.scopedInstances.set(scope, new Map());
        }

        const scopeInstances = this.scopedInstances.get(scope)!;
        
        if (scopeInstances.has(registration.name)) {
            return scopeInstances.get(registration.name) as T;
        }

        const dependencies = this.resolveDependencies(registration.dependencies || [], scope);
        const instance = registration.factory(...dependencies);
        
        scopeInstances.set(registration.name, instance);
        return instance;
    }

    /**
     * Resolve transient service
     */
    private resolveTransient<T>(registration: ServiceRegistration<T>, scope?: string): T {
        const dependencies = this.resolveDependencies(registration.dependencies || [], scope);
        return registration.factory(...dependencies);
    }

    /**
     * Resolve service dependencies
     */
    private resolveDependencies(dependencies: string[], scope?: string): any[] {
        return dependencies.map(dep => this.resolve(dep, scope));
    }

    /**
     * Check if a service is registered
     */
    isRegistered(name: string): boolean {
        return this.services.has(name);
    }

    /**
     * Get all registered service names
     */
    getRegisteredServices(): string[] {
        return Array.from(this.services.keys());
    }

    /**
     * Clear all services and instances
     */
    clear(): void {
        this.services.clear();
        this.singletonInstances.clear();
        this.scopedInstances.clear();
        this.resolutionStack = [];
    }

    /**
     * Clear scoped instances for a specific scope
     */
    clearScope(scope: string): void {
        this.scopedInstances.delete(scope);
    }

    /**
     * Create a scoped container
     */
    createScope(scopeName: string): IServiceContainer {
        return new ScopedServiceContainer(this, scopeName);
    }

    /**
     * Get service registration info
     */
    getServiceInfo(name: string): ServiceRegistration | undefined {
        return this.services.get(name);
    }

    /**
     * Register multiple services at once
     */
    registerBatch(registrations: Array<{
        name: string;
        factory: (...deps: any[]) => any;
        lifetime?: ServiceLifetime;
        dependencies?: string[];
    }>): void {
        for (const reg of registrations) {
            this.register(
                reg.name,
                reg.factory,
                reg.lifetime || ServiceLifetime.TRANSIENT,
                reg.dependencies || []
            );
        }
    }
}

/**
 * Scoped service container implementation
 */
class ScopedServiceContainer implements IServiceContainer {
    constructor(
        private parentContainer: ServiceContainer,
        private scopeName: string
    ) {}

    register<T>(
        name: string,
        factory: (...deps: any[]) => T,
        lifetime?: ServiceLifetime,
        dependencies?: string[]
    ): void {
        this.parentContainer.register(name, factory, lifetime, dependencies);
    }

    resolve<T>(name: string): T {
        return this.parentContainer.resolve<T>(name, this.scopeName);
    }

    isRegistered(name: string): boolean {
        return this.parentContainer.isRegistered(name);
    }

    clear(): void {
        this.parentContainer.clearScope(this.scopeName);
    }

    createScope(scopeName: string): IServiceContainer {
        return this.parentContainer.createScope(scopeName);
    }
}

/**
 * Default service container instance
 */
export const serviceContainer = new ServiceContainer();

/**
 * Service decorator for automatic registration
 */
export function Service(name: string, lifetime: ServiceLifetime = ServiceLifetime.TRANSIENT) {
    return function <T extends { new (...args: any[]): {} }>(constructor: T) {
        serviceContainer.register(name, () => new constructor(), lifetime);
        return constructor;
    };
}

/**
 * Injectable decorator for dependency injection
 */
export function Injectable(dependencies: string[] = []) {
    return function <T extends { new (...args: any[]): {} }>(constructor: T) {
        const originalConstructor = constructor;
        
        const injectedConstructor = function (...args: any[]) {
            const resolvedDependencies = dependencies.map(dep => serviceContainer.resolve(dep));
            return new originalConstructor(...resolvedDependencies, ...args);
        } as any;
        
        injectedConstructor.prototype = originalConstructor.prototype;
        return injectedConstructor;
    };
}

/**
 * Utility functions for common service patterns
 */
export class ServiceContainerUtils {
    /**
     * Register all Semble core services
     */
    static registerCoreServices(container: ServiceContainer): void {
        // This will be called from the main node files to register all services
        // Services will be registered in dependency order
        
        // Core services (no dependencies)
        container.registerSingleton('config', () => ({}), []);
        container.registerSingleton('cache', () => ({}), ['config']);
        
        // API services
        container.registerSingleton('credentials', () => ({}), ['config']);
        container.registerSingleton('queryService', () => ({}), ['credentials', 'cache']);
        container.registerSingleton('fieldDiscovery', () => ({}), ['queryService', 'cache']);
        container.registerSingleton('permissionCheck', () => ({}), ['queryService', 'cache']);
        container.registerSingleton('validation', () => ({}), ['fieldDiscovery']);
        
        // Component services
        container.registerTransient('resourceSelector', () => ({}), ['fieldDiscovery', 'cache']);
        container.registerTransient('eventTrigger', () => ({}), []);
        container.registerTransient('eventAction', () => ({}), []);
        container.registerTransient('pollTime', () => ({}), []);
        container.registerSingleton('additionalFields', () => ({}), ['fieldDiscovery']);
    }

    /**
     * Create a service container with all Semble services registered
     */
    static createConfiguredContainer(): ServiceContainer {
        const container = new ServiceContainer();
        ServiceContainerUtils.registerCoreServices(container);
        return container;
    }
}
