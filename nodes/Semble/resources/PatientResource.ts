/**
 * @fileoverview Patient resource implementation for Semble node
 * @description Handles CRUD operations for patient management
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Resources
 */

import { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { BaseResource } from './BaseResource';
import { calculateDateRangeStart } from '../triggers/BaseTrigger';

/**
 * Patient resource class
 * @class PatientResource
 * @extends BaseResource
 * @description Provides CRUD operations for patient management
 */
export class PatientResource extends BaseResource {
  readonly resourceName = 'patient';

  /**
   * Create a new patient
   * @protected
   */
  protected async create(
    context: IExecuteFunctions,
    itemIndex: number,
    debugMode: boolean
  ): Promise<IDataObject> {
    const firstName = context.getNodeParameter('firstName', itemIndex) as string;
    const lastName = context.getNodeParameter('lastName', itemIndex) as string;
    const email = context.getNodeParameter('email', itemIndex) as string;
    const phone = context.getNodeParameter('phone', itemIndex) as string;
    const phoneTypeRaw = context.getNodeParameter('phoneType', itemIndex) as string;
    const dateOfBirth = context.getNodeParameter('dateOfBirth', itemIndex) as string;
    
    // Validate phoneType
    const validPhoneTypes = ['Mobile', 'Office', 'Home', 'Fax', 'Other'];
    let phoneType: string;
    
    if (phoneTypeRaw && phoneTypeRaw.trim() !== '') {
      const phoneTypeValue = phoneTypeRaw.trim();
      if (validPhoneTypes.includes(phoneTypeValue)) {
        phoneType = phoneTypeValue;
      } else {
        throw new Error(`Invalid phone type: "${phoneTypeRaw}". Valid values are: ${validPhoneTypes.join(', ')}`);
      }
    } else {
      throw new Error('Phone type is required');
    }
    
    // Get all optional fields
    const title = context.getNodeParameter('title', itemIndex, '') as string;
    const genderRaw = context.getNodeParameter('gender', itemIndex, '') as string;
    const sexRaw = context.getNodeParameter('sex', itemIndex, '') as string;
    const birthSurname = context.getNodeParameter('birthSurname', itemIndex, '') as string;
    const birthName = context.getNodeParameter('birthName', itemIndex, '') as string;
    const birthNames = context.getNodeParameter('birthNames', itemIndex, '') as string;
    const placeOfBirth = context.getNodeParameter('placeOfBirth', itemIndex, '') as string;
    const socialSecurityNumber = context.getNodeParameter('socialSecurityNumber', itemIndex, '') as string;
    const occupation = context.getNodeParameter('occupation', itemIndex, '') as string;
    const address = context.getNodeParameter('address', itemIndex, '') as string;
    const city = context.getNodeParameter('city', itemIndex, '') as string;
    const postcode = context.getNodeParameter('postcode', itemIndex, '') as string;
    const country = context.getNodeParameter('country', itemIndex, '') as string;
    const comments = context.getNodeParameter('comments', itemIndex, '') as string;
    const onHoldRaw = context.getNodeParameter('onHold', itemIndex, '') as string;
    const emergencyContactName = context.getNodeParameter('emergencyContactName', itemIndex, '') as string;
    const emergencyContactPhone = context.getNodeParameter('emergencyContactPhone', itemIndex, '') as string;
    const emergencyContactRelationship = context.getNodeParameter('emergencyContactRelationship', itemIndex, '') as string;
    
    // Validate onHold
    const validOnHoldValues = ['true', 'false', 'yes', 'no'];
    let onHold: boolean;
    
    if (onHoldRaw && onHoldRaw.trim() !== '') {
      const onHoldValue = onHoldRaw.trim().toLowerCase();
      if (validOnHoldValues.includes(onHoldValue)) {
        onHold = onHoldValue === 'true' || onHoldValue === 'yes';
      } else {
        throw new Error(`Invalid onHold value: "${onHoldRaw}". Valid values are: ${validOnHoldValues.join(', ')}`);
      }
    } else {
      onHold = false; // Default to false if not provided
    }
    
    // Validate and process gender and sex fields
    const validGenderValues = ['male', 'female', 'other', 'prefer_not_to_say'];
    const validSexValues = ['male', 'female', 'other'];
    
    let gender: string | undefined;
    let sex: string | undefined;
    
    // Validate gender
    if (genderRaw && genderRaw.trim() !== '') {
      const genderValue = genderRaw.trim().toLowerCase();
      if (validGenderValues.includes(genderValue)) {
        gender = genderValue;
      } else {
        throw new Error(`Invalid gender value: "${genderRaw}". Valid values are: ${validGenderValues.join(', ')}`);
      }
    }
    
    // Validate sex
    if (sexRaw && sexRaw.trim() !== '') {
      const sexValue = sexRaw.trim().toLowerCase();
      if (validSexValues.includes(sexValue)) {
        sex = sexValue;
      } else {
        throw new Error(`Invalid sex value: "${sexRaw}". Valid values are: ${validSexValues.join(', ')}`);
      }
    }
    
    // No more additionalFields since we moved everything to regular fields

    const mutation = `
      mutation CreatePatient($patientData: CreatePatientDataInput!) {
        createPatient(patientData: $patientData) {
          error
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
        }
      }
    `;

    const patientData: any = {
      first: firstName,
      last: lastName,
      email,
      phoneNumber: phone,
      phoneType: phoneType,
      dob: dateOfBirth,
    };

    // Add optional fields if provided (and not empty)
    if (title && title.trim() !== '') patientData.title = title;
    if (gender) patientData.gender = gender;
    if (sex) patientData.sex = sex;
    if (birthSurname && birthSurname.trim() !== '') patientData.birthSurname = birthSurname;
    if (birthName && birthName.trim() !== '') patientData.birthName = birthName;
    if (birthNames && birthNames.trim() !== '') patientData.birthNames = birthNames;
    if (placeOfBirth && placeOfBirth.trim() !== '') patientData.placeOfBirth = placeOfBirth;
    if (socialSecurityNumber && socialSecurityNumber.trim() !== '') patientData.socialSecurityNumber = socialSecurityNumber;
    if (occupation && occupation.trim() !== '') patientData.occupation = occupation;
    if (address && address.trim() !== '') patientData.address = address;
    if (city && city.trim() !== '') patientData.city = city;
    if (postcode && postcode.trim() !== '') patientData.postcode = postcode;
    if (country && country.trim() !== '') patientData.country = country;
    if (comments && comments.trim() !== '') patientData.comments = comments;
    if (onHold) patientData.onHold = onHold;
    if (emergencyContactName && emergencyContactName.trim() !== '') patientData.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone && emergencyContactPhone.trim() !== '') patientData.emergencyContactPhone = emergencyContactPhone;
    if (emergencyContactRelationship && emergencyContactRelationship.trim() !== '') patientData.emergencyContactRelationship = emergencyContactRelationship;

    const variables = {
      patientData
    };

    const response = await this.makeRequest(context, mutation, variables, debugMode);
    
    if (debugMode && response) {
      // Log the response structure for debugging
      try {
        const responseStr = JSON.stringify(response, null, 2);
        // Simple logging fallback since n8n logger is complex
      } catch (e) {
        // Ignore logging errors
      }
    }
    
    if (!response || !response.createPatient) {
      throw new Error('Create patient response is null or undefined. Response: ' + JSON.stringify(response));
    }
    
    // Check for API error in the PatientResponsePayload
    if (response.createPatient.error) {
      throw new Error('Semble API Error: ' + response.createPatient.error);
    }
    
    if (!response.createPatient.data) {
      throw new Error('Create patient data is null or undefined. This might indicate a validation error or API issue. Response: ' + JSON.stringify(response.createPatient));
    }
    
    return response.createPatient.data;
  }

  /**
   * Get a patient by ID
   * @protected
   */
  protected async get(
    context: IExecuteFunctions,
    itemIndex: number,
    debugMode: boolean
  ): Promise<IDataObject> {
    const patientId = context.getNodeParameter('patientId', itemIndex) as string;

    const query = `
      query GetPatient($id: ID!) {
        patient(id: $id) {
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
      }
    `;

    const variables = { id: patientId };
    const response = await this.makeRequest(context, query, variables, debugMode);
    return response.patient;
  }

  /**
   * Get all patients
   * @protected
   */
  protected async getAll(
    context: IExecuteFunctions,
    itemIndex: number,
    debugMode: boolean
  ): Promise<IDataObject[]> {
    const filters = context.getNodeParameter('filters', itemIndex) as IDataObject;

    const query = `
      query GetPatients($pagination: Pagination, $search: String, $options: QueryOptions) {
        patients(
          pagination: $pagination
          search: $search
          options: $options
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
    `;

    // Build variables object
    const variables: IDataObject = {};
    
    // Handle search filter
    if (filters.search) {
      variables.search = filters.search;
    }
    
    // Handle date period filter (like triggers)
    const options: IDataObject = {};
    if (filters.datePeriod && filters.datePeriod !== 'all') {
      const dateField = (filters.dateField as string) || 'updatedAt'; // Default to updatedAt like triggers
      const currentTime = new Date();
      const dateRangeStart = calculateDateRangeStart(filters.datePeriod as string);
      
      options[dateField] = {
        start: dateRangeStart.toISOString().split('T')[0], // Format as YYYY-MM-DD
        end: currentTime.toISOString().split('T')[0] // Format as YYYY-MM-DD
      };
    }
    
    // Add options to variables if any filters are set
    if (Object.keys(options).length > 0) {
      variables.options = options;
    }

    // Get all patients by paginating through all pages
    const allPatients: IDataObject[] = [];
    let currentPage = 1;
    let hasMore = true;
    
    while (hasMore) {
      variables.pagination = { page: currentPage, pageSize: 100 }; // Use larger page size for efficiency
      
      const response = await this.makeRequest(context, query, variables, debugMode);
      const patients = response.patients.data;
      
      allPatients.push(...patients);
      
      hasMore = response.patients.pageInfo.hasMore;
      currentPage++;
      
      // Safety check to prevent infinite loops
      if (currentPage > 1000) {
        break;
      }
    }
    
    return allPatients;
  }

  /**
   * Maps create fields from UI names to API field names
   * Filters out unsupported fields that are shown in UI for reference only
   * @private
   */
  private mapCreateFields(additionalFields: IDataObject): IDataObject {
    const mappedFields: IDataObject = {};
    
    // Fields that are not supported in CreatePatientDataInput
    const unsupportedFields = ['phone', 'emergencyContact'];
    
    for (const [key, value] of Object.entries(additionalFields)) {
      // Skip unsupported fields
      if (unsupportedFields.includes(key)) {
        continue;
      }
      
      switch (key) {
        case 'firstName':
          mappedFields.first = value;
          break;
        case 'lastName':
          mappedFields.last = value;
          break;
        case 'dateOfBirth':
          mappedFields.dob = value;
          break;
        default:
          // For all other supported fields, use the same name
          // Fields like: email, title, address, city, postcode, country, paymentReference, comments,
          // gender, sex, birthSurname, birthName, socialSecurityNumber, occupation, membershipName,
          // onHold, placeOfBirth, communicationPreferences, numbers, customAttributes
          mappedFields[key] = value;
          break;
      }
    }

    return mappedFields;
  }

  /**
   * Maps update fields from UI names to API field names
   * Filters out unsupported fields that are shown in UI for reference only
   * @private
   */
  private mapUpdateFields(updateFields: IDataObject): IDataObject {
    const mappedFields: IDataObject = {};
    
    // Fields that are not supported in UpdatePatientDataInput
    const unsupportedFields = ['phone', 'emergencyContact'];
    
    for (const [key, value] of Object.entries(updateFields)) {
      // Skip unsupported fields
      if (unsupportedFields.includes(key)) {
        continue;
      }
      
      switch (key) {
        case 'firstName':
          mappedFields.first = value;
          break;
        case 'lastName':
          mappedFields.last = value;
          break;
        case 'dateOfBirth':
          mappedFields.dob = value;
          break;
        case 'onHold':
          // Validate onHold field
          if (value && typeof value === 'string' && value.trim() !== '') {
            const validOnHoldValues = ['true', 'false', 'yes', 'no'];
            const onHoldValue = value.trim().toLowerCase();
            if (validOnHoldValues.includes(onHoldValue)) {
              mappedFields.onHold = onHoldValue === 'true' || onHoldValue === 'yes';
            } else {
              throw new Error(`Invalid onHold value: "${value}". Valid values are: ${validOnHoldValues.join(', ')}`);
            }
          } else {
            mappedFields.onHold = false; // Default to false if empty
          }
          break;
        default:
          // For all other supported fields, use the same name
          // Fields like: email, title, address, city, postcode, country, paymentReference, comments,
          // gender, sex, birthSurname, birthName, socialSecurityNumber, occupation, membershipName,
          // placeOfBirth, communicationPreferences, numbers, customAttributes
          mappedFields[key] = value;
          break;
      }
    }

    return mappedFields;
  }

  /**
   * Update a patient
   * @protected
   */  protected async update(
    context: IExecuteFunctions,
    itemIndex: number,
    debugMode: boolean
  ): Promise<IDataObject> {
    const patientId = context.getNodeParameter('patientId', itemIndex) as string;
    const updateFields = context.getNodeParameter('updateFields', itemIndex) as IDataObject;

    const mutation = `
      mutation UpdatePatient($id: ID!, $patientData: UpdatePatientDataInput!) {
        updatePatient(id: $id, patientData: $patientData) {
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
        }
      }
    `;

    const variables = {
      id: patientId,
      patientData: this.mapUpdateFields(updateFields),
    };

    const response = await this.makeRequest(context, mutation, variables, debugMode);
    return response.updatePatient.data;
  }

  /**
   * Delete a patient
   * @protected
   */
  protected async delete(
    context: IExecuteFunctions,
    itemIndex: number,
    debugMode: boolean
  ): Promise<IDataObject> {
    const patientId = context.getNodeParameter('patientId', itemIndex) as string;

    const mutation = `
      mutation DeletePatient($id: ID!) {
        deletePatient(id: $id) {
          error
          data {
            id
            firstName
            lastName
            fullName
            status
          }
        }
      }
    `;

    const variables = { id: patientId };
    const response = await this.makeRequest(context, mutation, variables, debugMode);
    return response.deletePatient;
  }
}
