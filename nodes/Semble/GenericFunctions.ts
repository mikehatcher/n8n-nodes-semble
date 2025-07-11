/**
 * @fileoverview Generic utility functions for Semble API integration
 * @description This module provides rate limiting, API request handling, and utility functions
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Utils
 */

import {
  IExecuteFunctions,
  IExecuteSingleFunctions,
  IHookFunctions,
  ILoadOptionsFunctions,
  IPollFunctions,
} from "n8n-workflow";

import { IDataObject, NodeApiError, IHttpRequestOptions } from "n8n-workflow";

/**
 * Rate limiting configuration for Semble API
 * @const {Object} SEMBLE_RATE_LIMIT
 * @description Conservative rate limits to prevent API throttling
 */
// Semble API Rate Limiting Configuration
export const SEMBLE_RATE_LIMIT = {
  // Maximum requests per minute (conservative for future-proofing)
  MAX_REQUESTS_PER_MINUTE: 120,
  // Time window in milliseconds (1 minute)
  WINDOW_MS: 60 * 1000,
  // Minimum time between requests (in milliseconds)
  MIN_REQUEST_INTERVAL: Math.ceil((60 * 1000) / 120), // ~500ms between requests
};

/**
 * Global rate limiting state (shared across all instances)
 * @type {number[]}
 * @description Tracks timestamps of recent API requests for rate limiting
 */
// Global rate limiting state (shared across all instances)
let requestQueue: number[] = [];

/**
 * Implements a precision delay function for rate limiting
 * @async
 * @function sleep
 * @param {number} ms - Delay duration in milliseconds
 * @returns {Promise<void>} Promise that resolves after the specified delay
 * @description Uses busy-wait for short delays (<50ms) and Promise-based timing for longer delays
 */
// Rate limiting helper - implements a simple delay
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    // Use a simple busy wait for very short delays, Promise-based delay for longer ones
    if (ms < 50) {
      const start = Date.now();
      while (Date.now() - start < ms) {
        // Busy wait for very short delays
      }
      resolve();
    } else {
      // For longer delays, use Promise with manual timing
      const start = Date.now();
      const checkInterval = () => {
        if (Date.now() - start >= ms) {
          resolve();
        } else {
          // Use setImmediate equivalent with Promise
          Promise.resolve().then(checkInterval);
        }
      };
      checkInterval();
    }
  });
}

/**
 * Enforces rate limiting to prevent API throttling
 * @async
 * @function enforceRateLimit
 * @returns {Promise<void>} Promise that resolves when safe to make next request
 * @description Implements sliding window rate limiting with pre-emptive throttling
 */
// Rate limiting helper - ensures we don't exceed the API limits
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();

  // Remove requests older than the time window
  requestQueue = requestQueue.filter(
    (timestamp) => now - timestamp < SEMBLE_RATE_LIMIT.WINDOW_MS
  );

  // If we're at the limit, calculate how long to wait
  if (requestQueue.length >= SEMBLE_RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
    const oldestRequest = Math.min(...requestQueue);
    const waitTime = SEMBLE_RATE_LIMIT.WINDOW_MS - (now - oldestRequest) + 100; // +100ms buffer

    if (waitTime > 0) {
      await sleep(waitTime);
    }
  }

  // If we haven't made a request recently, enforce minimum interval
  const lastRequest = requestQueue[requestQueue.length - 1] || 0;
  const timeSinceLastRequest = now - lastRequest;

  if (timeSinceLastRequest < SEMBLE_RATE_LIMIT.MIN_REQUEST_INTERVAL) {
    const waitTime =
      SEMBLE_RATE_LIMIT.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await sleep(waitTime);
  }

  // Record this request
  requestQueue.push(Date.now());
}

/**
 * Debug logging configuration and utilities
 * @const {Object} DEBUG_CONFIG
 * @description Configuration for debug logging functionality
 */
export const DEBUG_CONFIG = {
  // Maximum size for logged request/response bodies (to prevent console spam)
  MAX_LOG_SIZE: 2048,
  // Whether to pretty-print JSON in logs
  PRETTY_PRINT: true,
  // Prefix for all debug log messages
  LOG_PREFIX: '[SEMBLE-DEBUG]',
};

/**
 * Truncates long strings for logging purposes
 * @function truncateForLog
 * @param {any} data - Data to truncate
 * @param {number} maxLength - Maximum length (default: 2048)
 * @returns {string} Truncated string representation
 */
