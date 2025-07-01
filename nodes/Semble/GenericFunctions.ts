/**
 * @fileoverview Generic utility functions for Semble API integration
 * @description This module provides rate limiting, API request handling, and utility functions
 * @author Mike Hatcher <mike.hatcher@progenious.com>
 * @website https://progenious.com
 * @version 1.0
 * @namespace N8nNodesSemble.Utils
 */

import {
  IExecuteFunctions,
  IExecuteSingleFunctions,
  IHookFunctions,
  ILoadOptionsFunctions,
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
 * Makes authenticated GraphQL requests to Semble API with rate limiting and error handling
 * @async
 * @function sembleApiRequest
 * @param {string} query - GraphQL query string
 * @param {IDataObject} variables - GraphQL variables object
 * @param {number} retryAttempts - Maximum number of retry attempts (default: 3)
 * @returns {Promise<any>} Promise resolving to the GraphQL response data
 * @throws {NodeApiError} When API request fails or rate limits are exceeded
 * @description Includes automatic retry with exponential backoff and jitter
 */
export async function sembleApiRequest(
  this:
    | IHookFunctions
    | IExecuteFunctions
    | IExecuteSingleFunctions
    | ILoadOptionsFunctions,
  query: string,
  variables: IDataObject = {},
  retryAttempts: number = 3
): Promise<any> {
  const credentials = await this.getCredentials("sembleApi");

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

  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    try {
      // Enforce rate limiting before making the request
      await enforceRateLimit();

      const response = await this.helpers.httpRequest(options);

      if (response.errors) {
        throw new NodeApiError(this.getNode(), {
          message: `GraphQL Error: ${response.errors[0].message}`,
          description: response.errors
            .map((err: any) => err.message)
            .join(", "),
        });
      }

      return response.data;
    } catch (error: any) {
      // Handle rate limiting (429 status code) or server overload (503)
      const isRateLimited =
        error.response?.status === 429 || error.response?.status === 503;
      const isRetryableError = error.response?.status >= 500 || isRateLimited;

      if (isRetryableError && attempt < retryAttempts) {
        // Exponential backoff: 1s, 2s, 4s, etc.
        const delay = Math.pow(2, attempt) * 1000;

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.3 * delay;
        const totalDelay = delay + jitter;

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
