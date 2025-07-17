/**
 * @fileoverview ValidationService Test Suite
 * @description Comprehensive tests for field validation, type checking, and data normalization
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Services.ValidationService
 */

import { ValidationService, ValidationResult, FieldValidationResult } from '../../services/ValidationService';
import { ValidationError } from '../../core/SembleError';
import { IDataObject } from 'n8n-workflow';

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = ValidationService.getInstance();
    // Reset schemas to default state
    validationService.resetSchemas();
  });

  describe('Singleton Pattern', () => {
    test('should return the same instance', () => {
      const instance1 = ValidationService.getInstance();
      const instance2 = ValidationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Patient Validation', () => {
    describe('Valid Patient Data', () => {
      test('should validate complete patient data successfully', () => {
        const patientData: IDataObject = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          phoneType: 'mobile',
          dateOfBirth: '1990-01-15',
          gender: 'male',
          sex: 'male',
          title: 'Mr',
          onHold: false,
        };

        const result = validationService.validateResourceData('patient', 'create', patientData);

        expect(result.isValid).toBe(true);
        expect(result.errorCount).toBe(0);
        expect(result.warningCount).toBe(0);
        expect(result.normalizedData).toBeDefined();
      });

      test('should normalize and validate patient data', () => {
        const patientData: IDataObject = {
          firstName: '  John  ',
          lastName: '  Doe  ',
          email: '  JOHN.DOE@EXAMPLE.COM  ',
          phone: '+1 234 567 890',
          phoneType: 'mobile',
          dateOfBirth: '1990-01-15',
          title: '  Mr  ',
          onHold: 'true',
        };

        const result = validationService.validateResourceData('patient', 'create', patientData);

        expect(result.isValid).toBe(true);
        expect(result.normalizedData.firstName).toBe('John');
        expect(result.normalizedData.lastName).toBe('Doe');
        expect(result.normalizedData.email).toBe('john.doe@example.com');
        expect(result.normalizedData.phone).toBe('+1234567890');
        expect(result.normalizedData.title).toBe('Mr');
        expect(result.normalizedData.onHold).toBe(true);
      });
    });

    describe('Invalid Patient Data', () => {
      test('should fail validation with missing required fields', () => {
        const patientData: IDataObject = {
          firstName: 'John',
          // Missing lastName, email, phone, phoneType, dateOfBirth
        };

        const result = validationService.validateResourceData('patient', 'create', patientData);

        expect(result.isValid).toBe(false);
        expect(result.errorCount).toBeGreaterThan(0);
        
        const missingFieldErrors = result.fieldResults.filter(fr => 
          fr.errorMessage?.includes('is required')
        );
        expect(missingFieldErrors.length).toBeGreaterThan(0);
      });

      test('should fail validation with invalid email format', () => {
        const patientData: IDataObject = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'invalid-email',
          phone: '+1234567890',
          phoneType: 'mobile',
          dateOfBirth: '1990-01-15',
        };

        const result = validationService.validateResourceData('patient', 'create', patientData);

        expect(result.isValid).toBe(false);
        const emailError = result.fieldResults.find(fr => fr.fieldName === 'email');
        expect(emailError?.isValid).toBe(false);
        expect(emailError?.errorMessage).toContain('email');
      });

      test('should fail validation with invalid phone format', () => {
        const patientData: IDataObject = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '123', // Too short
          phoneType: 'mobile',
          dateOfBirth: '1990-01-15',
        };

        const result = validationService.validateResourceData('patient', 'create', patientData);

        expect(result.isValid).toBe(false);
        const phoneError = result.fieldResults.find(fr => fr.fieldName === 'phone');
        expect(phoneError?.isValid).toBe(false);
        expect(phoneError?.errorMessage).toContain('phone');
      });

      test('should fail validation with invalid enum values', () => {
        const patientData: IDataObject = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          phoneType: 'invalid-type',
          dateOfBirth: '1990-01-15',
          gender: 'invalid-gender',
        };

        const result = validationService.validateResourceData('patient', 'create', patientData);

        expect(result.isValid).toBe(false);
        
        const phoneTypeError = result.fieldResults.find(fr => fr.fieldName === 'phoneType');
        expect(phoneTypeError?.isValid).toBe(false);
        expect(phoneTypeError?.errorMessage).toContain('must be one of');

        const genderError = result.fieldResults.find(fr => fr.fieldName === 'gender');
        expect(genderError?.isValid).toBe(false);
        expect(genderError?.errorMessage).toContain('must be one of');
      });

      test('should fail validation with future date of birth', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        
        const patientData: IDataObject = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          phoneType: 'mobile',
          dateOfBirth: futureDate.toISOString().split('T')[0],
        };

        const result = validationService.validateResourceData('patient', 'create', patientData);

        expect(result.isValid).toBe(false);
        const dobError = result.fieldResults.find(fr => fr.fieldName === 'dateOfBirth');
        expect(dobError?.isValid).toBe(false);
        expect(dobError?.errorMessage).toContain('future');
      });

      test('should fail validation with extremely old date of birth', () => {
        const patientData: IDataObject = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          phoneType: 'mobile',
          dateOfBirth: '1800-01-01', // Too old
        };

        const result = validationService.validateResourceData('patient', 'create', patientData);

        expect(result.isValid).toBe(false);
        const dobError = result.fieldResults.find(fr => fr.fieldName === 'dateOfBirth');
        expect(dobError?.isValid).toBe(false);
        expect(dobError?.errorMessage).toContain('150 years');
      });
    });

    describe('Update Operation', () => {
      test('should make fields optional for update operation', () => {
        const updateData: IDataObject = {
          firstName: 'Jane',
          email: 'jane.doe@example.com',
          // Missing other required fields - should be OK for update
        };

        const result = validationService.validateResourceData('patient', 'update', updateData);

        expect(result.isValid).toBe(true);
        expect(result.normalizedData.firstName).toBe('Jane');
        expect(result.normalizedData.email).toBe('jane.doe@example.com');
      });
    });
  });

  describe('Booking Validation', () => {
    describe('Valid Booking Data', () => {
      test('should validate complete booking data successfully', () => {
        const bookingData: IDataObject = {
          patientId: '12345',
          doctorId: 'doc-123',
          locationId: 'loc-456',
          bookingTypeId: 'bt-789',
          startTime: '2024-12-31T09:00:00',
          endTime: '2024-12-31T10:00:00',
          comments: 'Regular checkup',
          sendConfirmationMessage: true,
          sendReminderMessage: true,
          sendFollowupMessage: false,
        };

        const result = validationService.validateResourceData('booking', 'create', bookingData);

        expect(result.isValid).toBe(true);
        expect(result.errorCount).toBe(0);
      });

      test('should normalize boolean strings in booking data', () => {
        const bookingData: IDataObject = {
          patientId: '12345',
          doctorId: 'doc-123',
          locationId: 'loc-456',
          bookingTypeId: 'bt-789',
          startTime: '2024-12-31T09:00:00',
          endTime: '2024-12-31T10:00:00',
          sendConfirmationMessage: 'true',
          sendReminderMessage: 'yes',
          sendFollowupMessage: 'false',
        };

        const result = validationService.validateResourceData('booking', 'create', bookingData);

        expect(result.isValid).toBe(true);
        expect(result.normalizedData.sendConfirmationMessage).toBe(true);
        expect(result.normalizedData.sendReminderMessage).toBe(true);
        expect(result.normalizedData.sendFollowupMessage).toBe(false);
      });

      test('should normalize space-separated datetime format', () => {
        const bookingData: IDataObject = {
          patientId: '12345',
          doctorId: 'doc-123',
          locationId: 'loc-456',
          bookingTypeId: 'bt-789',
          startTime: '2024-12-31 09:00:00',
          endTime: '2024-12-31 10:00:00',
        };

        const result = validationService.validateResourceData('booking', 'create', bookingData);

        expect(result.isValid).toBe(true);
        expect(result.normalizedData.startTime).toBe('2024-12-31T09:00:00');
        expect(result.normalizedData.endTime).toBe('2024-12-31T10:00:00');
      });
    });

    describe('Invalid Booking Data', () => {
      test('should fail validation with missing required fields', () => {
        const bookingData: IDataObject = {
          patientId: '12345',
          // Missing other required fields
        };

        const result = validationService.validateResourceData('booking', 'create', bookingData);

        expect(result.isValid).toBe(false);
        expect(result.errorCount).toBeGreaterThan(0);
      });

      test('should fail validation with invalid ID formats', () => {
        const bookingData: IDataObject = {
          patientId: 'invalid-id-format!@#',
          doctorId: 'doc-123',
          locationId: 'loc-456',
          bookingTypeId: 'bt-789',
          startTime: '2024-12-31T09:00:00',
          endTime: '2024-12-31T10:00:00',
        };

        const result = validationService.validateResourceData('booking', 'create', bookingData);

        expect(result.isValid).toBe(false);
        const patientIdError = result.fieldResults.find(fr => fr.fieldName === 'patientId');
        expect(patientIdError?.isValid).toBe(false);
        expect(patientIdError?.errorMessage).toContain('valid ID');
      });

      test('should fail validation when end time is before start time', () => {
        const bookingData: IDataObject = {
          patientId: '12345',
          doctorId: 'doc-123',
          locationId: 'loc-456',
          bookingTypeId: 'bt-789',
          startTime: '2024-12-31T10:00:00',
          endTime: '2024-12-31T09:00:00', // Before start time
        };

        const result = validationService.validateResourceData('booking', 'create', bookingData);

        expect(result.isValid).toBe(false);
        const endTimeError = result.fieldResults.find(fr => fr.fieldName === 'endTime' && !fr.isValid);
        expect(endTimeError?.isValid).toBe(false);
        expect(endTimeError?.errorMessage).toContain('after start time');
      });

      test('should fail validation with dates too far in the future', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 10);
        
        const bookingData: IDataObject = {
          patientId: '12345',
          doctorId: 'doc-123',
          locationId: 'loc-456',
          bookingTypeId: 'bt-789',
          startTime: futureDate.toISOString(),
          endTime: futureDate.toISOString(),
        };

        const result = validationService.validateResourceData('booking', 'create', bookingData);

        expect(result.isValid).toBe(false);
        const startTimeError = result.fieldResults.find(fr => fr.fieldName === 'startTime');
        expect(startTimeError?.isValid).toBe(false);
        expect(startTimeError?.errorMessage).toContain('5 years');
      });
    });
  });

  describe('Field Validation', () => {
    describe('Type Validation', () => {
      test('should validate string types correctly', () => {
        const rule = { required: true, type: 'string' as const };
        
        const validResult = validationService.validateField('testField', 'valid string', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(validResult.isValid).toBe(true);

        const invalidResult = validationService.validateField('testField', 123, rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errorMessage).toContain('string');
      });

      test('should validate number types correctly', () => {
        const rule = { required: true, type: 'number' as const };
        
        const validResult = validationService.validateField('testField', 123, rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(validResult.isValid).toBe(true);

        const invalidResult = validationService.validateField('testField', 'not a number', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errorMessage).toContain('number');
      });

      test('should validate boolean types correctly', () => {
        const rule = { required: true, type: 'boolean' as const };
        
        const validResult = validationService.validateField('testField', true, rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(validResult.isValid).toBe(true);

        const invalidResult = validationService.validateField('testField', 'not a boolean', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errorMessage).toContain('boolean');
      });

      test('should validate date types correctly', () => {
        const rule = { required: true, type: 'date' as const };
        
        const validResult = validationService.validateField('testField', '2024-01-01', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(validResult.isValid).toBe(true);

        const invalidResult = validationService.validateField('testField', 'not a date', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errorMessage).toContain('date');
      });

      test('should validate email types correctly', () => {
        const rule = { required: true, type: 'email' as const };
        
        const validResult = validationService.validateField('testField', 'test@example.com', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(validResult.isValid).toBe(true);

        const invalidResult = validationService.validateField('testField', 'not-an-email', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errorMessage).toContain('email');
      });

      test('should validate phone types correctly', () => {
        const rule = { required: true, type: 'phone' as const };
        
        const validResult = validationService.validateField('testField', '+1234567890', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(validResult.isValid).toBe(true);

        const invalidResult = validationService.validateField('testField', '123', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errorMessage).toContain('phone');
      });

      test('should validate ID types correctly', () => {
        const rule = { required: true, type: 'id' as const };
        
        const validUuidResult = validationService.validateField('testField', '123e4567-e89b-12d3-a456-426614174000', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(validUuidResult.isValid).toBe(true);

        const validNumericResult = validationService.validateField('testField', '12345', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(validNumericResult.isValid).toBe(true);

        const invalidResult = validationService.validateField('testField', 'invalid-id!', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errorMessage).toContain('valid ID');
      });
    });

    describe('Length Validation', () => {
      test('should validate minimum length', () => {
        const rule = { required: true, type: 'string' as const, minLength: 5 };
        
        const validResult = validationService.validateField('testField', 'valid string', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(validResult.isValid).toBe(true);

        const invalidResult = validationService.validateField('testField', 'hi', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errorMessage).toContain('at least 5');
      });

      test('should validate maximum length', () => {
        const rule = { required: true, type: 'string' as const, maxLength: 10 };
        
        const validResult = validationService.validateField('testField', 'short', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(validResult.isValid).toBe(true);

        const invalidResult = validationService.validateField('testField', 'this string is too long', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errorMessage).toContain('no more than 10');
      });
    });

    describe('Numeric Range Validation', () => {
      test('should validate minimum value', () => {
        const rule = { required: true, type: 'number' as const, min: 10 };
        
        const validResult = validationService.validateField('testField', 15, rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(validResult.isValid).toBe(true);

        const invalidResult = validationService.validateField('testField', 5, rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errorMessage).toContain('at least 10');
      });

      test('should validate maximum value', () => {
        const rule = { required: true, type: 'number' as const, max: 100 };
        
        const validResult = validationService.validateField('testField', 50, rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(validResult.isValid).toBe(true);

        const invalidResult = validationService.validateField('testField', 150, rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errorMessage).toContain('no more than 100');
      });
    });

    describe('Pattern Validation', () => {
      test('should validate against regex patterns', () => {
        const rule = { required: true, type: 'string' as const, pattern: /^[A-Z][a-z]+$/ };
        
        const validResult = validationService.validateField('testField', 'Valid', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(validResult.isValid).toBe(true);

        const invalidResult = validationService.validateField('testField', 'invalid', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errorMessage).toContain('format is invalid');
      });
    });

    describe('Enum Validation', () => {
      test('should validate against enum values', () => {
        const rule = { 
          required: true, 
          type: 'enum' as const, 
          enumValues: ['option1', 'option2', 'option3'] as readonly string[]
        };
        
        const validResult = validationService.validateField('testField', 'option2', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(validResult.isValid).toBe(true);

        const invalidResult = validationService.validateField('testField', 'invalid-option', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errorMessage).toContain('must be one of');
        expect(invalidResult.errorMessage).toContain('option1, option2, option3');
      });
    });

    describe('Custom Validation', () => {
      test('should apply custom validators', () => {
        const customValidator = (value: any) => {
          if (value === 'forbidden') {
            return { isValid: false, errorMessage: 'This value is forbidden' };
          }
          return { isValid: true };
        };

        const rule = { 
          required: true, 
          type: 'string' as const, 
          customValidator 
        };
        
        const validResult = validationService.validateField('testField', 'allowed', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(validResult.isValid).toBe(true);

        const invalidResult = validationService.validateField('testField', 'forbidden', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errorMessage).toBe('This value is forbidden');
      });
    });

    describe('Value Normalization', () => {
      test('should apply value normalizers', () => {
        const normalizer = (value: any) => value.toString().toUpperCase().trim();
        
        const rule = { 
          required: true, 
          type: 'string' as const, 
          normalizer 
        };
        
        const result = validationService.validateField('testField', '  hello world  ', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        
        expect(result.isValid).toBe(true);
        expect(result.normalizedValue).toBe('HELLO WORLD');
      });

      test('should handle normalizer errors gracefully', () => {
        const faultyNormalizer = (value: any) => {
          throw new Error('Normalizer failed');
        };
        
        const rule = { 
          required: true, 
          type: 'string' as const, 
          normalizer: faultyNormalizer 
        };
        
        const result = validationService.validateField('testField', 'test', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('Failed to normalize');
      });
    });

    describe('Required Field Validation', () => {
      test('should fail validation for missing required fields', () => {
        const rule = { required: true, type: 'string' as const };
        
        const undefinedResult = validationService.validateField('testField', undefined, rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(undefinedResult.isValid).toBe(false);
        expect(undefinedResult.errorMessage).toContain('is required');

        const nullResult = validationService.validateField('testField', null, rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(nullResult.isValid).toBe(false);
        expect(nullResult.errorMessage).toContain('is required');

        const emptyStringResult = validationService.validateField('testField', '', rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(emptyStringResult.isValid).toBe(false);
        expect(emptyStringResult.errorMessage).toContain('is required');
      });

      test('should pass validation for optional fields with no value', () => {
        const rule = { required: false, type: 'string' as const };
        
        const result = validationService.validateField('testField', undefined, rule, {
          resource: 'test',
          operation: 'create',
          environment: 'test',
          allFields: {},
          strictMode: false,
        });
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Custom Validation Schemas', () => {
    test('should allow registration of custom validation schemas', () => {
      const customSchema = {
        customField: {
          required: true,
          type: 'string' as const,
          minLength: 5,
        },
      };

      validationService.registerValidationSchema('customResource', customSchema);
      
      const schema = validationService.getValidationSchemaForResource('customResource');
      expect(schema).toBeDefined();
      expect(schema?.customField).toBeDefined();
      expect(schema?.customField.required).toBe(true);
    });

    test('should validate data against custom schemas', () => {
      const customSchema = {
        name: {
          required: true,
          type: 'string' as const,
          minLength: 3,
        },
        age: {
          required: true,
          type: 'number' as const,
          min: 0,
          max: 150,
        },
      };

      validationService.registerValidationSchema('person', customSchema);
      
      const validData = { name: 'John', age: 30 };
      const result = validationService.validateResourceData('person', 'create', validData);
      
      expect(result.isValid).toBe(true);
      expect(result.errorCount).toBe(0);
    });
  });

  describe('validateAndThrow', () => {
    test('should return normalized data for valid input', () => {
      const patientData: IDataObject = {
        firstName: '  John  ',
        lastName: '  Doe  ',
        email: '  JOHN.DOE@EXAMPLE.COM  ',
        phone: '+1234567890',
        phoneType: 'mobile',
        dateOfBirth: '1990-01-15',
      };

      const normalizedData = validationService.validateAndThrow('patient', 'create', patientData);
      
      expect(normalizedData.firstName).toBe('John');
      expect(normalizedData.lastName).toBe('Doe');
      expect(normalizedData.email).toBe('john.doe@example.com');
    });

    test('should throw ValidationError for invalid input', () => {
      const invalidData: IDataObject = {
        firstName: 'John',
        // Missing required fields
      };

      expect(() => {
        validationService.validateAndThrow('patient', 'create', invalidData);
      }).toThrow(ValidationError);
    });

    test('should include field errors in thrown ValidationError', () => {
      const invalidData: IDataObject = {
        firstName: 'John',
        email: 'invalid-email',
      };

      try {
        validationService.validateAndThrow('patient', 'create', invalidData);
        fail('Expected ValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.fieldErrors.length).toBeGreaterThan(0);
        expect(validationError.hasFieldError('email')).toBe(true);
      }
    });
  });

  describe('Schema Reset', () => {
    test('should reset schemas to default state', () => {
      // Register a custom schema
      const customSchema = { customField: { required: true, type: 'string' as const } };
      validationService.registerValidationSchema('custom', customSchema);
      
      expect(validationService.getValidationSchemaForResource('custom')).toBeDefined();
      
      // Reset schemas
      validationService.resetSchemas();
      
      // Custom schema should be gone, but default schemas should be restored
      expect(validationService.getValidationSchemaForResource('custom')).toBeUndefined();
      expect(validationService.getValidationSchemaForResource('patient')).toBeDefined();
      expect(validationService.getValidationSchemaForResource('booking')).toBeDefined();
    });
  });

  describe('Error Edge Cases', () => {
    test('should handle validation of unknown resource types gracefully', () => {
      const data = { someField: 'value' };
      const result = validationService.validateResourceData('unknownResource', 'create', data);
      
      // Should pass since no schema means no rules to fail
      expect(result.isValid).toBe(true);
      expect(result.fieldResults.length).toBe(0);
    });

    test('should handle empty data gracefully', () => {
      const result = validationService.validateResourceData('patient', 'create', {});
      
      expect(result.isValid).toBe(false);
      expect(result.errorCount).toBeGreaterThan(0); // Should fail due to missing required fields
    });

    test('should handle validation context properly', () => {
      const patientData: IDataObject = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        phoneType: 'mobile',
        dateOfBirth: '1990-01-15',
      };

      const context = {
        environment: 'production',
        strictMode: true,
      };

      const result = validationService.validateResourceData('patient', 'create', patientData, context);
      
      expect(result.isValid).toBe(true);
    });
  });
});
