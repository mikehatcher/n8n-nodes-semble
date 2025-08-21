/**
 * @fileoverview Component Integration Test
 * @description Integration test to validate that all UI components can be imported and instantiated correctly
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Components
 */

import { INodeProperties } from 'n8n-workflow';

describe('Component Integration', () => {
  test('should successfully import and instantiate ResourceSelector', async () => {
    const { ResourceSelector } = await import('../../components/ResourceSelector');
    
    expect(ResourceSelector).toBeDefined();
    expect(typeof ResourceSelector.create).toBe('function');
    
    const property = ResourceSelector.create();
    expect(property).toBeDefined();
    expect(property.name).toBeDefined();
    expect(property.type).toBeDefined();
  });

  test('should successfully import and instantiate EventTriggerSelector', async () => {
    const { EventTriggerSelector } = await import('../../components/EventTriggerSelector');
    
    expect(EventTriggerSelector).toBeDefined();
    expect(typeof EventTriggerSelector.generateProperty).toBe('function');
    
    const property = EventTriggerSelector.generateProperty();
    expect(property).toBeDefined();
    expect(property.name).toBeDefined();
    expect(property.type).toBeDefined();
  });

  test('should successfully import and instantiate EventActionSelector', async () => {
    const { EventActionSelector } = await import('../../components/EventActionSelector');
    
    expect(EventActionSelector).toBeDefined();
    expect(typeof EventActionSelector.generateProperty).toBe('function');
    
    const property = EventActionSelector.generateProperty();
    expect(property).toBeDefined();
    expect(property.name).toBeDefined();
    expect(property.type).toBeDefined();
  });

  test('should successfully import and instantiate PollTimeSelector', async () => {
    const { PollTimeSelector } = await import('../../components/PollTimeSelector');
    
    expect(PollTimeSelector).toBeDefined();
    expect(typeof PollTimeSelector.generatePollIntervalProperty).toBe('function');
    expect(typeof PollTimeSelector.generateDatePeriodProperty).toBe('function');
    
    const pollProperty = PollTimeSelector.generatePollIntervalProperty();
    expect(pollProperty).toBeDefined();
    expect(pollProperty.name).toBeDefined();
    expect(pollProperty.type).toBeDefined();
    
    const dateProperty = PollTimeSelector.generateDatePeriodProperty();
    expect(dateProperty).toBeDefined();
    expect(dateProperty.name).toBeDefined();
    expect(dateProperty.type).toBeDefined();
  });

  test('should validate component index exports', async () => {
    const componentIndex = await import('../../components/index');
    
    expect(componentIndex.ResourceSelector).toBeDefined();
    expect(componentIndex.EventTriggerSelector).toBeDefined();
    expect(componentIndex.EventActionSelector).toBeDefined();
    expect(componentIndex.PollTimeSelector).toBeDefined();
  });

  test('should validate enums are properly exported', async () => {
    const { EventTriggerType } = await import('../../components/EventTriggerSelector');
    const { EventActionType } = await import('../../components/EventActionSelector');
    const { PollIntervalType, DatePeriodType } = await import('../../components/PollTimeSelector');
    
    expect(EventTriggerType).toBeDefined();
    expect(EventTriggerType.NEW_ONLY).toBeDefined();
    expect(EventTriggerType.NEW_OR_UPDATED).toBeDefined();
    
    expect(EventActionType).toBeDefined();
    expect(EventActionType.CREATE).toBeDefined();
    expect(EventActionType.GET).toBeDefined();
    expect(EventActionType.GET_MANY).toBeDefined();
    expect(EventActionType.UPDATE).toBeDefined();
    expect(EventActionType.DELETE).toBeDefined();
    
    expect(PollIntervalType).toBeDefined();
    expect(PollIntervalType.MINUTES_1).toBeDefined();
    expect(PollIntervalType.MINUTES_5).toBeDefined();
    
    expect(DatePeriodType).toBeDefined();
    expect(DatePeriodType.DAY_1).toBeDefined();
    expect(DatePeriodType.WEEK_1).toBeDefined();
  });
});
