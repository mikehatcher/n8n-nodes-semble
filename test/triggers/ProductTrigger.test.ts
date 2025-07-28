/**
 * @fileoverview Tests for ProductTrigger implementation
 * @description Comprehensive tests for product trigger functionality
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Triggers
 */

import { ProductTrigger } from "../../nodes/Semble/triggers/ProductTrigger";
import { IPollFunctions, INodeExecutionData } from "n8n-workflow";

// Mock the SemblePagination module
jest.mock("../../nodes/Semble/shared/PaginationHelpers", () => ({
  SemblePagination: {
    execute: jest.fn(),
  },
  buildPaginationConfig: jest.fn(),
}));

// Mock the ProductQueries module
jest.mock("../../nodes/Semble/shared/ProductQueries", () => ({
  GET_PRODUCTS_QUERY: "mock-products-query",
}));

describe("ProductTrigger", () => {
  let mockPollFunctions: jest.Mocked<IPollFunctions>;

  beforeEach(() => {
    // Mock IPollFunctions
    mockPollFunctions = {
      getWorkflowStaticData: jest.fn().mockReturnValue({}),
      getNode: jest.fn().mockReturnValue({ name: "ProductTrigger" }),
      // Add other required methods as stubs
    } as any;

    jest.clearAllMocks();
  });

  describe("RESOURCE_CONFIG", () => {
    it("should have correct resource configuration", () => {
      expect(ProductTrigger.RESOURCE_CONFIG).toEqual({
        displayName: "Product",
        value: "product",
        description: "Monitor products for changes (create, update)",
        query: "mock-products-query",
        dateField: "updatedAt",
        apiResponseKey: "products",
      });
    });
  });

  describe("calculateDateRangeStart", () => {
    beforeEach(() => {
      // Mock Date to have consistent test results
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-07-28T12:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should calculate correct date for 1 day period", () => {
      const result = ProductTrigger.calculateDateRangeStart("1d");
      const expected = new Date("2025-07-27T12:00:00Z");
      expect(result.getTime()).toBe(expected.getTime());
    });

    it("should calculate correct date for 1 week period", () => {
      const result = ProductTrigger.calculateDateRangeStart("1w");
      const expected = new Date("2025-07-21T12:00:00Z");
      expect(result.getTime()).toBe(expected.getTime());
    });

    it("should calculate correct date for 1 month period", () => {
      const result = ProductTrigger.calculateDateRangeStart("1m");
      const expected = new Date("2025-06-28T12:00:00Z");
      expect(result.getTime()).toBe(expected.getTime());
    });

    it("should calculate correct date for 3 months period", () => {
      const result = ProductTrigger.calculateDateRangeStart("3m");
      const expected = new Date("2025-04-29T12:00:00Z");
      expect(result.getTime()).toBe(expected.getTime());
    });

    it("should calculate correct date for 6 months period", () => {
      const result = ProductTrigger.calculateDateRangeStart("6m");
      const expected = new Date("2025-01-29T12:00:00Z");
      expect(result.getTime()).toBe(expected.getTime());
    });

    it("should calculate correct date for 12 months period", () => {
      const result = ProductTrigger.calculateDateRangeStart("12m");
      const expected = new Date("2024-07-28T12:00:00Z"); // One year back exactly
      expect(result.getTime()).toBe(expected.getTime());
    });

    it("should return epoch date for 'all' period", () => {
      const result = ProductTrigger.calculateDateRangeStart("all");
      const expected = new Date("1970-01-01");
      expect(result.getTime()).toBe(expected.getTime());
    });

    it("should default to 1 month for unknown period", () => {
      const result = ProductTrigger.calculateDateRangeStart("unknown");
      const expected = new Date("2025-06-28T12:00:00Z");
      expect(result.getTime()).toBe(expected.getTime());
    });
  });

  describe("pollProducts", () => {
    const { SemblePagination } = require("../../nodes/Semble/shared/PaginationHelpers");

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-07-28T12:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should poll products successfully with new products", async () => {
      const mockProducts = [
        {
          id: "product1",
          name: "Test Product 1",
          itemCode: "TP001",
          status: "active",
          productType: "service",
          createdAt: "2025-07-28T11:00:00Z",
          updatedAt: "2025-07-28T11:00:00Z",
        },
        {
          id: "product2",
          name: "Test Product 2",
          itemCode: "TP002",
          status: "active",
          productType: "product",
          createdAt: "2025-07-28T11:30:00Z",
          updatedAt: "2025-07-28T11:45:00Z",
        },
      ];

      SemblePagination.execute.mockResolvedValue({
        data: mockProducts,
        meta: { pagesProcessed: 1, totalRecords: 2 },
      });

      const config = {
        event: "newOrUpdated" as const,
        datePeriod: "1d",
        limit: -1,
      };

      const result = await ProductTrigger.pollProducts(mockPollFunctions, config);

      expect(result.hasNewData).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.filteredCount).toBe(2);
      expect(result.totalCount).toBe(2);

      // Check trigger metadata
      expect((result.data[0].json as any).__triggerMetadata).toEqual({
        resource: "product",
        event: "newOrUpdated",
        pollTime: "2025-07-28T12:00:00.000Z",
        isNew: true, // createdAt === updatedAt
        isUpdated: false,
        productType: "service",
        status: "active",
      });

      expect((result.data[1].json as any).__triggerMetadata).toEqual({
        resource: "product",
        event: "newOrUpdated",
        pollTime: "2025-07-28T12:00:00.000Z",
        isNew: false, // createdAt !== updatedAt
        isUpdated: true,
        productType: "product",
        status: "active",
      });
    });

    it("should handle empty product results", async () => {
      SemblePagination.execute.mockResolvedValue({
        data: [],
        meta: { pagesProcessed: 1, totalRecords: 0 },
      });

      const config = {
        event: "newOnly" as const,
        datePeriod: "1w",
        limit: 100,
      };

      const result = await ProductTrigger.pollProducts(mockPollFunctions, config);

      expect(result.hasNewData).toBe(false);
      expect(result.data).toHaveLength(0);
      expect(result.filteredCount).toBe(0);
      expect(result.totalCount).toBe(0);
    });

    it("should use correct query parameters for newOnly event", async () => {
      SemblePagination.execute.mockResolvedValue({
        data: [],
        meta: { pagesProcessed: 1, totalRecords: 0 },
      });

      const config = {
        event: "newOnly" as const,
        datePeriod: "1m",
        limit: 50,
      };

      await ProductTrigger.pollProducts(mockPollFunctions, config);

      expect(SemblePagination.execute).toHaveBeenCalledWith(
        mockPollFunctions,
        expect.objectContaining({
          query: "mock-products-query",
          baseVariables: expect.objectContaining({
            options: expect.objectContaining({
              createdAt: expect.objectContaining({
                start: expect.any(String),
                end: expect.any(String),
              }),
            }),
          }),
          dataPath: "products",
          pageSize: 100,
          returnAll: false,
        }),
      );
    });

    it("should use correct query parameters for newOrUpdated event", async () => {
      SemblePagination.execute.mockResolvedValue({
        data: [],
        meta: { pagesProcessed: 1, totalRecords: 0 },
      });

      const config = {
        event: "newOrUpdated" as const,
        datePeriod: "1w",
        limit: -1,
        maxPages: 5,
      };

      await ProductTrigger.pollProducts(mockPollFunctions, config);

      expect(SemblePagination.execute).toHaveBeenCalledWith(
        mockPollFunctions,
        expect.objectContaining({
          query: "mock-products-query",
          baseVariables: expect.objectContaining({
            options: expect.objectContaining({
              updatedAt: expect.objectContaining({
                start: expect.any(String),
                end: expect.any(String),
              }),
            }),
          }),
          dataPath: "products",
          pageSize: 100,
          returnAll: true,
          maxPages: 5,
        }),
      );
    });

    it("should update workflow static data with poll time", async () => {
      const mockStaticData = {};
      mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockStaticData);

      SemblePagination.execute.mockResolvedValue({
        data: [],
        meta: { pagesProcessed: 1, totalRecords: 0 },
      });

      const config = {
        event: "newOrUpdated" as const,
        datePeriod: "1d",
        limit: 100,
      };

      await ProductTrigger.pollProducts(mockPollFunctions, config);

      expect(mockStaticData).toHaveProperty("lastPoll", "2025-07-28T12:00:00.000Z");
    });

    it("should handle API errors gracefully", async () => {
      const apiError = new Error("API request failed");
      SemblePagination.execute.mockRejectedValue(apiError);

      const config = {
        event: "newOrUpdated" as const,
        datePeriod: "1d",
        limit: 100,
      };

      await expect(
        ProductTrigger.pollProducts(mockPollFunctions, config),
      ).rejects.toThrow("Failed to poll products: API request failed");
    });
  });

  describe("handleProductChanges", () => {
    it("should filter products for newOnly event", async () => {
      const products = [
        {
          id: "product1",
          name: "New Product",
          createdAt: "2025-07-28T11:00:00Z",
          updatedAt: "2025-07-28T11:00:00Z", // Same as createdAt = new
        },
        {
          id: "product2",
          name: "Updated Product",
          createdAt: "2025-07-27T10:00:00Z",
          updatedAt: "2025-07-28T11:00:00Z", // Different = updated
        },
      ];

      const config = {
        event: "newOnly" as const,
        datePeriod: "1d",
        limit: 100,
      };

      const result = await ProductTrigger.handleProductChanges(
        mockPollFunctions,
        products,
        config,
      );

      expect(result).toHaveLength(1);
      expect(result[0].json.id).toBe("product1");
      expect((result[0].json as any).__triggerContext).toEqual({
        resource: "product",
        event: "newOnly",
        timestamp: expect.any(String),
        productId: "product1",
        productName: "New Product",
        itemCode: null,
        status: "unknown",
      });
    });

    it("should include all products for newOrUpdated event", async () => {
      const products = [
        {
          id: "product1",
          name: "New Product",
          itemCode: "NP001",
          status: "active",
          createdAt: "2025-07-28T11:00:00Z",
          updatedAt: "2025-07-28T11:00:00Z",
        },
        {
          id: "product2",
          name: "Updated Product",
          itemCode: "UP002",
          status: "inactive",
          createdAt: "2025-07-27T10:00:00Z",
          updatedAt: "2025-07-28T11:00:00Z",
        },
      ];

      const config = {
        event: "newOrUpdated" as const,
        datePeriod: "1d",
        limit: 100,
      };

      const result = await ProductTrigger.handleProductChanges(
        mockPollFunctions,
        products,
        config,
      );

      expect(result).toHaveLength(2);
      expect((result[0].json as any).__triggerContext.productName).toBe("New Product");
      expect((result[0].json as any).__triggerContext.itemCode).toBe("NP001");
      expect((result[0].json as any).__triggerContext.status).toBe("active");
      expect((result[1].json as any).__triggerContext.productName).toBe("Updated Product");
      expect((result[1].json as any).__triggerContext.itemCode).toBe("UP002");
      expect((result[1].json as any).__triggerContext.status).toBe("inactive");
    });
  });

  describe("validateConfig", () => {
    it("should validate correct configuration", () => {
      const validConfig = {
        event: "newOrUpdated" as const,
        datePeriod: "1m",
        limit: 100,
      };

      expect(() => ProductTrigger.validateConfig(validConfig)).not.toThrow();
    });

    it("should throw error for invalid event", () => {
      const invalidConfig = {
        event: "invalid" as any,
        datePeriod: "1m",
        limit: 100,
      };

      expect(() => ProductTrigger.validateConfig(invalidConfig)).toThrow(
        "Invalid event type: invalid",
      );
    });

    it("should throw error for invalid date period", () => {
      const invalidConfig = {
        event: "newOnly" as const,
        datePeriod: "invalid",
        limit: 100,
      };

      expect(() => ProductTrigger.validateConfig(invalidConfig)).toThrow(
        "Invalid date period: invalid",
      );
    });

    it("should throw error for invalid limit", () => {
      const invalidConfig = {
        event: "newOnly" as const,
        datePeriod: "1m",
        limit: 0,
      };

      expect(() => ProductTrigger.validateConfig(invalidConfig)).toThrow(
        "Invalid limit: 0. Must be -1 or positive number",
      );
    });
  });

  describe("getSupportedEvents", () => {
    it("should return correct supported events", () => {
      const events = ProductTrigger.getSupportedEvents();

      expect(events).toEqual([
        {
          name: "New or Updated",
          value: "newOrUpdated",
          description: "Trigger on new products or updates to existing products",
        },
        {
          name: "New Only",
          value: "newOnly",
          description: "Trigger only on newly created products",
        },
      ]);
    });
  });

  describe("getFilteringOptions", () => {
    it("should return correct filtering options", () => {
      const options = ProductTrigger.getFilteringOptions();

      expect(options).toEqual([
        {
          name: "Product Type",
          value: "productType",
          description: "Filter by product type (service, product, etc.)",
        },
        {
          name: "Status",
          value: "status",
          description: "Filter by product status (active, inactive, etc.)",
        },
        {
          name: "Bookable Only",
          value: "isBookable",
          description: "Only include bookable products/services",
        },
        {
          name: "Stock Level",
          value: "stockLevel",
          description: "Filter by current stock level",
        },
      ]);
    });
  });
});
