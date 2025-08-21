/**
 * @fileoverview Unit tests for GenericFunctions
 * @description Tests the generic utility functions for Semble API integration
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Nodes
 */

import { IDataObject, NodeApiError } from 'n8n-workflow';
import { sembleApiRequest } from '../../nodes/Semble/GenericFunctions';

// Mock the n8n workflow functions
const mockThis = {
  getCredentials: jest.fn(),
  getNode: jest.fn().mockReturnValue({ type: 'test', name: 'Test Node' }),
  helpers: {
    httpRequest: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
};

// Mock console.log to capture debug output
const originalConsoleLog = console.log;
let consoleOutputs: string[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  consoleOutputs = [];
  console.log = jest.fn((...args) => {
    consoleOutputs.push(args.join(' '));
  });
});

afterEach(() => {
  console.log = originalConsoleLog;
});

describe('GenericFunctions', () => {
  describe('sembleApiRequest', () => {
    const mockQuery = 'query { patients { id name } }';
    const mockVariables: IDataObject = { limit: 10 };

    beforeEach(() => {
      mockThis.getCredentials.mockResolvedValue({
        token: 'test-token-123',
        url: 'https://test.semble.io/graphql',
      });
    });

    describe('Successful Requests', () => {
      test('should make successful API request with basic parameters', async () => {
        const mockResponse = {
          data: { patients: [{ id: '1', name: 'Test Patient' }] },
        };

        mockThis.helpers.httpRequest.mockResolvedValueOnce(mockResponse);

        const result = await sembleApiRequest.call(
          mockThis as any,
          mockQuery,
          mockVariables
        );

        expect(result).toEqual(mockResponse.data);
        expect(mockThis.helpers.httpRequest).toHaveBeenCalledWith({
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Token': 'test-token-123',
          },
          method: 'POST',
          body: {
            query: mockQuery,
            variables: mockVariables,
          },
          url: 'https://test.semble.io/graphql',
          json: true,
        });
      });

      test('should handle requests with empty variables', async () => {
        const mockResponse = { data: { patients: [] } };
        mockThis.helpers.httpRequest.mockResolvedValueOnce(mockResponse);

        const result = await sembleApiRequest.call(mockThis as any, mockQuery);

        expect(result).toEqual(mockResponse.data);
        expect(mockThis.helpers.httpRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            body: {
              query: mockQuery,
              variables: {},
            },
          })
        );
      });

      test('should use baseUrl when url is not provided', async () => {
        mockThis.getCredentials.mockResolvedValueOnce({
          apiToken: 'test-api-token',
          baseUrl: 'https://api.semble.io/v2',
        });

        const mockResponse = { data: { success: true } };
        mockThis.helpers.httpRequest.mockResolvedValueOnce(mockResponse);

        await sembleApiRequest.call(mockThis as any, mockQuery);

        expect(mockThis.helpers.httpRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            url: 'https://api.semble.io/v2',
            headers: expect.objectContaining({
              'X-Token': 'test-api-token',
            }),
          })
        );
      });

      test('should enable debug mode when specified', async () => {
        const mockResponse = { data: { test: true } };
        mockThis.helpers.httpRequest.mockResolvedValueOnce(mockResponse);

        await sembleApiRequest.call(
          mockThis as any,
          mockQuery,
          mockVariables,
          3,
          true
        );

        expect(mockThis.logger.info).toHaveBeenCalledWith(
          'Starting Semble API request',
          expect.objectContaining({
            query: expect.stringContaining('query { patients'),
            variables: ['limit'],
            url: 'https://test.semble.io/graphql',
          })
        );

        expect(mockThis.logger.info).toHaveBeenCalledWith(
          'Received API response',
          expect.objectContaining({
            hasErrors: false,
            errorsCount: 0,
            dataKeys: ['test'],
          })
        );
      });
    });

    describe('Debug Logging', () => {
      test('should always log debug information for integration tests', async () => {
        const mockResponse = { data: { test: true } };
        mockThis.helpers.httpRequest.mockResolvedValueOnce(mockResponse);

        await sembleApiRequest.call(mockThis as any, mockQuery, mockVariables);

        expect(consoleOutputs).toContain('🔧 API Request Debug:');
        expect(consoleOutputs).toContain('- URL: https://test.semble.io/graphql');
        expect(consoleOutputs).toContain('- Token available: true');
        expect(consoleOutputs).toContain('- Token value preview: test-token-123...');
        expect(consoleOutputs).toContain('- Full credentials keys: token,url');
      });

      test('should truncate query preview in debug logs', async () => {
        const longQuery = 'query { ' + 'a'.repeat(300) + ' }';
        const mockResponse = { data: { test: true } };
        mockThis.helpers.httpRequest.mockResolvedValueOnce(mockResponse);

        await sembleApiRequest.call(mockThis as any, longQuery);

        const queryLogLine = consoleOutputs.find(line => 
          line.includes('- Query preview:')
        );
        expect(queryLogLine).toBeDefined();
        expect(queryLogLine!.length).toBeLessThan(250); // Should be truncated
      });
    });

    describe('Error Handling', () => {
      test('should handle GraphQL errors in response', async () => {
        const mockResponse = {
          errors: [
            { message: 'Field "nonexistent" is not defined' },
            { message: 'Validation failed' },
          ],
          data: null,
        };

        mockThis.helpers.httpRequest.mockResolvedValueOnce(mockResponse);

        await expect(
          sembleApiRequest.call(mockThis as any, mockQuery)
        ).rejects.toThrow(NodeApiError);
      });

      test('should handle HTTP errors with detailed logging', async () => {
        const mockError = {
          message: 'Network Error',
          response: {
            status: 500,
            statusText: 'Internal Server Error',
            data: { error: 'Database connection failed' },
          },
        };

        mockThis.helpers.httpRequest.mockRejectedValueOnce(mockError);

        await expect(
          sembleApiRequest.call(mockThis as any, mockQuery)
        ).rejects.toThrow(NodeApiError);

        // Check that error logging section started
        expect(consoleOutputs).toContain('🔴 Detailed API Error Debug:');
      });

      test('should handle errors without response object', async () => {
        const mockError = new Error('Connection timeout');
        mockThis.helpers.httpRequest.mockRejectedValueOnce(mockError);

        await expect(
          sembleApiRequest.call(mockThis as any, mockQuery)
        ).rejects.toThrow(NodeApiError);

        // Should log error debug section
        expect(consoleOutputs).toContain('🔴 Detailed API Error Debug:');
      });
    });

    describe('Retry Logic', () => {
      test('should retry on 5xx server errors', async () => {
        const mockError = {
          message: 'Server Error',
          response: { status: 500 },
        };

        const mockSuccess = { data: { success: true } };

        mockThis.helpers.httpRequest
          .mockRejectedValueOnce(mockError)
          .mockRejectedValueOnce(mockError)
          .mockResolvedValueOnce(mockSuccess);

        const result = await sembleApiRequest.call(mockThis as any, mockQuery);

        expect(result).toEqual(mockSuccess.data);
        expect(mockThis.helpers.httpRequest).toHaveBeenCalledTimes(3);
        expect(mockThis.logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('API error (attempt 1/4). Retrying in 1000ms...')
        );
      });

      test('should not retry on 4xx client errors', async () => {
        const mockError = {
          message: 'Bad Request',
          response: { status: 400 },
        };

        mockThis.helpers.httpRequest.mockRejectedValueOnce(mockError);

        await expect(
          sembleApiRequest.call(mockThis as any, mockQuery)
        ).rejects.toThrow(NodeApiError);

        expect(mockThis.helpers.httpRequest).toHaveBeenCalledTimes(1);
      });

      test('should respect custom retry attempts parameter', async () => {
        const mockError = {
          message: 'Server Error',
          response: { status: 503 },
        };

        mockThis.helpers.httpRequest.mockRejectedValue(mockError);

        await expect(
          sembleApiRequest.call(mockThis as any, mockQuery, {}, 1)
        ).rejects.toThrow(NodeApiError);

        expect(mockThis.helpers.httpRequest).toHaveBeenCalledTimes(2); // 1 + 1 retry
      });

      test('should implement exponential backoff', async () => {
        const mockError = {
          message: 'Server Error',
          response: { status: 502 },
        };

        mockThis.helpers.httpRequest.mockRejectedValue(mockError);

        const startTime = Date.now();

        await expect(
          sembleApiRequest.call(mockThis as any, mockQuery, {}, 2)
        ).rejects.toThrow(NodeApiError);

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // Should have waited at least 1s + 2s = 3s for backoff
        expect(totalTime).toBeGreaterThan(2900); // Allow some margin for execution time
      });

      test('should log retry attempts in debug mode', async () => {
        const mockError = {
          message: 'Gateway Timeout',
          response: { status: 504 },
        };

        const mockSuccess = { data: { retried: true } };

        mockThis.helpers.httpRequest
          .mockRejectedValueOnce(mockError)
          .mockResolvedValueOnce(mockSuccess);

        await sembleApiRequest.call(mockThis as any, mockQuery, {}, 3, true);

        expect(mockThis.logger.info).toHaveBeenCalledWith('Retry attempt 1/3');
        expect(mockThis.logger.error).toHaveBeenCalledWith(
          'Error during Semble API request',
          expect.objectContaining({
            attempt: 1,
            error: 'Gateway Timeout',
            status: 504,
          })
        );
      });
    });

    describe('Edge Cases', () => {
      test('should handle missing credentials gracefully', async () => {
        mockThis.getCredentials.mockResolvedValueOnce({});

        const mockResponse = { data: { test: true } };
        mockThis.helpers.httpRequest.mockResolvedValueOnce(mockResponse);

        await sembleApiRequest.call(mockThis as any, mockQuery);

        expect(mockThis.helpers.httpRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-Token': undefined,
            }),
          })
        );
      });

      test('should handle response without data property', async () => {
        const mockResponse = { errors: null };
        mockThis.helpers.httpRequest.mockResolvedValueOnce(mockResponse);

        const result = await sembleApiRequest.call(mockThis as any, mockQuery);

        expect(result).toBeUndefined();
      });

      test('should handle empty query string', async () => {
        const mockResponse = { data: null };
        mockThis.helpers.httpRequest.mockResolvedValueOnce(mockResponse);

        const result = await sembleApiRequest.call(mockThis as any, '');

        expect(result).toBeNull();
        expect(consoleOutputs).toContain('- Query preview: ...');
      });
    });
  });
});
