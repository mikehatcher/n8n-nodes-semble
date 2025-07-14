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
    const doctorId = context.getNodeParameter('doctorId', itemIndex) as string;
    const locationId = context.getNodeParameter('locationId', itemIndex) as string;
    const bookingTypeId = context.getNodeParameter('bookingTypeId', itemIndex) as string;
    const startTimeRaw = context.getNodeParameter('startTime', itemIndex) as string;
    const endTimeRaw = context.getNodeParameter('endTime', itemIndex) as string;
    
    // Validate and process start time
    const startTime = this.validateDateTime(startTimeRaw, 'startTime');
    
    // Validate and process end time
    const endTime = this.validateDateTime(endTimeRaw, 'endTime');
    
    // Get individual fields instead of additionalFields
    const comments = context.getNodeParameter('comments', itemIndex, '') as string;
    const videoUrl = context.getNodeParameter('videoUrl', itemIndex, '') as string;
    const reference = context.getNodeParameter('reference', itemIndex, '') as string;
    const billedRaw = context.getNodeParameter('billed', itemIndex, 'false') as string;
    const onlineBookingPaymentStatus = context.getNodeParameter('onlineBookingPaymentStatus', itemIndex, '') as string;
    
    // Validate billed field
    const billed = this.validateBoolean(billedRaw, 'billed');
    
    // Get patient message settings and validate
    const sendConfirmationMessageRaw = context.getNodeParameter('sendConfirmationMessage', itemIndex, 'true') as string;
    const sendReminderMessageRaw = context.getNodeParameter('sendReminderMessage', itemIndex, 'true') as string;
    const sendFollowupMessageRaw = context.getNodeParameter('sendFollowupMessage', itemIndex, 'false') as string;
    const sendCancellationMessageRaw = context.getNodeParameter('sendCancellationMessage', itemIndex, 'false') as string;
    
    // Validate patient message settings
    const sendConfirmationMessage = this.validateBoolean(sendConfirmationMessageRaw, 'sendConfirmationMessage');
    const sendReminderMessage = this.validateBoolean(sendReminderMessageRaw, 'sendReminderMessage');
    const sendFollowupMessage = this.validateBoolean(sendFollowupMessageRaw, 'sendFollowupMessage');
    const sendCancellationMessage = this.validateBoolean(sendCancellationMessageRaw, 'sendCancellationMessage');

    const mutation = `
      mutation CreateBooking($bookingData: BookingDataInput!) {
        createBooking(bookingData: $bookingData) {
          error
          data {
            id
            deleted
            cancellationReason
            doctorName
            doctor {
              id
              firstName
              lastName
              email
            }
            location {
              id
              name
              address {
                address
                city
                postcode
                country
              }
            }
            appointment {
              id
              title
              duration
              price
            }
            start
            end
            patient {
              id
              firstName
              lastName
              email
            }
            patientId
            bookingJourney {
              arrived
              consultation
              departed
              dna
            }
            createdAt
            updatedAt
            videoUrl
            comments
            reference
            billed
            patientMessagesSent {
              confirmation
              reminder
              followup
              cancellation
            }
            onlineBookingPaymentStatus
          }
        }
      }
    `;

    const bookingData: IDataObject = {
      patient: patientId,
      doctor: doctorId,
      location: locationId,
      bookingType: bookingTypeId,
      start: startTime,
      end: endTime,
      comments,
      videoUrl,
      reference,
      billed,
      onlineBookingPaymentStatus,
      sendPatientMessages: {
        confirmation: sendConfirmationMessage,
        reminder: sendReminderMessage,
        followup: sendFollowupMessage,
        cancellation: sendCancellationMessage,
      },
    };

    const variables = { bookingData };
    const response = await this.makeRequest(context, mutation, variables, debugMode);
    return response.createBooking;
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
          deleted
          cancellationReason
          doctorName
          doctor {
            id
            firstName
            lastName
            email
          }
          location {
            id
            name
            address {
              address
              city
              postcode
              country
            }
          }
          appointment {
            id
            title
            duration
            price
          }
          start
          end
          patient {
            id
            firstName
            lastName
            email
          }
          patientId
          bookingJourney {
            arrived
            consultation
            departed
            dna
          }
          createdAt
          updatedAt
          videoUrl
          comments
          reference
          billed
          patientMessagesSent {
            confirmation
            reminder
            followup
            cancellation
          }
          onlineBookingPaymentStatus
        }
      }
    `;

    const variables = { id: bookingId };
    const response = await this.makeRequest(context, query, variables, debugMode);
    return response.booking;
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
      query GetBookings($limit: Int, $offset: Int, $patientId: ID, $doctorId: ID, $locationId: ID, $dateFrom: DateTime, $dateTo: DateTime, $deleted: Boolean) {
        bookings(limit: $limit, offset: $offset, patientId: $patientId, doctorId: $doctorId, locationId: $locationId, dateFrom: $dateFrom, dateTo: $dateTo, deleted: $deleted) {
          data {
            id
            deleted
            cancellationReason
            doctorName
            doctor {
              id
              firstName
              lastName
              email
            }
            location {
              id
              name
              address {
                address
                city
                postcode
                country
              }
            }
            appointment {
              id
              title
              duration
              price
            }
            start
            end
            patient {
              id
              firstName
              lastName
              email
            }
            patientId
            bookingJourney {
              arrived
              consultation
              departed
              dna
            }
            createdAt
            updatedAt
            videoUrl
            comments
            reference
            billed
            patientMessagesSent {
              confirmation
              reminder
              followup
              cancellation
            }
            onlineBookingPaymentStatus
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
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
    return response.bookings.data;
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
      mutation UpdateBooking($id: ID!, $bookingData: BookingDataInput!) {
        updateBooking(id: $id, bookingData: $bookingData) {
          error
          data {
            id
            deleted
            cancellationReason
            doctorName
            doctor {
              id
              firstName
              lastName
              email
            }
            location {
              id
              name
              address {
                address
                city
                postcode
                country
              }
            }
            appointment {
              id
              title
              duration
              price
            }
            start
            end
            patient {
              id
              firstName
              lastName
              email
            }
            patientId
            bookingJourney {
              arrived
              consultation
              departed
              dna
            }
            createdAt
            updatedAt
            videoUrl
            comments
            reference
            billed
            patientMessagesSent {
              confirmation
              reminder
              followup
              cancellation
            }
            onlineBookingPaymentStatus
          }
        }
      }
    `;

    // Map field names to match API expectations and validate
    const bookingData: IDataObject = {};
    for (const [key, value] of Object.entries(updateFields)) {
      switch (key) {
        case 'doctorId':
          bookingData.doctor = value;
          break;
        case 'locationId':
          bookingData.location = value;
          break;
        case 'bookingTypeId':
          bookingData.bookingType = value;
          break;
        case 'startTime':
          bookingData.start = this.validateDateTime(value as string, 'startTime');
          break;
        case 'endTime':
          bookingData.end = this.validateDateTime(value as string, 'endTime');
          break;
        default:
          bookingData[key] = value;
          break;
      }
    }

    const variables = { id: bookingId, bookingData };
    const response = await this.makeRequest(context, mutation, variables, debugMode);
    return response.updateBooking;
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
    const sendCancellationMessages = context.getNodeParameter('sendCancellationMessages', itemIndex, false) as boolean;

    const mutation = `
      mutation DeleteBooking($id: ID!, $sendCancellationMessages: Boolean) {
        deleteBooking(id: $id, sendCancellationMessages: $sendCancellationMessages) {
          error
          data {
            id
            deleted
            cancellationReason
            doctorName
            doctor {
              id
              firstName
              lastName
              email
            }
            location {
              id
              name
              address {
                address
                city
                postcode
                country
              }
            }
            appointment {
              id
              title
              duration
              price
            }
            start
            end
            patient {
              id
              firstName
              lastName
              email
            }
            patientId
            bookingJourney {
              arrived
              consultation
              departed
              dna
            }
            createdAt
            updatedAt
            videoUrl
            comments
            reference
            billed
            patientMessagesSent {
              confirmation
              reminder
              followup
              cancellation
            }
            onlineBookingPaymentStatus
          }
        }
      }
    `;

    const variables = { id: bookingId, sendCancellationMessages };
    const response = await this.makeRequest(context, mutation, variables, debugMode);
    return response.deleteBooking;
  }

  /**
   * Validates and formats datetime string
   */
  private validateDateTime(dateTimeRaw: string, fieldName: string): string {
    if (!dateTimeRaw || dateTimeRaw.trim() === '') {
      throw new Error(`${fieldName} is required`);
    }

    const dateTime = dateTimeRaw.trim();
    
    // Check if it's in ISO format with T separator
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?$/;
    
    // Check if it's in space-separated format
    const spaceRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    
    if (isoRegex.test(dateTime)) {
      return dateTime;
    } else if (spaceRegex.test(dateTime)) {
      // Convert space-separated format to ISO format
      return dateTime.replace(' ', 'T');
    } else {
      throw new Error(`Invalid ${fieldName} format: "${dateTimeRaw}". Expected formats: YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD HH:MM:SS`);
    }
  }

  /**
   * Validates and converts string to boolean
   */
  private validateBoolean(booleanRaw: string, fieldName: string): boolean {
    if (!booleanRaw || booleanRaw.trim() === '') {
      return false; // Default to false if empty
    }

    const validBooleanValues = ['true', 'false', 'yes', 'no'];
    const booleanValue = booleanRaw.trim().toLowerCase();
    
    if (validBooleanValues.includes(booleanValue)) {
      return booleanValue === 'true' || booleanValue === 'yes';
    } else {
      throw new Error(`Invalid ${fieldName} value: "${booleanRaw}". Valid values are: ${validBooleanValues.join(', ')}`);
    }
  }
}
