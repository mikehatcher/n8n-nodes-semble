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
    // Get the last poll time from workflow state or set default
    const workflowStaticData = pollFunctions.getWorkflowStaticData("node");
    const lastPollTime = workflowStaticData.lastPollTime as string;
    const currentTime = new Date().toISOString();

    try {
      // Build base variables for the query
      const baseVariables: IDataObject = {};

      // For bookings, we need to structure the variables to match GET_BOOKINGS_QUERY:
      // query GetBookings($pagination: Pagination, $options: QueryOptions, $dateRange: DateRange)
      
      // Set up the date range for filtering 
      let dateRangeStart: string;
      if (lastPollTime) {
        dateRangeStart = lastPollTime;
      } else {
        // First run - get recent bookings from the last 7 days to ensure we find some data
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        dateRangeStart = sevenDaysAgo;
      }

      const dateRange = {
        start: dateRangeStart,
        end: currentTime,
      };

      // Set up simple options object (simplified - no complex filtering)
      const options: IDataObject = {
        // Use updatedAt as the default filter to catch all changes
        updatedAt: dateRange,
      };

      baseVariables.options = options;
      baseVariables.dateRange = dateRange;

      // Read limit from additionalOptions (matching SembleTrigger node behavior)
      const additionalOptions = pollFunctions.getNodeParameter(
        "additionalOptions",
        {},
      ) as IDataObject;
      const limit = (additionalOptions.limit as number) ?? 50;

      // DEBUG: Log the actual limit being used
      console.log(`🔧 BookingTrigger DEBUG: additionalOptions =`, additionalOptions);
      console.log(`🔧 BookingTrigger DEBUG: using limit =`, limit);

      // Execute the query to get changed bookings
      const result = await SemblePagination.execute(pollFunctions, {
        query: GET_BOOKINGS_QUERY,
        baseVariables,
        dataPath: "bookings",
        pageSize: limit,
        returnAll: false,
        search: "",
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
            // Add trigger metadata (simplified)
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
