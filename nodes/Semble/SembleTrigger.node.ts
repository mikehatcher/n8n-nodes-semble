/**
 * @fileoverview Semble trigger node implementation for n8n
 * @description This module provides polling triggers for Semble API events
 * @author Mike Hatcher <mike.hatcher@progenious.com>
 * @website https://progenious.com
 * @version 1.0
 * @namespace N8nNodesSemble.Triggers
 */

import {
  IPollFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
  NodeConnectionType,
} from "n8n-workflow";

import { sembleApiRequest } from "./GenericFunctions";

/**
 * Semble trigger node class for n8n
 * @class SembleTrigger
 * @implements {INodeType}
 * @description Provides polling-based triggers for new and updated Semble records
 */
export class SembleTrigger implements INodeType {
  /**
   * Node type description and configuration
   * @type {INodeTypeDescription}
   * @description Defines the trigger's appearance, properties, and polling behavior
   */
  description: INodeTypeDescription = {
    displayName: "Semble Trigger",
    name: "sembleTrigger",
    icon: "file:semble.svg",
    group: ["trigger"],
    version: 1,
    subtitle: '={{$parameter["event"]}}',
    description: "Starts the workflow when Semble events occur",
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
        displayName: "Event",
        name: "event",
        type: "options",
        options: [
          {
            name: "New Patient",
            value: "newPatient",
            description: "Trigger when a new patient is created",
          },
          {
            name: "Updated Patient",
            value: "updatedPatient",
            description: "Trigger when a patient is updated",
          },
          {
            name: "New Appointment",
            value: "newAppointment",
            description: "Trigger when a new appointment is created",
          },
          {
            name: "Updated Appointment",
            value: "updatedAppointment",
            description: "Trigger when an appointment is updated",
          },
          {
            name: "New Product",
            value: "newProduct",
            description: "Trigger when a new product is created",
          },
          {
            name: "Updated Product",
            value: "updatedProduct",
            description: "Trigger when a product is updated",
          },
        ],
        default: "newPatient",
        noDataExpression: true,
      },
      {
        displayName: "Poll Interval",
        name: "pollInterval",
        type: "number",
        default: 300, // 5 minutes - conservative for rate limiting
        description:
          "How often to check for changes (in seconds). Minimum 30 seconds due to Semble API rate limits.",
        typeOptions: {
          minValue: 30, // Increased minimum to respect rate limits
        },
      },
    ],
  };

  /**
   * Main polling method for the Semble trigger
   * @async
   * @method poll
   * @param {IPollFunctions} this - n8n polling context
   * @returns {Promise<INodeExecutionData[][] | null>} Array of execution data or null if no new data
   * @throws {NodeOperationError} When event type is not supported
   * @description Polls Semble API for new or updated records based on configured event type
   */
  async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
    const webhookData = this.getWorkflowStaticData("node");
    const event = this.getNodeParameter("event") as string;
    const pollInterval = this.getNodeParameter("pollInterval") as number;

    // Get the last poll time
    const lastPoll = webhookData.lastPoll as string;
    const now = new Date().toISOString();

    let query = "";
    let variables: any = {};

    // Build the GraphQL query based on event type
    switch (event) {
      case "newPatient":
      case "updatedPatient":
        query = `
						query GetPatients($options: QueryOptions) {
							patients(options: $options) {
								data {
									id
									firstName
									lastName
									email
									dob
									createdAt
									updatedAt
								}
							}
						}
					`;
        if (lastPoll) {
          variables.options = {
            updatedAt: {
              start: lastPoll,
            },
          };
        }
        break;

      case "newAppointment":
      case "updatedAppointment":
        query = `
						query GetBookings($options: QueryOptions) {
							bookings(options: $options) {
								data {
									id
									start
									end
									patient {
										id
										firstName
										lastName
									}
									location {
										name
									}
									createdAt
									updatedAt
								}
							}
						}
					`;
        if (lastPoll) {
          variables.options = {
            updatedAt: {
              start: lastPoll,
            },
          };
        }
        break;

      case "newProduct":
      case "updatedProduct":
        query = `
						query GetProducts($options: QueryOptions) {
							products(options: $options) {
								data {
									id
									name
									itemCode
									price
									stockLevel
									status
									createdAt
									updatedAt
								}
							}
						}
					`;
        if (lastPoll) {
          variables.options = {
            updatedAt: {
              start: lastPoll,
            },
          };
        }
        break;

      default:
        throw new NodeOperationError(this.getNode(), `Unknown event: ${event}`);
    }

    try {
      // Get credentials
      const credentials = await this.getCredentials("sembleApi");

      // Make API request using n8n's httpRequestWithAuthentication
      const response = await this.helpers.httpRequestWithAuthentication.call(
        this,
        "sembleApi",
        {
          method: "POST",
          url: credentials.baseUrl as string,
          body: {
            query,
            variables,
          },
          json: true,
        }
      );

      // Update the last poll time
      webhookData.lastPoll = now;

      if (!response.data) {
        return null;
      }

      let items: any[] = [];

      switch (event) {
        case "newPatient":
          items =
            response.data.patients?.data?.filter(
              (patient: any) =>
                !lastPoll || new Date(patient.createdAt) > new Date(lastPoll)
            ) || [];
          break;

        case "updatedPatient":
          items =
            response.data.patients?.data?.filter(
              (patient: any) =>
                !lastPoll || new Date(patient.updatedAt) > new Date(lastPoll)
            ) || [];
          break;

        case "newAppointment":
          items =
            response.data.bookings?.data?.filter(
              (booking: any) =>
                !lastPoll || new Date(booking.createdAt) > new Date(lastPoll)
            ) || [];
          break;

        case "updatedAppointment":
          items =
            response.data.bookings?.data?.filter(
              (booking: any) =>
                !lastPoll || new Date(booking.updatedAt) > new Date(lastPoll)
            ) || [];
          break;

        case "newProduct":
          items =
            response.data.products?.data?.filter(
              (product: any) =>
                !lastPoll || new Date(product.createdAt) > new Date(lastPoll)
            ) || [];
          break;

        case "updatedProduct":
          items =
            response.data.products?.data?.filter(
              (product: any) =>
                !lastPoll || new Date(product.updatedAt) > new Date(lastPoll)
            ) || [];
          break;
      }

      if (items.length === 0) {
        return null;
      }

      return [items.map((item) => ({ json: item }))];
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new NodeOperationError(
        this.getNode(),
        `Failed to poll Semble API: ${errorMessage}`
      );
    }
  }
}
