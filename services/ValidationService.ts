/**
 * @fileoverview ValidationService - Input validation before API calls
 * @description Provides comprehensive field validation with Semble-specific rules
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Services
 */

import { IDataObject } from 'n8n-workflow';
import { ValidationError } from '../core/SembleError';
import { FIELD_CONSTANTS, VALIDATION_PATTERNS } from '../core/Constants';

/**
 * Result interface for individual field validation operations
 * 
 * Contains detailed validation results for a single field including
 * validation status, error/warning messages, and normalized values.
 * 
 * @example
 * ```typescript
 * const fieldResult: FieldValidationResult = {
 *   isValid: false,
 *   fieldName: 'email',
 *   value: 'invalid-email',
 *   errorMessage: 'Invalid email format',
 *   normalizedValue: null
 * };
 * ```
 * 
 * @interface FieldValidationResult
 * @since 2.0.0
 */
export interface FieldValidationResult {
  /** Whether the field value passed validation */
  isValid: boolean;
  /** Name of the field that was validated */
  fieldName: string;
  /** The original value that was validated */
  value: any;
  /** Error message if validation failed */
  errorMessage?: string;
  /** Warning message for non-critical issues */
  warningMessage?: string;
  /** Normalized/cleaned value after validation */
  normalizedValue?: any;
}

/**
 * Comprehensive validation result interface for multiple field validation
 * 
 * Aggregates validation results from multiple fields providing overall
 * validation status, detailed field results, and normalized output data.
 * 
 * @example
 * ```typescript
 * const validationResult: ValidationResult = {
 *   isValid: false,
 *   fieldResults: [
 *     { isValid: true, fieldName: 'firstName', value: 'John' },
 *     { isValid: false, fieldName: 'email', value: 'invalid', errorMessage: 'Invalid email' }
 *   ],
 *   errorCount: 1,
 *   warningCount: 0,
 *   normalizedData: { firstName: 'John' }
 * };
 * ```
 * 
 * @interface ValidationResult
 * @since 2.0.0
 */
export interface ValidationResult {
  /** Whether all fields passed validation */
  isValid: boolean;
  /** Individual validation results for each field */
  fieldResults: FieldValidationResult[];
  /** Total number of validation errors */
  errorCount: number;
  /** Total number of validation warnings */
  warningCount: number;
  /** Object containing normalized/cleaned field values */
  normalizedData: IDataObject;
}

/**
 * Field validation rule definition
 * @interface ValidationRule
 */
export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'phone' | 'id' | 'enum';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enumValues?: readonly string[];
  customValidator?: (value: any, context?: IDataObject) => { isValid: boolean; errorMessage?: string };
  normalizer?: (value: any) => any;
  dependencies?: string[];
}

/**
 * Resource-specific validation schema
 * @interface ResourceValidationSchema
 */
export interface ResourceValidationSchema {
  [fieldName: string]: ValidationRule;
}

/**
 * Validation context for complex validations
 * @interface ValidationContext
 */
export interface ValidationContext {
  resource: string;
  operation: string;
  allFields: IDataObject;
  strictMode: boolean;
}

/**
 * ValidationService - Comprehensive input validation for Semble API calls
 * @class ValidationService
 * @description Provides field validation, type checking, and data normalization
 */
export class ValidationService {
  private static instance: ValidationService;
  private validationSchemas: Map<string, ResourceValidationSchema> = new Map();

  /**
   * Private constructor for singleton pattern
   * @private
   */
  private constructor() {
    // Bind methods to ensure correct 'this' context
    this.normalizeBooleanString = this.normalizeBooleanString.bind(this);
    this.normalizeDateTimeString = this.normalizeDateTimeString.bind(this);
    this.validateDateOfBirth = this.validateDateOfBirth.bind(this);
    this.validateDateTime = this.validateDateTime.bind(this);
    
    this.initializeSchemas();
  }

