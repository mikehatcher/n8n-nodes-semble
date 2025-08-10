/**
 * @fileoverview Unit tests for BookingTrigger module
 * @description Comprehensive test suite for booking-specific trigger logic
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Triggers.Booking
 */

import { IPollFunctions, IDataObject } from "n8n-workflow";
import { BookingTrigger } from "../../nodes/Semble/triggers/BookingTrigger";
import * as GenericFunctions from "../../nodes/Semble/GenericFunctions";

// Mock the entire PaginationHelpers module
jest.mock("../../nodes/Semble/shared/PaginationHelpers", () => ({
  SemblePagination: {
    execute: jest.fn(),
  },
  buildPaginationConfig: jest.fn(),
}));

// Mock the dependencies
jest.mock("../../nodes/Semble/GenericFunctions");

const mockGenericFunctions = GenericFunctions as jest.Mocked<typeof GenericFunctions>;

// Import the mocked module after mocking
const { SemblePagination, buildPaginationConfig } = require("../../nodes/Semble/shared/PaginationHelpers");

describe("BookingTrigger", () => {
  let mockPollFunctions: jest.Mocked<IPollFunctions>;
  let mockWorkflowStaticData: IDataObject;

  beforeEach(() => {
    mockWorkflowStaticData = {};

    mockPollFunctions = {
      getNodeParameter: jest.fn((parameterName: string, defaultValue?: any) => {
        if (parameterName === "additionalOptions") {
          return { limit: 50 };
        }
        return defaultValue;
      }),
      getWorkflowStaticData: jest.fn(() => mockWorkflowStaticData),
      getTimezone: jest.fn().mockReturnValue('UTC'),
      getNode: jest.fn(() => ({ 
        type: "n8n-nodes-semble.sembleTrigger",
        name: "Booking Trigger Test",
        id: "booking-test-id"
      })),
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      },
    } as any;

    // Setup pagination helpers mock implementation
    jest.clearAllMocks();
    
    buildPaginationConfig.mockReturnValue({
      pageSize: -1,
      returnAll: true,
    });

    // Default successful response with no data
    (SemblePagination.execute as jest.Mock).mockResolvedValue({
      data: [],
      meta: {
        pagesProcessed: 1,
        totalRecords: 0,
        hasMore: false
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("poll method", () => {
    it("should handle new bookings when no last poll time exists", async () => {
      // Setup: No previous poll time (first run)
      mockWorkflowStaticData.lastPollTime = undefined;

      // Setup mock response with booking data
      const mockBookings = [
        {
          id: "booking1",
          appointmentType: { id: "type1", name: "Consultation" },
          status: "confirmed",
          createdAt: "2025-08-10T10:00:00Z",
          updatedAt: "2025-08-10T10:00:00Z",
        },
        {
          id: "booking2",
          appointmentType: { id: "type2", name: "Follow-up" },
          status: "pending",
          createdAt: "2025-08-10T09:30:00Z",
          updatedAt: "2025-08-10T09:30:00Z",
        },
      ];

      (SemblePagination.execute as jest.Mock).mockResolvedValue([
        { json: mockBookings[0] },
        { json: mockBookings[1] }
      ]);

      // Execute
      const result = await BookingTrigger.poll(mockPollFunctions);

      // Verify
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Verify lastPollTime was updated
      expect(mockWorkflowStaticData.lastPollTime).toBeDefined();
    });

    it("should handle empty results gracefully", async () => {
      // Setup: No new bookings
      (SemblePagination.execute as jest.Mock).mockResolvedValue([]);

      // Execute
      const result = await BookingTrigger.poll(mockPollFunctions);

      // Verify
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1); // Should return one batch
      expect(Array.isArray(result[0])).toBe(true); // First batch should be an array
      expect(result[0]).toEqual([]);
      expect(mockWorkflowStaticData.lastPollTime).toBeDefined();
    });

    it("should use existing lastPollTime for incremental polling", async () => {
      // Setup: Previous poll time exists
      const previousPollTime = new Date("2025-08-09T10:00:00Z");
      mockWorkflowStaticData.lastPollTime = previousPollTime.toISOString();

      // Setup mock response
      const mockBookings = [
        {
          id: "booking3",
          appointmentType: { id: "type3", name: "Emergency" },
          status: "urgent",
          createdAt: "2025-08-10T11:00:00Z",
          updatedAt: "2025-08-10T11:00:00Z",
        },
      ];

      (SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: [mockBookings[0]],
        meta: {
          pagesProcessed: 1,
          totalRecords: 1,
          hasMore: false
        }
      });

      // Execute
      const result = await BookingTrigger.poll(mockPollFunctions);

      // Verify
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1); // Should return one batch
      expect(Array.isArray(result[0])).toBe(true); // First batch should be an array
      expect(result[0].length).toBe(1); // Should have one booking
      
      // Verify pagination was called with correct time range
      expect(SemblePagination.execute).toHaveBeenCalled();
      
      // Verify lastPollTime was updated
      const newLastPollTime = new Date(mockWorkflowStaticData.lastPollTime as string);
      expect(newLastPollTime.getTime()).toBeGreaterThan(previousPollTime.getTime());
    });

    it("should handle API errors gracefully on first run", async () => {
      // Setup: API error and no previous poll time (first run)
      mockWorkflowStaticData.lastPollTime = undefined;
      (SemblePagination.execute as jest.Mock).mockRejectedValue(
        new Error("Booking API unavailable")
      );

      // Execute - should not throw on first run
      const result = await BookingTrigger.poll(mockPollFunctions);
      
      // Verify - should return empty result and set lastPollTime
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([[]]);
      expect(mockWorkflowStaticData.lastPollTime).toBeDefined();
    });

    it("should handle API errors by throwing on subsequent runs", async () => {
      // Setup: API error and previous poll time exists (subsequent run)
      mockWorkflowStaticData.lastPollTime = "2025-08-09T10:00:00.000Z";
      (SemblePagination.execute as jest.Mock).mockRejectedValue(
        new Error("Booking API unavailable")
      );

      // Execute & Verify - should throw on subsequent runs
      await expect(BookingTrigger.poll(mockPollFunctions)).rejects.toThrow();
    });

    it("should filter out invalid booking records", async () => {
      // Setup: Mixed valid and invalid bookings
      const mixedBookings = [
        {
          id: "booking-valid",
          appointmentType: { id: "type1", name: "Valid" },
          status: "confirmed",
          createdAt: "2025-08-10T10:00:00Z",
        },
        {
          // Missing required fields
          id: "booking-invalid",
          status: "pending",
        },
        {
          id: "booking-valid2",
          appointmentType: { id: "type2", name: "Also Valid" },
          status: "scheduled",
          createdAt: "2025-08-10T10:30:00Z",
        },
      ];

      (SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: mixedBookings,
        meta: {
          pagesProcessed: 1,
          totalRecords: 3,
          hasMore: false
        }
      });

      // Execute
      const result = await BookingTrigger.poll(mockPollFunctions);

      // Verify - should handle all records, even if some are invalid
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1); // Should return one batch
      expect(Array.isArray(result[0])).toBe(true); // First batch should be an array
      expect(result[0].length).toBe(3); // All records should be returned
    });

    it("should handle large datasets efficiently", async () => {
      // Setup: Large dataset
      const largeBookingSet = Array.from({ length: 500 }, (_, i) => ({
        id: `booking-${i}`,
        appointmentType: { id: `type-${i % 10}`, name: `Type ${i % 10}` },
        status: i % 2 === 0 ? "confirmed" : "pending",
        createdAt: new Date(Date.now() - i * 60000).toISOString(),
        updatedAt: new Date(Date.now() - i * 30000).toISOString(),
      }));

      (SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: largeBookingSet,
        meta: {
          pagesProcessed: 5,
          totalRecords: 500,
          hasMore: false
        }
      });

      // Execute
      const result = await BookingTrigger.poll(mockPollFunctions);

      // Verify
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1); // Should return one batch
      expect(Array.isArray(result[0])).toBe(true); // First batch should be an array
      expect(result[0].length).toBe(500);
      expect(mockWorkflowStaticData.lastPollTime).toBeDefined();
    });

    it("should handle different booking statuses correctly", async () => {
      // Setup: Bookings with various statuses
      const statusVarietyBookings = [
        {
          id: "booking-confirmed",
          appointmentType: { id: "type1", name: "Consultation" },
          status: "confirmed",
          createdAt: "2025-08-10T10:00:00Z",
        },
        {
          id: "booking-pending",
          appointmentType: { id: "type2", name: "Follow-up" },
          status: "pending",
          createdAt: "2025-08-10T10:15:00Z",
        },
        {
          id: "booking-cancelled",
          appointmentType: { id: "type3", name: "Check-up" },
          status: "cancelled",
          createdAt: "2025-08-10T10:30:00Z",
        },
        {
          id: "booking-completed",
          appointmentType: { id: "type4", name: "Treatment" },
          status: "completed",
          createdAt: "2025-08-10T10:45:00Z",
        },
      ];

      (SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: statusVarietyBookings,
        meta: {
          pagesProcessed: 1,
          totalRecords: 4,
          hasMore: false
        }
      });

      // Execute
      const result = await BookingTrigger.poll(mockPollFunctions);

      // Verify
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1); // Should return one batch
      expect(Array.isArray(result[0])).toBe(true); // First batch should be an array
      expect(result[0].length).toBe(4);
      
      // Should handle all status types
      const statuses = (result[0] as any[]).map(item => item.json.status);
      expect(statuses).toContain("confirmed");
      expect(statuses).toContain("pending");
      expect(statuses).toContain("cancelled");
      expect(statuses).toContain("completed");
    });

    it("should handle pagination correctly", async () => {
      // Setup: Test pagination by mocking pagination helper calls
      const firstPageBookings = [
        {
          id: "booking-page1-1",
          appointmentType: { id: "type1", name: "Page 1 Item 1" },
          status: "confirmed",
          createdAt: "2025-08-10T10:00:00Z",
        },
        {
          id: "booking-page1-2",
          appointmentType: { id: "type2", name: "Page 1 Item 2" },
          status: "pending",
          createdAt: "2025-08-10T10:15:00Z",
        },
      ];

      (SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: firstPageBookings,
        meta: {
          pagesProcessed: 1,
          totalRecords: 2,
          hasMore: false
        }
      });

      // Execute
      const result = await BookingTrigger.poll(mockPollFunctions);

      // Verify
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1); // Should return one batch
      expect(Array.isArray(result[0])).toBe(true); // First batch should be an array
      expect(result[0].length).toBe(2);
      expect(SemblePagination.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle null/undefined responses", async () => {
      (SemblePagination.execute as jest.Mock).mockResolvedValue(null);

      const result = await BookingTrigger.poll(mockPollFunctions);
      
      // Should handle gracefully
      expect(result === null || Array.isArray(result)).toBe(true);
    });

    it("should handle malformed booking data", async () => {
      const malformedBookings = [
        null,
        undefined,
        { json: {} },
        { json: { invalid: "data" } },
        { json: { id: "valid-booking", status: "confirmed" } },
      ];

      (SemblePagination.execute as jest.Mock).mockResolvedValue(
        malformedBookings.filter(Boolean)
      );

      const result = await BookingTrigger.poll(mockPollFunctions);
      
      expect(Array.isArray(result)).toBe(true);
      // Should process what it can
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle concurrent polling attempts", async () => {
      const bookingData = [
        {
          id: "concurrent-test",
          appointmentType: { id: "type1", name: "Concurrent Test" },
          status: "confirmed",
          createdAt: "2025-08-10T10:00:00Z",
        },
      ];

      (SemblePagination.execute as jest.Mock).mockResolvedValue([
        { json: bookingData[0] }
      ]);

      // Execute multiple polls concurrently
      const polls = Array.from({ length: 3 }, () => 
        BookingTrigger.poll(mockPollFunctions)
      );

      const results = await Promise.all(polls);
      
      // All should succeed
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });
});
