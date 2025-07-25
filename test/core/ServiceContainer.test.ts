/**
 * @fileoverview Unit tests for ServiceContainer
 * @description Tests the dependency injection container functionality
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Core
 */

import { ServiceContainer, ServiceLifetime } from '../../core/ServiceContainer';

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe('Service Registration', () => {
    test('should register a transient service', () => {
      container.register('testService', () => ({ value: 'test' }));
      
      expect(container.isRegistered('testService')).toBe(true);
      
      const instance1 = container.resolve('testService');
      const instance2 = container.resolve('testService');
      
      expect(instance1).toEqual({ value: 'test' });
      expect(instance1).not.toBe(instance2); // Different instances
    });

    test('should register a singleton service', () => {
      container.registerSingleton('singletonService', () => ({ value: Math.random() }));
      
      const instance1 = container.resolve('singletonService');
      const instance2 = container.resolve('singletonService');
      
      expect(instance1).toBe(instance2); // Same instance
    });

    test('should register a scoped service', () => {
      container.registerScoped('scopedService', () => ({ value: Math.random() }));
      
      const scope1 = container.createScope('scope1');
      const scope2 = container.createScope('scope2');
      
      const instance1a = scope1.resolve('scopedService');
      const instance1b = scope1.resolve('scopedService');
      const instance2 = scope2.resolve('scopedService');
      
      expect(instance1a).toBe(instance1b); // Same within scope
      expect(instance1a).not.toBe(instance2); // Different across scopes
    });

    test('should throw error when registering duplicate service', () => {
      container.register('duplicateService', () => ({}));
      
      expect(() => {
        container.register('duplicateService', () => ({}));
      }).toThrow("Service 'duplicateService' is already registered");
    });
  });

  describe('Service Resolution', () => {
    test('should resolve service with dependencies', () => {
      container.register('dependency', () => ({ name: 'dep' }));
      container.register('service', (dep) => ({ dependency: dep }), ServiceLifetime.TRANSIENT, ['dependency']);
      
      const instance = container.resolve<any>('service');
      
      expect(instance.dependency).toEqual({ name: 'dep' });
    });

    test('should resolve nested dependencies', () => {
      container.register('deepDep', () => ({ level: 'deep' }));
      container.register('midDep', (deep) => ({ deep, level: 'mid' }), ServiceLifetime.TRANSIENT, ['deepDep']);
      container.register('topService', (mid) => ({ mid, level: 'top' }), ServiceLifetime.TRANSIENT, ['midDep']);
      
      const instance = container.resolve<any>('topService');
      
      expect(instance.level).toBe('top');
      expect(instance.mid.level).toBe('mid');
      expect(instance.mid.deep.level).toBe('deep');
    });

    test('should throw error for unregistered service', () => {
      expect(() => {
        container.resolve('nonexistentService');
      }).toThrow("Service 'nonexistentService' is not registered");
    });

    test('should detect circular dependencies', () => {
      container.register('serviceA', (b) => ({ b }), ServiceLifetime.TRANSIENT, ['serviceB']);
      container.register('serviceB', (a) => ({ a }), ServiceLifetime.TRANSIENT, ['serviceA']);
      
      expect(() => {
        container.resolve('serviceA');
      }).toThrow('Circular dependency detected');
    });

    test('should handle missing dependencies', () => {
      container.register('serviceWithMissingDep', (missing) => ({ missing }), ServiceLifetime.TRANSIENT, ['missingService']);
      
      expect(() => {
        container.resolve('serviceWithMissingDep');
      }).toThrow("Service 'missingService' is not registered");
    });
  });

  describe('Scoped Services', () => {
    test('should create independent scopes', () => {
      container.registerScoped('counter', () => {
        let count = 0;
        return { increment: () => ++count, value: () => count };
      });
      
      const scope1 = container.createScope('scope1');
      const scope2 = container.createScope('scope2');
      
      const counter1 = scope1.resolve<any>('counter');
      const counter2 = scope2.resolve<any>('counter');
      
      counter1.increment();
      counter1.increment();
      counter2.increment();
      
      expect(counter1.value()).toBe(2);
      expect(counter2.value()).toBe(1);
    });

    test('should maintain scoped instance within same scope', () => {
      container.registerScoped('scopedData', () => ({ id: Math.random() }));
      
      const scope = container.createScope('testScope');
      const instance1 = scope.resolve('scopedData');
      const instance2 = scope.resolve('scopedData');
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Container Management', () => {
    test('should clear all services', () => {
      container.register('service1', () => ({}));
      container.register('service2', () => ({}));
      
      expect(container.isRegistered('service1')).toBe(true);
      expect(container.isRegistered('service2')).toBe(true);
      
      container.clear();
      
      expect(container.isRegistered('service1')).toBe(false);
      expect(container.isRegistered('service2')).toBe(false);
    });

    test('should check service registration status', () => {
      expect(container.isRegistered('nonexistent')).toBe(false);
      
      container.register('existing', () => ({}));
      
      expect(container.isRegistered('existing')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle factory function errors', () => {
      container.register('errorService', () => {
        throw new Error('Factory error');
      });
      
      expect(() => {
        container.resolve('errorService');
      }).toThrow('Factory error');
    });

    test('should handle dependency resolution errors', () => {
      container.register('errorDep', () => {
        throw new Error('Dependency error');
      });
      container.register('serviceWithErrorDep', (dep) => ({ dep }), ServiceLifetime.TRANSIENT, ['errorDep']);
      
      expect(() => {
        container.resolve('serviceWithErrorDep');
      }).toThrow('Dependency error');
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle mixed service lifetimes', () => {
      // Singleton config service
      container.registerSingleton('config', () => ({ apiUrl: 'https://api.example.com' }));
      
      // Transient request service that depends on singleton config
      container.register('httpClient', (config) => ({ 
        config, 
        id: Math.random() 
      }), ServiceLifetime.TRANSIENT, ['config']);
      
      const client1 = container.resolve<any>('httpClient');
      const client2 = container.resolve<any>('httpClient');
      
      // Different instances
      expect(client1.id).not.toBe(client2.id);
      
      // Same config instance
      expect(client1.config).toBe(client2.config);
    });

    test('should handle deep dependency chains', () => {
      container.register('level1', () => ({ level: 1 }));
      container.register('level2', (l1) => ({ level: 2, prev: l1 }), ServiceLifetime.TRANSIENT, ['level1']);
      container.register('level3', (l2) => ({ level: 3, prev: l2 }), ServiceLifetime.TRANSIENT, ['level2']);
      container.register('level4', (l3) => ({ level: 4, prev: l3 }), ServiceLifetime.TRANSIENT, ['level3']);
      container.register('level5', (l4) => ({ level: 5, prev: l4 }), ServiceLifetime.TRANSIENT, ['level4']);
      
      const instance = container.resolve<any>('level5');
      
      expect(instance.level).toBe(5);
      expect(instance.prev.level).toBe(4);
      expect(instance.prev.prev.level).toBe(3);
      expect(instance.prev.prev.prev.level).toBe(2);
      expect(instance.prev.prev.prev.prev.level).toBe(1);
    });
  });
});