function truncateForLog(data: any, maxLength: number = DEBUG_CONFIG.MAX_LOG_SIZE): string {
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, DEBUG_CONFIG.PRETTY_PRINT ? 2 : 0);
  if (jsonString.length <= maxLength) {
    return jsonString;
  }
  return jsonString.substring(0, maxLength) + '... [TRUNCATED]';
}

/**
 * Logs debug information to n8n console
 * @function debugLog
 * @param {any} context - n8n execution context
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 */
function debugLog(
  context: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions,
  message: string,
  data?: any
): void {
  const logMessage = `${DEBUG_CONFIG.LOG_PREFIX} ${message}`;
  
  if (context.logger) {
    // Use n8n's logger
    if (data !== undefined) {
      context.logger.info(logMessage, { debugData: truncateForLog(data) });
    } else {
      context.logger.info(logMessage);
    }
  } else {
    // Fallback: throw a warning to make debug info visible in execution logs
    try {
      if (data !== undefined) {
        throw new Error(`${logMessage}: ${truncateForLog(data)}`);
      } else {
        throw new Error(logMessage);
      }
    } catch (debugError) {
      // This will appear in n8n execution logs as a warning
      // but won't stop execution due to try-catch
    }
  }
}

/**
 * Sanitizes sensitive data for logging
 * @function sanitizeForLog
 * @param {any} obj - Object to sanitize
 * @returns {any} Sanitized object with sensitive fields redacted
 */
function sanitizeForLog(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj };
  const sensitiveFields = ['token', 'password', 'apikey', 'authorization', 'x-token', 'auth'];

  // Recursively sanitize object
  function sanitizeRecursive(target: any): any {
    if (Array.isArray(target)) {
      return target.map(sanitizeRecursive);
    }
    
    if (target && typeof target === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(target)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = sanitizeRecursive(value);
        }
      }
      return result;
    }
    
    return target;
  }

  return sanitizeRecursive(sanitized);
}

/**
 * Makes authenticated GraphQL requests to Semble API with rate limiting and error handling
 * @async
 * @function sembleApiRequest
 * @param {string} query - GraphQL query string
 * @param {IDataObject} variables - GraphQL variables object
 * @param {number} retryAttempts - Maximum number of retry attempts (default: 3)
 * @param {boolean} debugMode - Enable detailed logging for troubleshooting (default: false)
 * @returns {Promise<any>} Promise resolving to the GraphQL response data
 * @throws {NodeApiError} When API request fails or rate limits are exceeded
 * @description Includes automatic retry with exponential backoff and jitter
 */
