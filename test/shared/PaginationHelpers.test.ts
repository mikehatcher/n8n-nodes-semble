/**
 * @fileoverview Tests for modular pagination system
 * @description Comprehensive tests for SemblePagination class and helper functions
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Shared
 */

import { IExecuteFunctions, IPollFunctions, IDataObject, NodeApiError } from 'n8n-workflow';
import { MockProxy, mock } from 'jest-mock-extended';
import { 
  SemblePagination, 
  PaginationConfig, 
  PaginationResult,
  buildPaginationConfig,
  PAGINATION_FIELDS
} from '../../nodes/Semble/shared/PaginationHelpers';
import { sembleApiRequest } from '../../nodes/Semble/GenericFunctions';

// Mock the GenericFunctions module
jest.mock('../../nodes/Semble/GenericFunctions');
const mockSembleApiRequest = sembleApiRequest as jest.MockedFunction<typeof sembleApiRequest>;

describe('PaginationHelpers', () => {
  let mockContext: MockProxy<IExecuteFunctions>;

  beforeEach(() => {
    mockContext = mock<IExecuteFunctions>();
    jest.clearAllMocks();
  });

  describe('SemblePagination', () => {
    const mockQuery = `
      query GetPatients($pagination: PaginationInput, $search: String) {
        patients(pagination: $pagination, search: $search) {
          data {
            id
            firstName
            lastName
          }
          pageInfo {
            hasMore
          }
        }
      }
    `;

    const baseConfig: PaginationConfig = {
      query: mockQuery,
      baseVariables: {},
      dataPath: 'patients',
      pageSize: 50,
      returnAll: false,
      search: undefined,
      options: {}
    };

    describe('executeSinglePage', () => {
      it('should execute single page query successfully', async () => {
        const mockResponse = {
          patients: {
            data: [
              { id: '1', firstName: 'John', lastName: 'Doe' },
              { id: '2', firstName: 'Jane', lastName: 'Smith' }
            ],
            pageInfo: { hasMore: true }
          }
        };

        mockSembleApiRequest.mockResolvedValue(mockResponse);

        const result = await SemblePagination.execute(mockContext, baseConfig);

        expect(result.data).toHaveLength(2);
        expect(result.data[0]).toEqual({ id: '1', firstName: 'John', lastName: 'Doe' });
        expect(result.meta.pagesProcessed).toBe(1);
        expect(result.meta.totalRecords).toBe(2);
        expect(result.meta.hasMore).toBe(true);

        expect(mockSembleApiRequest).toHaveBeenCalledWith(
          mockQuery,
          {
            pagination: { page: 1, pageSize: 50 },
            search: undefined,
            options: {}
          },
          3,
          false
        );
      });

      it('should handle empty results', async () => {
        const mockResponse = {
          patients: {
            data: [],
            pageInfo: { hasMore: false }
          }
        };

        mockSembleApiRequest.mockResolvedValue(mockResponse);

        const result = await SemblePagination.execute(mockContext, baseConfig);

        expect(result.data).toHaveLength(0);
        expect(result.meta.pagesProcessed).toBe(1);
        expect(result.meta.totalRecords).toBe(0);
        expect(result.meta.hasMore).toBe(false);
      });

      it('should handle missing pageInfo', async () => {
        const mockResponse = {
          patients: {
            data: [{ id: '1', firstName: 'John', lastName: 'Doe' }]
          }
        };

        mockSembleApiRequest.mockResolvedValue(mockResponse);

        const result = await SemblePagination.execute(mockContext, baseConfig);

        expect(result.data).toHaveLength(1);
        expect(result.meta.hasMore).toBe(false);
      });

      it('should handle search parameter', async () => {
        const configWithSearch = {
          ...baseConfig,
          search: 'John'
        };

        const mockResponse = {
          patients: {
            data: [{ id: '1', firstName: 'John', lastName: 'Doe' }],
            pageInfo: { hasMore: false }
          }
        };

        mockSembleApiRequest.mockResolvedValue(mockResponse);

        await SemblePagination.execute(mockContext, configWithSearch);

        expect(mockSembleApiRequest).toHaveBeenCalledWith(
          mockQuery,
          {
            pagination: { page: 1, pageSize: 50 },
            search: 'John',
            options: {}
          },
          3,
          false
        );
      });
    });

    describe('executeAutoPagination', () => {
      it('should auto-paginate through multiple pages', async () => {
        const configWithReturnAll = {
          ...baseConfig,
          returnAll: true
        };

        // Mock multiple pages
        mockSembleApiRequest
          .mockResolvedValueOnce({
            patients: {
              data: [
                { id: '1', firstName: 'John', lastName: 'Doe' },
                { id: '2', firstName: 'Jane', lastName: 'Smith' }
              ],
              pageInfo: { hasMore: true }
            }
          })
          .mockResolvedValueOnce({
            patients: {
              data: [
                { id: '3', firstName: 'Bob', lastName: 'Wilson' }
              ],
              pageInfo: { hasMore: false }
            }
          });

        const result = await SemblePagination.execute(mockContext, configWithReturnAll);

        expect(result.data).toHaveLength(3);
        expect(result.data[0]).toEqual({ id: '1', firstName: 'John', lastName: 'Doe' });
        expect(result.data[2]).toEqual({ id: '3', firstName: 'Bob', lastName: 'Wilson' });
        expect(result.meta.pagesProcessed).toBe(2);
        expect(result.meta.totalRecords).toBe(3);
        expect(result.meta.hasMore).toBeUndefined(); // Not set for returnAll

        expect(mockSembleApiRequest).toHaveBeenCalledTimes(2);
        expect(mockSembleApiRequest).toHaveBeenNthCalledWith(1, mockQuery, {
          pagination: { page: 1, pageSize: 100 },
          search: undefined,
          options: {}
        }, 3, false);
        expect(mockSembleApiRequest).toHaveBeenNthCalledWith(2, mockQuery, {
          pagination: { page: 2, pageSize: 100 },
          search: undefined,
          options: {}
        }, 3, false);
      });

      it('should handle single page with returnAll', async () => {
        const configWithReturnAll = {
          ...baseConfig,
          returnAll: true
        };

        mockSembleApiRequest.mockResolvedValue({
          patients: {
            data: [{ id: '1', firstName: 'John', lastName: 'Doe' }],
            pageInfo: { hasMore: false }
          }
        });

        const result = await SemblePagination.execute(mockContext, configWithReturnAll);

        expect(result.data).toHaveLength(1);
        expect(result.meta.pagesProcessed).toBe(1);
        expect(result.meta.totalRecords).toBe(1);
        expect(mockSembleApiRequest).toHaveBeenCalledTimes(1);
      });

      it('should stop at safety limit of 1000 pages when no progress is made', async () => {
        const configWithReturnAll = {
          ...baseConfig,
          returnAll: true
        };

        // Mock response that has more pages initially, then returns empty data after 1000 pages
        let callCount = 0;
        mockSembleApiRequest.mockImplementation(() => {
          callCount++;
          if (callCount <= 1000) {
            return Promise.resolve({
              patients: {
                data: [{ id: `${callCount}`, firstName: 'John', lastName: 'Doe' }],
                pageInfo: { hasMore: true }
              }
            });
          } else {
            // After 1000 pages, return empty data - this should trigger the safety break
            return Promise.resolve({
              patients: {
                data: [],
                pageInfo: { hasMore: true }
              }
            });
          }
        });

        const result = await SemblePagination.execute(mockContext, configWithReturnAll);

        // Should process exactly 1000 pages with data, then stop when empty data is encountered
        expect(result.meta.pagesProcessed).toBe(1001); // 1000 with data + 1 empty
        expect(result.data).toHaveLength(1000); // Only the pages with actual data
        expect(mockSembleApiRequest).toHaveBeenCalledTimes(1001);
      });

      it('should continue processing beyond 1000 pages when data is still being returned', async () => {
        const configWithReturnAll = {
          ...baseConfig,
          returnAll: true
        };

        // Mock response that returns data for 1500 pages, then stops
        let callCount = 0;
        mockSembleApiRequest.mockImplementation(() => {
          callCount++;
          if (callCount <= 1500) {
            return Promise.resolve({
              patients: {
                data: [{ id: `${callCount}`, firstName: 'John', lastName: 'Doe' }],
                pageInfo: { hasMore: callCount < 1500 }
              }
            });
          } else {
            return Promise.resolve({
              patients: {
                data: [],
                pageInfo: { hasMore: false }
              }
            });
          }
        });

        const result = await SemblePagination.execute(mockContext, configWithReturnAll);

        // Should process all 1500 pages because data was being returned
        expect(result.meta.pagesProcessed).toBe(1500);
        expect(result.data).toHaveLength(1500);
        expect(mockSembleApiRequest).toHaveBeenCalledTimes(1500);
      });

      it('should handle options parameter', async () => {
        const configWithOptions = {
          ...baseConfig,
          returnAll: true,
          options: { status: 'active' }
        };

        mockSembleApiRequest.mockResolvedValue({
          patients: {
            data: [{ id: '1', firstName: 'John', lastName: 'Doe' }],
            pageInfo: { hasMore: false }
          }
        });

        await SemblePagination.execute(mockContext, configWithOptions);

        expect(mockSembleApiRequest).toHaveBeenCalledWith(
          mockQuery,
          {
            pagination: { page: 1, pageSize: 100 },
            search: undefined,
            options: { status: 'active' }
          },
          3,
          false
        );
      });
    });

    describe('error handling', () => {
      it('should wrap API errors in NodeApiError', async () => {
        mockSembleApiRequest.mockRejectedValue(new Error('API connection failed'));

        await expect(
          SemblePagination.execute(mockContext, baseConfig)
        ).rejects.toThrow(NodeApiError);
      });

      it('should handle malformed API responses', async () => {
        mockSembleApiRequest.mockResolvedValue({
          // Missing patients data
        });

        const result = await SemblePagination.execute(mockContext, baseConfig);

        expect(result.data).toHaveLength(0);
        expect(result.meta.totalRecords).toBe(0);
      });
    });
  });

  describe('buildPaginationConfig', () => {
    it('should build config with default values', () => {
      const options: IDataObject = {};
      const config = buildPaginationConfig(options);

      expect(config).toEqual({
        pageSize: 50,
        returnAll: false,
        search: undefined
      });
    });

    it('should use provided values', () => {
      const options: IDataObject = {
        pageSize: 25,
        returnAll: true,
        search: 'test search'
      };
      const config = buildPaginationConfig(options);

      expect(config).toEqual({
        pageSize: 25,
        returnAll: true,
        search: 'test search'
      });
    });

    it('should handle undefined search', () => {
      const options: IDataObject = {
        pageSize: 100,
        returnAll: false,
        search: ''
      };
      const config = buildPaginationConfig(options);

      expect(config).toEqual({
        pageSize: 100,
        returnAll: false,
        search: undefined
      });
    });
  });

  describe('PAGINATION_FIELDS', () => {
    it('should contain required pagination fields', () => {
      expect(PAGINATION_FIELDS).toContain('pageInfo');
      expect(PAGINATION_FIELDS).toContain('hasMore');
    });
  });
});
