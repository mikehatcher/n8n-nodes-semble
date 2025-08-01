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
    const paginationConfig = buildPaginationConfig(options);

    try {
      const baseVariables: IDataObject = {};

      // Add date filtering if provided
      if (options.startDate) {
        baseVariables.startDate = options.startDate;
      }
      if (options.endDate) {
        baseVariables.endDate = options.endDate;
      }

      // Add status filtering if provided
      if (options.status) {
        baseVariables.status = options.status;
      }

      // Add patient filtering if provided
      if (options.patientId) {
        baseVariables.patientId = options.patientId;
      }

      // Add practitioner filtering if provided
      if (options.practitionerId) {
        baseVariables.practitionerId = options.practitionerId;
      }

      const result = await SemblePagination.execute(executeFunctions, {
        query: GET_BOOKINGS_QUERY,
        baseVariables,
        dataPath: "bookings",
        pageSize: paginationConfig.pageSize,
        returnAll: paginationConfig.returnAll,
        search: paginationConfig.search,
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