export async function sembleApiRequest(
  this:
    | IHookFunctions
    | IExecuteFunctions
    | IExecuteSingleFunctions
    | ILoadOptionsFunctions
    | IPollFunctions,
  query: string,
  variables: IDataObject = {},
  retryAttempts: number = 3,
  debugMode: boolean = false
): Promise<any> {
  const credentials = await this.getCredentials("sembleApi");

  if (debugMode) {
    debugLog(this, 'Starting API request', {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      variables: sanitizeForLog(variables),
      retryAttempts,
      baseUrl: credentials.baseUrl
    });
  }

  // Validate safety mode before making any API requests
  validateSafetyMode(credentials, query);

  const options: IHttpRequestOptions = {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-token": credentials.apiToken as string,
    },
    method: "POST",
    body: {
      query,
      variables,
    },
    url: credentials.baseUrl as string,
    json: true,
  };

  if (debugMode) {
    debugLog(this, 'Request options prepared', {
      url: options.url,
      method: options.method,
      headers: sanitizeForLog(options.headers),
      bodySize: JSON.stringify(options.body).length
    });
  }

  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    try {
      if (debugMode && attempt > 0) {
        debugLog(this, `Retry attempt ${attempt}/${retryAttempts}`);
      }

      // Enforce rate limiting before making the request
      await enforceRateLimit();

      if (debugMode) {
        debugLog(this, `Making HTTP request (attempt ${attempt + 1})`, {
          query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
          variables: sanitizeForLog(variables),
          url: options.url,
          method: options.method
        });
      }

      const response = await this.helpers.httpRequest(options);

      if (debugMode) {
        debugLog(this, 'Received API response', {
          hasErrors: !!response.errors,
          errorsCount: response.errors?.length || 0,
          dataKeys: response.data ? Object.keys(response.data) : [],
          responseSize: JSON.stringify(response).length
        });
      }

      if (response.errors) {
        if (debugMode) {
          debugLog(this, 'GraphQL errors detected', {
            errors: response.errors.map((err: any) => ({
              message: err.message,
              path: err.path,
              extensions: err.extensions
            }))
          });
        }

        throw new NodeApiError(this.getNode(), {
          message: `GraphQL Error: ${response.errors[0].message}`,
          description: response.errors
            .map((err: any) => err.message)
            .join(", "),
        });
      }

      if (debugMode) {
        debugLog(this, 'API request completed successfully', {
          attempt: attempt + 1,
          dataPreview: truncateForLog(response.data, 500)
        });
      }

      return response.data;
    } catch (error: any) {
      // Handle rate limiting (429 status code) or server overload (503)
      const isRateLimited =
        error.response?.status === 429 || error.response?.status === 503;
      const isRetryableError = error.response?.status >= 500 || isRateLimited;

      if (debugMode) {
        debugLog(this, 'Error occurred during Semble API request', {
          attempt: attempt + 1,
          error: {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            isRateLimited,
            isRetryableError
          }
        });
      }

      if (isRetryableError && attempt < retryAttempts) {
        // Exponential backoff: 1s, 2s, 4s, etc.
        const delay = Math.pow(2, attempt) * 1000;

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.3 * delay;
        const totalDelay = delay + jitter;

        if (debugMode) {
          debugLog(this, `Retrying after error (${Math.round(totalDelay)}ms delay)`, {
            attempt: attempt + 1,
            totalAttempts: retryAttempts + 1,
            delayMs: Math.round(totalDelay)
          });
        }

        // Use n8n logger if available, fallback to error throwing
        if (this.logger) {
          this.logger.warn(
            `Semble API rate limited or server error (attempt ${attempt + 1}/${
              retryAttempts + 1
            }). Retrying in ${Math.round(totalDelay)}ms...`
          );
        }

        await sleep(totalDelay);
        continue;
      }

      // If it's a rate limiting error and we've exhausted retries
      if (isRateLimited) {
        throw new NodeApiError(this.getNode(), {
          message: "Semble API rate limit exceeded",
          description:
            "The API request was rate limited. Please reduce the frequency of requests or increase polling intervals.",
          httpCode: error.response?.status || 429,
        });
      }

      throw new NodeApiError(this.getNode(), error as any);
    }
  }
}

/**
 * Validates safety mode settings to prevent accidental data modifications
 * @function validateSafetyMode
 * @param {any} credentials - Semble API credentials object
 * @param {string} operation - The operation being performed
 * @throws {NodeApiError} When safety mode prevents the operation
 */
function validateSafetyMode(credentials: any, operation: string): void {
  const environment = credentials.environment || 'development';
  const safetyMode = credentials.safetyMode !== false; // Default to true
  const productionConfirmed = credentials.productionConfirmed === true;

  // Check production environment confirmation
  if (environment === 'production' && !productionConfirmed) {
    throw new NodeApiError(
      { message: 'Production access not confirmed', code: 'SAFETY_BLOCK' } as any,
      {
        message: '⚠️ Production Environment Safety Block: You must confirm production access in credentials',
        description: 'To use production environment, check "Production Confirmation" in your Semble API credentials',
        httpCode: '403'
      }
    );
  }

  // Block destructive operations in safety mode
  const destructiveOperations = ['create', 'update', 'delete', 'mutation'];
  const isDestructive = destructiveOperations.some(op => 
    operation.toLowerCase().includes(op) || operation.toLowerCase().startsWith('create') || 
    operation.toLowerCase().startsWith('update') || operation.toLowerCase().startsWith('delete')
  );

  if (safetyMode && isDestructive && environment !== 'production') {
    throw new NodeApiError(
      { message: 'Safety mode active', code: 'SAFETY_MODE' } as any,
      {
        message: `🛡️ Safety Mode: ${operation} operation blocked in ${environment} environment`,
        description: 'To perform data modifications, disable "Enable Safety Mode" in your Semble API credentials or switch to read-only operations',
        httpCode: '403'
      }
    );
  }

  // Extra confirmation for production destructive operations
  if (environment === 'production' && isDestructive) {
    // Log warning for production operations (will appear in n8n logs)
  }
}

