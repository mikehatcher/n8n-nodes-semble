/**
 * @fileoverview BookingResource - Action hooks for booking CRUD operations
 * @description Implements comprehensive booking management following the established resource pattern
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Resources
 */

import {
  IExecuteFunctions,
  IDataObject,
  NodeApiError,
  NodeOperationError,
} from "n8n-workflow";

import { sembleApiRequest } from "../GenericFunctions";
import { SemblePagination, buildPaginationConfig } from "../shared/PaginationHelpers";
import {
  GET_BOOKING_QUERY,
  GET_BOOKINGS_QUERY,
  CREATE_BOOKING_MUTATION,
  UPDATE_BOOKING_MUTATION,
  DELETE_BOOKING_MUTATION,
  UPDATE_BOOKING_JOURNEY_MUTATION,
  BOOKING_FIELDS,
} from "../shared/BookingQueries";

/**
 * BookingResource class implementing CRUD operations for Semble bookings
 * Follows the established resource pattern with unified action execution
 */
export class BookingResource {
  /**
   * Get a single booking by ID
   * @param executeFunctions - The execution functions context
   * @param itemIndex - The index of the current item being processed
   * @returns Promise resolving to booking data
   * @throws NodeOperationError when booking ID is missing
   * @throws NodeApiError when booking not found or API errors occur
   */
  static async get(executeFunctions: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
    const bookingId = executeFunctions.getNodeParameter("bookingId", itemIndex) as string;

    if (!bookingId) {
      throw new NodeOperationError(
        executeFunctions.getNode(),
        "Booking ID is required for get operation",
        { itemIndex }
      );
    }

    try {
      const response = await sembleApiRequest.call(
        executeFunctions,
        GET_BOOKING_QUERY,
        { id: bookingId },
        3,
        false
      );

      if (!response.booking) {
        throw new NodeApiError(executeFunctions.getNode(), {
          message: `Booking with ID "${bookingId}" not found`,
          description: "The specified booking does not exist in the system",
        });
      }

      return response.booking as IDataObject;
    } catch (error) {
      if (error instanceof NodeApiError || error instanceof NodeOperationError) {
        throw error;
      }

      throw new NodeApiError(executeFunctions.getNode(), {
        message: "Failed to retrieve booking",
        description: (error as Error).message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Get multiple bookings with optional filtering and pagination
   * @param executeFunctions - The execution functions context
   * @param itemIndex - The index of the current item being processed
   * @returns Promise resolving to array of booking data
   * @throws NodeApiError when pagination or API errors occur
   */
  static async getMany(executeFunctions: IExecuteFunctions, itemIndex: number): Promise<IDataObject[]> {
    const options = executeFunctions.getNodeParameter("options", itemIndex) as IDataObject;

    try {
      // If patientId is provided, use the more efficient patient.bookings approach
      if (options.patientId) {
        return await BookingResource.getPatientBookings(executeFunctions, itemIndex);
      }

      // Original approach for general booking queries
      const paginationConfig = buildPaginationConfig(options);
      const baseVariables: IDataObject = {};

      // Add date filtering if provided - bookings API expects dateRange object
      if (options.startDate || options.endDate) {
        baseVariables.dateRange = {} as IDataObject;
        if (options.startDate) {
          (baseVariables.dateRange as IDataObject).start = options.startDate;
        }
        if (options.endDate) {
          (baseVariables.dateRange as IDataObject).end = options.endDate;
        }
      }

      // Initialize options object with supported QueryOptions fields
      baseVariables.options = {} as IDataObject;

      // Add includeDeleted if provided (only supported field in QueryOptions for bookings)
      if (options.includeDeleted !== undefined) {
        (baseVariables.options as IDataObject).includeDeleted = options.includeDeleted;
      }

      const result = await SemblePagination.execute(executeFunctions, {
        query: GET_BOOKINGS_QUERY,
        baseVariables,
        dataPath: "bookings",
        pageSize: paginationConfig.pageSize,
        returnAll: paginationConfig.returnAll,
        options: {},
      });

      return result.data;
    } catch (error) {
      throw new NodeApiError(executeFunctions.getNode(), {
        message: "Failed to retrieve bookings",
        description: (error as Error).message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Get bookings for a specific patient using the patient.bookings field
   * This is more efficient than filtering all bookings client-side
   * @param executeFunctions - The execution functions context
   * @param itemIndex - The index of the current item being processed
   * @returns Promise resolving to array of booking data for the patient
   * @throws NodeApiError when patient not found or API errors occur
   */
  static async getPatientBookings(executeFunctions: IExecuteFunctions, itemIndex: number): Promise<IDataObject[]> {
    const options = executeFunctions.getNodeParameter("options", itemIndex) as IDataObject;
    const patientId = options.patientId as string;

    if (!patientId) {
      throw new NodeOperationError(
        executeFunctions.getNode(),
        "Patient ID is required for patient booking queries",
        { itemIndex }
      );
    }

    try {
      let startDate: string;
      let endDate: string;

      // Check if we have explicit date range from options
      if (options.startDate && options.endDate) {
        startDate = options.startDate as string;
        endDate = options.endDate as string;
      } else {
        // Try to get the trigger's pollTime to calculate appropriate date range
        const inputData = executeFunctions.getInputData();
        const itemData = inputData[itemIndex]?.json as IDataObject;
        const metaData = itemData?.__meta as IDataObject;
        const triggerPollTime = metaData?.pollTime as string;
        
        if (triggerPollTime) {
          // Calculate date range based on trigger timeframe
          const triggerTime = new Date(triggerPollTime);
          const now = new Date();
          
          // For bookings, we want:
          // 1. Appointments from the last 24 hours (or since trigger period started)
          // 2. All future appointments
          
          // Calculate 24 hours before the trigger time as the start
          const triggerStart = new Date(triggerTime.getTime() - (24 * 60 * 60 * 1000));
          
          // Start from 24 hours before trigger time (for recent bookings)
          startDate = triggerStart.toISOString().split('T')[0]; // Format as YYYY-MM-DD
          
          // End date should be far in the future to capture all future bookings
          const futureDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now
          endDate = futureDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        } else {
          // Fallback to explicit range if provided, or very broad range
          startDate = options.startDate as string || "2020-01-01";
          endDate = options.endDate as string || "2030-12-31";
        }
      }

      // Build the query to get patient with their bookings
      const query = `
        query GetPatientBookings($id: ID!, $start: Date!, $end: Date!) {
          patient(id: $id) {
            id
            firstName
            lastName
            email
            bookings(start: $start, end: $end) {
              ${BOOKING_FIELDS}
            }
          }
        }
      `;

      const variables = {
        id: patientId,
        start: startDate,
        end: endDate,
      };

      const response = await sembleApiRequest.call(executeFunctions, query, variables, 3, false);

      if (!response.patient) {
        throw new NodeApiError(executeFunctions.getNode(), {
          message: `Patient with ID ${patientId} not found`,
          description: "Please verify the patient ID is correct",
        });
      }

      return response.patient.bookings || [];
    } catch (error) {
      throw new NodeApiError(executeFunctions.getNode(), {
        message: "Failed to retrieve patient bookings",
        description: (error as Error).message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Create a new booking
   * @param executeFunctions - The execution functions context
   * @param itemIndex - The index of the current item being processed
   * @returns Promise resolving to created booking data
   * @throws NodeOperationError when required fields are missing
   * @throws NodeApiError when creation fails
   */
  static async create(executeFunctions: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
    const patient = executeFunctions.getNodeParameter("patient", itemIndex) as string;
    const doctor = executeFunctions.getNodeParameter("doctor", itemIndex) as string;
    const location = executeFunctions.getNodeParameter("location", itemIndex) as string;
    const bookingType = executeFunctions.getNodeParameter("bookingType", itemIndex) as string;
    const start = executeFunctions.getNodeParameter("start", itemIndex) as string;
    const end = executeFunctions.getNodeParameter("end", itemIndex) as string;
    const comments = executeFunctions.getNodeParameter("comments", itemIndex, "") as string;
    const additionalFields = executeFunctions.getNodeParameter("additionalFields", itemIndex) as IDataObject;

    // Validate required fields
    if (!patient || !doctor || !location || !bookingType || !start || !end) {
      throw new NodeOperationError(
        executeFunctions.getNode(),
        "Patient, Doctor, Location, Booking Type, Start Time, and End Time are required for create operation",
        { itemIndex }
      );
    }

    try {
      // Prepare bookingData for the mutation
      const bookingData: IDataObject = {
        patient,
        location,
        bookingType,
        doctor,
        start,
        end,
        ...additionalFields,
      };

      // Add comments if provided
      if (comments) {
        bookingData.comments = comments;
      }

      const variables: IDataObject = {
        patient,
        location,
        bookingType,
        doctor,
        comments,
        start,
        end,
        bookingData,
      };

      const response = await sembleApiRequest.call(
        executeFunctions,
        CREATE_BOOKING_MUTATION,
        variables,
        3,
        false
      );

      if (response.createBooking?.error) {
        throw new NodeApiError(executeFunctions.getNode(), {
          message: "Failed to create booking",
          description: response.createBooking.error,
        });
      }

      if (!response.createBooking?.data) {
        throw new NodeApiError(executeFunctions.getNode(), {
          message: "Failed to create booking",
          description: "No data returned from booking creation",
        });
      }

      return response.createBooking.data as IDataObject;
    } catch (error) {
      if (error instanceof NodeApiError || error instanceof NodeOperationError) {
        throw error;
      }

      throw new NodeApiError(executeFunctions.getNode(), {
        message: "Failed to create booking",
        description: (error as Error).message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Update an existing booking
   * @param executeFunctions - The execution functions context
   * @param itemIndex - The index of the current item being processed
   * @returns Promise resolving to updated booking data
   * @throws NodeOperationError when booking ID is missing
   * @throws NodeApiError when update fails
   */
  static async update(executeFunctions: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
    const bookingId = executeFunctions.getNodeParameter("bookingId", itemIndex) as string;
    const updateFields = executeFunctions.getNodeParameter("updateFields", itemIndex) as IDataObject;

    if (!bookingId) {
      throw new NodeOperationError(
        executeFunctions.getNode(),
        "Booking ID is required for update operation",
        { itemIndex }
      );
    }

    try {
      const response = await sembleApiRequest.call(
        executeFunctions,
        UPDATE_BOOKING_MUTATION,
        {
          id: bookingId,
          bookingData: updateFields,
        },
        3,
        false
      );

      if (response.updateBooking?.error) {
        throw new NodeApiError(executeFunctions.getNode(), {
          message: "Failed to update booking",
          description: response.updateBooking.error,
        });
      }

      if (!response.updateBooking?.data) {
        throw new NodeApiError(executeFunctions.getNode(), {
          message: "Failed to update booking",
          description: "No data returned from booking update",
        });
      }

      return response.updateBooking.data as IDataObject;
    } catch (error) {
      if (error instanceof NodeApiError || error instanceof NodeOperationError) {
        throw error;
      }

      throw new NodeApiError(executeFunctions.getNode(), {
        message: "Failed to update booking",
        description: (error as Error).message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Delete a booking
   * @param executeFunctions - The execution functions context
   * @param itemIndex - The index of the current item being processed
   * @returns Promise resolving to deletion confirmation
   * @throws NodeOperationError when booking ID is missing
   * @throws NodeApiError when deletion fails
   */
  static async delete(executeFunctions: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
    const bookingId = executeFunctions.getNodeParameter("bookingId", itemIndex) as string;
    const sendCancellationMessages = executeFunctions.getNodeParameter("sendCancellationMessages", itemIndex, false) as boolean;

    if (!bookingId) {
      throw new NodeOperationError(
        executeFunctions.getNode(),
        "Booking ID is required for delete operation",
        { itemIndex }
      );
    }

    try {
      const variables: IDataObject = {
        id: bookingId,
      };

      // Add sendCancellationMessages if specified
      if (sendCancellationMessages !== undefined) {
        variables.sendCancellationMessages = sendCancellationMessages;
      }

      const response = await sembleApiRequest.call(
        executeFunctions,
        DELETE_BOOKING_MUTATION,
        variables,
        3,
        false
      );

      if (response.deleteBooking?.error) {
        throw new NodeApiError(executeFunctions.getNode(), {
          message: "Failed to delete booking",
          description: response.deleteBooking.error,
        });
      }

      return {
        success: true,
        bookingId,
        deletedBooking: response.deleteBooking?.data || null,
        message: `Booking with ID "${bookingId}" deleted successfully`,
      };
    } catch (error) {
      if (error instanceof NodeApiError || error instanceof NodeOperationError) {
        throw error;
      }

      throw new NodeApiError(executeFunctions.getNode(), {
        message: "Failed to delete booking",
        description: (error as Error).message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Update booking journey stage (e.g., mark patient as arrived, in consultation, departed)
   * @param executeFunctions - The execution functions context
   * @param itemIndex - The index of the item being processed
   * @returns Promise resolving to the updated booking
   * @throws NodeApiError if the API request fails
   */
  static async updateJourney(executeFunctions: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
    const bookingId = executeFunctions.getNodeParameter("bookingId", itemIndex) as string;
    const journeyStage = executeFunctions.getNodeParameter("journeyStage", itemIndex) as string;
    const customDate = executeFunctions.getNodeParameter("customDate", itemIndex, false) as boolean;
    
    if (!bookingId) {
      throw new NodeOperationError(executeFunctions.getNode(), "Booking ID is required for journey update");
    }
    
    const variables: IDataObject = {
      id: bookingId,
      journeyStage: journeyStage, // API expects lowercase enum values
    };

    // Always include a date - either custom or current
    if (customDate) {
      const date = executeFunctions.getNodeParameter("date", itemIndex) as string;
      variables.date = date;
    } else {
      // Use current date/time if no custom date specified
      variables.date = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format
    }

    try {
      const response = await sembleApiRequest.call(
        executeFunctions,
        UPDATE_BOOKING_JOURNEY_MUTATION,
        variables,
        3,
        false
      );

      if (response.updateBookingJourney.error) {
        throw new NodeApiError(executeFunctions.getNode(), {
          message: response.updateBookingJourney.error,
          description: response.updateBookingJourney.error,
        });
      }

      if (!response.updateBookingJourney.data) {
        throw new NodeApiError(executeFunctions.getNode(), {
          message: "No data returned from booking journey update",
          description: "No data returned from booking journey update",
        });
      }

      return response.updateBookingJourney.data;
    } catch (error) {
      throw new NodeApiError(executeFunctions.getNode(), {
        message: `Failed to update booking journey: ${(error as Error).message}`,
        description: (error as Error).message,
      });
    }
  }

  /**
   * Execute the specified booking action
   * @param executeFunctions - The execution functions context
   * @param action - The action to execute (get, getMany, create, update, delete)
   * @param itemIndex - The index of the current item being processed
   * @returns Promise resolving to action result
   * @throws NodeOperationError for unknown actions
   */
  static async executeAction(
    executeFunctions: IExecuteFunctions,
    action: string,
    itemIndex: number
  ): Promise<IDataObject | IDataObject[]> {
    switch (action) {
      case "get":
        return await BookingResource.get(executeFunctions, itemIndex);
      case "getMany":
        return await BookingResource.getMany(executeFunctions, itemIndex);
      case "create":
        return await BookingResource.create(executeFunctions, itemIndex);
      case "update":
        return await BookingResource.update(executeFunctions, itemIndex);
      case "updateJourney":
        return await BookingResource.updateJourney(executeFunctions, itemIndex);
      case "delete":
        return await BookingResource.delete(executeFunctions, itemIndex);
      default:
        throw new NodeOperationError(
          executeFunctions.getNode(),
          `Unknown booking action: ${action}`,
          { itemIndex }
        );
    }
  }
}
