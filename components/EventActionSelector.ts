/**
 * @fileoverview Event Action Selector component for n8n node properties
 * @description Provides CRUD operation selector (Create, Get, Get Many, Update, Delete)
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Components
 */

import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

/**
 * Available CRUD action types
 * @enum EventActionType
 */
export enum EventActionType {
  CREATE = 'create',
  GET = 'get',
  GET_MANY = 'getMany',
  UPDATE = 'update',
  DELETE = 'delete'
}

/**
 * Configuration for event action selector
 * @interface EventActionSelectorConfig
 */
export interface EventActionSelectorConfig {
  name?: string;
  displayName?: string;
  description?: string;
  default?: EventActionType;
  displayOptions?: {
    show?: { [key: string]: string[] };
    hide?: { [key: string]: string[] };
  };
  includeActions?: EventActionType[];
  excludeActions?: EventActionType[];
  resourceSpecific?: {
    [resource: string]: EventActionType[];
  };
}

/**
 * Action definition with metadata
 * @interface EventActionDefinition
 */
export interface EventActionDefinition {
  name: string;
  value: EventActionType;
  description: string;
  actionDescription: string;
  isEnabled: boolean;
  requiresId: boolean;
  returnsMultiple: boolean;
  supportedResources: string[];
}

/**
 * Event Action Selector component class
 * @class EventActionSelector
 * @description Generates CRUD operation selection UI for action nodes
 */
export class EventActionSelector {
  /**
   * Available action definitions
   */
  private static readonly ACTION_DEFINITIONS: EventActionDefinition[] = [
    {
      name: 'Create',
      value: EventActionType.CREATE,
      description: 'Create new records in Semble',
      actionDescription: 'Create new records in semble',
      isEnabled: true,
      requiresId: false,
      returnsMultiple: false,
      supportedResources: ['patient', 'booking']
    },
    {
      name: 'Get',
      value: EventActionType.GET,
      description: 'Retrieve a single record from Semble',
      actionDescription: 'Get a single record from semble',
      isEnabled: true,
      requiresId: true,
      returnsMultiple: false,
      supportedResources: ['patient', 'booking']
    },
    {
      name: 'Get Many',
      value: EventActionType.GET_MANY,
      description: 'Retrieve multiple records from Semble',
      actionDescription: 'Get multiple records from semble',
      isEnabled: true,
      requiresId: false,
      returnsMultiple: true,
      supportedResources: ['patient', 'booking']
    },
    {
      name: 'Update',
      value: EventActionType.UPDATE,
      description: 'Update existing records in Semble',
      actionDescription: 'Update existing records in semble',
      isEnabled: true,
      requiresId: true,
      returnsMultiple: false,
      supportedResources: ['patient', 'booking']
    },
    {
      name: 'Delete',
      value: EventActionType.DELETE,
      description: 'Delete records from Semble',
      actionDescription: 'Delete records from semble',
      isEnabled: true,
      requiresId: true,
      returnsMultiple: false,
      supportedResources: ['patient', 'booking']
    }
  ];

  /**
   * Default configuration for event action selector
   */
  private static readonly DEFAULT_CONFIG: Required<EventActionSelectorConfig> = {
    name: 'action',
    displayName: 'Action',
    description: 'The action you want to perform',
    default: EventActionType.GET,
    displayOptions: {},
    includeActions: [],
    excludeActions: [],
    resourceSpecific: {}
  };

  /**
   * Create event action selector property for n8n nodes
   * @static
   * @param {EventActionSelectorConfig} config - Configuration options
   * @returns {INodeProperties} Generated event action selector property
   */
  static generateProperty(config: EventActionSelectorConfig = {}): INodeProperties {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    return {
      displayName: finalConfig.displayName,
      name: finalConfig.name,
      type: 'options',
      noDataExpression: true,
      options: this.getFilteredActions(finalConfig),
      default: finalConfig.default,
      description: finalConfig.description,
      ...(finalConfig.displayOptions && Object.keys(finalConfig.displayOptions).length > 0 && {
        displayOptions: finalConfig.displayOptions
      })
    };
  }

  /**
   * Get filtered action options
   * @static
   * @param {Required<EventActionSelectorConfig>} config - Filter configuration
   * @returns {INodePropertyOptions[]} Filtered action options
   */
  private static getFilteredActions(
    config: Required<EventActionSelectorConfig>
  ): INodePropertyOptions[] {
    let actions = this.ACTION_DEFINITIONS.filter(action => action.isEnabled);

    // Apply include filter
    if (config.includeActions.length > 0) {
      actions = actions.filter(action =>
        config.includeActions.includes(action.value)
      );
    }

    // Apply exclude filter
    if (config.excludeActions.length > 0) {
      actions = actions.filter(action =>
        !config.excludeActions.includes(action.value)
      );
    }

    return actions.map(action => ({
      name: action.name,
      value: action.value,
      description: action.description,
      action: action.actionDescription
    }));
  }

  /**
   * Get action definition by type
   * @static
   * @param {EventActionType} actionType - Action type to lookup
   * @returns {EventActionDefinition | undefined} Action definition
   */
  static getActionDefinition(actionType: EventActionType): EventActionDefinition | undefined {
    return this.ACTION_DEFINITIONS.find(action => action.value === actionType);
  }

  /**
   * Check if action requires an ID parameter
   * @static
   * @param {EventActionType} actionType - Action type to check
   * @returns {boolean} True if action requires ID
   */
  static requiresId(actionType: EventActionType): boolean {
    const definition = this.getActionDefinition(actionType);
    return definition?.requiresId || false;
  }