/**
 * Permission handling utilities for Semble API
 * @description Provides DRY methods for detecting and reporting permission issues
 */

/**
 * Configuration for permission handling
 * @const {Object} PERMISSION_CONFIG
 */
export const PERMISSION_CONFIG = {
  // Common permission error patterns
  PERMISSION_ERROR_PATTERNS: [
    /Missing permission/i,
    /Access denied/i,
    /Unauthorized/i,
    /Forbidden/i,
    /Not allowed/i,
    /Permission required/i,
  ],
  // Indicator for missing fields in output
  MISSING_FIELD_INDICATOR: '__MISSING_PERMISSION__',
  // Key prefix for permission metadata
  PERMISSION_META_PREFIX: '__permission_',
};

/**
 * Represents a field that couldn't be accessed due to permissions
 * @interface MissingPermissionField
 */
export interface MissingPermissionField {
  fieldName: string;
  reason: string;
  errorMessage?: string;
  suggestedAction?: string;
}

/**
 * Metadata about permission issues in API responses
 * @interface PermissionMetadata
 */
export interface PermissionMetadata {
  hasPermissionIssues: boolean;
  missingFields: MissingPermissionField[];
  partialData: boolean;
  timestamp: string;
}

/**
 * Checks if an error is related to API permissions
 * @function isPermissionError
 * @param {any} error - Error object or message to check
 * @returns {boolean} True if the error appears to be permission-related
 */
export function isPermissionError(error: any): boolean {
  const message = typeof error === 'string' ? error : error?.message || '';
  return PERMISSION_CONFIG.PERMISSION_ERROR_PATTERNS.some(pattern => 
    pattern.test(message)
  );
}

/**
 * Extracts permission error details from GraphQL errors
 * @function extractPermissionErrors
 * @param {any[]} errors - Array of GraphQL errors
 * @returns {MissingPermissionField[]} Array of missing permission fields
 */
export function extractPermissionErrors(errors: any[]): MissingPermissionField[] {
  const missingFields: MissingPermissionField[] = [];
  
  if (!Array.isArray(errors)) {
    return missingFields;
  }

  errors.forEach((error, index) => {
    if (isPermissionError(error)) {
      // Try to extract field name from error path or message
      let fieldName = 'unknown_field';
      
      if (error.path && Array.isArray(error.path)) {
        fieldName = error.path.join('.');
      } else {
        // Try to extract field name from error message
        const match = error.message?.match(/(\w+)(?:\s+field|\s+permission)/i);
        if (match) {
          fieldName = match[1];
        }
      }

      missingFields.push({
        fieldName,
        reason: 'insufficient_permissions',
        errorMessage: error.message,
        suggestedAction: 'Contact your Semble administrator to request additional API permissions'
      });
    }
  });

  return missingFields;
}

/**
 * Processes API response data and handles permission issues
 * @function processResponseWithPermissions
 * @param {any} response - Raw API response
 * @param {any} context - n8n context for logging
 * @param {boolean} debugMode - Whether debug logging is enabled
 * @returns {Object} Processed response with permission metadata
 */
export function processResponseWithPermissions(
  response: any,
  context: any,
  debugMode: boolean = false
): {
  data: any;
  permissionMeta: PermissionMetadata;
} {
  const permissionMeta: PermissionMetadata = {
    hasPermissionIssues: false,
    missingFields: [],
    partialData: false,
    timestamp: new Date().toISOString(),
  };

  // Check for GraphQL errors that indicate permission issues
  if (response.errors && Array.isArray(response.errors)) {
    const permissionErrors = extractPermissionErrors(response.errors);
    
    if (permissionErrors.length > 0) {
      permissionMeta.hasPermissionIssues = true;
      permissionMeta.missingFields = permissionErrors;
      permissionMeta.partialData = true;

      if (debugMode) {
        debugLog(context, 'Permission issues detected in API response', {
          errorCount: response.errors.length,
          permissionErrors: permissionErrors.length,
          missingFields: permissionErrors.map(f => f.fieldName)
        });
      }
    }
  }

  return {
    data: response.data || {},
    permissionMeta
  };
}

