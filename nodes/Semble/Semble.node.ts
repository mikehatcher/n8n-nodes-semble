/**
 * @fileoverview Main Semble node implementation for n8n (Action/Trigger-based architecture)
 * @description This module provides CRUD operations for Semble practice management system using action-based structure
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

/**
 * Main Semble node class for n8n
 * @class Semble
 * @implements {INodeType}
 * @description Action/trigger-based node architecture for Semble API access
 */
export class Semble implements INodeType {
  /**
   * Node type description and configuration
   * @type {INodeTypeDescription}
   * @description Defines the node's appearance, properties, and available actions
   */
  description: INodeTypeDescription = {
    displayName: "Semble",
    name: "semble",
    icon: "file:semble.svg",
    group: ["input"],
    version: 1,
    subtitle: '={{$parameter["action"]}}',
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
        displayName: "Action",
        name: "action",
        type: "options",
        noDataExpression: true,
        options: [
          {
            name: "Get",
            value: "get",
            description: "Retrieve data from Semble",
            action: "Retrieve data from semble",
          },
          {
            name: "Create",
            value: "create",
            description: "Create new records in Semble",
            action: "Create new records in semble",
          },
          {
            name: "Update",
            value: "update",
            description: "Update existing records in Semble",
            action: "Update existing records in semble",
          },
          {
            name: "Delete",
            value: "delete",
            description: "Delete records from Semble",
            action: "Delete records from semble",
          },
        ],
        default: "get",
        description: "The action you want to perform",
      },
      // TODO: Add action-specific properties
    ],
  };

  /**
   * Dynamic option loading methods
   * @type {Object}
   * @description Provides dynamic dropdown options for various actions
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
      async getBookingTypes(
        this: ILoadOptionsFunctions,
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
   * @throws {NodeOperationError} When action is not supported or parameters are invalid
   * @throws {NodeApiError} When API requests fail
   * @description Handles all CRUD operations using action-based approach
   */
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: IDataObject[] = [];
    const length = items.length;

    const action = this.getNodeParameter("action", 0) as string;

    for (let i = 0; i < length; i++) {
      try {
        let responseData: IDataObject | IDataObject[] | undefined;

        switch (action) {
          case "get":
            // TODO: Implement get action
            responseData = { message: "Get action not yet implemented" };
            break;
          case "create":
            // TODO: Implement create action
            responseData = { message: "Create action not yet implemented" };
            break;
          case "update":
            // TODO: Implement update action
            responseData = { message: "Update action not yet implemented" };
            break;
          case "delete":
            // TODO: Implement delete action
            responseData = { message: "Delete action not yet implemented" };
            break;
          default:
            throw new NodeOperationError(
              this.getNode(),
              `Unknown action: ${action}`,
            );
        }

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
