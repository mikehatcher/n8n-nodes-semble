/**
 * @fileoverview Patient trigger configuration for Semble node
 * @description Defines patient-specific trigger configuration and GraphQL queries
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Triggers
 */

import { TriggerResourceConfig } from './BaseTrigger';

/**
 * Patient trigger configuration
 * @const {TriggerResourceConfig} patientTriggerConfig
 * @description Configuration for patient data polling and processing
 */
export const patientTriggerConfig: TriggerResourceConfig = {
  displayName: 'Patient',
  value: 'patient',
  description: 'Triggers when patient data changes (create, update, delete)',
  dateField: 'updatedAt',
  query: `
    query GetPatients($pagination: Pagination, $dateRange: DateRange) {
      patients(
        pagination: $pagination
        options: {
          updatedAt: $dateRange
        }
      ) {
        data {
          id
          title
          status
          firstName
          lastName
          fullName
          birthSurname
          birthName
          birthNames
          dob
          placeOfBirth {
            name
            code
          }
          socialSecurityNumber
          gender
          sex
          email
          googleClientId
          paymentReference
          phones {
            phoneId
            phoneType
            phoneNumber
          }
          occupation
          address {
            address
            city
            postcode
            country
          }
          membershipName
          membershipStartDate
          membershipStartDateFormatted
          sharingToken {
            token
          }
          numbers {
            id
            name
            value
          }
          customAttributes {
            id
            title
            text
            response
            required
          }
          communicationPreferences {
            receiveEmail
            receiveSMS
            promotionalMarketing
            privacyPolicy {
              response
            }
            paymentReminders
          }
          relatedAccounts {
            relationshipId
            relationshipType
            relationshipLabel
            deleted
            contactDetails {
              relatedAccountId
              source
              sourceId
              firstName
              lastName
              title
              companyName
              phones {
                phoneId
                phoneType
                phoneNumber
              }
              email
              address
              city
              postcode
              country
              notes
              policyNumber
              authorizationCode
            }
          }
          accessGroups {
            id
            name
          }
          comments
          ins {
            oid
          }
          onHold
          episodes {
            id
            title
            startDate
            endDate
            status
          }
          labels {
            id
            color
            text
            referenceId
          }
          createdAt
          updatedAt
        }
        pageInfo {
          hasMore
        }
      }
    }
  `,
};

/**
 * UI property definition for patient resource selection
 * @const {Object} PATIENT_RESOURCE_OPTION
 */
export const PATIENT_RESOURCE_OPTION = {
  name: 'Patient',
  value: 'patient',
  description: 'Monitor patient records for changes (create, update, delete)',
};
