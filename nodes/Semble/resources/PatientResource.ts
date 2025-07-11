/**
 * @fileoverview Patient resource implementation for Semble node
 * @description Handles CRUD operations for patient management
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Resources
 */

import { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { BaseResource } from './BaseResource';

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
    const additionalFields = context.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    const mutation = `
      mutation CreatePatient($input: CreatePatientInput!) {
        createPatient(input: $input) {
          id
          firstName
          lastName
          email
          phone
          dateOfBirth
          gender
          address {
            line1
            line2
            city
            postcode
            country
          }
          emergencyContact {
            name
            phone
            relationship
          }
          createdAt
          updatedAt
        }
      }
    `;

    const variables = {
      input: {
        firstName,
        lastName,
        email,
        phone,
        ...additionalFields,
      },
    };

    const response = await this.makeRequest(context, mutation, variables, debugMode);
    return response.data.createPatient;
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
          firstName
          lastName
          email
          phone
          dateOfBirth
          gender
          address {
            line1
            line2
            city
            postcode
            country
          }
          emergencyContact {
            name
            phone
            relationship
          }
          createdAt
          updatedAt
        }
      }
    `;

    const variables = { id: patientId };
    const response = await this.makeRequest(context, query, variables, debugMode);
    return response.data.patient;
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
    const returnAll = context.getNodeParameter('returnAll', itemIndex) as boolean;
    const filters = context.getNodeParameter('filters', itemIndex) as IDataObject;

    const query = `
      query GetPatients($limit: Int, $offset: Int, $search: String) {
        patients(limit: $limit, offset: $offset, search: $search) {
          id
          firstName
          lastName
          email
          phone
          dateOfBirth
          gender
          address {
            line1
            line2
            city
            postcode
            country
          }
          emergencyContact {
            name
            phone
            relationship
          }
          createdAt
          updatedAt
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
    return response.data.patients;
  }

  /**
   * Update a patient
   * @protected
   */
  protected async update(
    context: IExecuteFunctions,
    itemIndex: number,
    debugMode: boolean
  ): Promise<IDataObject> {
    const patientId = context.getNodeParameter('patientId', itemIndex) as string;
    const updateFields = context.getNodeParameter('updateFields', itemIndex) as IDataObject;

    const mutation = `
      mutation UpdatePatient($id: ID!, $input: UpdatePatientInput!) {
        updatePatient(id: $id, input: $input) {
          id
          firstName
          lastName
          email
          phone
          dateOfBirth
          gender
          address {
            line1
            line2
            city
            postcode
            country
          }
          emergencyContact {
            name
            phone
            relationship
          }
          createdAt
          updatedAt
        }
      }
    `;

    const variables = {
      id: patientId,
      input: updateFields,
    };

    const response = await this.makeRequest(context, mutation, variables, debugMode);
    return response.data.updatePatient;
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
          success
          message
        }
      }
    `;

    const variables = { id: patientId };
    const response = await this.makeRequest(context, mutation, variables, debugMode);
    return response.data.deletePatient;
  }
}
