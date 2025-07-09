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
  appointmentOperations,
  appointmentFields,
} from "./descriptions/AppointmentDescription";

/**
 * Main Semble node class for n8n
 * @class Semble
 * @implements {INodeType}
 * @description Provides appointment management access to Semble API
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
            name: "Appointment",
            value: "appointment",
          },
        ],
        default: "appointment",
      },

      // Appointment operations
      ...appointmentOperations,
      ...appointmentFields,
    ],
  };

  /**
   * Dynamic option loading methods  
   * @type {Object}
   * @description Provides dynamic dropdown options for appointments
   */
  methods = {
    loadOptions: {
      /**
       * Loads appointment types for appointment creation dropdowns
       * @async
       * @method getAppointmentTypes
       * @param {ILoadOptionsFunctions} this - n8n load options context
       * @returns {Promise<INodePropertyOptions[]>} Array of appointment type options
       */
      // Load appointment types
      async getAppointmentTypes(
        this: ILoadOptionsFunctions
      ): Promise<INodePropertyOptions[]> {
        const returnData: INodePropertyOptions[] = [];

        const query = `
					query GetAppointmentTypes {
						appointmentTypes {
							id
							name
						}
					}
				`;

        const response = await sembleApiRequest.call(this, query);
        const types = response.data.appointmentTypes || [];

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
        if (resource === "appointment") {
          // Appointment operations
          if (operation === "create") {
            const patientId = this.getNodeParameter("patientId", i) as string;
            const staffId = this.getNodeParameter("staffId", i) as string;
            const appointmentTypeId = this.getNodeParameter(
              "appointmentTypeId",
              i
            ) as string;
            const startTime = this.getNodeParameter("startTime", i) as string;
            const endTime = this.getNodeParameter("endTime", i) as string;
            const additionalFields = this.getNodeParameter(
              "additionalFields",
              i
            ) as IDataObject;

            const mutation = `
							mutation CreateAppointment($input: CreateAppointmentInput!) {
								createAppointment(input: $input) {
									id
									patientId
									staffId
									appointmentTypeId
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
                appointmentTypeId,
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
            responseData = response.data.createAppointment;
          }

          if (operation === "get") {
            const appointmentId = this.getNodeParameter(
              "appointmentId",
              i
            ) as string;

            const query = `
							query GetAppointment($id: ID!) {
								appointment(id: $id) {
									id
									patientId
									staffId
									appointmentTypeId
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

            const variables = { id: appointmentId };
            const response = await sembleApiRequest.call(
              this,
              query,
              variables
            );
            responseData = response.data.appointment;
          }

          if (operation === "getAll") {
            const returnAll = this.getNodeParameter("returnAll", i) as boolean;
            const filters = this.getNodeParameter("filters", i) as IDataObject;

            let query = `
							query GetAppointments($limit: Int, $offset: Int) {
								appointments(limit: $limit, offset: $offset) {
									id
									patientId
									staffId
									appointmentTypeId
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
            responseData = response.data.appointments;
          }

          if (operation === "update") {
            const appointmentId = this.getNodeParameter(
              "appointmentId",
              i
            ) as string;
            const updateFields = this.getNodeParameter(
              "updateFields",
              i
            ) as IDataObject;

            const mutation = `
							mutation UpdateAppointment($id: ID!, $input: UpdateAppointmentInput!) {
								updateAppointment(id: $id, input: $input) {
									id
									patientId
									staffId
									appointmentTypeId
									startTime
									endTime
									status
									notes
								}
							}
						`;

            const variables = {
              id: appointmentId,
              input: updateFields,
            };

            const response = await sembleApiRequest.call(
              this,
              mutation,
              variables
            );
            responseData = response.data.updateAppointment;
          }

          if (operation === "delete") {
            const appointmentId = this.getNodeParameter(
              "appointmentId",
              i
            ) as string;

            const mutation = `
							mutation DeleteAppointment($id: ID!) {
								deleteAppointment(id: $id) {
									success
									message
								}
							}
						`;

            const variables = { id: appointmentId };
            const response = await sembleApiRequest.call(
              this,
              mutation,
              variables
            );
            responseData = response.data.deleteAppointment;
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