  /**
   * Get singleton instance of ValidationService
   * @static
   * @returns {ValidationService} The singleton instance
   */
  public static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  /**
   * Initialize validation schemas for all resources
   * @private
   */
  private initializeSchemas(): void {
    // Patient validation schema
    this.validationSchemas.set('patient', {
      firstName: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100,
        normalizer: (value: string) => value?.trim(),
      },
      lastName: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100,
        normalizer: (value: string) => value?.trim(),
      },
      email: {
        required: true,
        type: 'email',
        maxLength: 255,
        pattern: VALIDATION_PATTERNS.EMAIL,
        normalizer: (value: string) => value?.toLowerCase().trim(),
      },
      phone: {
        required: true,
        type: 'phone',
        pattern: VALIDATION_PATTERNS.PHONE,
        normalizer: (value: string) => value?.replace(/\s+/g, ''),
      },
      phoneType: {
        required: true,
        type: 'enum',
        enumValues: FIELD_CONSTANTS.PHONE_TYPES,
      },
      dateOfBirth: {
        required: true,
        type: 'date',
        pattern: VALIDATION_PATTERNS.DATE,
        customValidator: this.validateDateOfBirth,
      },
      gender: {
        type: 'enum',
        enumValues: FIELD_CONSTANTS.GENDER_OPTIONS,
      },
      sex: {
        type: 'enum',
        enumValues: FIELD_CONSTANTS.SEX_OPTIONS,
      },
      title: {
        type: 'string',
        maxLength: 50,
        normalizer: (value: string) => value?.trim(),
      },
      onHold: {
        type: 'boolean',
        normalizer: this.normalizeBooleanString,
      },
    });

    // Booking validation schema
    this.validationSchemas.set('booking', {
      patientId: {
        required: true,
        type: 'id',
        pattern: VALIDATION_PATTERNS.UUID_OR_NUMERIC_ID,
      },
      doctorId: {
        required: true,
        type: 'id',
        pattern: VALIDATION_PATTERNS.UUID_OR_NUMERIC_ID,
      },
      locationId: {
        required: true,
        type: 'id',
        pattern: VALIDATION_PATTERNS.UUID_OR_NUMERIC_ID,
      },
      bookingTypeId: {
        required: true,
        type: 'id',
        pattern: VALIDATION_PATTERNS.UUID_OR_NUMERIC_ID,
      },
      startTime: {
        required: true,
        type: 'date',
        customValidator: this.validateDateTime,
        normalizer: this.normalizeDateTimeString,
      },
      endTime: {
        required: true,
        type: 'date',
        customValidator: this.validateDateTime,
        normalizer: this.normalizeDateTimeString,
        dependencies: ['startTime'],
      },
      comments: {
        type: 'string',
        maxLength: 1000,
        normalizer: (value: string) => value?.trim(),
      },
      sendConfirmationMessage: {
        type: 'boolean',
        normalizer: this.normalizeBooleanString,
      },
      sendReminderMessage: {
        type: 'boolean',
        normalizer: this.normalizeBooleanString,
      },
      sendFollowupMessage: {
        type: 'boolean',
        normalizer: this.normalizeBooleanString,
      },
    });
  }

  /**
   * Validate data for a specific resource and operation
   * @param {string} resource - The resource type (patient, booking, etc.)
   * @param {string} operation - The operation type (create, update, etc.)
   * @param {IDataObject} data - The data to validate
   * @param {ValidationContext} [context] - Additional validation context
   * @returns {ValidationResult} Validation result
   */
  public validateResourceData(
    resource: string,
    operation: string,
    data: IDataObject,
    context?: Partial<ValidationContext>
  ): ValidationResult {
    const validationContext: ValidationContext = {
      resource,
      operation,
      allFields: data,
      strictMode: false, // Default to lenient mode
      ...context,
    };

    const schema = this.getValidationSchema(resource, operation);
    const fieldResults: FieldValidationResult[] = [];
    const normalizedData: IDataObject = {};
    let errorCount = 0;
    let warningCount = 0;

    // Validate each field in the schema
    for (const [fieldName, rule] of Object.entries(schema)) {
      const fieldResult = this.validateField(fieldName, data[fieldName], rule, validationContext);
      fieldResults.push(fieldResult);

      if (!fieldResult.isValid) {
        errorCount++;
      }
      if (fieldResult.warningMessage) {
        warningCount++;
      }

      // Use normalized value if available
      normalizedData[fieldName] = fieldResult.normalizedValue !== undefined 
        ? fieldResult.normalizedValue 
        : fieldResult.value;
    }

    // Validate cross-field dependencies
    const dependencyResults = this.validateDependencies(schema, normalizedData, validationContext);
    fieldResults.push(...dependencyResults);
    errorCount += dependencyResults.filter(r => !r.isValid).length;
    warningCount += dependencyResults.filter(r => r.warningMessage).length;

    const isValid = errorCount === 0;

    return {
      isValid,
      fieldResults,
      errorCount,
      warningCount,
      normalizedData,
    };
  }

  /**
   * Validate a single field
   * @param {string} fieldName - The field name
   * @param {any} value - The field value
   * @param {ValidationRule} rule - The validation rule
   * @param {ValidationContext} context - Validation context
   * @returns {FieldValidationResult} Field validation result
   */
  public validateField(
    fieldName: string,
    value: any,
    rule: ValidationRule,
    context: ValidationContext
  ): FieldValidationResult {
    const result: FieldValidationResult = {
      isValid: true,
      fieldName,
      value,
    };

    // Check if field is required
    if (rule.required && (value === undefined || value === null || value === '')) {
      result.isValid = false;
      result.errorMessage = `${fieldName} is required`;
      return result;
    }

    // Skip validation if value is empty and not required
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return result;
    }

    // Normalize value if normalizer is provided
    if (rule.normalizer) {
      try {
        result.normalizedValue = rule.normalizer(value);
      } catch (error) {
        result.isValid = false;
        result.errorMessage = `Failed to normalize ${fieldName}: ${error}`;
        return result;
      }
    }

    const valueToValidate = result.normalizedValue !== undefined ? result.normalizedValue : value;

    // Type validation
    if (rule.type) {
      const typeValidation = this.validateType(fieldName, valueToValidate, rule.type);
      if (!typeValidation.isValid) {
        result.isValid = false;
        result.errorMessage = typeValidation.errorMessage;
        return result;
      }
    }

        // String length validation
        if (typeof valueToValidate === 'string') {
          if (rule.minLength !== undefined && valueToValidate.length < rule.minLength) {
            result.isValid = false;
            result.errorMessage = `${fieldName} must be at least ${rule.minLength} characters long`;
            return result;
          }
          if (rule.maxLength !== undefined && valueToValidate.length > rule.maxLength) {
            result.isValid = false;
            result.errorMessage = `${fieldName} must be no more than ${rule.maxLength} characters long`;
            return result;
          }
        }    // Numeric range validation
    if (typeof valueToValidate === 'number') {
      if (rule.min !== undefined && valueToValidate < rule.min) {
        result.isValid = false;
        result.errorMessage = `${fieldName} must be at least ${rule.min}`;
        return result;
      }
      if (rule.max !== undefined && valueToValidate > rule.max) {
        result.isValid = false;
        result.errorMessage = `${fieldName} must be no more than ${rule.max}`;
        return result;
      }
    }

    // Pattern validation
    if (rule.pattern && typeof valueToValidate === 'string') {
      if (!rule.pattern.test(valueToValidate)) {
        result.isValid = false;
        result.errorMessage = `${fieldName} format is invalid`;
        return result;
      }
    }

    // Enum validation
    if (rule.enumValues && !rule.enumValues.includes(valueToValidate)) {
      result.isValid = false;
      result.errorMessage = `${fieldName} must be one of: ${rule.enumValues.join(', ')}`;
      return result;
    }

    // Custom validation
    if (rule.customValidator) {
      const customResult = rule.customValidator(valueToValidate, context.allFields);
      if (!customResult.isValid) {
        result.isValid = false;
        result.errorMessage = customResult.errorMessage || `${fieldName} validation failed`;
        return result;
      }
    }

    return result;
  }

  /**
   * Validate field type
   * @private
   * @param {string} fieldName - Field name for error messages
   * @param {any} value - Value to validate
   * @param {string} expectedType - Expected type
   * @returns {FieldValidationResult} Validation result
   */
  private validateType(fieldName: string, value: any, expectedType: string): FieldValidationResult {
    const result: FieldValidationResult = {
      isValid: true,
      fieldName,
      value,
    };

    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          result.isValid = false;
          result.errorMessage = `${fieldName} must be a string`;
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          result.isValid = false;
          result.errorMessage = `${fieldName} must be a valid number`;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          result.isValid = false;
          result.errorMessage = `${fieldName} must be a boolean`;
        }
        break;
      case 'date':
        if (!this.isValidDate(value)) {
          result.isValid = false;
          result.errorMessage = `${fieldName} must be a valid date`;
        }
        break;
      case 'email':
        if (typeof value !== 'string' || !VALIDATION_PATTERNS.EMAIL.test(value)) {
          result.isValid = false;
          result.errorMessage = `${fieldName} must be a valid email address`;
        }
        break;
      case 'phone':
        if (typeof value !== 'string' || !VALIDATION_PATTERNS.PHONE.test(value)) {
          result.isValid = false;
          result.errorMessage = `${fieldName} must be a valid phone number`;
        }
        break;
      case 'id':
        if (!this.isValidId(value)) {
          result.isValid = false;
          result.errorMessage = `${fieldName} must be a valid ID`;
        }
        break;
    }

    return result;
  }

  /**
   * Validate cross-field dependencies
   * @private
   * @param {ResourceValidationSchema} schema - Validation schema
   * @param {IDataObject} data - Normalized data
   * @param {ValidationContext} context - Validation context
   * @returns {FieldValidationResult[]} Dependency validation results
   */
  private validateDependencies(
    schema: ResourceValidationSchema,
    data: IDataObject,
    context: ValidationContext
  ): FieldValidationResult[] {
    const results: FieldValidationResult[] = [];

    // Special case: booking end time must be after start time
    if (context.resource === 'booking' && data.startTime && data.endTime) {
      const startTime = new Date(data.startTime as string);
      const endTime = new Date(data.endTime as string);

      if (endTime <= startTime) {
        results.push({
          isValid: false,
          fieldName: 'endTime',
          value: data.endTime,
          errorMessage: 'End time must be after start time',
        });
      }
    }

    return results;
  }

  /**
   * Get validation schema for a resource and operation
   * @private
   * @param {string} resource - Resource name
   * @param {string} operation - Operation name
   * @returns {ResourceValidationSchema} Validation schema
   */
  private getValidationSchema(resource: string, operation: string): ResourceValidationSchema {
    const baseSchema = this.validationSchemas.get(resource) || {};
    
    // Modify schema based on operation
    if (operation === 'update') {
      // For updates, most fields are optional
      const updateSchema: ResourceValidationSchema = {};
      for (const [fieldName, rule] of Object.entries(baseSchema)) {
        updateSchema[fieldName] = { ...rule, required: false };
      }
      return updateSchema;
    }

    return baseSchema;
  }

  /**
   * Check if a value is a valid date
   * @private
   * @param {any} value - Value to check
   * @returns {boolean} True if valid date
   */
  private isValidDate(value: any): boolean {
    if (typeof value === 'string') {
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
    return value instanceof Date && !isNaN(value.getTime());
  }

  /**
   * Check if a value is a valid ID (UUID or numeric)
   * @private
   * @param {any} value - Value to check
   * @returns {boolean} True if valid ID
   */
  private isValidId(value: any): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    return VALIDATION_PATTERNS.UUID_OR_NUMERIC_ID.test(value);
  }

  /**
   * Normalize boolean string values
   * @private
   * @param {any} value - Value to normalize
   * @returns {boolean} Normalized boolean value
   */
  private normalizeBooleanString(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      return lowerValue === 'true' || lowerValue === 'yes' || lowerValue === '1';
    }
    return false;
  }

  /**
   * Normalize date/time string values
   * @private
   * @param {any} value - Value to normalize
   * @returns {string} Normalized date/time string
   */
  private normalizeDateTimeString(value: any): string {
    if (typeof value !== 'string') {
      throw new Error('Date/time value must be a string');
    }

    const trimmed = value.trim();
    
    // Convert space-separated format to ISO format
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed.replace(' ', 'T');
    }

    return trimmed;
  }

  /**
   * Validate date of birth
   * @private
   * @param {any} value - Date of birth value
   * @returns {{ isValid: boolean; errorMessage?: string }} Validation result
   */
  private validateDateOfBirth(value: any): { isValid: boolean; errorMessage?: string } {
    if (!this.isValidDate(value)) {
      return { isValid: false, errorMessage: 'Invalid date format' };
    }

    const birthDate = new Date(value);
    const today = new Date();
    const maxAge = 150;
    const minAge = 0;

    const age = today.getFullYear() - birthDate.getFullYear();

    if (birthDate > today) {
      return { isValid: false, errorMessage: 'Date of birth cannot be in the future' };
    }

    if (age > maxAge) {
      return { isValid: false, errorMessage: `Age cannot exceed ${maxAge} years` };
    }

    if (age < minAge) {
      return { isValid: false, errorMessage: 'Invalid date of birth' };
    }

    return { isValid: true };
  }

  /**
   * Validate date/time values
   * @private
   * @param {any} value - Date/time value
   * @returns {{ isValid: boolean; errorMessage?: string }} Validation result
   */
  private validateDateTime(value: any): { isValid: boolean; errorMessage?: string } {
    if (!this.isValidDate(value)) {
      return { isValid: false, errorMessage: 'Invalid date/time format' };
    }

    const dateTime = new Date(value);
    const now = new Date();
    const maxFutureYears = 5;
    const maxFutureDate = new Date(now.getFullYear() + maxFutureYears, now.getMonth(), now.getDate());

    if (dateTime > maxFutureDate) {
      return { isValid: false, errorMessage: `Date cannot be more than ${maxFutureYears} years in the future` };
    }

    return { isValid: true };
  }

  /**
   * Register a custom validation schema for a resource
   * @param {string} resource - Resource name
   * @param {ResourceValidationSchema} schema - Validation schema
   */
  public registerValidationSchema(resource: string, schema: ResourceValidationSchema): void {
    this.validationSchemas.set(resource, schema);
  }

  /**
   * Get validation schema for a resource
   * @param {string} resource - Resource name
   * @returns {ResourceValidationSchema | undefined} Validation schema
   */
  public getValidationSchemaForResource(resource: string): ResourceValidationSchema | undefined {
    return this.validationSchemas.get(resource);
  }

  /**
   * Validate and throw on validation errors
   * @param {string} resource - Resource name
   * @param {string} operation - Operation name
   * @param {IDataObject} data - Data to validate
   * @param {ValidationContext} [context] - Validation context
   * @returns {IDataObject} Normalized data
   * @throws {ValidationError} If validation fails
   */
  public validateAndThrow(
    resource: string,
    operation: string,
    data: IDataObject,
    context?: Partial<ValidationContext>
  ): IDataObject {
    const result = this.validateResourceData(resource, operation, data, context);

    if (!result.isValid) {
      const errorMessages = result.fieldResults
        .filter(fr => !fr.isValid)
        .map(fr => fr.errorMessage)
        .join('; ');

      const fieldErrors = result.fieldResults
        .filter(fr => !fr.isValid)
        .map(fr => ({
          field: fr.fieldName,
          message: fr.errorMessage || 'Validation failed',
          value: fr.value
        }));

      throw new ValidationError(
        `Validation failed: ${errorMessages}`,
        fieldErrors
      );
    }

    return result.normalizedData;
  }

  /**
   * Reset to default validation schemas
   */
  public resetSchemas(): void {
    this.validationSchemas.clear();
    this.initializeSchemas();
  }
}

/**
 * Default export of ValidationService singleton
 */
export default ValidationService.getInstance();
