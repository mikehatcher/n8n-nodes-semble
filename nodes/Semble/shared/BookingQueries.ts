/**
 * @fileoverview Booking-specific GraphQL queries and field definitions
 * @description Complete booking operations with CRUD mutations and queries following established patterns
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Nodes.Shared
 */

/**
 * Complete booking fields for GraphQL queries
 * Includes all essential booking information and related entities
 * Updated to match actual API schema
 */
export const BOOKING_FIELDS = `
  id
  status
  start
  end
  duration
  comments
  createdAt
  updatedAt
  patient {
    id
    firstName
    lastName
    email
  }
  location {
    id
    name
  }
  doctor {
    id
    firstName
    lastName
  }
  bookingType {
    id
    name
    duration
  }
`;

/**
 * GraphQL query for getting a single booking by ID
 */
export const GET_BOOKING_QUERY = `
  query GetBooking($id: ID!) {
    booking(id: $id) {
      ${BOOKING_FIELDS}
    }
  }
`;

/**
 * GraphQL query for getting multiple bookings with pagination
 * Example usage with the modular pagination system:
 * 
 * const paginationResult = await SemblePagination.execute(this, {
 *   query: GET_BOOKINGS_QUERY,
 *   baseVariables: {},
 *   dataPath: 'bookings',
 *   pageSize: paginationConfig.pageSize,
 *   returnAll: paginationConfig.returnAll,
 *   search: paginationConfig.search,
 *   options: { startDate: '2024-01-01', endDate: '2024-12-31' }
 * });
 */
export const GET_BOOKINGS_QUERY = `
  query GetBookings($pagination: Pagination, $search: String, $options: QueryOptions) {
    bookings(
      pagination: $pagination
      search: $search
      options: $options
    ) {
      data {
        ${BOOKING_FIELDS}
      }
      pageInfo {
        hasMore
      }
    }
  }
`;

/**
 * GraphQL mutation for creating a new booking
 * Updated to match actual API schema
 */
export const CREATE_BOOKING_MUTATION = `
  mutation CreateBooking(
    $patient: ID!
    $location: ID!
    $bookingType: ID!
    $doctor: ID!
    $comments: String
    $start: Date!
    $end: Date!
    $bookingData: BookingDataInput
  ) {
    createBooking(
      patient: $patient
      location: $location
      bookingType: $bookingType
      doctor: $doctor
      comments: $comments
      start: $start
      end: $end
      bookingData: $bookingData
    ) {
      data {
        ${BOOKING_FIELDS}
      }
      error
    }
  }
`;

/**
 * GraphQL mutation for updating an existing booking
 * Updated to match actual API schema
 */
export const UPDATE_BOOKING_MUTATION = `
  mutation UpdateBooking($id: ID!, $bookingData: BookingDataInput) {
    updateBooking(id: $id, bookingData: $bookingData) {
      data {
        ${BOOKING_FIELDS}
      }
      error
    }
  }
`;

/**
 * GraphQL mutation for deleting a booking
 * Updated to match actual API schema with sendCancellationMessages
 */
export const DELETE_BOOKING_MUTATION = `
  mutation DeleteBooking($id: ID!, $sendCancellationMessages: Boolean) {
    deleteBooking(id: $id, sendCancellationMessages: $sendCancellationMessages) {
      data {
        id
        status
        start
        end
      }
      error
    }
  }
`;
