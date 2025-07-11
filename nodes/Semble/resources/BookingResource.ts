/**
 * @fileoverview Booking resource implementation for Semble node
 * @description Implements CRUD operations for booking management
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Resources
 */

import { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { BaseResource } from './BaseResource';

/**
 * Booking resource class
 * @class BookingResource
 * @extends {BaseResource}
 * @description Handles booking CRUD operations
 */
export class BookingResource extends BaseResource {
  readonly resourceName = 'booking';

  /**
   * Create a new booking
   * @protected
   */
  protected async create(
    context: IExecuteFunctions,
    itemIndex: number,
    debugMode: boolean
  ): Promise<IDataObject> {
    const patientId = context.getNodeParameter('patientId', itemIndex) as string;
    const staffId = context.getNodeParameter('staffId', itemIndex) as string;
    const bookingTypeId = context.getNodeParameter('bookingTypeId', itemIndex) as string;
    const startTime = context.getNodeParameter('startTime', itemIndex) as string;
    const endTime = context.getNodeParameter('endTime', itemIndex) as string;
    const additionalFields = context.getNodeParameter('additionalFields', itemIndex) as IDataObject;

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

    const response = await this.makeRequest(context, mutation, variables, debugMode);
    return response.data.createBooking;
  }

  /**
   * Get a booking by ID
   * @protected
   */
  protected async get(
    context: IExecuteFunctions,
    itemIndex: number,
    debugMode: boolean
  ): Promise<IDataObject> {
    const bookingId = context.getNodeParameter('bookingId', itemIndex) as string;

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
    const response = await this.makeRequest(context, query, variables, debugMode);
    return response.data.booking;
  }

  /**
   * Get all bookings
   * @protected
   */
  protected async getAll(
    context: IExecuteFunctions,
    itemIndex: number,
    debugMode: boolean
  ): Promise<IDataObject[]> {
    const returnAll = context.getNodeParameter('returnAll', itemIndex) as boolean;
    const filters = context.getNodeParameter('filters', itemIndex) as IDataObject;

    const query = `
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
      variables.limit = context.getNodeParameter('limit', itemIndex) as number;
    }

    // Apply filters if provided
    Object.assign(variables, filters);

    const response = await this.makeRequest(context, query, variables, debugMode);
    return response.data.bookings;
  }

  /**
   * Update a booking
   * @protected
   */
  protected async update(
    context: IExecuteFunctions,
    itemIndex: number,
    debugMode: boolean
  ): Promise<IDataObject> {
    const bookingId = context.getNodeParameter('bookingId', itemIndex) as string;
    const updateFields = context.getNodeParameter('updateFields', itemIndex) as IDataObject;

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

    const response = await this.makeRequest(context, mutation, variables, debugMode);
    return response.data.updateBooking;
  }

  /**
   * Delete a booking
   * @protected
   */
  protected async delete(
    context: IExecuteFunctions,
    itemIndex: number,
    debugMode: boolean
  ): Promise<IDataObject> {
    const bookingId = context.getNodeParameter('bookingId', itemIndex) as string;

    const mutation = `
      mutation DeleteBooking($id: ID!) {
        deleteBooking(id: $id) {
          success
          message
        }
      }
    `;

    const variables = { id: bookingId };
    const response = await this.makeRequest(context, mutation, variables, debugMode);
    return response.data.deleteBooking;
  }
}
