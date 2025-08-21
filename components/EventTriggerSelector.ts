/**
 * @fileoverview Event Trigger Selector component for n8n node properties
 * @description Provides "New"/"New and Updated" event selection for trigger nodes
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Components
 */

import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

/**
 * Event trigger types available for monitoring
 * @enum EventTriggerType
 */
export enum EventTriggerType {
  NEW_ONLY = 'newOnly',
  NEW_OR_UPDATED = 'newOrUpdated',
}

/**
 * Configuration for event trigger selector
 * @interface EventTriggerSelectorConfig
 */
export interface EventTriggerSelectorConfig {
  name?: string;
  displayName?: string;
  description?: string;
  default?: EventTriggerType;
  displayOptions?: {
    show?: { [key: string]: string[] };
    hide?: { [key: string]: string[] };
  };
  includeEvents?: EventTriggerType[];
  excludeEvents?: EventTriggerType[];
}

/**
 * Event trigger definition
 * @interface EventTriggerDefinition
 */
export interface EventTriggerDefinition {
  name: string;
  value: EventTriggerType;
  description: string;
  isEnabled: boolean;
  filterStrategy: string;
}

/**
 * Event Trigger Selector component class
 * @class EventTriggerSelector
 * @description Generates event trigger selection UI for trigger nodes
 */
export class EventTriggerSelector {
  /**
   * Available event trigger definitions
   */
  private static readonly EVENT_TRIGGERS: EventTriggerDefinition[] = [
    {
      name: 'New Only',
      value: EventTriggerType.NEW_ONLY,
      description: 'Trigger only on newly created items',
      isEnabled: true,
      filterStrategy: 'creation_date'
    },
    {
      name: 'New or Updated',
      value: EventTriggerType.NEW_OR_UPDATED,
      description: 'Trigger on new items or updates to existing items',
      isEnabled: true,
      filterStrategy: 'modification_date'
    }
  ];

  /**
   * Default configuration for event trigger selector
   */
  private static readonly DEFAULT_CONFIG: Required<EventTriggerSelectorConfig> = {
    name: 'event',
    displayName: 'Event',
    description: 'What changes should trigger the workflow',
    default: EventTriggerType.NEW_OR_UPDATED,
    displayOptions: {},
    includeEvents: [],
    excludeEvents: []
  };

  /**
   * Create event trigger selector property for n8n nodes
   * @static
   * @param {EventTriggerSelectorConfig} config - Configuration options
   * @returns {INodeProperties} Generated event trigger selector property
   */
  static generateProperty(config: EventTriggerSelectorConfig = {}): INodeProperties {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    return {
      displayName: finalConfig.displayName,
      name: finalConfig.name,
      type: 'options',
      noDataExpression: true,
      options: this.getFilteredEventTriggers(finalConfig),
      default: finalConfig.default,
      description: finalConfig.description,
      ...(finalConfig.displayOptions && Object.keys(finalConfig.displayOptions).length > 0 && {
        displayOptions: finalConfig.displayOptions
      })
    };
  }

  /**
   * Get filtered event trigger options
   * @static
   * @param {Required<EventTriggerSelectorConfig>} config - Filter configuration
   * @returns {INodePropertyOptions[]} Filtered event trigger options
   */
  private static getFilteredEventTriggers(
    config: Required<EventTriggerSelectorConfig>
  ): INodePropertyOptions[] {
    let triggers = this.EVENT_TRIGGERS.filter(trigger => trigger.isEnabled);

    // Apply include filter
    if (config.includeEvents.length > 0) {
      triggers = triggers.filter(trigger =>
        config.includeEvents.includes(trigger.value)
      );
    }

    // Apply exclude filter
    if (config.excludeEvents.length > 0) {
      triggers = triggers.filter(trigger =>
        !config.excludeEvents.includes(trigger.value)
      );
    }

    return triggers.map(trigger => ({
      name: trigger.name,
      value: trigger.value,
      description: trigger.description
    }));
  }