/**
 * Adds permission metadata to individual data items
 * @function addPermissionMetaToItem
 * @param {any} item - Data item to enhance
 * @param {PermissionMetadata} permissionMeta - Permission metadata
 * @param {number} itemIndex - Index of this item in the result set (for filtering relevant errors)
 * @returns {any} Enhanced item with permission indicators
 */
export function addPermissionMetaToItem(
  item: any,
  permissionMeta: PermissionMetadata,
  itemIndex: number = 0
): any {
  const enhancedItem = { ...item };

  // Filter missing fields to only those relevant to this specific item
  const relevantMissingFields = permissionMeta.missingFields.filter(field => {
    // Check if this error path refers to this specific item
    const pathParts = field.fieldName.split('.');
    
    // Look for patterns like "bookings.data.0.doctor.id" where 0 is the item index
    if (pathParts.length >= 3) {
      const dataIndex = parseInt(pathParts[2]);
      if (!isNaN(dataIndex) && dataIndex === itemIndex) {
        return true;
      }
    }
    
    // Also include general errors that don't specify an item index
    return !field.fieldName.includes('.data.') || field.fieldName.split('.data.').length === 1;
  });

  // Create item-specific permission metadata
  const itemPermissionMeta: PermissionMetadata = {
    hasPermissionIssues: relevantMissingFields.length > 0,
    missingFields: relevantMissingFields,
    partialData: relevantMissingFields.length > 0,
    timestamp: permissionMeta.timestamp,
  };

  // Add permission metadata
  enhancedItem[`${PERMISSION_CONFIG.PERMISSION_META_PREFIX}meta`] = itemPermissionMeta;

  // Mark missing fields in the data structure (only for this item)
  if (itemPermissionMeta.hasPermissionIssues) {
    relevantMissingFields.forEach(missingField => {
      // Convert global path to item-relative path
      // "bookings.data.0.doctor.id" -> "doctor.id" for item 0
      let itemFieldPath = missingField.fieldName;
      const pathParts = missingField.fieldName.split('.');
      
      if (pathParts.length >= 4 && pathParts[1] === 'data') {
        // Remove the "bookings.data.0" part to get "doctor.id"
        itemFieldPath = pathParts.slice(3).join('.');
      }
      
      // Create nested path in the item
      const pathParts2 = itemFieldPath.split('.');
      let current = enhancedItem;
      
      for (let i = 0; i < pathParts2.length - 1; i++) {
        if (!current[pathParts2[i]]) {
          current[pathParts2[i]] = {};
        }
        current = current[pathParts2[i]];
      }
      
      const finalKey = pathParts2[pathParts2.length - 1];
      current[finalKey] = {
        [PERMISSION_CONFIG.MISSING_FIELD_INDICATOR]: {
          reason: missingField.reason,
          message: missingField.errorMessage,
          suggestedAction: missingField.suggestedAction,
          timestamp: itemPermissionMeta.timestamp
        }
      };
    });
  }

  return enhancedItem;
}

/**
 * Enhanced API request function with permission handling
 * @async
 * @function sembleApiRequestWithPermissions
 * @param {string} query - GraphQL query string
 * @param {IDataObject} variables - GraphQL variables object
 * @param {number} retryAttempts - Maximum number of retry attempts (default: 3)
 * @param {boolean} debugMode - Enable detailed logging for troubleshooting (default: false)
 * @returns {Promise<{data: any, permissionMeta: PermissionMetadata}>} Promise resolving to enhanced response
 * @description Wraps sembleApiRequest with permission handling capabilities
 */
export async function sembleApiRequestWithPermissions(
  this:
    | IHookFunctions
    | IExecuteFunctions
    | IExecuteSingleFunctions
    | ILoadOptionsFunctions
    | IPollFunctions,
  query: string,
  variables: IDataObject = {},
  retryAttempts: number = 3,
  debugMode: boolean = false
): Promise<{data: any, permissionMeta: PermissionMetadata}> {
  try {
    // Make the standard API request but don't throw on GraphQL errors for permission issues
    const response = await makeRawApiRequest.call(
      this,
      query,
      variables,
      retryAttempts,
      debugMode
    );

    // Process the response with permission handling
    return processResponseWithPermissions(response, this, debugMode);

  } catch (error: any) {
    // If it's a permission error, convert to a partial success with metadata
    if (isPermissionError(error)) {
      const permissionMeta: PermissionMetadata = {
        hasPermissionIssues: true,
        missingFields: [{
          fieldName: 'entire_query',
          reason: 'insufficient_permissions',
          errorMessage: error.message,
          suggestedAction: 'Contact your Semble administrator to request additional API permissions'
        }],
        partialData: false,
        timestamp: new Date().toISOString(),
      };

      if (debugMode) {
        debugLog(this, 'Entire query failed due to permissions', {
          error: error.message
        });
      }

      return {
        data: {},
        permissionMeta
      };
    }

    // Re-throw non-permission errors
    throw error;
  }
}

