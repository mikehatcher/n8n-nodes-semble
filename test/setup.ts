/**
 * @fileoverview Global test setup for n8n-nodes-semble
 * @description Configures Jest environment and global mocks following n8n best practices
 */

import { jest } from '@jest/globals';

/**
 * Global test timeout configuration
 * Increased for API operations that may take time
 */
jest.setTimeout(30000);

/**
 * Mock console methods to reduce noise in test output
 * Uncomment if you want to suppress console output during tests
 */
// global.console = {
//   ...console,
//   // Keep error and warn for debugging
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
// };

/**
 * Global test environment variables
 * These will be available in all tests
 */
process.env.NODE_ENV = 'test';
process.env.TZ = 'UTC'; // Ensure consistent timezone for date tests

/**
 * Global error handler for unhandled promise rejections
 * Helps catch async errors that might otherwise be silent
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, just log the error
});

/**
 * Global cleanup after all tests
 */
afterAll(() => {
  // Add any global cleanup logic here
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
