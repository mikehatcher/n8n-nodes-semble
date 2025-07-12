/**
 * @fileoverview Booking trigger functionality for Semble n8n nodes
 * @description This module provides booking-specific trigger logic
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Triggers.Booking
 */

import { TriggerResourceConfig } from './BaseTrigger';

/**
 * Booking trigger resource configuration
 * @const {TriggerResourceConfig} BOOKING_TRIGGER_CONFIG
 */
export const BOOKING_TRIGGER_CONFIG: TriggerResourceConfig = {
  displayName: 'Booking',
  value: 'booking',
  description: 'Monitor bookings/appointments for changes (appointments are just a new UI view for the same data)',
  query: `
    query GetBookings($pagination: Pagination, $dateRange: DateRange) {
      bookings(pagination: $pagination, dateRange: $dateRange) {
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
          page
          pageSize
          hasMore
        }
      }
    }
  `,
  dateField: 'updatedAt'
};

/**
 * UI property definition for booking resource selection
 * @const {Object} BOOKING_RESOURCE_OPTION
 */
export const BOOKING_RESOURCE_OPTION = {
  name: 'Booking',
  value: 'booking',
  description: 'Monitor bookings/appointments for changes (appointments are just a new UI view for bookings)'
};
