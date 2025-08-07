/**
 * @fileoverview Shared pagination utilities for Semble GraphQL API
 * @description Provides reusable pagination logic for all Semble data types
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Nodes.Shared
 */

import { IExecuteFunctions, IPollFunctions, IDataObject, NodeApiError } from "n8n-workflow";
// Type for context that works with both execution and polling functions
type SembleContext = IExecuteFunctions | IPollFunctions;

import { sembleApiRequest } from "../GenericFunctions";

/**
 * Configuration for paginated queries
 */
export interface PaginationConfig {
  /** The GraphQL query string with pagination variables */
  query: string;
  /** Base variables for the query (excluding pagination) */
  baseVariables: IDataObject;
  /** Path to the data array in the response (e.g., 'patients', 'bookings') */
  dataPath: string;
  /** Page size for single page requests */
  pageSize: number;
  /** Whether to return all results via auto-pagination */
  returnAll: boolean;
  /** Optional search term */
  search?: string;
  /** Optional additional options */
  options?: IDataObject;
  /** Maximum pages to process for integration tests (optional) */
  maxPages?: number;
}

/**
 * Result of a paginated query operation
 */
export interface PaginationResult {
  /** The collected data from all pages or single page */
  data: IDataObject[];
  /** Metadata about the pagination operation */
  meta: {
    /** Total pages processed (for returnAll operations) */
    pagesProcessed: number;
    /** Total records returned */
    totalRecords: number;
    /** Whether more pages are available (for single page operations) */
    hasMore?: boolean;
  };
}

/**
 * Generic pagination handler for Semble GraphQL API
 * @class SemblePagination
 * @description Provides reusable pagination logic following Semble API patterns
 */
export class SemblePagination {
  /**
   * Execute a paginated query against the Semble API
   * @static
   * @async
   * @param {SembleContext} context - n8n execution context
   * @param {PaginationConfig} config - Pagination configuration
   * @returns {Promise<PaginationResult>} Paginated results with metadata
   * @throws {NodeApiError} When API requests fail
   */
  static async execute(
    context: SembleContext,
    config: PaginationConfig
  ): Promise<PaginationResult> {
    const { query, baseVariables, dataPath, pageSize, returnAll, search, options } = config;

    try {
      if (returnAll) {
        return await SemblePagination.executeAutoPagination(context, config);
      } else {
        return await SemblePagination.executeSinglePage(context, config);
      }
    } catch (error) {
      throw new NodeApiError(context.getNode(), {
        message: `Failed to execute paginated query: ${(error as Error).message}`,
        description: (error as Error).message,
      });
    }
  }

  /**
   * Execute auto-pagination to retrieve all results
   * @private
   * @static
   * @async
   * @param {SembleContext} context - n8n execution context
   * @param {PaginationConfig} config - Pagination configuration
   * @returns {Promise<PaginationResult>} All paginated results
   */
  private static async executeAutoPagination(
    context: SembleContext,
    config: PaginationConfig
  ): Promise<PaginationResult> {
    const { query, baseVariables, dataPath, search, options, maxPages } = config;
    const allData: IDataObject[] = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const variables: IDataObject = {
        ...baseVariables,
        pagination: { page: currentPage, pageSize: 100 }, // Use larger page size for efficiency
        options: options || {}
      };

      // Only add search if it's provided and not empty/undefined
      if (search) {
        variables.search = search;
      }

      const response = await sembleApiRequest.call(context, query, variables, 3, false);
      const responseData = response[dataPath];

      if (responseData && responseData.data) {
        allData.push(...responseData.data);
        
        // Check if there are more pages using pageInfo.hasMore
        hasMore = responseData.pageInfo?.hasMore || false;
        currentPage++;
        
        // Check maxPages limit for integration tests
        if (maxPages && currentPage > maxPages) {
          console.log(`🔒 Stopping pagination at maxPages limit: ${maxPages}`);
          break;
        }
        
        // Safety check to prevent infinite loops - only break if no progress is being made
        if (currentPage > 1000 && responseData.data.length === 0) {
          break;
        }
      } else {
        hasMore = false;
      }
    }

    return {
      data: allData,
      meta: {
        pagesProcessed: currentPage - 1,
        totalRecords: allData.length,
      }
    };
  }

  /**
   * Execute single page query
   * @private
   * @static
   * @async
   * @param {SembleContext} context - n8n execution context
   * @param {PaginationConfig} config - Pagination configuration
   * @returns {Promise<PaginationResult>} Single page results
   */
  private static async executeSinglePage(
    context: SembleContext,
    config: PaginationConfig
  ): Promise<PaginationResult> {
    const { query, baseVariables, dataPath, pageSize, search, options } = config;

    const variables: IDataObject = {
      ...baseVariables,
      pagination: { page: 1, pageSize },
      options: options || {}
    };

    // Only add search if it's provided and not empty/undefined
    if (search) {
      variables.search = search;
    }

    const response = await sembleApiRequest.call(context, query, variables, 3, false);
    const responseData = response[dataPath];

    if (responseData && responseData.data) {
      return {
        data: responseData.data,
        meta: {
          pagesProcessed: 1,
          totalRecords: responseData.data.length,
          hasMore: responseData.pageInfo?.hasMore || false,
        }
      };
    } else {
      return {
        data: [],
        meta: {
          pagesProcessed: 1,
          totalRecords: 0,
          hasMore: false,
        }
      };
    }
  }
}

/**
 * Common GraphQL pagination fields that should be included in queries
 * @const {string} PAGINATION_FIELDS
 */
export const PAGINATION_FIELDS = `
  pageInfo {
    hasMore
  }
`;

/**
 * Helper to build pagination variables
 * @param {IDataObject} options - Options from n8n parameters
 * @returns {Object} Pagination configuration object
 */
export function buildPaginationConfig(options: IDataObject): {
  pageSize: number;
  returnAll: boolean;
  search?: string;
} {
  return {
    pageSize: (options.pageSize as number) || 50,
    returnAll: (options.returnAll as boolean) || false,
    search: (options.search as string) || undefined,
  };
}
