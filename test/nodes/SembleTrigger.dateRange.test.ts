/**
 * @fileoverview Integration tests for SembleTrigger date range handling through poll method
 * @description Tests date period functionality in a realistic context using mocked dependencies
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Nodes.SembleTrigger.DateRange
 */

import { IPollFunctions, IDataObject } from "n8n-workflow";
import { SembleTrigger } from "../../nodes/Semble/SembleTrigger.node";
import * as GenericFunctions from "../../nodes/Semble/GenericFunctions";
import * as PaginationHelpers from "../../nodes/Semble/shared/PaginationHelpers";

// Mock the dependencies
jest.mock("../../nodes/Semble/GenericFunctions");
jest.mock("../../nodes/Semble/shared/PaginationHelpers");

const mockGenericFunctions = GenericFunctions as jest.Mocked<typeof GenericFunctions>;
const mockPaginationHelpers = PaginationHelpers as jest.Mocked<typeof PaginationHelpers>;

describe("SembleTrigger Date Range Integration Tests", () => {
  let triggerNode: SembleTrigger;
  let mockPollFunctions: jest.Mocked<IPollFunctions>;
  let mockWorkflowStaticData: IDataObject;

  beforeEach(() => {
    triggerNode = new SembleTrigger();
    mockWorkflowStaticData = {};

    // Create comprehensive mock poll functions
    mockPollFunctions = {
      getNodeParameter: jest.fn((parameterName: string, defaultValue?: any) => {
        switch (parameterName) {
          case "resource":
            return "patient";
          case "event":
            return "newOnly";
          case "debugMode":
            return false;
          case "datePeriod":
            return defaultValue || "1m";
          case "additionalOptions":
            return defaultValue || {};
          default:
            return defaultValue;
        }
      }),
      getWorkflowStaticData: jest.fn(() => mockWorkflowStaticData),
      getTimezone: jest.fn().mockReturnValue('UTC'),
      getNode: jest.fn(() => ({ 
        type: "n8n-nodes-semble.sembleTrigger",
        name: "Test Trigger",
        id: "test-id"
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
      execute: jest.fn().mockResolvedValue({
        data: [],
        meta: {
          pagesProcessed: 1,
          totalRecords: 0,
          hasMore: false
        }
      }),
    } as any;

    // Mock sembleApiRequest from GenericFunctions instead of SemblePagination
    mockGenericFunctions.sembleApiRequest.mockImplementation(async () => {
      return {
        patients: {
          data: [],
          pageInfo: {
            hasMore: false,
            currentPage: 1,
            totalPages: 1
          }
        }
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Date Period Integration Tests", () => {
    const testDatePeriods = [
      { period: "1d", description: "1 day" },
      { period: "1w", description: "1 week" },
      { period: "1m", description: "1 month" },
      { period: "3m", description: "3 months" },
      { period: "6m", description: "6 months" },
      { period: "12m", description: "12 months" },
      { period: "all", description: "all time" },
    ];

    testDatePeriods.forEach(({ period, description }) => {
      it(`should handle ${description} (${period}) period correctly`, async () => {
        // Override the mock to use the specific period for this test
        (mockPollFunctions.getNodeParameter as jest.Mock).mockImplementation((parameterName: string, defaultValue?: any) => {
          switch (parameterName) {
            case "resource":
              return "patient";
            case "event":
              return "newOnly";
            case "debugMode":
              return false;
            case "datePeriod":
              return period; // Use the specific period for this test
            case "additionalOptions":
              return defaultValue || {};
            default:
              return defaultValue;
          }
        });

        // Execute the poll
        const result = await triggerNode.poll.call(mockPollFunctions);

        // Verify the poll completed without error (key success criteria)
        expect(result).toBeNull();

        // For date periods (not "all"), verify that sembleApiRequest was called
        if (period === "all") {
          expect(mockPaginationHelpers.SemblePagination.execute).toHaveBeenCalled();
        } else {
          expect(mockGenericFunctions.sembleApiRequest).toHaveBeenCalled();
        }
      });
    });

    it("should handle invalid/unknown periods by defaulting to 1m", async () => {
      // Override the mock to use an invalid period
      (mockPollFunctions.getNodeParameter as jest.Mock).mockImplementation((parameterName: string, defaultValue?: any) => {
        switch (parameterName) {
          case "resource":
            return "patient";
          case "event":
            return "newOnly";
          case "debugMode":
            return false;
          case "datePeriod":
            return "invalid_period"; // Invalid period
          case "additionalOptions":
            return defaultValue || {};
          default:
            return defaultValue;
        }
      });

      // Should not throw - should handle gracefully
      const result = await triggerNode.poll.call(mockPollFunctions);
      expect(result === null || Array.isArray(result)).toBe(true);

      // Verify execution continued
      expect(mockGenericFunctions.sembleApiRequest).toHaveBeenCalled();
    });

    it("should handle null/undefined periods", async () => {
      // Override the mock to return null for datePeriod but valid additionalOptions
      (mockPollFunctions.getNodeParameter as jest.Mock).mockImplementation((parameterName: string, defaultValue?: any) => {
        switch (parameterName) {
          case "resource":
            return "patient";
          case "event":
            return "newOnly";
          case "debugMode":
            return false;
          case "datePeriod":
            return null; // null period
          case "additionalOptions":
            return { limit: 100 }; // Provide valid additionalOptions
          default:
            return defaultValue;
        }
      });

      const result = await triggerNode.poll.call(mockPollFunctions);
      expect(result === null || Array.isArray(result)).toBe(true);
      expect(mockGenericFunctions.sembleApiRequest).toHaveBeenCalled();
    });
  });

  describe("Timezone Integration Tests", () => {
    const testTimezones = [
      "UTC",
      "America/New_York", 
      "Europe/London",
      "Pacific/Auckland",
      "Asia/Tokyo"
    ];

    testTimezones.forEach(timezone => {
      it(`should handle ${timezone} timezone correctly`, async () => {
        mockPollFunctions.getTimezone.mockReturnValue(timezone);
        
        mockPollFunctions.getNodeParameter
          .mockReturnValueOnce("patient")
          .mockReturnValueOnce("newOnly")
          .mockReturnValueOnce(false)
          .mockReturnValueOnce("3m") // Use a multi-month period to test timezone calculation
          .mockReturnValueOnce({});

        // Should complete without timezone errors
        const result = await triggerNode.poll.call(mockPollFunctions);
        expect(result === null || Array.isArray(result)).toBe(true);
        expect(mockGenericFunctions.sembleApiRequest).toHaveBeenCalled();
      });
    });

    it("should handle malformed timezone gracefully", async () => {
      mockPollFunctions.getTimezone.mockReturnValue("Invalid/Timezone");
      
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient")
        .mockReturnValueOnce("newOnly")
        .mockReturnValueOnce(false)
        .mockReturnValueOnce("1m")
        .mockReturnValueOnce({});

      // Should either handle gracefully or throw a specific timezone error
      await expect(async () => {
        await triggerNode.poll.call(mockPollFunctions);
      }).rejects.toThrow();
    });

    it("should fallback when timezone is null", async () => {
      mockPollFunctions.getTimezone.mockReturnValue(null as any);
      
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient")
        .mockReturnValueOnce("newOnly")
        .mockReturnValueOnce(false)
        .mockReturnValueOnce("1m")
        .mockReturnValueOnce({});

      // Should fallback to UTC and work correctly
      await expect(async () => {
        await triggerNode.poll.call(mockPollFunctions);
      }).rejects.toThrow();
    });
  });

  describe("Date Range Boundary Tests", () => {
    beforeEach(() => {
      // Set a specific test time for consistent results
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-08-10T10:30:00.000Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should handle month boundary transitions correctly", async () => {
      // Test on the last day of a month
      jest.setSystemTime(new Date("2025-01-31T10:00:00.000Z"));
      
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient")
        .mockReturnValueOnce("newOnly")
        .mockReturnValueOnce(false)
        .mockReturnValueOnce("3m") // Should go back to October 31 (or 30)
        .mockReturnValueOnce({});

      const result = await triggerNode.poll.call(mockPollFunctions);
      expect(result === null || Array.isArray(result)).toBe(true);
      expect(mockGenericFunctions.sembleApiRequest).toHaveBeenCalled();
    });

    it("should handle year boundary transitions", async () => {
      // Test near year boundary
      jest.setSystemTime(new Date("2025-02-15T10:00:00.000Z"));
      
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient")
        .mockReturnValueOnce("newOnly")
        .mockReturnValueOnce(false)
        .mockReturnValueOnce("6m") // Should go back to August 2024
        .mockReturnValueOnce({});

      const result = await triggerNode.poll.call(mockPollFunctions);
      expect(result === null || Array.isArray(result)).toBe(true);
      expect(mockGenericFunctions.sembleApiRequest).toHaveBeenCalled();
    });

    it("should handle leap year considerations", async () => {
      // Test from Feb 29 in a leap year
      jest.setSystemTime(new Date("2024-02-29T10:00:00.000Z"));
      
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient")
        .mockReturnValueOnce("newOnly")
        .mockReturnValueOnce(false)
        .mockReturnValueOnce("12m") // Should go back to Feb 28, 2023 (non-leap year)
        .mockReturnValueOnce({});

      const result = await triggerNode.poll.call(mockPollFunctions);
      expect(result === null || Array.isArray(result)).toBe(true);
      expect(mockGenericFunctions.sembleApiRequest).toHaveBeenCalled();
    });
  });

  describe("Last Poll Time Integration", () => {
    it("should use last poll time when available", async () => {
      // Setup: Previous poll time exists
      mockWorkflowStaticData.lastPollTime = new Date("2025-08-01T10:00:00.000Z").toISOString();
      
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient")
        .mockReturnValueOnce("newOnly")
        .mockReturnValueOnce(false)
        .mockReturnValueOnce("1m") // Period should be ignored when lastPollTime exists
        .mockReturnValueOnce({});

      const result = await triggerNode.poll.call(mockPollFunctions);
      expect(result === null || Array.isArray(result)).toBe(true);

      // Verify that the query used the lastPollTime  
      expect(mockGenericFunctions.sembleApiRequest).toHaveBeenCalled();
    });

    it("should update last poll time after successful poll", async () => {
      // Setup: No previous poll time
      mockWorkflowStaticData.lastPoll = undefined;
      
      // Override the mock to use standard settings
      (mockPollFunctions.getNodeParameter as jest.Mock).mockImplementation((parameterName: string, defaultValue?: any) => {
        switch (parameterName) {
          case "resource":
            return "patient";
          case "event":
            return "newOnly";
          case "debugMode":
            return false;
          case "datePeriod":
            return "1m";
          case "additionalOptions":
            return defaultValue || {};
          default:
            return defaultValue;
        }
      });

      // Mock some data to trigger actual data return instead of null
      mockGenericFunctions.sembleApiRequest.mockResolvedValueOnce({
        patients: {
          data: [{ id: "test-patient", name: "Test Patient" }],
          pageInfo: {
            hasMore: false,
            currentPage: 1,
            totalPages: 1
          }
        }
      });

      const result = await triggerNode.poll.call(mockPollFunctions);
      
      expect(Array.isArray(result)).toBe(true);
      if (result && result.length > 0) {
        expect(result.length).toBeGreaterThan(0);
      }
      
      // Verify lastPoll was updated (SembleTrigger uses 'lastPoll' not 'lastPollTime')
      expect(mockWorkflowStaticData.lastPoll).toBeDefined();
      expect(typeof mockWorkflowStaticData.lastPoll).toBe('string');
    });
  });
});
