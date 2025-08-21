/**
 * @fileoverview Tests for ResourceSelector component - field generation and type management
 * @description Test suite for the existing ResourceSelector component
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Components
 * @since 2024-12-23
 * 
 * This test suite validates the ResourceSelector component functionality including:
 * - Basic resource property generation
 * - Trigger and action mode configurations
 * - Custom configuration handling
 * - TypeScript type compatibility with n8n interfaces
 */

import { INodeProperties } from 'n8n-workflow';
import {
  ResourceSelector,
  ResourceSelectorConfig,
  ResourceDefinition
} from '../../components/ResourceSelector';

describe('ResourceSelector Component', () => {
  describe('Basic Component Generation', () => {
    test('should create default resource selector', () => {
      const property = ResourceSelector.create();
      
      expect(property).toBeDefined();
      expect(property.displayName).toBe('Resource');
      expect(property.name).toBe('resource');
      expect(property.type).toBe('options');
      expect(property.options).toHaveLength(3); // patient, booking, and product are enabled
      expect(property.default).toBe('patient');
    });

    test('should create resource selector with custom config', () => {
      const config: ResourceSelectorConfig = {
        displayName: 'Custom Resource',
        name: 'customResource',
        description: 'Custom description',
        default: 'booking'
      };

      const property = ResourceSelector.create(config);
      
      expect(property.displayName).toBe('Custom Resource');
      expect(property.name).toBe('customResource');
      expect(property.description).toBe('Custom description');
      expect(property.default).toBe('booking');
    });

    test('should filter resources by include list', () => {
      const config: ResourceSelectorConfig = {
        includeResources: ['patient']
      };

      const property = ResourceSelector.create(config);
      
      expect(property.options).toHaveLength(1);
      // Type assertion for testing - we know this is INodePropertyOptions[]
      const options = property.options as Array<{ name: string; value: string; description: string }>;
      expect(options[0].value).toBe('patient');
    });

    test('should filter resources by exclude list', () => {
      const config: ResourceSelectorConfig = {
        excludeResources: ['booking']
      };

      const property = ResourceSelector.create(config);
      
      expect(property.options).toHaveLength(2); // patient and product remain
      // Type assertion for testing - we know this is INodePropertyOptions[]
      const options = property.options as Array<{ name: string; value: string; description: string }>;
      expect(options.map(opt => opt.value)).toContain('patient');
      expect(options.map(opt => opt.value)).toContain('product');
      expect(options.map(opt => opt.value)).not.toContain('booking');
    });
  });

  describe('Factory Methods', () => {
    test('should create trigger-specific resource selector', () => {
      const property = ResourceSelector.createForTrigger();
      
      expect(property.displayName).toBe('Resource');
      expect(property.description).toContain('monitor');
      expect(property.options).toHaveLength(2); // Patient and product triggers implemented
      // Type assertion for testing - we know this is INodePropertyOptions[]
      const options = property.options as Array<{ name: string; value: string; description: string }>;
      expect(options.map(opt => opt.value)).toContain('patient');
      expect(options.map(opt => opt.value)).toContain('product');
    });

    test('should create action-specific resource selector', () => {
      const property = ResourceSelector.createForAction();
      
      expect(property.displayName).toBe('Resource');
      expect(property.description).toContain('perform actions');
      expect(property.options).toHaveLength(3); // patient, booking, and product actions implemented
    });
  });

  describe('Resource Management', () => {
    test('should get all resource types', () => {
      const types = ResourceSelector.getAllResourceTypes();
      
      expect(types).toContain('patient');
      expect(types).toContain('booking');
      expect(types).toContain('doctor');
      expect(types).toContain('location');
    });

    test('should get enabled resource types only', () => {
      const types = ResourceSelector.getEnabledResourceTypes();
      
      expect(types).toContain('patient');
      expect(types).toContain('booking');
      expect(types).toContain('product');
      expect(types).not.toContain('doctor'); // disabled by default
    });

    test('should check resource enabled status', () => {
      expect(ResourceSelector.isResourceEnabled('patient')).toBe(true);
      expect(ResourceSelector.isResourceEnabled('booking')).toBe(true);
      expect(ResourceSelector.isResourceEnabled('product')).toBe(true);
      expect(ResourceSelector.isResourceEnabled('doctor')).toBe(false);
    });

    test('should get resource definition', () => {
      const definition = ResourceSelector.getResourceDefinition('patient');
      
      expect(definition).toBeDefined();
      expect(definition?.name).toBe('Patient');
      expect(definition?.value).toBe('patient');
      expect(definition?.isEnabled).toBe(true);
    });

    test('should update resource status', () => {
      ResourceSelector.updateResourceStatus('doctor', true);
      expect(ResourceSelector.isResourceEnabled('doctor')).toBe(true);
      
      // Reset for other tests
      ResourceSelector.updateResourceStatus('doctor', false);
    });
  });

  describe('Permission-based Filtering', () => {
    test('should get resources by permissions', () => {
      const resources = ResourceSelector.getResourcesByPermissions(['patients:read']);
      
      expect(resources).toHaveLength(1);
      expect(resources[0].value).toBe('patient');
    });
  });
});
