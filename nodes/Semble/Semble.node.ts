/**
 * @fileoverview Main Semble node implementation for n8n
 * @description This module provides CRUD operations for Semble practice management system
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Nodes
 */

import {
  IExecuteFunctions,
  IDataObject,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
  NodeApiError,
  NodeOperationError,
  NodeConnectionType,
} from "n8n-workflow";

import { sembleApiRequest } from "./GenericFunctions";
import { RESOURCE_REGISTRY, ResourceName } from "./resources";

import {
  bookingOperations,
  bookingFields,
} from "./descriptions/BookingDescription";

/**
 * Main Semble node class for n8n
 * @class Semble
 * @implements {INodeType}
 * @description Provides booking management access to Semble API
 */
export class Semble implements INodeType {
  /**
   * Node type description and configuration
   * @type {INodeTypeDescription}
   * @description Defines the node's appearance, properties, and available operations
   */
  description: INodeTypeDescription = {
    displayName: "Semble",
    name: "semble",
    icon: "file:semble.svg",
    group: ["input"],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: "Interact with Semble practice management system",
    defaults: {
      name: "Semble",
    },
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
    credentials: [
      {
        name: "sembleApi",
        required: true,
      },
    ],
    properties: [
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          {
            name: "Booking",
            value: "booking",
            description: "Manage appointments and bookings in your practice",
          },
        ],
        default: "booking",
        description: "The type of data you want to work with in Semble",
      },

      // Booking operations
      ...bookingOperations,
      ...bookingFields,
    ],
  };

  /**
   * Dynamic option loading methods  
   * @type {Object}
   * @description Provides dynamic dropdown options for bookings
   */
  methods = {
    loadOptions: {
      /**
       * Loads booking types for booking creation dropdowns
       * @async
       * @method getBookingTypes
       * @param {ILoadOptionsFunctions} this - n8n load options context
       * @returns {Promise<INodePropertyOptions[]>} Array of booking type options
       */
      // Load booking types
      async getBookingTypes(
        this: ILoadOptionsFunctions
      ): Promise<INodePropertyOptions[]> {
        const returnData: INodePropertyOptions[] = [];

        const query = `
					query GetBookingTypes {
						bookingTypes {
							id
							name
						}
					}
				`;

        const response = await sembleApiRequest.call(this, query, {}, 3, false);
        const types = response.data.bookingTypes || [];

        for (const type of types) {
          returnData.push({
            name: type.name,
            value: type.id,
          });
        }

        return returnData;
      },
    },
  };

  /**
   * Main execution method for the Semble node
   * @async
   * @method execute
   * @param {IExecuteFunctions} this - n8n execution context
   * @returns {Promise<INodeExecutionData[][]>} Array of execution data
   * @throws {NodeOperationError} When operation is not supported or parameters are invalid
   * @throws {NodeApiError} When API requests fail
   * @description Handles all CRUD operations using resource-based approach
   */
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: IDataObject[] = [];
    const length = items.length;

    const resource = this.getNodeParameter("resource", 0) as ResourceName;
    const operation = this.getNodeParameter("operation", 0) as string;
    
    // Get the resource class from the registry
    const ResourceClass = RESOURCE_REGISTRY[resource];
    if (!ResourceClass) {
      throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
    }

    // Create resource instance
    const resourceInstance = new ResourceClass();

    for (let i = 0; i < length; i++) {
      try {
        const responseData = await resourceInstance.execute(this, operation, i);

        if (Array.isArray(responseData)) {
          returnData.push(...(responseData as IDataObject[]));
        } else if (responseData !== undefined) {
          returnData.push(responseData as IDataObject);
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ error: (error as Error).message });
          continue;
        }
        throw error;
      }
    }

    return [this.helpers.returnJsonArray(returnData)];
  }
}