  /**
   * Check if action returns multiple records
   * @static
   * @param {EventActionType} actionType - Action type to check
   * @returns {boolean} True if action returns multiple records
   */
  static returnsMultiple(actionType: EventActionType): boolean {
    const definition = this.getActionDefinition(actionType);
    return definition?.returnsMultiple || false;
  }

  /**
   * Get supported resources for action
   * @static
   * @param {EventActionType} actionType - Action type to check
   * @returns {string[]} Array of supported resource names
   */
  static getSupportedResources(actionType: EventActionType): string[] {
    const definition = this.getActionDefinition(actionType);
    return definition?.supportedResources || [];
  }

  /**
   * Check if action supports specific resource
   * @static
   * @param {EventActionType} actionType - Action type to check
   * @param {string} resource - Resource to check support for
   * @returns {boolean} True if action supports the resource
   */
  static supportsResource(actionType: EventActionType, resource: string): boolean {
    const supportedResources = this.getSupportedResources(actionType);
    return supportedResources.includes(resource);
  }

  /**
   * Generate conditional display options for action-specific properties
   * @static
   * @param {EventActionType} actionType - Action type to show properties for
   * @param {string[]} resources - Resources to show properties for (optional)
   * @returns {object} Display options object
   */
  static generateDisplayOptions(
    actionType: EventActionType,
    resources?: string[]
  ): { show: { [key: string]: string[] } } {
    const displayOptions: { show: { [key: string]: string[] } } = {
      show: {
        action: [actionType]
      }
    };

    if (resources && resources.length > 0) {
      displayOptions.show.resource = resources;
    }

    return displayOptions;
  }

  /**
   * Generate display options for actions that require ID
   * @static
   * @param {string[]} resources - Resources to show properties for (optional)
   * @returns {object} Display options object for ID-requiring actions
   */
  static generateIdRequiredDisplayOptions(
    resources?: string[]
  ): { show: { [key: string]: string[] } } {
    const idRequiredActions = this.ACTION_DEFINITIONS
      .filter(action => action.requiresId)
      .map(action => action.value);

    const displayOptions: { show: { [key: string]: string[] } } = {
      show: {
        action: idRequiredActions
      }
    };

    if (resources && resources.length > 0) {
      displayOptions.show.resource = resources;
    }

    return displayOptions;
  }

  /**
   * Generate display options for actions that don't require ID
   * @static
   * @param {string[]} resources - Resources to show properties for (optional)
   * @returns {object} Display options object for non-ID actions
   */
  static generateNoIdDisplayOptions(
    resources?: string[]
  ): { show: { [key: string]: string[] } } {
    const noIdActions = this.ACTION_DEFINITIONS
      .filter(action => !action.requiresId)
      .map(action => action.value);

    const displayOptions: { show: { [key: string]: string[] } } = {
      show: {
        action: noIdActions
      }
    };

    if (resources && resources.length > 0) {
      displayOptions.show.resource = resources;
    }

    return displayOptions;
  }

  /**
   * Validate action type
   * @static
   * @param {string} actionType - Action type to validate
   * @throws {Error} If action type is invalid
   */
  static validateActionType(actionType: string): void {
    const validTypes = Object.values(EventActionType);
    if (!validTypes.includes(actionType as EventActionType)) {
      throw new Error(`Invalid action type: ${actionType}. Valid types: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Validate action and resource combination
   * @static
   * @param {EventActionType} actionType - Action type to validate
   * @param {string} resource - Resource to validate
   * @throws {Error} If combination is invalid
   */
  static validateActionResource(actionType: EventActionType, resource: string): void {
    if (!this.supportsResource(actionType, resource)) {
      const supportedResources = this.getSupportedResources(actionType);
      throw new Error(
        `Action '${actionType}' does not support resource '${resource}'. ` +
        `Supported resources: ${supportedResources.join(', ')}`
      );
    }
  }
}

/**
 * Event action selector factory for common use cases
 * @class EventActionSelectorFactory
 * @description Provides pre-configured event action selectors for common scenarios
 */
export class EventActionSelectorFactory {
  /**
   * Generate action selector for patient operations
   * @static
   * @returns {INodeProperties} Patient action selector
   */
  static forPatientOperations(): INodeProperties {
    return EventActionSelector.generateProperty({
      displayOptions: {
        show: {
          resource: ['patient']
        }
      }
    });
  }

  /**
   * Generate action selector for booking operations
   * @static
   * @returns {INodeProperties} Booking action selector
   */
  static forBookingOperations(): INodeProperties {
    return EventActionSelector.generateProperty({
      displayOptions: {
        show: {
          resource: ['booking']
        }
      }
    });
  }

  /**
   * Generate action selector for read-only operations
   * @static
   * @returns {INodeProperties} Read-only action selector
   */
  static forReadOnlyOperations(): INodeProperties {
    return EventActionSelector.generateProperty({
      includeActions: [EventActionType.GET, EventActionType.GET_MANY],
      default: EventActionType.GET
    });
  }

  /**
   * Generate action selector for write operations
   * @static
   * @returns {INodeProperties} Write operations action selector
   */
  static forWriteOperations(): INodeProperties {
    return EventActionSelector.generateProperty({
      includeActions: [EventActionType.CREATE, EventActionType.UPDATE, EventActionType.DELETE],
      default: EventActionType.CREATE
    });
  }

  /**
   * Generate action selector for CRUD operations
   * @static
   * @returns {INodeProperties} Full CRUD action selector
   */
  static forCrudOperations(): INodeProperties {
    return EventActionSelector.generateProperty({
      // Include all actions by default
    });
  }
}
