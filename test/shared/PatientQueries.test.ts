/**
 * @fileoverview Tests for Patient GraphQL queries and field definitions
 * @description Tests for shared patient query constants and field definitions
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Shared
 */

import { 
  GET_PATIENT_QUERY, 
  GET_PATIENTS_QUERY, 
  CREATE_PATIENT_MUTATION,
  UPDATE_PATIENT_MUTATION,
  DELETE_PATIENT_MUTATION,
  PATIENT_FIELDS 
} from '../../nodes/Semble/shared/PatientQueries';

describe('PatientQueries', () => {
  describe('PATIENT_FIELDS', () => {
    it('should contain required scalar fields', () => {
      expect(PATIENT_FIELDS).toContain('id');
      expect(PATIENT_FIELDS).toContain('firstName');
      expect(PATIENT_FIELDS).toContain('lastName');
      expect(PATIENT_FIELDS).toContain('email');
      expect(PATIENT_FIELDS).toContain('dob'); // Semble uses 'dob' not 'dateOfBirth'
      expect(PATIENT_FIELDS).toContain('status');
      expect(PATIENT_FIELDS).toContain('createdAt');
      expect(PATIENT_FIELDS).toContain('updatedAt');
    });

    it('should contain address fields', () => {
      expect(PATIENT_FIELDS).toContain('address {');
      expect(PATIENT_FIELDS).toContain('address'); // Semble address structure
      expect(PATIENT_FIELDS).toContain('city');
      expect(PATIENT_FIELDS).toContain('postcode');
      expect(PATIENT_FIELDS).toContain('country');
    });

    it('should contain phones fields', () => {
      expect(PATIENT_FIELDS).toContain('phones {');
      expect(PATIENT_FIELDS).toContain('phoneId');
      expect(PATIENT_FIELDS).toContain('phoneType');
      expect(PATIENT_FIELDS).toContain('phoneNumber');
    });

    it('should contain communication preference fields', () => {
      expect(PATIENT_FIELDS).toContain('communicationPreferences {');
      expect(PATIENT_FIELDS).toContain('receiveEmail');
      expect(PATIENT_FIELDS).toContain('receiveSMS');
      expect(PATIENT_FIELDS).toContain('promotionalMarketing');
    });
  });

  describe('GET_PATIENT_QUERY', () => {
    it('should be a valid GraphQL query structure', () => {
      expect(GET_PATIENT_QUERY).toContain('query GetPatient');
      expect(GET_PATIENT_QUERY).toContain('$id: ID!');
      expect(GET_PATIENT_QUERY).toContain('patient(id: $id)');
      expect(GET_PATIENT_QUERY).toContain(PATIENT_FIELDS);
    });

    it('should include all patient fields', () => {
      expect(GET_PATIENT_QUERY).toContain('firstName');
      expect(GET_PATIENT_QUERY).toContain('lastName');
      expect(GET_PATIENT_QUERY).toContain('email');
      expect(GET_PATIENT_QUERY).toContain('address {');
      expect(GET_PATIENT_QUERY).toContain('phones {');
    });
  });

  describe('GET_PATIENTS_QUERY', () => {
    it('should be a valid GraphQL query structure', () => {
      expect(GET_PATIENTS_QUERY).toContain('query GetPatients');
      expect(GET_PATIENTS_QUERY).toContain('$pagination: Pagination'); // Semble uses Pagination type
      expect(GET_PATIENTS_QUERY).toContain('$search: String');
      expect(GET_PATIENTS_QUERY).toContain('patients(');
    });

    it('should include pagination fields', () => {
      expect(GET_PATIENTS_QUERY).toContain('data {');
      expect(GET_PATIENTS_QUERY).toContain('pageInfo {');
      expect(GET_PATIENTS_QUERY).toContain('hasMore');
    });

    it('should include all patient fields in data section', () => {
      expect(GET_PATIENTS_QUERY).toContain(PATIENT_FIELDS);
    });
  });

  describe('DELETE_PATIENT_MUTATION', () => {
    it('should be a valid GraphQL mutation structure', () => {
      expect(DELETE_PATIENT_MUTATION).toContain('mutation DeletePatient');
      expect(DELETE_PATIENT_MUTATION).toContain('$id: ID!');
      expect(DELETE_PATIENT_MUTATION).toContain('deletePatient(id: $id)');
    });

    it('should include error and data fields', () => {
      expect(DELETE_PATIENT_MUTATION).toContain('error');
      expect(DELETE_PATIENT_MUTATION).toContain('data {');
      expect(DELETE_PATIENT_MUTATION).toContain('id');
      expect(DELETE_PATIENT_MUTATION).toContain('firstName');
      expect(DELETE_PATIENT_MUTATION).toContain('lastName');
    });

    it('should return minimal fields on delete', () => {
      // Delete mutation should only return essential fields, not all patient data
      expect(DELETE_PATIENT_MUTATION).toContain('firstName');
      expect(DELETE_PATIENT_MUTATION).toContain('lastName');
      expect(DELETE_PATIENT_MUTATION).not.toContain('address {');
      expect(DELETE_PATIENT_MUTATION).not.toContain('emergencyContact {');
    });
  });

  describe('query validation', () => {
    it('should have consistent variable naming', () => {
      // All queries should use consistent variable naming patterns
      expect(GET_PATIENT_QUERY).toContain('$id: ID!');
      expect(DELETE_PATIENT_MUTATION).toContain('$id: ID!');
      expect(GET_PATIENTS_QUERY).toContain('$pagination: Pagination'); // Semble uses Pagination type
      expect(GET_PATIENTS_QUERY).toContain('$search: String');
    });

    it('should not contain syntax errors', () => {
      // Basic syntax validation - should not contain common GraphQL errors
      const queries = [GET_PATIENT_QUERY, GET_PATIENTS_QUERY, CREATE_PATIENT_MUTATION, DELETE_PATIENT_MUTATION];
      
      queries.forEach(query => {
        // Should have balanced braces
        const openBraces = (query.match(/{/g) || []).length;
        const closeBraces = (query.match(/}/g) || []).length;
        expect(openBraces).toBe(closeBraces);
        
        // Should not have trailing commas before closing braces
        expect(query).not.toMatch(/,\s*}/);
        
        // Should not contain undefined variables
        expect(query).not.toMatch(/\$undefined/);
      });
    });
  });

  describe('CREATE_PATIENT_MUTATION', () => {
    it('should be a valid GraphQL mutation structure', () => {
      expect(CREATE_PATIENT_MUTATION).toContain('mutation CreatePatient');
      expect(CREATE_PATIENT_MUTATION).toContain('$patientData: CreatePatientDataInput!');
      expect(CREATE_PATIENT_MUTATION).toContain('createPatient(');
      expect(CREATE_PATIENT_MUTATION).toContain('insData: $insData');
      expect(CREATE_PATIENT_MUTATION).toContain('patientData: $patientData');
    });

    it('should include error and data fields', () => {
      expect(CREATE_PATIENT_MUTATION).toContain('error');
      expect(CREATE_PATIENT_MUTATION).toContain('data {');
    });

    it('should include all patient fields in data section', () => {
      expect(CREATE_PATIENT_MUTATION).toContain(PATIENT_FIELDS);
    });

    it('should use CreatePatientDataInput type', () => {
      expect(CREATE_PATIENT_MUTATION).toContain('CreatePatientDataInput!');
    });

    it('should handle optional insData parameter', () => {
      expect(CREATE_PATIENT_MUTATION).toContain('$insData: String');
    });

    it('should include comprehensive patient fields for response', () => {
      // Check for core fields that should be in the response
      expect(CREATE_PATIENT_MUTATION).toContain('id');
      expect(CREATE_PATIENT_MUTATION).toContain('firstName');
      expect(CREATE_PATIENT_MUTATION).toContain('lastName');
      expect(CREATE_PATIENT_MUTATION).toContain('email');
      expect(CREATE_PATIENT_MUTATION).toContain('dob');
      
      // Check for complex object fields
      expect(CREATE_PATIENT_MUTATION).toContain('address {');
      expect(CREATE_PATIENT_MUTATION).toContain('phones {');
      expect(CREATE_PATIENT_MUTATION).toContain('customAttributes {');
      expect(CREATE_PATIENT_MUTATION).toContain('communicationPreferences {');
      expect(CREATE_PATIENT_MUTATION).toContain('placeOfBirth {');
    });
  });

  describe('UPDATE_PATIENT_MUTATION', () => {
    it('should be a valid GraphQL mutation structure', () => {
      expect(UPDATE_PATIENT_MUTATION).toContain('mutation UpdatePatient');
      expect(UPDATE_PATIENT_MUTATION).toContain('$id: ID!');
      expect(UPDATE_PATIENT_MUTATION).toContain('$patientData: UpdatePatientDataInput!');
      expect(UPDATE_PATIENT_MUTATION).toContain('updatePatient(');
      expect(UPDATE_PATIENT_MUTATION).toContain('id: $id');
      expect(UPDATE_PATIENT_MUTATION).toContain('patientData: $patientData');
    });

    it('should include error and data fields', () => {
      expect(UPDATE_PATIENT_MUTATION).toContain('error');
      expect(UPDATE_PATIENT_MUTATION).toContain('data {');
    });

    it('should include all patient fields in data section', () => {
      expect(UPDATE_PATIENT_MUTATION).toContain(PATIENT_FIELDS);
    });

    it('should use UpdatePatientDataInput type', () => {
      expect(UPDATE_PATIENT_MUTATION).toContain('UpdatePatientDataInput!');
    });

    it('should require patient ID parameter', () => {
      expect(UPDATE_PATIENT_MUTATION).toContain('$id: ID!');
      expect(UPDATE_PATIENT_MUTATION).toContain('id: $id');
    });

    it('should include comprehensive patient fields for response', () => {
      // Check for core fields that should be in the response
      expect(UPDATE_PATIENT_MUTATION).toContain('id');
      expect(UPDATE_PATIENT_MUTATION).toContain('firstName');
      expect(UPDATE_PATIENT_MUTATION).toContain('lastName');
      expect(UPDATE_PATIENT_MUTATION).toContain('email');
      expect(UPDATE_PATIENT_MUTATION).toContain('dob');
      expect(UPDATE_PATIENT_MUTATION).toContain('updatedAt');
      
      // Check for complex object fields
      expect(UPDATE_PATIENT_MUTATION).toContain('address {');
      expect(UPDATE_PATIENT_MUTATION).toContain('phones {');
      expect(UPDATE_PATIENT_MUTATION).toContain('customAttributes {');
      expect(UPDATE_PATIENT_MUTATION).toContain('communicationPreferences {');
      expect(UPDATE_PATIENT_MUTATION).toContain('placeOfBirth {');
    });

    it('should not include insData parameter (update-specific)', () => {
      expect(UPDATE_PATIENT_MUTATION).not.toContain('insData');
      expect(UPDATE_PATIENT_MUTATION).not.toContain('$insData');
    });
  });
});