/**
 * Raw API request function that doesn't throw on GraphQL errors
 * @async
 * @function makeRawApiRequest
 * @description Internal function for making API requests without throwing on GraphQL errors
 */
async function makeRawApiRequest(
  this:
    | IHookFunctions
    | IExecuteFunctions
    | IExecuteSingleFunctions
    | ILoadOptionsFunctions
    | IPollFunctions,
  query: string,
  variables: IDataObject = {},
  retryAttempts: number = 3,
  debugMode: boolean = false
): Promise<any> {
  const credentials = await this.getCredentials("sembleApi");

  if (debugMode) {
    debugLog(this, 'Starting raw API request', {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      variables: sanitizeForLog(variables),
      retryAttempts,
      baseUrl: credentials.baseUrl
    });
  }

  // Validate safety mode before making any API requests
  validateSafetyMode(credentials, query);

  const options: IHttpRequestOptions = {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-token": credentials.apiToken as string,
    },
    method: "POST",
    body: {
      query,
      variables,
    },
    url: credentials.baseUrl as string,
    json: true,
  };

  if (debugMode) {
    debugLog(this, 'Request options prepared', {
      url: options.url,
      method: options.method,
      headers: sanitizeForLog(options.headers),
      bodySize: JSON.stringify(options.body).length
    });
  }

  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    try {
      if (debugMode && attempt > 0) {
        debugLog(this, `Retry attempt ${attempt}/${retryAttempts}`);
      }

      // Enforce rate limiting before making the request
      await enforceRateLimit();

      if (debugMode) {
        debugLog(this, `Making HTTP request (attempt ${attempt + 1})`, {
          query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
          variables: sanitizeForLog(variables),
          url: options.url,
          method: options.method
        });
      }

      const response = await this.helpers.httpRequest(options);

      if (debugMode) {
        debugLog(this, 'Received API response', {
          hasErrors: !!response.errors,
          errorsCount: response.errors?.length || 0,
          dataKeys: response.data ? Object.keys(response.data) : [],
          responseSize: JSON.stringify(response).length
        });
      }

      return response;
    } catch (error: any) {
      // Handle rate limiting (429 status code) or server overload (503)
      const isRateLimited =
        error.response?.status === 429 || error.response?.status === 503;
      const isRetryableError = error.response?.status >= 500 || isRateLimited;

      if (debugMode) {
        debugLog(this, 'Error occurred during Semble API request', {
          attempt: attempt + 1,
          error: {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            isRateLimited,
            isRetryableError
          }
        });
      }

      if (isRetryableError && attempt < retryAttempts) {
        // Exponential backoff: 1s, 2s, 4s, etc.
        const delay = Math.pow(2, attempt) * 1000;

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.3 * delay;
        const totalDelay = delay + jitter;

        if (debugMode) {
          debugLog(this, `Retrying after error (${Math.round(totalDelay)}ms delay)`, {
            attempt: attempt + 1,
            totalAttempts: retryAttempts + 1,
            delayMs: Math.round(totalDelay)
          });
        }

        // Use n8n logger if available, fallback to error throwing
        if (this.logger) {
          this.logger.warn(
            `Semble API rate limited or server error (attempt ${attempt + 1}/${
              retryAttempts + 1
            }). Retrying in ${Math.round(totalDelay)}ms...`
          );
        }

        await sleep(totalDelay);
        continue;
      }

      // If it's a rate limiting error and we've exhausted retries
      if (isRateLimited) {
        throw new NodeApiError(this.getNode(), {
          message: "Semble API rate limit exceeded",
          description:
            "The API request was rate limited. Please reduce the frequency of requests or increase polling intervals.",
          httpCode: error.response?.status || 429,
        });
      }

      throw new NodeApiError(this.getNode(), error as any);
    }
  }
}

