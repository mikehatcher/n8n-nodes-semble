/**
 * @fileoverview Component exports for Phase 3 UI Components
 * @description Central export point for all n8n UI components
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Components
 */

// Resource Selector
export {
  ResourceSelector,
  ResourceSelectorConfig,
  ResourceDefinition
} from './ResourceSelector';

// Event Trigger Selector
export {
  EventTriggerSelector,
  EventTriggerType,
  EventTriggerSelectorConfig,
  EventTriggerDefinition,
  EventTriggerSelectorFactory
} from './EventTriggerSelector';

// Event Action Selector
export {
  EventActionSelector,
  EventActionType,
  EventActionSelectorConfig,
  EventActionDefinition,
  EventActionSelectorFactory
} from './EventActionSelector';

// Poll Time Selector
export {
  PollTimeSelector,
  PollIntervalType,
  DatePeriodType,
  PollTimeSelectorConfig,
  DatePeriodSelectorConfig,
  PollIntervalDefinition,
  DatePeriodDefinition,
  PollTimeSelectorFactory
} from './PollTimeSelector';

// Additional Fields Registry
export {
  AdditionalFieldsRegistry,
  RegisteredFieldDefinition,
  FieldRegistryOptions,
  FieldRegistrationResult,
  defaultFieldsRegistry,
  registerField,
  getAdditionalFields
} from './AdditionalFieldsRegistry';

// Record Limit Field
export {
  RecordLimitField,
  RecordLimitConfig,
  RecordLimitValidation,
  defaultRecordLimit,
  createLimitField,
  validateRecordLimit,
  processLimitForApi
} from './RecordLimitField';
