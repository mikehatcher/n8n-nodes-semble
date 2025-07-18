/**
 * @fileoverview Patient-specific GraphQL queries and field definitions
 * @description Provides reusable patient queries for use with pagination helpers
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Nodes.Shared
 */

/**
 * Complete patient fields for GraphQL queries
 * Includes all scalar fields and complex objects
 */
export const PATIENT_FIELDS = `
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
  socialSecurityNumber
  gender
  sex
  email
  googleClientId
  paymentReference
  occupation
  membershipName
  membershipStartDate
  membershipStartDateFormatted
  createdAt
  updatedAt
  comments
  onHold
  placeOfBirth {
    name
    code
  }
  phones {
    phoneId
    phoneType
    phoneNumber
  }
  address {
    address
    city
    postcode
    country
  }
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
    paymentReminders
    privacyPolicy {
      response
    }
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
  labels {
    id
    color
    text
    referenceId
  }
  accessGroups {
    id
    name
    label
  }
`;

/**
 * GraphQL query for getting a single patient by ID
 */
export const GET_PATIENT_QUERY = `
  query GetPatient($id: ID!) {
    patient(id: $id) {
      ${PATIENT_FIELDS}
    }
  }
`;

/**
 * GraphQL query for getting multiple patients with pagination
 */
export const GET_PATIENTS_QUERY = `
  query GetPatients($pagination: Pagination, $search: String, $options: QueryOptions) {
    patients(
      pagination: $pagination
      search: $search
      options: $options
    ) {
      data {
        ${PATIENT_FIELDS}
      }
      pageInfo {
        hasMore
      }
    }
  }
`;

/**
 * GraphQL mutation for deleting a patient
 */
export const DELETE_PATIENT_MUTATION = `
  mutation DeletePatient($id: ID!) {
    deletePatient(id: $id) {
      data {
        id
        firstName
        lastName
        status
      }
      error
    }
  }
`;
