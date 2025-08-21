/**
 * @fileoverview Integration tests for updated Semble node modular architecture
 * @description Tests the complete patient operations using the modular pagination system
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Integration
 */

import { SemblePagination, buildPaginationConfig } from '../../nodes/Semble/shared/PaginationHelpers';
import { GET_PATIENT_QUERY, GET_PATIENTS_QUERY, DELETE_PATIENT_MUTATION } from '../../nodes/Semble/shared/PatientQueries';
import { sembleApiRequest } from '../../nodes/Semble/GenericFunctions';

// Mock the GenericFunctions module
jest.mock('../../nodes/Semble/GenericFunctions');
const mockSembleApiRequest = sembleApiRequest as jest.MockedFunction<typeof sembleApiRequest>;

describe('Semble Node Integration - Modular System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modular Architecture Validation', () => {
    it('should export all required pagination components', () => {
      expect(SemblePagination).toBeDefined();
      expect(SemblePagination.execute).toBeDefined();
      expect(buildPaginationConfig).toBeDefined();
    });

    it('should export all patient query constants', () => {
      expect(GET_PATIENT_QUERY).toBeDefined();
      expect(GET_PATIENTS_QUERY).toBeDefined();
      expect(DELETE_PATIENT_MUTATION).toBeDefined();
      
      // Verify queries contain essential elements
      expect(GET_PATIENT_QUERY).toContain('query GetPatient');
      expect(GET_PATIENTS_QUERY).toContain('query GetPatients');
      expect(DELETE_PATIENT_MUTATION).toContain('mutation DeletePatient');
    });

    it('should have consistent GraphQL structure across queries', () => {
      // All queries should use ID variable for single record operations
      expect(GET_PATIENT_QUERY).toContain('$id: ID!');
      expect(DELETE_PATIENT_MUTATION).toContain('$id: ID!');
      
      // Multi-record query should use pagination
      expect(GET_PATIENTS_QUERY).toContain('$pagination: Pagination');
      expect(GET_PATIENTS_QUERY).toContain('pageInfo');
      expect(GET_PATIENTS_QUERY).toContain('hasMore');
    });
  });

  describe('Pagination Configuration Builder', () => {
    it('should build valid configuration from node parameters', () => {
      const nodeOptions = {
        pageSize: 25,
        returnAll: true,
        search: 'test search term'
      };

      const config = buildPaginationConfig(nodeOptions);

      expect(config).toEqual({
        pageSize: 25,
        returnAll: true,
        search: 'test search term'
      });
    });

    it('should handle empty configuration with defaults', () => {
      const config = buildPaginationConfig({});

      expect(config).toEqual({
        pageSize: 50,
        returnAll: false,
        search: undefined
      });
    });

    it('should normalize empty search strings', () => {
      const config = buildPaginationConfig({
        search: ''
      });

      expect(config.search).toBeUndefined();
    });
  });

  describe('Query Structure Validation', () => {
    it('should have balanced GraphQL syntax in all queries', () => {
      const queries = [GET_PATIENT_QUERY, GET_PATIENTS_QUERY, DELETE_PATIENT_MUTATION];

      queries.forEach(query => {
        // Count braces to ensure balanced syntax
        const openBraces = (query.match(/{/g) || []).length;
        const closeBraces = (query.match(/}/g) || []).length;
        expect(openBraces).toBe(closeBraces);

        // Ensure no trailing commas before closing braces
        expect(query).not.toMatch(/,\s*}/);
      });
    });

    it('should include all essential patient fields', () => {
      const essentialFields = ['id', 'firstName', 'lastName', 'email', 'status'];
      
      essentialFields.forEach(field => {
        expect(GET_PATIENT_QUERY).toContain(field);
        expect(GET_PATIENTS_QUERY).toContain(field);
      });
    });

    it('should include structured data fields', () => {
      // Address structure
      expect(GET_PATIENT_QUERY).toContain('address {');
      expect(GET_PATIENTS_QUERY).toContain('address {');
      
      // Phone structure  
      expect(GET_PATIENT_QUERY).toContain('phones {');
      expect(GET_PATIENTS_QUERY).toContain('phones {');
      
      // Communication preferences
      expect(GET_PATIENT_QUERY).toContain('communicationPreferences {');
      expect(GET_PATIENTS_QUERY).toContain('communicationPreferences {');
    });
  });

  describe('Modular Reusability Demonstration', () => {
    it('should demonstrate how pagination works with different data types', async () => {
      // This test shows how the modular system can be used for any data type
      const mockExecuteContext = {
        getNode: jest.fn(() => ({ id: 'test', name: 'test' }))
      };

      // Mock successful pagination response
      mockSembleApiRequest.mockResolvedValue({
        testDataType: {
          data: [
            { id: '1', name: 'Test Item 1' },
            { id: '2', name: 'Test Item 2' }
          ],
          pageInfo: { hasMore: false }
        }
      });

      // Example of how to use pagination for any data type
      const config = {
        query: 'query GetTestData($pagination: Pagination) { testDataType(pagination: $pagination) { data { id name } pageInfo { hasMore } } }',
        baseVariables: {},
        dataPath: 'testDataType',
        pageSize: 50,
        returnAll: false,
        search: undefined,
        options: {}
      };

      const result = await SemblePagination.execute(mockExecuteContext as any, config);

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ id: '1', name: 'Test Item 1' });
      expect(result.meta.totalRecords).toBe(2);
      expect(result.meta.pagesProcessed).toBe(1);
    });

    it('should handle auto-pagination across multiple pages', async () => {
      const mockExecuteContext = {
        getNode: jest.fn(() => ({ id: 'test', name: 'test' }))
      };

      // Mock multi-page response
      mockSembleApiRequest
        .mockResolvedValueOnce({
          patients: {
            data: [{ id: '1', firstName: 'John' }],
            pageInfo: { hasMore: true }
          }
        })
        .mockResolvedValueOnce({
          patients: {
            data: [{ id: '2', firstName: 'Jane' }],
            pageInfo: { hasMore: false }
          }
        });

      const config = {
        query: GET_PATIENTS_QUERY,
        baseVariables: {},
        dataPath: 'patients',
        pageSize: 50,
        returnAll: true, // Enable auto-pagination
        search: undefined,
        options: {}
      };

      const result = await SemblePagination.execute(mockExecuteContext as any, config);

      expect(result.data).toHaveLength(2);
      expect(result.meta.pagesProcessed).toBe(2);
      expect(result.meta.totalRecords).toBe(2);
      expect(mockSembleApiRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling and Safety', () => {
    it('should enforce pagination safety limits', async () => {
      const mockExecuteContext = {
        getNode: jest.fn(() => ({ id: 'test', name: 'test' }))
      };

      // Mock response that always indicates more pages (infinite pagination scenario)
      mockSembleApiRequest.mockResolvedValue({
        patients: {
          data: [{ id: '1', firstName: 'Test' }],
          pageInfo: { hasMore: true } // Always true = infinite loop risk
        }
      });

      const config = {
        query: GET_PATIENTS_QUERY,
        baseVariables: {},
        dataPath: 'patients',
        pageSize: 50,
        returnAll: true,
        search: undefined,
        options: {},
        maxPages: 5 // Limit to prevent memory exhaustion in tests
      };

      const result = await SemblePagination.execute(mockExecuteContext as any, config);

      // Should stop at maxPages limit of 5 for testing (instead of 1000)
      expect(result.meta.pagesProcessed).toBe(5);
      expect(mockSembleApiRequest).toHaveBeenCalledTimes(5);
    });

    it('should handle API errors gracefully', async () => {
      const mockExecuteContext = {
        getNode: jest.fn(() => ({ id: 'test', name: 'test' }))
      };

      mockSembleApiRequest.mockRejectedValue(new Error('API connection failed'));

      const config = {
        query: GET_PATIENT_QUERY,
        baseVariables: { id: 'test-id' },
        dataPath: 'patient',
        pageSize: 50,
        returnAll: false,
        search: undefined,
        options: {}
      };

      await expect(
        SemblePagination.execute(mockExecuteContext as any, config)
      ).rejects.toThrow('Failed to execute paginated query');
    });
  });

  describe('Performance and Efficiency', () => {
    it('should use larger page sizes for auto-pagination efficiency', async () => {
      const mockExecuteContext = {
        getNode: jest.fn(() => ({ id: 'test', name: 'test' }))
      };

      mockSembleApiRequest.mockResolvedValue({
        patients: {
          data: [{ id: '1', firstName: 'Test' }],
          pageInfo: { hasMore: false }
        }
      });

      const config = {
        query: GET_PATIENTS_QUERY,
        baseVariables: {},
        dataPath: 'patients',
        pageSize: 25, // User requested smaller page size
        returnAll: true, // But auto-pagination should use larger sizes
        search: undefined,
        options: {}
      };

      await SemblePagination.execute(mockExecuteContext as any, config);

      // Verify auto-pagination uses page size 100 for efficiency, not the user's 25
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          pagination: expect.objectContaining({
            pageSize: 100 // Efficient auto-pagination size
          })
        }),
        3,
        false
      );
    });

    it('should respect user page size for single page requests', async () => {
      const mockExecuteContext = {
        getNode: jest.fn(() => ({ id: 'test', name: 'test' }))
      };

      mockSembleApiRequest.mockResolvedValue({
        patients: {
          data: [{ id: '1', firstName: 'Test' }],
          pageInfo: { hasMore: false }
        }
      });

      const config = {
        query: GET_PATIENTS_QUERY,
        baseVariables: {},
        dataPath: 'patients',
        pageSize: 25, // User requested page size
        returnAll: false, // Single page request
        search: undefined,
        options: {}
      };

      await SemblePagination.execute(mockExecuteContext as any, config);

      // Verify single page request uses user's requested page size
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          pagination: expect.objectContaining({
            pageSize: 25 // User's requested size
          })
        }),
        3,
        false
      );
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should handle search functionality correctly', async () => {
      const mockExecuteContext = {
        getNode: jest.fn(() => ({ id: 'test', name: 'test' }))
      };

      mockSembleApiRequest.mockResolvedValue({
        patients: {
          data: [
            { id: '1', firstName: 'John', lastName: 'Smith' },
            { id: '2', firstName: 'Jane', lastName: 'Smith' }
          ],
          pageInfo: { hasMore: false }
        }
      });

      const config = {
        query: GET_PATIENTS_QUERY,
        baseVariables: {},
        dataPath: 'patients',
        pageSize: 50,
        returnAll: false,
        search: 'Smith', // Search for patients with surname "Smith"
        options: {}
      };

      await SemblePagination.execute(mockExecuteContext as any, config);

      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          search: 'Smith'
        }),
        3,
        false
      );
    });

    it('should pass through additional options correctly', async () => {
      const mockExecuteContext = {
        getNode: jest.fn(() => ({ id: 'test', name: 'test' }))
      };

      mockSembleApiRequest.mockResolvedValue({
        patients: {
          data: [{ id: '1', firstName: 'Test' }],
          pageInfo: { hasMore: false }
        }
      });

      const config = {
        query: GET_PATIENTS_QUERY,
        baseVariables: {},
        dataPath: 'patients',
        pageSize: 50,
        returnAll: false,
        search: undefined,
        options: {
          status: 'active',
          sortBy: 'lastName',
          includeArchived: false
        }
      };

      await SemblePagination.execute(mockExecuteContext as any, config);

      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          options: {
            status: 'active',
            sortBy: 'lastName',
            includeArchived: false
          }
        }),
        3,
        false
      );
    });
  });
});
