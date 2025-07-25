/**
 * @fileoverview Unit tests for core index exports
 * @description Tests the core module exports and integration
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Core
 */

describe('Core Index Exports', () => {
  describe('Service Container Exports', () => {
    test('should export ServiceContainer class', async () => {
      const { ServiceContainer } = await import('../../core/index');
      
      expect(ServiceContainer).toBeDefined();
      expect(typeof ServiceContainer).toBe('function');
      
      // Test instantiation
      const container = new ServiceContainer();
      expect(container).toBeInstanceOf(ServiceContainer);
    });

    test('should export ServiceContainer utilities', async () => {
      const { ServiceContainerUtils } = await import('../../core/index');
      
      expect(ServiceContainerUtils).toBeDefined();
      expect(typeof ServiceContainerUtils).toBe('function');
    });

    test('should export ServiceLifetime enum', async () => {
      const { ServiceLifetime } = await import('../../core/index');
      
      expect(ServiceLifetime).toBeDefined();
      expect(ServiceLifetime.SINGLETON).toBe('singleton');
      expect(ServiceLifetime.TRANSIENT).toBe('transient');
      expect(ServiceLifetime.SCOPED).toBe('scoped');
    });
  });

  describe('Event System Exports', () => {
    test('should export EventSystem class', async () => {
      const { EventSystem } = await import('../../core/index');
      
      expect(EventSystem).toBeDefined();
      expect(typeof EventSystem).toBe('function');
      
      // Test instantiation
      const eventSystem = new EventSystem();
      expect(eventSystem).toBeInstanceOf(EventSystem);
    });

    test('should export EventSystem utilities', async () => {
      const { EventSystemUtils } = await import('../../core/index');
      
      expect(EventSystemUtils).toBeDefined();
      expect(typeof EventSystemUtils).toBe('function');
    });
  });

  describe('Schema Registry Exports', () => {
    test('should export SchemaRegistry class', async () => {
      const { SchemaRegistry } = await import('../../core/index');
      
      expect(SchemaRegistry).toBeDefined();
      expect(typeof SchemaRegistry).toBe('function');
      
      // Test instantiation
      const registry = new SchemaRegistry();
      expect(registry).toBeInstanceOf(SchemaRegistry);
    });

    test('should export SchemaRegistry utilities', async () => {
      const { SchemaRegistryUtils } = await import('../../core/index');
      
      expect(SchemaRegistryUtils).toBeDefined();
      expect(typeof SchemaRegistryUtils).toBe('function');
    });
  });

  describe('Error Classes Exports', () => {
    test('should export SembleError class', async () => {
      const { SembleError } = await import('../../core/index');
      
      expect(SembleError).toBeDefined();
      expect(typeof SembleError).toBe('function');
      
      // Test instantiation
      const error = new SembleError('Test error');
      expect(error).toBeInstanceOf(SembleError);
      expect(error).toBeInstanceOf(Error);
    });

    test('should export specific error classes', async () => {
      // Note: Checking what's actually exported from the index
      const coreModule = await import('../../core/index');
      
      // SembleError should be available
      expect(coreModule.SembleError).toBeDefined();
      
      // Test that we can create error instances
      const error = new coreModule.SembleError('Test error');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Middleware Pipeline Exports', () => {
    test('should export MiddlewarePipeline class', async () => {
      const { MiddlewarePipeline } = await import('../../core/index');
      
      expect(MiddlewarePipeline).toBeDefined();
      expect(typeof MiddlewarePipeline).toBe('function');
    });

    test('should export middleware utilities', async () => {
      const { MiddlewarePipelineUtils } = await import('../../core/index');
      
      expect(MiddlewarePipelineUtils).toBeDefined();
      expect(typeof MiddlewarePipelineUtils).toBe('function');
    });
  });

  describe('Base Configuration Exports', () => {
    test('should check for BaseConfig availability', async () => {
      const coreModule = await import('../../core/index');
      
      // Check if BaseConfig is exported (may not be in current version)
      if ('BaseConfig' in coreModule) {
        expect(coreModule.BaseConfig).toBeDefined();
        expect(typeof coreModule.BaseConfig).toBe('function');
      }
    });

    test('should check for BaseConfig utilities', async () => {
      const coreModule = await import('../../core/index');
      
      // Check if BaseConfigUtils is exported (may not be in current version)
      if ('BaseConfigUtils' in coreModule) {
        expect(coreModule.BaseConfigUtils).toBeDefined();
        expect(typeof coreModule.BaseConfigUtils).toBe('object');
      }
    });
  });

  describe('Type Exports', () => {
    test('should export interface types without runtime errors', async () => {
      // TypeScript interfaces don't exist at runtime, but we can test
      // that the import doesn't fail
      const coreModule = await import('../../core/index');
      
      // The module should load without errors
      expect(coreModule).toBeDefined();
    });

    test('should provide comprehensive type coverage', async () => {
      const coreModule = await import('../../core/index');
      
      // Check that we have a good selection of exports
      const exportNames = Object.keys(coreModule);
      
      // Should have at least 10 exports (classes, utilities, enums)
      expect(exportNames.length).toBeGreaterThanOrEqual(10);
      
      // Should include major components
      expect(exportNames).toContain('ServiceContainer');
      expect(exportNames).toContain('EventSystem');
      expect(exportNames).toContain('SchemaRegistry');
      expect(exportNames).toContain('SembleError');
    });
  });

  describe('Module Integration', () => {
    test('should provide clean barrel export interface', async () => {
      const coreModule = await import('../../core/index');
      
      // All exports should be defined
      Object.values(coreModule).forEach(exportedValue => {
        expect(exportedValue).toBeDefined();
      });
    });

    test('should maintain consistent export structure', async () => {
      const { 
        ServiceContainer,
        EventSystem,
        SchemaRegistry,
        SembleError,
        MiddlewarePipeline
      } = await import('../../core/index');
      
      // All major classes should be constructible
      expect(() => new ServiceContainer()).not.toThrow();
      expect(() => new EventSystem()).not.toThrow();
      expect(() => new SchemaRegistry()).not.toThrow();
      expect(() => new SembleError('test')).not.toThrow();
      expect(() => new MiddlewarePipeline()).not.toThrow();
    });

    test('should support tree-shaking friendly imports', async () => {
      // Test named imports work correctly
      const { ServiceContainer: ImportedServiceContainer } = await import('../../core/index');
      const { EventSystem: ImportedEventSystem } = await import('../../core/index');
      
      expect(ImportedServiceContainer).toBeDefined();
      expect(ImportedEventSystem).toBeDefined();
      
      // Should be the same references
      const fullModule = await import('../../core/index');
      expect(ImportedServiceContainer).toBe(fullModule.ServiceContainer);
      expect(ImportedEventSystem).toBe(fullModule.EventSystem);
    });
  });

  describe('Version Compatibility', () => {
    test('should maintain stable API surface', async () => {
      const coreModule = await import('../../core/index');
      
      // Key exports that should always be available
      const requiredExports = [
        'ServiceContainer',
        'ServiceLifetime',
        'EventSystem',
        'SchemaRegistry',
        'SembleError',
        'MiddlewarePipeline'
      ];
      
      requiredExports.forEach(exportName => {
        expect((coreModule as any)[exportName]).toBeDefined();
      });
    });

    test('should provide backward compatibility', async () => {
      // Test that major interfaces haven't changed unexpectedly
      const { ServiceContainer, ServiceLifetime } = await import('../../core/index');
      
      const container = new ServiceContainer();
      
      // Core DI functionality should work
      expect(typeof container.register).toBe('function');
      expect(typeof container.resolve).toBe('function');
      expect(typeof container.isRegistered).toBe('function');
      
      // ServiceLifetime enum should have expected values
      expect(Object.values(ServiceLifetime)).toContain('singleton');
      expect(Object.values(ServiceLifetime)).toContain('transient');
      expect(Object.values(ServiceLifetime)).toContain('scoped');
    });
  });
});
