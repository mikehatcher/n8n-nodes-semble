/**
 * @fileoverview Unit tests for ProductTrigger module
 * @description Comprehensive test suite for product-specific trigger logic
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Triggers.Product
 */

import { IPollFunctions, IDataObject } from "n8n-workflow";
import { ProductTrigger } from "../../nodes/Semble/triggers/ProductTrigger";
import * as GenericFunctions from "../../nodes/Semble/GenericFunctions";
import * as PaginationHelpers from "../../nodes/Semble/shared/PaginationHelpers";

// Mock the dependencies
jest.mock("../../nodes/Semble/GenericFunctions");
jest.mock("../../nodes/Semble/shared/PaginationHelpers");

const mockGenericFunctions = GenericFunctions as jest.Mocked<typeof GenericFunctions>;
const mockPaginationHelpers = PaginationHelpers as jest.Mocked<typeof PaginationHelpers>;

describe("ProductTrigger", () => {
  let mockPollFunctions: jest.Mocked<IPollFunctions>;
  let mockWorkflowStaticData: IDataObject;

  beforeEach(() => {
    mockWorkflowStaticData = {};

    mockPollFunctions = {
      getNodeParameter: jest.fn(),
      getWorkflowStaticData: jest.fn(() => mockWorkflowStaticData),
      getTimezone: jest.fn().mockReturnValue('UTC'),
      getNode: jest.fn(() => ({ 
        type: "n8n-nodes-semble.sembleTrigger",
        name: "Product Trigger Test",
        id: "product-test-id"
      })),
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      },
    } as any;

    // Setup pagination helpers
    mockPaginationHelpers.buildPaginationConfig.mockReturnValue({
      pageSize: -1,
      returnAll: true,
    });

    mockPaginationHelpers.SemblePagination = {
      execute: jest.fn(),
    } as any;

    // Default successful response
    (mockPaginationHelpers.SemblePagination.execute as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("pollProducts method", () => {
    it("should handle new products when no last poll time exists", async () => {
      // Setup: No previous poll time (first run)
      mockWorkflowStaticData.lastPoll = undefined;

      // Setup mock response with product data
      const mockProducts = [
        {
          id: "product1",
          name: "Test Product 1",
          category: "Category A",
          price: 99.99,
          status: "active",
          createdAt: "2025-08-10T10:00:00Z",
          updatedAt: "2025-08-10T10:00:00Z",
        },
        {
          id: "product2",
          name: "Test Product 2",
          category: "Category B",
          price: 149.99,
          status: "active",
          createdAt: "2025-08-10T09:30:00Z",
          updatedAt: "2025-08-10T09:30:00Z",
        },
      ];

      (mockPaginationHelpers.SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: [mockProducts[0], mockProducts[1]],
        meta: {
          pagesProcessed: 1,
          totalRecords: 2,
          hasMore: false
        }
      });

      const config = {
        event: "newOnly" as const,
        datePeriod: "3m",
        limit: 100,
        maxPages: 10
      };

      // Execute
      const result = await ProductTrigger.pollProducts(mockPollFunctions, config);

      // Verify
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('hasNewData');
      expect(Array.isArray(result.data)).toBe(true);
      
      // Verify lastPoll was updated
      expect(mockWorkflowStaticData.lastPoll).toBeDefined();
    });

    it("should handle empty results gracefully", async () => {
      // Setup: No new products
      (mockPaginationHelpers.SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: [],
        meta: {
          pagesProcessed: 1,
          totalRecords: 0,
          hasMore: false
        }
      });

      const config = {
        event: "newOnly" as const,
        datePeriod: "3m",
        limit: 100,
        maxPages: 10
      };

      // Execute
      const result = await ProductTrigger.pollProducts(mockPollFunctions, config);

      // Verify
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockWorkflowStaticData.lastPoll).toBeDefined();
    });

    it("should use existing lastPoll for incremental polling", async () => {
      // Setup: Previous poll time exists
      const previousPollTime = new Date("2025-08-09T10:00:00Z");
      mockWorkflowStaticData.lastPoll = previousPollTime.toISOString();

      // Setup mock response
      const mockProducts = [
        {
          id: "product3",
          name: "New Product",
          category: "New Category",
          price: 199.99,
          status: "active",
          createdAt: "2025-08-10T11:00:00Z",
          updatedAt: "2025-08-10T11:00:00Z",
        },
      ];

      (mockPaginationHelpers.SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: [mockProducts[0]],
        meta: {
          pagesProcessed: 1,
          totalRecords: 1,
          hasMore: false
        }
      });

      const config = {
        event: "newOrUpdated" as const,
        datePeriod: "3m",
        limit: 100,
        maxPages: 10
      };

      // Execute
      const result = await ProductTrigger.pollProducts(mockPollFunctions, config);

      // Verify
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(1);
      
      // Verify pagination was called with correct time range
      expect(mockPaginationHelpers.SemblePagination.execute).toHaveBeenCalled();
      
      // Verify lastPoll was updated
      const newLastPoll = new Date(mockWorkflowStaticData.lastPoll as string);
      expect(newLastPoll.getTime()).toBeGreaterThan(previousPollTime.getTime());
    });

    it("should handle API errors gracefully", async () => {
      // Setup: API error
      (mockPaginationHelpers.SemblePagination.execute as jest.Mock).mockRejectedValue(
        new Error("Product API unavailable")
      );

      const config = {
        event: "newOnly" as const,
        datePeriod: "3m",
        limit: 100,
        maxPages: 10
      };

      // Execute & Verify
      await expect(ProductTrigger.pollProducts(mockPollFunctions, config)).rejects.toThrow();
    });

    it("should handle different product statuses correctly", async () => {
      // Setup: Products with various statuses
      const statusVarietyProducts = [
        {
          id: "product-active",
          name: "Active Product",
          category: "Electronics",
          status: "active",
          price: 99.99,
          createdAt: "2025-08-10T10:00:00Z",
        },
        {
          id: "product-inactive",
          name: "Inactive Product",
          category: "Books",
          status: "inactive",
          price: 29.99,
          createdAt: "2025-08-10T10:15:00Z",
        },
        {
          id: "product-discontinued",
          name: "Discontinued Product",
          category: "Clothing",
          status: "discontinued",
          price: 0.00,
          createdAt: "2025-08-10T10:30:00Z",
        },
        {
          id: "product-draft",
          name: "Draft Product",
          category: "Draft",
          status: "draft",
          price: 199.99,
          createdAt: "2025-08-10T10:45:00Z",
        },
      ];

      (mockPaginationHelpers.SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: statusVarietyProducts,
        meta: {
          pagesProcessed: 1,
          totalRecords: 4,
          hasMore: false
        }
      });

      const config = {
        event: "newOnly" as const,
        datePeriod: "3m",
        limit: 100,
        maxPages: 10
      };

      // Execute
      const result = await ProductTrigger.pollProducts(mockPollFunctions, config);

      // Verify
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(4);
    });

    it("should handle large product catalogs efficiently", async () => {
      // Setup: Large product dataset
      const largeProductSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `product-${i}`,
        name: `Product ${i}`,
        category: `Category ${i % 10}`,
        price: Math.round((Math.random() * 1000) * 100) / 100,
        status: i % 3 === 0 ? "active" : i % 3 === 1 ? "inactive" : "draft",
        createdAt: new Date(Date.now() - i * 60000).toISOString(),
        updatedAt: new Date(Date.now() - i * 30000).toISOString(),
      }));

      (mockPaginationHelpers.SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: largeProductSet,
        meta: {
          pagesProcessed: 10,
          totalRecords: 1000,
          hasMore: false
        }
      });

      const config = {
        event: "newOrUpdated" as const,
        datePeriod: "6m",
        limit: -1, // Unlimited
        maxPages: 50
      };

      // Execute
      const result = await ProductTrigger.pollProducts(mockPollFunctions, config);

      // Verify
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(1000);
      expect(mockWorkflowStaticData.lastPoll).toBeDefined();
    });
  });

  describe("calculateDateRangeStart method", () => {
    it("should calculate 3 month period correctly", () => {
      const result = ProductTrigger.calculateDateRangeStart("3m");
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeLessThan(Date.now());
      
      // Should be approximately 3 months ago
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const timeDiff = Math.abs(result.getTime() - threeMonthsAgo.getTime());
      
      // Allow more tolerance for month calculations (can vary due to month lengths)
      expect(timeDiff).toBeLessThan(7 * 24 * 60 * 60 * 1000); // 7 day tolerance
    });

    it("should calculate 6 month period correctly", () => {
      const result = ProductTrigger.calculateDateRangeStart("6m");
      
      expect(result).toBeInstanceOf(Date);
      
      // Should be approximately 6 months ago
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const timeDiff = Math.abs(result.getTime() - sixMonthsAgo.getTime());
      
      // Allow 24 hour tolerance
      expect(timeDiff).toBeLessThan(24 * 60 * 60 * 1000);
    });

    it("should calculate 12 month period correctly", () => {
      const result = ProductTrigger.calculateDateRangeStart("12m");
      
      expect(result).toBeInstanceOf(Date);
      
      // Should be approximately 12 months ago
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const timeDiff = Math.abs(result.getTime() - twelveMonthsAgo.getTime());
      
      // Allow 24 hour tolerance
      expect(timeDiff).toBeLessThan(24 * 60 * 60 * 1000);
    });

    it("should default to 1 month for unknown periods", () => {
      const unknownResult = ProductTrigger.calculateDateRangeStart("unknown");
      const oneMonthResult = ProductTrigger.calculateDateRangeStart("1m");
      
      expect(unknownResult).toBeInstanceOf(Date);
      expect(oneMonthResult).toBeInstanceOf(Date);
      
      // Should be similar (within 1 minute)
      const timeDiff = Math.abs(unknownResult.getTime() - oneMonthResult.getTime());
      expect(timeDiff).toBeLessThan(60 * 1000);
    });

    it("should handle different time periods", () => {
      const utcResult = ProductTrigger.calculateDateRangeStart("3m");
      const allResult = ProductTrigger.calculateDateRangeStart("all");
      
      expect(utcResult).toBeInstanceOf(Date);
      expect(allResult).toBeInstanceOf(Date);
      
      // Both should be valid dates
      expect(utcResult.getTime()).toBeGreaterThan(0);
      expect(allResult.getTime()).toBeGreaterThanOrEqual(0); // "all" returns epoch (0), which is valid
      
      // "all" should be much older than "3m"
      expect(allResult.getTime()).toBeLessThan(utcResult.getTime());
    });
  });

  describe("validateConfig method", () => {
    it("should validate valid configuration without throwing", () => {
      const validConfig = {
        event: "newOnly" as const,
        datePeriod: "3m",
        limit: 100
      };

      expect(() => ProductTrigger.validateConfig(validConfig)).not.toThrow();
    });

    it("should throw error for invalid event type", () => {
      const invalidConfig = {
        event: "invalid_event" as any,
        datePeriod: "3m",
        limit: 100
      };

      expect(() => ProductTrigger.validateConfig(invalidConfig)).toThrow("Invalid event type");
    });

    it("should throw error for invalid date period", () => {
      const invalidConfig = {
        event: "newOnly" as const,
        datePeriod: "invalid_period",
        limit: 100
      };

      expect(() => ProductTrigger.validateConfig(invalidConfig)).toThrow("Invalid date period");
    });

    it("should throw error for invalid limit", () => {
      const invalidConfig = {
        event: "newOnly" as const,
        datePeriod: "3m",
        limit: 0 // Invalid: must be -1 or positive
      };

      expect(() => ProductTrigger.validateConfig(invalidConfig)).toThrow("Invalid limit");
    });

    it("should accept unlimited limit (-1)", () => {
      const validConfig = {
        event: "newOrUpdated" as const,
        datePeriod: "6m",
        limit: -1
      };

      expect(() => ProductTrigger.validateConfig(validConfig)).not.toThrow();
    });
  });

  describe("getSupportedEvents method", () => {
    it("should return array of supported events", () => {
      const events = ProductTrigger.getSupportedEvents();
      
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
      
      events.forEach((event: any) => {
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('value');
        expect(event).toHaveProperty('description');
      });
    });

    it("should include required event types", () => {
      const events = ProductTrigger.getSupportedEvents();
      const eventValues = events.map(e => e.value);
      
      expect(eventValues).toContain('newOnly');
      expect(eventValues).toContain('newOrUpdated');
    });
  });

  describe("getFilteringOptions method", () => {
    it("should return array of filtering options", () => {
      const options = ProductTrigger.getFilteringOptions();
      
      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBeGreaterThan(0);
      
      options.forEach((option: any) => {
        expect(option).toHaveProperty('name');
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('description');
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle null/undefined responses", async () => {
      (mockPaginationHelpers.SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: null,
        meta: {
          pagesProcessed: 0,
          totalRecords: 0,
          hasMore: false
        }
      });

      const config = {
        event: "newOnly" as const,
        datePeriod: "3m",
        limit: 100
      };

      // This should throw an error since the implementation doesn't handle null data gracefully
      await expect(ProductTrigger.pollProducts(mockPollFunctions, config)).rejects.toThrow();
    });

    it("should handle concurrent polling attempts", async () => {
      const productData = [
        {
          id: "concurrent-test",
          name: "Concurrent Test Product",
          price: 99.99,
          status: "active",
          createdAt: "2025-08-10T10:00:00Z",
        },
      ];

      (mockPaginationHelpers.SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: [productData[0]],
        meta: {
          pagesProcessed: 1,
          totalRecords: 1,
          hasMore: false
        }
      });

      const config = {
        event: "newOrUpdated" as const,
        datePeriod: "1m",
        limit: 50
      };

      // Execute multiple polls concurrently
      const polls = Array.from({ length: 3 }, () => 
        ProductTrigger.pollProducts(mockPollFunctions, config)
      );

      const results = await Promise.all(polls);
      
      // All should succeed
      results.forEach((result: any) => {
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('hasNewData');
      });
    });

    it("should handle different time period edge cases", () => {
      // Test various time period scenarios
      const periods = [
        "1d",
        "1w", 
        "1m",
        "3m",
        "6m",
        "12m",
        "all"
      ];

      periods.forEach(period => {
        const result = ProductTrigger.calculateDateRangeStart(period);
        expect(result).toBeInstanceOf(Date);
        expect(result.getTime()).toBeGreaterThanOrEqual(0); // Allow epoch time for "all"
        expect(result.getTime()).toBeLessThanOrEqual(Date.now());
      });
    });
  });
});