/**
 * Configuration for fields excluded from n8n triggers
 * @const {Object} EXCLUDED_FIELDS_CONFIG
 * @description Defines which fields are excluded and their messages
 * 
 * Example usage:
 * prescriptions: "My custom message goes here."
 */
export const EXCLUDED_FIELDS_CONFIG = {
  // Default exclusion message
  _DEFAULT_MESSAGE: "Excluded from n8n.",
  
  // Complex object fields that require dedicated nodes
  patient: {
    letters: null, // Will use default message
    labs: null, // Will use default message
    prescriptions: null, // Will use default message
    records: null, // Will use default message
    patientDocuments: null, // Will use default message
    bookings: null, // Will use default message
    invoices: null, // Will use default message
    episodes: null, // Will use default message
    consultations: null, // Will use default message
  },
  booking: {
    // Add booking-specific exclusions if needed
  },
  // Add other resource types as needed
};

/**
 * Adds excluded fields to an item's data with explanatory messages
 * @function addExcludedFieldsToItem
 * @param {IDataObject} item - The item to add excluded fields to
 * @param {string} resourceType - The type of resource (patient, booking, etc.)
 * @returns {IDataObject} The item with excluded fields added
 * @description Adds excluded fields with messages to maintain user experience consistency
 */
export function addExcludedFieldsToItem(item: IDataObject, resourceType: string): IDataObject {
  const excludedFields = EXCLUDED_FIELDS_CONFIG[resourceType as keyof typeof EXCLUDED_FIELDS_CONFIG];
  
  if (!excludedFields || typeof excludedFields !== 'object') {
    return item;
  }

  const itemWithExcludedFields = { ...item };
  const defaultMessage = EXCLUDED_FIELDS_CONFIG._DEFAULT_MESSAGE;
  
  // Add each excluded field with its explanatory message
  for (const [fieldName, message] of Object.entries(excludedFields)) {
    // Skip the _DEFAULT_MESSAGE field itself
    if (fieldName === '_DEFAULT_MESSAGE') {
      continue;
    }
    
    // Use the specific message or fall back to the default message
    itemWithExcludedFields[fieldName] = message || defaultMessage;
  }

  return itemWithExcludedFields;
}

/**
 * Processes an array of items and adds excluded fields to each
 * @function addExcludedFieldsToItems
 * @param {IDataObject[]} items - Array of items to process
 * @param {string} resourceType - The type of resource (patient, booking, etc.)
 * @returns {IDataObject[]} Array of items with excluded fields added
 * @description Batch processes items to add excluded fields consistently
 */
export function addExcludedFieldsToItems(items: IDataObject[], resourceType: string): IDataObject[] {
  return items.map(item => addExcludedFieldsToItem(item, resourceType));
}

/**
 * Checks if a field is excluded for a given resource type
 * @function isFieldExcluded
 * @param {string} fieldName - Name of the field to check
 * @param {string} resourceType - The type of resource (patient, booking, etc.)
 * @returns {boolean} True if the field is excluded
 * @description Utility function to check if a field should be excluded
 */
export function isFieldExcluded(fieldName: string, resourceType: string): boolean {
  const excludedFields = EXCLUDED_FIELDS_CONFIG[resourceType as keyof typeof EXCLUDED_FIELDS_CONFIG];
  return !!(excludedFields && typeof excludedFields === 'object' && fieldName in excludedFields);
}

/**
 * Gets the exclusion message for a specific field
 * @function getExclusionMessage
 * @param {string} fieldName - Name of the field
 * @param {string} resourceType - The type of resource (patient, booking, etc.)
 * @returns {string | null} The exclusion message or null if not excluded
 * @description Gets the user-friendly message for an excluded field
 */
export function getExclusionMessage(fieldName: string, resourceType: string): string | null {
  const excludedFields = EXCLUDED_FIELDS_CONFIG[resourceType as keyof typeof EXCLUDED_FIELDS_CONFIG];
  
  if (!excludedFields || typeof excludedFields !== 'object') {
    return null;
  }
  
  const fieldMessage = excludedFields[fieldName as keyof typeof excludedFields];
  
  if (fieldMessage === undefined) {
    return null; // Field is not excluded
  }
  
  // Return the specific message or the default message if field value is null
  return fieldMessage || EXCLUDED_FIELDS_CONFIG._DEFAULT_MESSAGE;
}
