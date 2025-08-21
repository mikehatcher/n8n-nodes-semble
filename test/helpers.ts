/**
 * @fileoverview Test helper utilities for n8n-nodes-semble
 * @description Provides common testing utilities, mock functions, and sample data following n8n patterns
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Helpers
 * @since 2.0.0
 */

import { 
  IExecuteFunctions, 
  ILoadOptionsFunctions,
  IDataObject,
  INodeExecutionData,
  INodeParameters,
  ICredentialDataDecryptedObject
} from 'n8n-workflow';
import { MockProxy, mock } from 'jest-mock-extended';

/**
 * Default test credentials for Semble API
 */
export const TEST_CREDENTIALS: ICredentialDataDecryptedObject = {
  baseUrl: 'https://test.semble.app/graphql',
  apiToken: 'test-api-token-12345',
};

/**
 * Creates a mock IExecuteFunctions context for testing
 * @param parameters - Node parameters to mock
 * @param inputData - Input data for the node
 * @param credentials - Credentials to use (defaults to TEST_CREDENTIALS)
 * @returns Mocked IExecuteFunctions
 */
export function createMockExecuteFunctions(
  parameters: INodeParameters = {},
  inputData: INodeExecutionData[] = [{ json: {} }],
  credentials: ICredentialDataDecryptedObject = TEST_CREDENTIALS
): MockProxy<IExecuteFunctions> {
  const mockContext = mock<IExecuteFunctions>();
  
  // Mock basic methods
  mockContext.getInputData.mockReturnValue(inputData);
  mockContext.getNodeParameter.mockImplementation((parameterName: string, itemIndex?: number, defaultValue?: any) => {
    return parameters[parameterName] ?? defaultValue;
  });
  mockContext.getCredentials.mockResolvedValue(credentials);
  
  // Mock helpers
  mockContext.helpers = {
    ...mockContext.helpers,
    returnJsonArray: jest.fn((data: IDataObject[]) => 
      data.map(item => ({ json: item }))
    ),
    httpRequest: jest.fn(),
  };
  
  // Mock logger
  mockContext.logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  
  // Mock node information
  mockContext.getNode.mockReturnValue({
    id: 'test-node-id',
    name: 'Test Semble Node',
    type: 'n8n-nodes-semble.semble',
    typeVersion: 1,
    position: [0, 0],
    parameters: parameters,
  });
  
  // Mock continue on fail
  mockContext.continueOnFail.mockReturnValue(false);
  
  return mockContext;
}

/**
 * Creates a mock ILoadOptionsFunctions context for testing dropdown options
 * @param credentials - Credentials to use (defaults to TEST_CREDENTIALS)
 * @returns Mocked ILoadOptionsFunctions
 */
export function createMockLoadOptionsFunctions(
  credentials: ICredentialDataDecryptedObject = TEST_CREDENTIALS
): MockProxy<ILoadOptionsFunctions> {
  const mockContext = mock<ILoadOptionsFunctions>();
  
  mockContext.getCredentials.mockResolvedValue(credentials);
  mockContext.helpers = {
    ...mockContext.helpers,
    httpRequest: jest.fn(),
  };
  
  return mockContext;
}

/**
 * Creates sample booking data for testing
 * @param overrides - Properties to override in the sample data
 * @returns Sample booking data
 */
export function createSampleBooking(overrides: Partial<IDataObject> = {}): IDataObject {
  return {
    id: 'booking-123',
    patientId: 'patient-456',
    doctorId: 'doctor-789',
    locationId: 'location-101',
    bookingTypeId: 'type-112',
    start: '2025-07-17T09:00:00.000Z',
    end: '2025-07-17T10:00:00.000Z',
    comments: 'Test booking',
    createdAt: '2025-07-17T08:00:00.000Z',
    updatedAt: '2025-07-17T08:00:00.000Z',
    ...overrides,
  };
}

/**
 * Creates sample patient data for testing
 * @param overrides - Properties to override in the sample data
 * @returns Sample patient data
 */
export function createSamplePatient(overrides: Partial<IDataObject> = {}): IDataObject {
  return {
    id: 'patient-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    dateOfBirth: '1985-06-15',
    createdAt: '2025-07-17T08:00:00.000Z',
    updatedAt: '2025-07-17T08:00:00.000Z',
    ...overrides,
  };
}

/**
 * Creates a mock GraphQL response
 * @param data - The data to return
 * @param errors - Optional GraphQL errors
 * @returns Mock GraphQL response
 */
export function createMockGraphQLResponse(data: any, errors?: any[]): any {
  return {
    data,
    errors,
  };
}

/**
 * Creates a mock HTTP response for testing
 * @param statusCode - HTTP status code
 * @param body - Response body
 * @param headers - Response headers
 * @returns Mock HTTP response
 */
export function createMockHttpResponse(
  statusCode: number = 200,
  body: any = {},
  headers: Record<string, string> = {}
): any {
  return {
    statusCode,
    body,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  };
}