  /**
   * Get event trigger definition by type
   * @static
   * @param {EventTriggerType} eventType - Event type to lookup
   * @returns {EventTriggerDefinition | undefined} Event trigger definition
   */
  static getEventTriggerDefinition(eventType: EventTriggerType): EventTriggerDefinition | undefined {
    return this.EVENT_TRIGGERS.find(trigger => trigger.value === eventType);
  }

  /**
   * Get filter strategy for event trigger type
   * @static
   * @param {EventTriggerType} eventType - Event type to get strategy for
   * @returns {string} Filter strategy name
   */
  static getFilterStrategy(eventType: EventTriggerType): string {
    const definition = this.getEventTriggerDefinition(eventType);
    return definition?.filterStrategy || 'modification_date';
  }

  /**
   * Check if event trigger monitors creation only
   * @static
   * @param {EventTriggerType} eventType - Event type to check
   * @returns {boolean} True if monitors creation only
   */
  static isCreationOnly(eventType: EventTriggerType): boolean {
    return eventType === EventTriggerType.NEW_ONLY;
  }

  /**
   * Check if event trigger monitors updates
   * @static
   * @param {EventTriggerType} eventType - Event type to check
   * @returns {boolean} True if monitors updates
   */
  static monitorsUpdates(eventType: EventTriggerType): boolean {
    return eventType === EventTriggerType.NEW_OR_UPDATED;
  }

  /**
   * Generate conditional display options for event-specific properties
   * @static
   * @param {EventTriggerType} eventType - Event type to show properties for
   * @param {string[]} resources - Resources to show properties for (optional)
   * @returns {object} Display options object
   */
  static generateDisplayOptions(
    eventType: EventTriggerType,
    resources?: string[]
  ): { show: { [key: string]: string[] } } {
    const displayOptions: { show: { [key: string]: string[] } } = {
      show: {
        event: [eventType]
      }
    };

    if (resources && resources.length > 0) {
      displayOptions.show.resource = resources;
    }

    return displayOptions;
  }

  /**
   * Validate event trigger type
   * @static
   * @param {string} eventType - Event type to validate
   * @throws {Error} If event type is invalid
   */
  static validateEventType(eventType: string): void {
    const validTypes = Object.values(EventTriggerType);
    if (!validTypes.includes(eventType as EventTriggerType)) {
      throw new Error(`Invalid event trigger type: ${eventType}. Valid types: ${validTypes.join(', ')}`);
    }
  }
}

/**
 * Event trigger selector factory for common use cases
 * @class EventTriggerSelectorFactory
 * @description Provides pre-configured event trigger selectors for common scenarios
 */
export class EventTriggerSelectorFactory {
  /**
   * Generate event trigger selector for patient monitoring
   * @static
   * @returns {INodeProperties} Patient event trigger selector
   */
  static forPatientTrigger(): INodeProperties {
    return EventTriggerSelector.generateProperty({
      displayOptions: {
        show: {
          resource: ['patient']
        }
      }
    });
  }

  /**
   * Generate event trigger selector for booking monitoring
   * @static
   * @returns {INodeProperties} Booking event trigger selector
   */
  static forBookingTrigger(): INodeProperties {
    return EventTriggerSelector.generateProperty({
      displayOptions: {
        show: {
          resource: ['booking']
        }
      }
    });
  }

  /**
   * Generate event trigger selector with new-only focus
   * @static
   * @returns {INodeProperties} New-only event trigger selector
   */
  static forNewRecordsOnly(): INodeProperties {
    return EventTriggerSelector.generateProperty({
      includeEvents: [EventTriggerType.NEW_ONLY],
      default: EventTriggerType.NEW_ONLY
    });
  }

  /**
   * Generate event trigger selector with updates focus
   * @static
   * @returns {INodeProperties} Updates-focused event trigger selector
   */
  static forUpdatesMonitoring(): INodeProperties {
    return EventTriggerSelector.generateProperty({
      includeEvents: [EventTriggerType.NEW_OR_UPDATED],
      default: EventTriggerType.NEW_OR_UPDATED
    });
  }
}
