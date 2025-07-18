/**
 * @fileoverview Generic utility functions for Semble API integration
 * @description Simplified implementation for real API requests in integration tests
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Nodes.GenericFunctions
 */

import {
  IExecuteFunctions,
  IExecuteSingleFunctions,
  IHookFunctions,
  ILoadOptionsFunctions,
  IPollFunctions,
  IDataObject,
  NodeApiError,
  IHttpRequestOptions,
} from "n8n-workflow";

/**
 * Makes authenticated GraphQL requests to Semble API
 * @async
 * @function sembleApiRequest
 * @param {string} query - GraphQL query string
 * @param {IDataObject} variables - GraphQL variables object
 * @param {number} retryAttempts - Maximum number of retry attempts (default: 3)
 * @param {boolean} debugMode - Enable detailed logging for troubleshooting (default: false)
 * @returns {Promise<any>} Promise resolving to the GraphQL response data
 * @throws {NodeApiError} When API request fails
 * @description Simplified version focused on getting real API calls working
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
    this.logger?.info('Starting Semble API request', {
      query: query.substring(0, 100) + '...',
      variables: Object.keys(variables),
      url: credentials.url || credentials.baseUrl,
    });
  }

  // DEBUG: Always log for integration tests
  console.log("🔧 API Request Debug:");
  console.log("- URL:", credentials.url || credentials.baseUrl);
  console.log("- Token available:", !!(credentials.token || credentials.apiToken));
  console.log("- Token value preview:", `${(credentials.token || credentials.apiToken || '').toString().substring(0, 20)}...`);
  console.log("- Full credentials keys:", Object.keys(credentials));
  console.log("- Query preview:", query.substring(0, 200) + "...");
  console.log("- Variables:", JSON.stringify(variables, null, 2));

  const options: IHttpRequestOptions = {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Token": credentials.token || credentials.apiToken,
    },
    method: "POST",
    body: {
      query,
      variables,
    },
    url: (credentials.url || credentials.baseUrl) as string,
    json: true,
  };

  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    try {
      if (debugMode && attempt > 0) {
        this.logger?.info(`Retry attempt ${attempt}/${retryAttempts}`);
      }

      const response = await this.helpers.httpRequest(options);

      if (debugMode) {
        this.logger?.info('Received API response', {
          hasErrors: !!response.errors,
          errorsCount: response.errors?.length || 0,
          dataKeys: response.data ? Object.keys(response.data) : [],
        });
      }

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
      const isRetryableError = error.response?.status >= 500;

      if (debugMode) {
        this.logger?.error('Error during Semble API request', {
          attempt: attempt + 1,
          error: error.message,
          status: error.response?.status,
        });
      }

      if (isRetryableError && attempt < retryAttempts) {
        // Simple exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        
        this.logger?.warn(
          `API error (attempt ${attempt + 1}/${retryAttempts + 1}). Retrying in ${delay}ms...`
        );

        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      console.log("🔴 Detailed API Error Debug:");
      console.log("- Error type:", typeof error);
      console.log("- Error name:", error?.constructor?.name);
      console.log("- Error message:", error?.message);
      console.log("- Response status:", error?.response?.status);
      console.log("- Response statusText:", error?.response?.statusText);
      console.log("- Response data:", error?.response?.data);

      throw new NodeApiError(this.getNode(), {
        message: `Semble API Error: ${error.message}`,
        description: error.response?.data?.message || error.message,
        httpCode: error.response?.status || 500,
      });
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new NodeApiError(this.getNode(), {
    message: "Unexpected error: Maximum retries exceeded",
  });
}
