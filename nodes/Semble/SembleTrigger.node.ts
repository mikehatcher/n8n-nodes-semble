/**
 * @fileoverview Semble trigger node implementation for n8n
 * @description This module provides scheduled polling triggers for Semble practice management system
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Triggers
 */

import {
  IPollFunctions,
  IDataObject,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
  NodeConnectionType,
} from "n8n-workflow";

import { 
  sembleApiRequest, 
  sembleApiRequestWithPermissions,
  addPermissionMetaToItem,
  PermissionMetadata 
} from "./GenericFunctions";

import { 
  BaseTrigger, 
  BaseTriggerConfig, 
  TriggerResourceConfig,
  calculateDateRangeStart,
  BOOKING_TRIGGER_CONFIG,
  BOOKING_RESOURCE_OPTION 
} from "./triggers";

// Import patient trigger config
import { patientTriggerConfig, PATIENT_RESOURCE_OPTION } from "./triggers/PatientTrigger";

// Import product trigger config
import { PRODUCT_TRIGGER_CONFIG, PRODUCT_RESOURCE_OPTION } from "./triggers/ProductTrigger";

/**
 * Resource configuration for triggers
 * @description Defines available resources and their polling queries
 */
const TRIGGER_RESOURCES: { [key: string]: TriggerResourceConfig } = {
  booking: BOOKING_TRIGGER_CONFIG,
  patient: patientTriggerConfig,
  product: PRODUCT_TRIGGER_CONFIG,
  // Note: The "Appointment (Beta)" UI in Semble is just a new calendar view
  // for the same underlying bookings data. The API only has 'bookings' resource.
  // Keeping this placeholder for potential future API expansion:
  // 
  // appointment: {
  //   displayName: 'Appointment (Beta)',
  //   value: 'appointment', 
  //   description: 'Monitor appointments (when API support is added)',
  //   query: `...`, // Would use appointments query when available
  //   dateField: 'updatedAt'
  // }

  // Future resources can be added here when available in the API:
  // staff: STAFF_TRIGGER_CONFIG
};

/**
 * Main Semble trigger node class for n8n
 * @class SembleTrigger
 * @implements {INodeType}
 * @description Provides scheduled polling access to Semble API for monitoring changes
 */
