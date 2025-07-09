/**
 * @fileoverview Main Semble node implementation for n8n
 * @description This module provides CRUD operations for Semble practice management system
 * @author Mike Hatcher <mike.hatcher@progenious.com>
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
          },
        ],
        default: "booking",
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

        const response = await sembleApiRequest.call(this, query);
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
   * @description Handles all CRUD operations for appointments/bookings
   */
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: IDataObject[] = [];
    const length = items.length;
    let responseData;

    const resource = this.getNodeParameter("resource", 0) as string;
    const operation = this.getNodeParameter("operation", 0) as string;

    for (let i = 0; i < length; i++) {
      try {
        if (resource === "booking") {
          // Booking operations
          if (operation === "create") {
            const patientId = this.getNodeParameter("patientId", i) as string;
            const staffId = this.getNodeParameter("staffId", i) as string;
            const bookingTypeId = this.getNodeParameter(
              "bookingTypeId",
              i
            ) as string;
            const startTime = this.getNodeParameter("startTime", i) as string;
            const endTime = this.getNodeParameter("endTime", i) as string;
            const additionalFields = this.getNodeParameter(
              "additionalFields",
              i
            ) as IDataObject;

            const mutation = `
							mutation CreateBooking($input: CreateBookingInput!) {
								createBooking(input: $input) {
									id
									patientId
									staffId
									bookingTypeId
									startTime
									endTime
									status
									notes
								}
							}
						`;

            const variables = {
              input: {
                patientId,
                staffId,
                bookingTypeId,
                startTime,
                endTime,
                ...additionalFields,
              },
            };

            const response = await sembleApiRequest.call(
              this,
              mutation,
              variables
            );
            responseData = response.data.createBooking;
          }

          if (operation === "get") {
            const bookingId = this.getNodeParameter(
              "bookingId",
              i
            ) as string;

            const query = `
							query GetBooking($id: ID!) {
								booking(id: $id) {
									id
									patientId
									staffId
									bookingTypeId
									startTime
									endTime
									status
									notes
									patient {
										id
										firstName
										lastName
										email
									}
									staff {
										id
										firstName
										lastName
									}
								}
							}
						`;

            const variables = { id: bookingId };
            const response = await sembleApiRequest.call(
              this,
              query,
              variables
            );
            responseData = response.data.booking;
          }

          if (operation === "getAll") {
            const returnAll = this.getNodeParameter("returnAll", i) as boolean;
            const filters = this.getNodeParameter("filters", i) as IDataObject;

            let query = `
							query GetBookings($limit: Int, $offset: Int) {
								bookings(limit: $limit, offset: $offset) {
									id
									patientId
									staffId
									bookingTypeId
									startTime
									endTime
									status
									notes
									patient {
										id
										firstName
										lastName
										email
									}
									staff {
										id
										firstName
										lastName
									}
								}
							}
						`;

            const variables: IDataObject = {};
            if (!returnAll) {
              variables.limit = this.getNodeParameter("limit", i) as number;
            }

            // Apply filters if provided
            Object.assign(variables, filters);

            const response = await sembleApiRequest.call(
              this,
              query,
              variables
            );
            responseData = response.data.bookings;
          }

          if (operation === "update") {
            const bookingId = this.getNodeParameter(
              "bookingId",
              i
            ) as string;
            const updateFields = this.getNodeParameter(
              "updateFields",
              i
            ) as IDataObject;

            const mutation = `
							mutation UpdateBooking($id: ID!, $input: UpdateBookingInput!) {
								updateBooking(id: $id, input: $input) {
									id
									patientId
									staffId
									bookingTypeId
									startTime
									endTime
									status
									notes
								}
							}
						`;

            const variables = {
              id: bookingId,
              input: updateFields,
            };

            const response = await sembleApiRequest.call(
              this,
              mutation,
              variables
            );
            responseData = response.data.updateBooking;
          }

          if (operation === "delete") {
            const bookingId = this.getNodeParameter(
              "bookingId",
              i
            ) as string;

            const mutation = `
							mutation DeleteBooking($id: ID!) {
								deleteBooking(id: $id) {
									success
									message
								}
							}
						`;

            const variables = { id: bookingId };
            const response = await sembleApiRequest.call(
              this,
              mutation,
              variables
            );
            responseData = response.data.deleteBooking;
          }
        }



        if (Array.isArray(responseData)) {
          returnData.push.apply(returnData, responseData as IDataObject[]);
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
