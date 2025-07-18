/**
 * @fileoverview Booking-specific GraphQL queries and field definitions
 * @description Example of how to use the modular pagination system for other data types
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Nodes.Shared
 */

/**
 * Complete booking fields for GraphQL queries
 * Example showing how other data types can use the same pagination pattern
 */
export const BOOKING_FIELDS = `
  id
  status
  startTime
  endTime
  duration
  notes
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
  practitioner {
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
 * GraphQL mutation for deleting a booking
 */
export const DELETE_BOOKING_MUTATION = `
  mutation DeleteBooking($id: ID!) {
    deleteBooking(id: $id) {
      data {
        id
        status
        startTime
        endTime
      }
      error
    }
  }
`;
