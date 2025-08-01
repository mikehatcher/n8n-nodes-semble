/**
 * @fileoverview BookingTrigger - Polling trigger for booking changes
 * @description Implements booking change detection following the established trigger pattern
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Triggers
 */

import {
  IPollFunctions,
  IDataObject,
  INodeExecutionData,
  NodeApiError,
} from "n8n-workflow";

import { sembleApiRequest } from "../GenericFunctions";
import { SemblePagination } from "../shared/PaginationHelpers";
import { GET_BOOKINGS_QUERY } from "../shared/BookingQueries";

/**
 * BookingTrigger class implementing polling for booking changes
 * Follows the established trigger pattern with date-based change detection
 */
export class BookingTrigger {
  /**
   * Poll for booking changes
   * @param pollFunctions - The poll functions context
   * @returns Promise resolving to array of booking change events
   * @throws NodeApiError when polling fails
   */
  static async poll(pollFunctions: IPollFunctions): Promise<INodeExecutionData[][]> {
    const triggerOptions = pollFunctions.getNodeParameter("triggerOptions") as IDataObject;
    const eventType = pollFunctions.getNodeParameter("eventType") as string;
    
    // Get the last poll time from workflow state or set default
    const workflowStaticData = pollFunctions.getWorkflowStaticData("node");
    const lastPollTime = workflowStaticData.lastPollTime as string;
    const currentTime = new Date().toISOString();

    try {
      // Build base variables for the query
      const baseVariables: IDataObject = {};

      // Add date filtering based on event type
      if (lastPollTime) {
        switch (eventType) {
          case "created":
            baseVariables.createdAfter = lastPollTime;
            break;
          case "updated":
            baseVariables.updatedAfter = lastPollTime;
            break;
          case "cancelled":
            baseVariables.statusChangedAfter = lastPollTime;
            baseVariables.status = "cancelled";
            break;
          case "confirmed":
            baseVariables.statusChangedAfter = lastPollTime;
            baseVariables.status = "confirmed";
            break;
          case "any":
          default:
            baseVariables.modifiedAfter = lastPollTime;
            break;
        }
      } else {
        // First run - get recent bookings from the last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        baseVariables.modifiedAfter = oneHourAgo;
      }

      // Add optional filters from trigger options
      if (triggerOptions.patientId) {
        baseVariables.patientId = triggerOptions.patientId;
      }

      if (triggerOptions.practitionerId) {
        baseVariables.practitionerId = triggerOptions.practitionerId;
      }

      if (triggerOptions.locationId) {
        baseVariables.locationId = triggerOptions.locationId;
      }

      if (triggerOptions.bookingTypeId) {
        baseVariables.bookingTypeId = triggerOptions.bookingTypeId;
      }

      // Get the limit from trigger options or use default
      const limit = (triggerOptions.limit as number) || 50;

      // Execute the query to get changed bookings
      const result = await SemblePagination.execute(pollFunctions, {
        query: GET_BOOKINGS_QUERY,
        baseVariables,
        dataPath: "bookings",
        pageSize: limit,
        returnAll: false,
        search: "",
        options: {
          orderBy: "updatedAt",
          orderDirection: "desc",
        },
      });

      // Update the last poll time
      workflowStaticData.lastPollTime = currentTime;

      // Transform the data into node execution format
      const executionData: INodeExecutionData[][] = [[]];

      if (result.data && result.data.length > 0) {
        for (const booking of result.data) {
          // Transform API field names to n8n-expected field names for compatibility
          const transformedBooking = {
            ...booking,
            // Map API field names to n8n-expected names
            startTime: booking.start,
            endTime: booking.end,
            notes: booking.comments,
            practitioner: booking.doctor,
            // Keep original API fields as well for flexibility
            start: booking.start,
            end: booking.end,
            comments: booking.comments,
            doctor: booking.doctor,
            // Add trigger metadata
            eventType,
            pollTime: currentTime,
            lastPollTime: lastPollTime || null,
          };

          executionData[0].push({
            json: transformedBooking,
          });
        }
      }

      return executionData;
    } catch (error) {
      // Don't throw errors on first run to avoid workflow failures
      if (!lastPollTime) {
        workflowStaticData.lastPollTime = currentTime;
        return [[]];
      }

      throw new NodeApiError(pollFunctions.getNode(), {
        message: "Failed to poll for booking changes",
        description: (error as Error).message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Test the trigger configuration
   * @param pollFunctions - The poll functions context
   * @returns Promise resolving to test execution data
   */
  static async test(pollFunctions: IPollFunctions): Promise<INodeExecutionData[][]> {
    try {
      // Get a small sample of recent bookings for testing
      const result = await SemblePagination.execute(pollFunctions, {
        query: GET_BOOKINGS_QUERY,
        baseVariables: {},
        dataPath: "bookings",
        pageSize: 3,
        returnAll: false,
        search: "",
        options: {
          orderBy: "updatedAt",
          orderDirection: "desc",
        },
      });

      const executionData: INodeExecutionData[][] = [[]];

      if (result.data && result.data.length > 0) {
        for (const booking of result.data) {
          executionData[0].push({
            json: {
              ...booking,
              eventType: "test",
              pollTime: new Date().toISOString(),
              isTestRun: true,
            },
          });
        }
      }

      return executionData;
    } catch (error) {
      throw new NodeApiError(pollFunctions.getNode(), {
        message: "Failed to test booking trigger",
        description: (error as Error).message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Execute the booking trigger based on mode
   * @param pollFunctions - The poll functions context
   * @param mode - The execution mode (poll or test)
   * @returns Promise resolving to execution data
   */
  static async execute(
    pollFunctions: IPollFunctions,
    mode: "poll" | "test" = "poll"
  ): Promise<INodeExecutionData[][]> {
    switch (mode) {
      case "test":
        return await BookingTrigger.test(pollFunctions);
      case "poll":
      default:
        return await BookingTrigger.poll(pollFunctions);
    }
  }
}
