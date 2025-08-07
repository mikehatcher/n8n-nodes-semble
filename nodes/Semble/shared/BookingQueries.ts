/**
 * @fileoverview Booking-specific GraphQL queries and field definitions
 * @description Complete booking operations with CRUD mutations and queries following established patterns
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Nodes.Shared
 */

/**
 * Complete booking fields for GraphQL queries
 * Includes ALL verified accessible booking fields from Semble API
 * Updated with actual API testing to confirm field availability and permissions
 */
export const BOOKING_FIELDS = `
  id
  deleted
  cancellationReason
  doctorName
  start
  end
  createdAt
  updatedAt
  videoUrl
  comments
  reference
  billed
  patientId
  onlineBookingPaymentStatus
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
  appointment {
    id
    title
    duration
    price
  }
  bookingJourney {
    arrived
    consultation
    departed
    dna
  }
  patientMessagesSent {
    confirmation
    reminder
    followup
    cancellation
  }
`;

/**
 * Booking fields with doctor information (requires settingsSeeUsers permission)
 * Use this when the user has appropriate permissions to see doctor details
 */
export const BOOKING_FIELDS_WITH_DOCTOR = `
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
  start
  end
  createdAt
  updatedAt
  videoUrl
  comments
  reference
  billed
  patientId
  onlineBookingPaymentStatus
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
  appointment {
    id
    title
    duration
    price
  }
  bookingJourney {
    arrived
    consultation
    departed
    dna
  }
  patientMessagesSent {
    confirmation
    reminder
    followup
    cancellation
  }
`;

/**
 * Basic booking fields for minimal permission levels
 * Includes only essential booking information
 */
export const BOOKING_FIELDS_BASIC = `
  id
  start
  end
  createdAt
  updatedAt
  patient {
    id
    firstName
    lastName
  }
  location {
    id
    name
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
 *   baseVariables: { 
 *     dateRange: { start: '2024-01-01', end: '2024-12-31' },
 *     options: {}
 *   },
 *   dataPath: 'bookings',
 *   pageSize: paginationConfig.pageSize,
 *   returnAll: paginationConfig.returnAll
 * });
 */
export const GET_BOOKINGS_QUERY = `
  query GetBookings($pagination: Pagination, $options: QueryOptions, $dateRange: DateRange) {
    bookings(
      pagination: $pagination
      options: $options
      dateRange: $dateRange
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

/**
 * GraphQL mutation for updating a booking's journey stage
 * High priority - commonly used for patient flow management
 */
export const UPDATE_BOOKING_JOURNEY_MUTATION = `
  mutation UpdateBookingJourney($id: ID!, $journeyStage: JourneyStage!, $date: Date) {
    updateBookingJourney(
      id: $id, 
      bookingJourneyInput: {
        journeyStage: $journeyStage,
        date: $date
      }
    ) {
      data {
        ${BOOKING_FIELDS}
      }
      error
    }
  }
`;
