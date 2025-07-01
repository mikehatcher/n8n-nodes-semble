/**
 * @fileoverview Semble API credentials configuration for n8n
 * @description This module defines the credential type for authenticating with the Semble API
 * @author Mike Hatcher <mike.hatcher@progenious.com>
 * @website https://progenious.com
 * @version 1.0
 * @namespace N8nNodesSemble.Credentials
 */

import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

/**
 * Semble API credential type for n8n
 * @class SembleApi
 * @implements {ICredentialType}
 * @description Defines the authentication mechanism for Semble's GraphQL API using JWT tokens
 */
export class SembleApi implements ICredentialType {
  /** @readonly The unique identifier for this credential type */
  name = "sembleApi";

  /** @readonly Display name shown in n8n UI */
  displayName = "Semble API";

  /** @readonly Link to Semble API documentation */
  documentationUrl = "https://docs.semble.io/";

  /**
   * Configuration properties for the credential
   * @type {INodeProperties[]}
   * @description Defines the input fields for API token and GraphQL endpoint
   */
  properties: INodeProperties[] = [
    {
      displayName: "Environment",
      name: "environment",
      type: "options",
      options: [
        {
          name: "Production",
          value: "production",
          description: "Live production environment - USE WITH EXTREME CAUTION"
        },
        {
          name: "Staging",
          value: "staging", 
          description: "Staging/testing environment"
        },
        {
          name: "Development",
          value: "development",
          description: "Local development environment (recommended for testing)"
        }
      ],
      default: "development",
      description: "Select the environment you are connecting to",
      required: true,
    },
    {
      displayName: "API Token",
      name: "apiToken",
      type: "string",
      typeOptions: { password: true },
      default: "",
      description:
        "The API token for your Semble account (JWT token from Semble app settings)",
      required: true,
    },
    {
      displayName: "GraphQL Endpoint",
      name: "baseUrl",
      type: "string",
      default: "https://open.semble.io/graphql",
      description: "The GraphQL endpoint for the Semble API",
      required: true,
    },
    {
      displayName: "Enable Safety Mode",
      name: "safetyMode", 
      type: "boolean",
      default: true,
      description: "Enable safety mode to prevent accidental data modifications. Recommended for non-production environments.",
      displayOptions: {
        show: {
          environment: ["development", "staging"]
        }
      }
    },
    {
      displayName: "Production Confirmation",
      name: "productionConfirmed",
      type: "boolean", 
      default: false,
      description: "⚠️ I confirm I am intentionally connecting to PRODUCTION and understand the risks",
      displayOptions: {
        show: {
          environment: ["production"]
        }
      },
      required: true
    }
  ];

  /**
   * Authentication configuration for Semble API
   * @type {IAuthenticateGeneric}
   * @description Uses generic authentication with x-token header containing JWT
   */
  // Use generic authentication with x-token header
  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {
      headers: {
        "x-token": "={{$credentials.apiToken}}",
        "Content-Type": "application/json",
      },
    },
  };

  /**
   * Connection test configuration
   * @type {ICredentialTestRequest}
   * @description Tests the API connection using GraphQL introspection query
   */
  // Test the connection with GraphQL introspection
  test: ICredentialTestRequest = {
    request: {
      baseURL: "={{$credentials.baseUrl}}",
      url: "",
      method: "POST",
      body: {
        query: "query { __schema { types { name } } }",
      },
    },
  };
}
