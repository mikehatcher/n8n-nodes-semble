/**
 * @fileoverview Simple Component Tests for UI Components
 * @description Focused tests for component functionality without complex type assertions
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Components
 */

import { INodeProperties } from 'n8n-workflow';

// Import components
import {
  ResourceSelector,
  ResourceSelectorConfig,
} from '../../components/ResourceSelector';

import {
  EventTriggerSelector,
  EventTriggerType,
} from '../../components/EventTriggerSelector';

import {
  EventActionSelector,
  EventActionType,
} from '../../components/EventActionSelector';

import {
  PollTimeSelector,
  PollIntervalType,
  DatePeriodType,
} from '../../components/PollTimeSelector';

describe('UI Components - Simplified Tests', () => {
  
  describe('ResourceSelector', () => {
    test('should create basic resource selector', () => {
      const property = ResourceSelector.create();
      
      expect(property).toBeDefined();
      expect(property.displayName).toBe('Resource');
      expect(property.name).toBe('resource');
      expect(property.type).toBe('options');
      expect(Array.isArray(property.options)).toBe(true);
    });

    test('should create trigger-specific resource selector', () => {
      const property = ResourceSelector.createForTrigger();
      
      expect(property).toBeDefined();
      expect(property.displayName).toBe('Resource');
      expect(property.description).toContain('monitor');
    });

    test('should create action-specific resource selector', () => {
      const property = ResourceSelector.createForAction();
      
      expect(property).toBeDefined();
      expect(property.displayName).toBe('Resource');
      expect(property.description).toContain('perform actions on');
    });

    test('should accept configuration', () => {
      const config: ResourceSelectorConfig = {
        displayName: 'Custom Resource',
        description: 'Custom description'
      };
      
      const property = ResourceSelector.create(config);
      
      expect(property.displayName).toBe('Custom Resource');
      expect(property.description).toBe('Custom description');
    });
  });

  describe('EventTriggerSelector', () => {
    test('should create basic event trigger selector', () => {
      const property = EventTriggerSelector.generateProperty();
      
      expect(property).toBeDefined();
      expect(property.displayName).toBe('Event');
      expect(property.name).toBe('event');
      expect(property.type).toBe('options');
      expect(property.default).toBe(EventTriggerType.NEW_OR_UPDATED);
    });

    test('should accept custom configuration', () => {
      const property = EventTriggerSelector.generateProperty({
        displayName: 'Custom Trigger',
        description: 'Custom trigger description'
      });
      
      expect(property.displayName).toBe('Custom Trigger');
      expect(property.description).toBe('Custom trigger description');
    });
  });

  describe('EventActionSelector', () => {
    test('should create basic event action selector', () => {
      const property = EventActionSelector.generateProperty();
      
      expect(property).toBeDefined();
      expect(property.displayName).toBe('Action');
      expect(property.name).toBe('action');
      expect(property.type).toBe('options');
      expect(property.default).toBe(EventActionType.GET);
    });

    test('should accept custom configuration', () => {
      const property = EventActionSelector.generateProperty({
        displayName: 'Custom Action',
        includeActions: [EventActionType.GET, EventActionType.CREATE]
      });
      
      expect(property.displayName).toBe('Custom Action');
      expect(Array.isArray(property.options)).toBe(true);
    });
  });

  describe('PollTimeSelector', () => {
    test('should create poll interval property', () => {
      const property = PollTimeSelector.generatePollIntervalProperty();
      
      expect(property).toBeDefined();
      expect(property.displayName).toBe('Poll Interval');
      expect(property.name).toBe('pollInterval');
      expect(property.type).toBe('options');
      expect(property.default).toBe(PollIntervalType.MINUTES_15);
    });

    test('should create date period property', () => {
      const property = PollTimeSelector.generateDatePeriodProperty();
      
      expect(property).toBeDefined();
      expect(property.displayName).toBe('Created/Updated Date');
      expect(property.name).toBe('datePeriod');
      expect(property.type).toBe('options');
      expect(property.default).toBe(DatePeriodType.MONTH_1);
    });

    test('should accept custom configuration for poll interval', () => {
      const property = PollTimeSelector.generatePollIntervalProperty({
        displayName: 'Custom Interval',
        description: 'Custom description',
        allowCustom: false
      });
      
      expect(property.displayName).toBe('Custom Interval');
      expect(property.description).toBe('Custom description');
    });

    test('should accept custom configuration for date period', () => {
      const property = PollTimeSelector.generateDatePeriodProperty({
        displayName: 'Custom Period',
        description: 'Custom period description'
      });
      
      expect(property.displayName).toBe('Custom Period');
      expect(property.description).toBe('Custom period description');
    });
  });

  describe('Component Integration', () => {
    test('should verify all components are properly exported', () => {
      // Test that all components can be instantiated
      expect(typeof ResourceSelector.create).toBe('function');
      expect(typeof EventTriggerSelector.generateProperty).toBe('function');
      expect(typeof EventActionSelector.generateProperty).toBe('function');
      expect(typeof PollTimeSelector.generatePollIntervalProperty).toBe('function');
      expect(typeof PollTimeSelector.generateDatePeriodProperty).toBe('function');
    });

    test('should verify all enums are properly exported', () => {
      // Test enum availability
      expect(EventTriggerType.NEW_ONLY).toBeDefined();
      expect(EventTriggerType.NEW_OR_UPDATED).toBeDefined();
      
      expect(EventActionType.CREATE).toBeDefined();
      expect(EventActionType.GET).toBeDefined();
      expect(EventActionType.UPDATE).toBeDefined();
      expect(EventActionType.DELETE).toBeDefined();
      expect(EventActionType.GET_MANY).toBeDefined();
      
      expect(PollIntervalType.MINUTES_1).toBeDefined();
      expect(PollIntervalType.MINUTES_5).toBeDefined();
      
      expect(DatePeriodType.DAY_1).toBeDefined();
      expect(DatePeriodType.WEEK_1).toBeDefined();
    });

    test('should produce valid n8n node properties', () => {
      // Test that all generated properties have required n8n fields
      const resourceProp = ResourceSelector.create();
      const triggerProp = EventTriggerSelector.generateProperty();
      const actionProp = EventActionSelector.generateProperty();
      const pollProp = PollTimeSelector.generatePollIntervalProperty();
      const dateProp = PollTimeSelector.generateDatePeriodProperty();

      const properties = [resourceProp, triggerProp, actionProp, pollProp, dateProp];

      properties.forEach(prop => {
        expect(prop.displayName).toBeDefined();
        expect(prop.name).toBeDefined();
        expect(prop.type).toBeDefined();
      });
    });
  });
});