export class SembleTrigger implements INodeType {
  /**
   * Node type description and configuration
   * @type {INodeTypeDescription}
   * @description Defines the trigger node's appearance, properties, and polling behavior
   */
  description: INodeTypeDescription = {
    displayName: "Semble Trigger",
    name: "sembleTrigger",
    icon: "file:semble.svg",
    group: ["trigger"],
    version: 1,
    subtitle: '={{$parameter["event"] + ": " + $parameter["resource"]}}',
    description: "Monitor Semble practice management system for changes",
    defaults: {
      name: "Semble Trigger",
    },
    inputs: [],
    outputs: [NodeConnectionType.Main],
    credentials: [
      {
        name: "sembleApi",
        required: true,
      },
    ],
    polling: true,
    properties: [
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          BOOKING_RESOURCE_OPTION,
          PATIENT_RESOURCE_OPTION,
          PRODUCT_RESOURCE_OPTION,
          // Future resources can be added here when available in the API:
          // STAFF_RESOURCE_OPTION,
        ],
        default: '',
        description: "The resource type to monitor for changes",
      },
      {
        displayName: "Event",
        name: "event",
        type: "options",
        options: [
          {
            name: "New or Updated",
            value: "newOrUpdated",
            description: "Trigger on new items or updates to existing items",
          },
          {
            name: "New Only",
            value: "newOnly", 
            description: "Trigger only on newly created items",
          },
        ],
        default: "newOrUpdated",
        description: "What changes should trigger the workflow",
      },
      {
        displayName: "Created/Updated Date",
        name: "datePeriod",
        type: "options",
        options: [
          {
            name: "1 Day",
            value: "1d",
            description: "Monitor bookings from the last 24 hours",
          },
          {
            name: "1 Month",
            value: "1m",
            description: "Monitor bookings from the last 30 days",
          },
          {
            name: "1 Week",
            value: "1w", 
            description: "Monitor bookings from the last 7 days",
          },
          {
            name: "12 Months",
            value: "12m",
            description: "Monitor bookings from the last 365 days",
          },
          {
            name: "3 Months",
            value: "3m",
            description: "Monitor bookings from the last 90 days",
          },
          {
            name: "6 Months", 
            value: "6m",
            description: "Monitor bookings from the last 180 days",
          },
          {
            name: "All Records",
            value: "all",
            description: "Use with caution. Recommend use in conjunction with Loop Over Items Node.",
          },
        ],
        default: "1m",
        description: "Time period to search for bookings. This filters bookings using the Semble API's dateRange parameter for efficient querying.",
      },
      {
        displayName: "Additional Options",
        name: "additionalOptions",
        type: "collection",
        placeholder: "Add Option",
        default: {},
        description: "Optional settings to fine-tune the trigger's polling behavior and performance",
        options: [
          {
            displayName: "Limit",
            name: "limit",
            type: "number",
            default: 50,
            description: 'Max number of results to return',
            typeOptions: {
              minValue: 1,
            },
          },
          {
            displayName: "Max Pages to Fetch",
            name: "maxPages",
            type: "number",
            default: 1,
            description: "Maximum number of pages to fetch per polling cycle. Higher values increase data coverage but may impact performance.",
            typeOptions: {
              minValue: 1,
              maxValue: 100,
            },
          },
        ],
      },
      {
        displayName: "Debug Mode",
        name: "debugMode",
        type: "boolean",
        default: false,
        description: "Whether to enable detailed logging for troubleshooting API requests and responses",
        displayOptions: {
          show: {
            "@version": [{ _cnd: { gte: 1 } }],
          },
        },
        routing: {
          send: {
            preSend: [],
          },
        },
        options: [
          {
            name: "Settings",
            value: "settings",
          },
        ],
      },
    ],
  };

  /**
   * Main polling method for the Semble trigger
   * @async
   * @method poll
   * @param {IPollFunctions} this - n8n polling context
   * @returns {Promise<INodeExecutionData[][] | null>} Array of execution data or null if no new data
   * @throws {NodeOperationError} When resource is not supported or parameters are invalid
   * @description Polls Semble API for changes and returns new/updated items
   */
  async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
    const resource = this.getNodeParameter("resource") as string;
    const event = this.getNodeParameter("event") as string;
    const debugMode = this.getNodeParameter("debugMode", false) as boolean;
    const datePeriod = this.getNodeParameter("datePeriod", "1m") as string;
    const additionalOptions = this.getNodeParameter("additionalOptions", {}) as IDataObject;
    
    const limit = additionalOptions.limit as number || 50;
    const maxPages = additionalOptions.maxPages as number || Number.MAX_SAFE_INTEGER; // Always unlimited by default

    // Get resource configuration
    const resourceConfig = TRIGGER_RESOURCES[resource];
    if (!resourceConfig) {
      throw new NodeOperationError(this.getNode(), `Resource "${resource}" is not supported`);
    }

    // Build trigger configuration
    const triggerConfig: BaseTriggerConfig = {
      resource,
      event,
      debugMode,
      datePeriod,
      limit,
      maxPages
    };

    try {
      // Use the base trigger polling logic
      const result = await BaseTrigger.poll(this, resourceConfig, triggerConfig);
      
      // Return data only if we have new items
      return result.hasNewData ? [result.data] : null;
    } catch (error) {
      if (debugMode && this.logger) {
        this.logger.error(`[SEMBLE-TRIGGER-DEBUG] Polling failed: ${(error as Error).message}`);
      }
      throw error;
    }
  }
}

// Export for n8n
export default SembleTrigger;
