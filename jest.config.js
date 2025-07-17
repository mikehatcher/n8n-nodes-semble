/**
 * Jest configuration for n8n-nodes-semble
 * Following n8n's official testing best practices
 */
module.exports = {
  // Use TypeScript for all test files
  preset: 'ts-jest',
  
  // Run tests in Node.js environment (required for n8n nodes)
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/test/**/*.test.ts',
    '**/__tests__/**/*.test.ts'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  
  // Module name mapping for better imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^~/(.*)$': '<rootDir>/$1',
  },
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'nodes/**/*.ts',
    'credentials/**/*.ts',
    'services/**/*.ts',
    'core/**/*.ts',
    'types/**/*.ts',
    '!nodes/**/*.d.ts',
    '!credentials/**/*.d.ts',
    '!services/**/*.d.ts',
    '!core/**/*.d.ts',
    '!types/**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/old/**',
  ],
  
  // Coverage thresholds (will gradually increase as we add more tests)
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 40,
      lines: 45,
      statements: 45,
    },
  },
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Test timeout (increased for API calls)
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output for better debugging
  verbose: true,
  
  // Global test setup
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/old/',
  ],
  
  // Module paths for n8n types
  modulePaths: ['<rootDir>/node_modules', '<rootDir>'],
};
