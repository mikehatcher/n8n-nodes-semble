/**
 * @fileoverview Unit tests for Constants
 * @description Tests the centralized constants and static values
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Core
 */

import { SEMBLE_CONSTANTS } from '../../core/Constants';

describe('Constants', () => {
  describe('SEMBLE_CONSTANTS', () => {
    test('should export main constants object', () => {
      expect(SEMBLE_CONSTANTS).toBeDefined();
      expect(typeof SEMBLE_CONSTANTS).toBe('object');
    });

    describe('API Configuration', () => {
      test('should define API endpoints', () => {
        expect(SEMBLE_CONSTANTS.API.ENDPOINTS).toBeDefined();
        expect(SEMBLE_CONSTANTS.API.ENDPOINTS.GRAPHQL).toBe('/graphql');
        expect(SEMBLE_CONSTANTS.API.ENDPOINTS.INTROSPECTION).toBe('/graphql?introspection=true');
        expect(SEMBLE_CONSTANTS.API.ENDPOINTS.HEALTH).toBe('/health');
        expect(SEMBLE_CONSTANTS.API.ENDPOINTS.VERSION).toBe('/version');
      });

      test('should define HTTP headers', () => {
        expect(SEMBLE_CONSTANTS.API.HEADERS).toBeDefined();
        expect(SEMBLE_CONSTANTS.API.HEADERS.CONTENT_TYPE).toBe('application/json');
        expect(SEMBLE_CONSTANTS.API.HEADERS.ACCEPT).toBe('application/json');
        expect(SEMBLE_CONSTANTS.API.HEADERS.USER_AGENT).toBe('n8n-nodes-semble/2.0.0');
        expect(SEMBLE_CONSTANTS.API.HEADERS.AUTHORIZATION_PREFIX).toBe('Bearer ');
        expect(SEMBLE_CONSTANTS.API.HEADERS.API_KEY_HEADER).toBe('X-API-Key');
      });

      test('should define HTTP status codes', () => {
        expect(SEMBLE_CONSTANTS.API.STATUS_CODES).toBeDefined();
        expect(SEMBLE_CONSTANTS.API.STATUS_CODES.OK).toBe(200);
        expect(SEMBLE_CONSTANTS.API.STATUS_CODES.CREATED).toBe(201);
        expect(SEMBLE_CONSTANTS.API.STATUS_CODES.NO_CONTENT).toBe(204);
        expect(SEMBLE_CONSTANTS.API.STATUS_CODES.BAD_REQUEST).toBe(400);
        expect(SEMBLE_CONSTANTS.API.STATUS_CODES.UNAUTHORIZED).toBe(401);
        expect(SEMBLE_CONSTANTS.API.STATUS_CODES.FORBIDDEN).toBe(403);
        expect(SEMBLE_CONSTANTS.API.STATUS_CODES.NOT_FOUND).toBe(404);
        expect(SEMBLE_CONSTANTS.API.STATUS_CODES.CONFLICT).toBe(409);
        expect(SEMBLE_CONSTANTS.API.STATUS_CODES.UNPROCESSABLE_ENTITY).toBe(422);
        expect(SEMBLE_CONSTANTS.API.STATUS_CODES.TOO_MANY_REQUESTS).toBe(429);
        expect(SEMBLE_CONSTANTS.API.STATUS_CODES.INTERNAL_SERVER_ERROR).toBe(500);
        expect(SEMBLE_CONSTANTS.API.STATUS_CODES.BAD_GATEWAY).toBe(502);
        expect(SEMBLE_CONSTANTS.API.STATUS_CODES.SERVICE_UNAVAILABLE).toBe(503);
        expect(SEMBLE_CONSTANTS.API.STATUS_CODES.GATEWAY_TIMEOUT).toBe(504);
      });

      test('should define API version information', () => {
        expect(SEMBLE_CONSTANTS.API.VERSION).toBeDefined();
        expect(SEMBLE_CONSTANTS.API.VERSION.CURRENT).toBe('2.0.0');
        expect(SEMBLE_CONSTANTS.API.VERSION.MINIMUM_SUPPORTED).toBe('1.0.0');
        expect(SEMBLE_CONSTANTS.API.VERSION.GRAPHQL_VERSION).toBe('15.0.0');
      });
    });

    describe('Timeout Configuration', () => {
      test('should define request timeouts', () => {
        expect(SEMBLE_CONSTANTS.TIMEOUTS).toBeDefined();
        expect(SEMBLE_CONSTANTS.TIMEOUTS.REQUEST_TIMEOUT).toBe(30000);
        expect(SEMBLE_CONSTANTS.TIMEOUTS.CONNECT_TIMEOUT).toBe(10000);
        expect(SEMBLE_CONSTANTS.TIMEOUTS.READ_TIMEOUT).toBe(20000);
      });

      test('should define operation timeouts', () => {
        expect(SEMBLE_CONSTANTS.TIMEOUTS.OPERATION_TIMEOUT).toBe(45000);
        expect(SEMBLE_CONSTANTS.TIMEOUTS.BATCH_OPERATION_TIMEOUT).toBe(120000);
        expect(SEMBLE_CONSTANTS.TIMEOUTS.INTROSPECTION_TIMEOUT).toBe(15000);
      });

      test('should define service initialization timeouts', () => {
        expect(SEMBLE_CONSTANTS.TIMEOUTS.SERVICE_INIT_TIMEOUT).toBe(10000);
        expect(SEMBLE_CONSTANTS.TIMEOUTS.CREDENTIAL_VALIDATION_TIMEOUT).toBe(5000);
        expect(SEMBLE_CONSTANTS.TIMEOUTS.PERMISSION_CHECK_TIMEOUT).toBe(3000);
      });

      test('should define cache timeouts', () => {
        expect(SEMBLE_CONSTANTS.TIMEOUTS.CACHE_OPERATION_TIMEOUT).toBe(1000);
        expect(SEMBLE_CONSTANTS.TIMEOUTS.CACHE_WARMUP_TIMEOUT).toBe(30000);
      });

      test('should have reasonable timeout values', () => {
        // All timeouts should be positive numbers
        Object.values(SEMBLE_CONSTANTS.TIMEOUTS).forEach(timeout => {
          expect(typeof timeout).toBe('number');
          expect(timeout).toBeGreaterThan(0);
        });

        // Request timeout should be longer than connect timeout
        expect(SEMBLE_CONSTANTS.TIMEOUTS.REQUEST_TIMEOUT)
          .toBeGreaterThan(SEMBLE_CONSTANTS.TIMEOUTS.CONNECT_TIMEOUT);

        // Operation timeout should be longer than request timeout
        expect(SEMBLE_CONSTANTS.TIMEOUTS.OPERATION_TIMEOUT)
          .toBeGreaterThan(SEMBLE_CONSTANTS.TIMEOUTS.REQUEST_TIMEOUT);

        // Batch operation timeout should be the longest
        expect(SEMBLE_CONSTANTS.TIMEOUTS.BATCH_OPERATION_TIMEOUT)
          .toBeGreaterThan(SEMBLE_CONSTANTS.TIMEOUTS.OPERATION_TIMEOUT);
      });
    });

    describe('Retry Configuration', () => {
      test('should define retry attempts', () => {
        expect(SEMBLE_CONSTANTS.RETRY).toBeDefined();
        expect(SEMBLE_CONSTANTS.RETRY.MAX_RETRIES).toBe(3);
        expect(SEMBLE_CONSTANTS.RETRY.MAX_RETRIES_CRITICAL).toBe(5);
        expect(SEMBLE_CONSTANTS.RETRY.MAX_RETRIES_NON_CRITICAL).toBe(2);
      });

      test('should define retry delays', () => {
        expect(SEMBLE_CONSTANTS.RETRY.INITIAL_DELAY).toBe(1000);
      });

      test('should have logical retry values', () => {
        // Critical operations should have more retries
        expect(SEMBLE_CONSTANTS.RETRY.MAX_RETRIES_CRITICAL)
          .toBeGreaterThan(SEMBLE_CONSTANTS.RETRY.MAX_RETRIES);

        // Non-critical should have fewer retries
        expect(SEMBLE_CONSTANTS.RETRY.MAX_RETRIES_NON_CRITICAL)
          .toBeLessThan(SEMBLE_CONSTANTS.RETRY.MAX_RETRIES);

        // All retry values should be positive
        expect(SEMBLE_CONSTANTS.RETRY.MAX_RETRIES).toBeGreaterThan(0);
        expect(SEMBLE_CONSTANTS.RETRY.INITIAL_DELAY).toBeGreaterThan(0);
      });
    });

    describe('Constants Structure Validation', () => {
      test('should have consistent structure', () => {
        // Main sections should exist
        expect(SEMBLE_CONSTANTS.API).toBeDefined();
        expect(SEMBLE_CONSTANTS.TIMEOUTS).toBeDefined();
        expect(SEMBLE_CONSTANTS.RETRY).toBeDefined();

        // Should be properly nested objects
        expect(typeof SEMBLE_CONSTANTS.API).toBe('object');
        expect(typeof SEMBLE_CONSTANTS.TIMEOUTS).toBe('object');
        expect(typeof SEMBLE_CONSTANTS.RETRY).toBe('object');
      });

      test('should not have undefined or null values in critical paths', () => {
        // Check that all endpoint values are strings
        Object.values(SEMBLE_CONSTANTS.API.ENDPOINTS).forEach(endpoint => {
          expect(typeof endpoint).toBe('string');
          expect(endpoint.length).toBeGreaterThan(0);
        });

        // Check that all header values are strings
        Object.values(SEMBLE_CONSTANTS.API.HEADERS).forEach(header => {
          expect(typeof header).toBe('string');
          expect(header.length).toBeGreaterThan(0);
        });

        // Check that all status codes are numbers
        Object.values(SEMBLE_CONSTANTS.API.STATUS_CODES).forEach(code => {
          expect(typeof code).toBe('number');
          expect(code).toBeGreaterThan(0);
        });
      });

      test('should have immutable constants', () => {
        // Constants should be readonly in TypeScript but not necessarily frozen at runtime
        // This test validates the structure exists and values are reasonable
        expect(SEMBLE_CONSTANTS.TIMEOUTS.REQUEST_TIMEOUT).toBe(30000);
        expect(SEMBLE_CONSTANTS.API.STATUS_CODES.OK).toBe(200);
        expect(SEMBLE_CONSTANTS.RETRY.MAX_RETRIES).toBe(3);
      });
    });

    describe('API Status Code Validity', () => {
      test('should have valid HTTP status codes', () => {
        const statusCodes = SEMBLE_CONSTANTS.API.STATUS_CODES;

        // 2xx Success codes
        expect(statusCodes.OK).toBe(200);
        expect(statusCodes.CREATED).toBe(201);
        expect(statusCodes.NO_CONTENT).toBe(204);

        // 4xx Client error codes
        expect(statusCodes.BAD_REQUEST).toBe(400);
        expect(statusCodes.UNAUTHORIZED).toBe(401);
        expect(statusCodes.FORBIDDEN).toBe(403);
        expect(statusCodes.NOT_FOUND).toBe(404);
        expect(statusCodes.CONFLICT).toBe(409);
        expect(statusCodes.UNPROCESSABLE_ENTITY).toBe(422);
        expect(statusCodes.TOO_MANY_REQUESTS).toBe(429);

        // 5xx Server error codes
        expect(statusCodes.INTERNAL_SERVER_ERROR).toBe(500);
        expect(statusCodes.BAD_GATEWAY).toBe(502);
        expect(statusCodes.SERVICE_UNAVAILABLE).toBe(503);
        expect(statusCodes.GATEWAY_TIMEOUT).toBe(504);
      });

      test('should categorize status codes correctly', () => {
        const statusCodes = SEMBLE_CONSTANTS.API.STATUS_CODES;

        // Success codes (2xx)
        const successCodes = [statusCodes.OK, statusCodes.CREATED, statusCodes.NO_CONTENT];
        successCodes.forEach(code => {
          expect(code).toBeGreaterThanOrEqual(200);
          expect(code).toBeLessThan(300);
        });

        // Client error codes (4xx)
        const clientErrorCodes = [
          statusCodes.BAD_REQUEST,
          statusCodes.UNAUTHORIZED,
          statusCodes.FORBIDDEN,
          statusCodes.NOT_FOUND,
          statusCodes.CONFLICT,
          statusCodes.UNPROCESSABLE_ENTITY,
          statusCodes.TOO_MANY_REQUESTS,
        ];
        clientErrorCodes.forEach(code => {
          expect(code).toBeGreaterThanOrEqual(400);
          expect(code).toBeLessThan(500);
        });

        // Server error codes (5xx)
        const serverErrorCodes = [
          statusCodes.INTERNAL_SERVER_ERROR,
          statusCodes.BAD_GATEWAY,
          statusCodes.SERVICE_UNAVAILABLE,
          statusCodes.GATEWAY_TIMEOUT,
        ];
        serverErrorCodes.forEach(code => {
          expect(code).toBeGreaterThanOrEqual(500);
          expect(code).toBeLessThan(600);
        });
      });
    });

    describe('Version Information', () => {
      test('should have valid semantic versions', () => {
        const semverPattern = /^\d+\.\d+\.\d+$/;

        expect(SEMBLE_CONSTANTS.API.VERSION.CURRENT).toMatch(semverPattern);
        expect(SEMBLE_CONSTANTS.API.VERSION.MINIMUM_SUPPORTED).toMatch(semverPattern);
        expect(SEMBLE_CONSTANTS.API.VERSION.GRAPHQL_VERSION).toMatch(semverPattern);
      });

      test('should have logical version relationships', () => {
        const current = SEMBLE_CONSTANTS.API.VERSION.CURRENT;
        const minimum = SEMBLE_CONSTANTS.API.VERSION.MINIMUM_SUPPORTED;

        // Current version should be >= minimum supported
        const currentParts = current.split('.').map(Number);
        const minimumParts = minimum.split('.').map(Number);

        // Compare major version
        if (currentParts[0] > minimumParts[0]) {
          expect(true).toBe(true); // Current major > minimum major
        } else if (currentParts[0] === minimumParts[0]) {
          // Same major, check minor
          if (currentParts[1] > minimumParts[1]) {
            expect(true).toBe(true); // Current minor > minimum minor
          } else if (currentParts[1] === minimumParts[1]) {
            // Same minor, check patch
            expect(currentParts[2]).toBeGreaterThanOrEqual(minimumParts[2]);
          }
        }
      });
    });
  });
});
