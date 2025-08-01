/**
 * @fileoverview Test suite for BookingTrigger polling functionality
 * @description Comprehensive tests for booking change detection following ProductTrigger pattern
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Triggers
 */

import {
  IPollFunctions,
  IDataObject,
  INodeExecutionData,
  NodeApiError,
} from "n8n-workflow";

import { BookingTrigger } from "../../nodes/Semble/triggers/BookingTrigger";
import { SemblePagination } from "../../nodes/Semble/shared/PaginationHelpers";
import { GET_BOOKINGS_QUERY } from "../../nodes/Semble/shared/BookingQueries";

// Mock dependencies
jest.mock("../../nodes/Semble/shared/PaginationHelpers");

const mockPagination = SemblePagination.execute as jest.MockedFunction<
  typeof SemblePagination.execute
>;

describe("BookingTrigger", () => {
  let mockPollFunctions: jest.Mocked<IPollFunctions>;
  let mockWorkflowStaticData: IDataObject;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock static data
    mockWorkflowStaticData = {};

    // Create mock poll functions
    mockPollFunctions = {
      getNodeParameter: jest.fn(),
      getNode: jest.fn(() => ({ name: "Test Booking Trigger" })),
      getWorkflowStaticData: jest.fn(() => mockWorkflowStaticData),
    } as unknown as jest.Mocked<IPollFunctions>;
  });

  describe("poll method", () => {
    it("should poll for new bookings on first run", async () => {
      const mockBookingsData = [
        {
          id: "booking1",
          status: "confirmed",
          startTime: "2024-01-15T10:00:00Z",
          createdAt: "2024-01-10T09:00:00Z",
          updatedAt: "2024-01-10T09:00:00Z",
          patient: { firstName: "John", lastName: "Doe" },
        },
        {
          id: "booking2",
          status: "pending",
          startTime: "2024-01-15T14:00:00Z",
          createdAt: "2024-01-10T10:00:00Z",
          updatedAt: "2024-01-10T10:00:00Z",
          patient: { firstName: "Jane", lastName: "Smith" },
        },
      ];

      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce({}) // triggerOptions
        .mockReturnValueOnce("any"); // eventType

      mockPagination.mockResolvedValue({
        data: mockBookingsData,
        meta: {
          pagesProcessed: 1,
          totalRecords: 2,
          hasMore: false,
        },
      });

      const result = await BookingTrigger.poll(mockPollFunctions);

      expect(mockPagination).toHaveBeenCalledWith(mockPollFunctions, {
        query: GET_BOOKINGS_QUERY,
        baseVariables: expect.objectContaining({
          modifiedAfter: expect.any(String),
        }),
        dataPath: "bookings",
        pageSize: 50,
        returnAll: false,
        search: "",
        options: {
          orderBy: "updatedAt",
          orderDirection: "desc",
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
      expect(result[0][0].json).toMatchObject({
        id: "booking1",
        eventType: "any",
        pollTime: expect.any(String),
        lastPollTime: null,
      });
      expect(mockWorkflowStaticData.lastPollTime).toBeDefined();
    });

    it("should poll for bookings created after last poll time", async () => {
      const lastPollTime = "2024-01-10T08:00:00Z";
      mockWorkflowStaticData.lastPollTime = lastPollTime;

      const mockBookingsData = [
        {
          id: "booking3",
          status: "confirmed",
          createdAt: "2024-01-10T09:30:00Z",
          updatedAt: "2024-01-10T09:30:00Z",
        },
      ];

      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce({}) // triggerOptions
        .mockReturnValueOnce("created"); // eventType

      mockPagination.mockResolvedValue({
        data: mockBookingsData,
        meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
      });

      const result = await BookingTrigger.poll(mockPollFunctions);

      expect(mockPagination).toHaveBeenCalledWith(mockPollFunctions, {
        query: GET_BOOKINGS_QUERY,
        baseVariables: {
          createdAfter: lastPollTime,
        },
        dataPath: "bookings",
        pageSize: 50,
        returnAll: false,
        search: "",
        options: {
          orderBy: "updatedAt",
          orderDirection: "desc",
        },
      });

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toMatchObject({
        id: "booking3",
        eventType: "created",
        lastPollTime,
      });
    });

    it("should filter by trigger options", async () => {
      const triggerOptions = {
        patientId: "patient123",
        practitionerId: "practitioner456",
        locationId: "location789",
        limit: 25,
      };

      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce(triggerOptions)
        .mockReturnValueOnce("updated");

      mockPagination.mockResolvedValue({
        data: [],
        meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
      });

      await BookingTrigger.poll(mockPollFunctions);

      expect(mockPagination).toHaveBeenCalledWith(mockPollFunctions, {
        query: GET_BOOKINGS_QUERY,
        baseVariables: expect.objectContaining({
          patientId: "patient123",
          practitionerId: "practitioner456",
          locationId: "location789",
          modifiedAfter: expect.any(String),
        }),
        dataPath: "bookings",
        pageSize: 25,
        returnAll: false,
        search: "",
        options: {
          orderBy: "updatedAt",
          orderDirection: "desc",
        },
      });
    });

    it("should handle cancelled event type filtering", async () => {
      const lastPollTime = "2024-01-10T08:00:00Z";
      mockWorkflowStaticData.lastPollTime = lastPollTime;

      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce({}) // triggerOptions
        .mockReturnValueOnce("cancelled"); // eventType

      mockPagination.mockResolvedValue({
        data: [],
        meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
      });

      await BookingTrigger.poll(mockPollFunctions);

      expect(mockPagination).toHaveBeenCalledWith(mockPollFunctions, {
        query: GET_BOOKINGS_QUERY,
        baseVariables: {
          statusChangedAfter: lastPollTime,
          status: "cancelled",
        },
        dataPath: "bookings",
        pageSize: 50,
        returnAll: false,
        search: "",
        options: {
          orderBy: "updatedAt",
          orderDirection: "desc",
        },
      });
    });

    it("should handle confirmed event type filtering", async () => {
      const lastPollTime = "2024-01-10T08:00:00Z";
      mockWorkflowStaticData.lastPollTime = lastPollTime;

      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce({}) // triggerOptions
        .mockReturnValueOnce("confirmed"); // eventType

      mockPagination.mockResolvedValue({
        data: [],
        meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
      });

      await BookingTrigger.poll(mockPollFunctions);

      expect(mockPagination).toHaveBeenCalledWith(mockPollFunctions, {
        query: GET_BOOKINGS_QUERY,
        baseVariables: {
          statusChangedAfter: lastPollTime,
          status: "confirmed",
        },
        dataPath: "bookings",
        pageSize: 50,
        returnAll: false,
        search: "",
        options: {
          orderBy: "updatedAt",
          orderDirection: "desc",
        },
      });
    });

    it("should return empty array when no changes found", async () => {
      mockWorkflowStaticData.lastPollTime = "2024-01-10T08:00:00Z";

      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce({}) // triggerOptions
        .mockReturnValueOnce("any"); // eventType

      mockPagination.mockResolvedValue({
        data: [],
        meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
      });

      const result = await BookingTrigger.poll(mockPollFunctions);

      expect(result).toEqual([[]]);
    });

    it("should handle API errors gracefully on subsequent runs", async () => {
      mockWorkflowStaticData.lastPollTime = "2024-01-10T08:00:00Z";

      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce({}) // triggerOptions
        .mockReturnValueOnce("any"); // eventType

      mockPagination.mockRejectedValue(new Error("API Error"));

      await expect(
        BookingTrigger.poll(mockPollFunctions)
      ).rejects.toThrow(NodeApiError);
    });

    it("should not throw errors on first run", async () => {
      // No lastPollTime set (first run)
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce({}) // triggerOptions
        .mockReturnValueOnce("any"); // eventType

      mockPagination.mockRejectedValue(new Error("API Error"));

      const result = await BookingTrigger.poll(mockPollFunctions);

      expect(result).toEqual([[]]);
      expect(mockWorkflowStaticData.lastPollTime).toBeDefined();
    });
  });

  describe("test method", () => {
    it("should return sample bookings for testing", async () => {
      const mockBookingsData = [
        {
          id: "test1",
          status: "confirmed",
          startTime: "2024-01-15T10:00:00Z",
        },
        {
          id: "test2",
          status: "pending",
          startTime: "2024-01-15T14:00:00Z",
        },
        {
          id: "test3",
          status: "cancelled",
          startTime: "2024-01-15T16:00:00Z",
        },
      ];

      mockPagination.mockResolvedValue({
        data: mockBookingsData,
        meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
      });

      const result = await BookingTrigger.test(mockPollFunctions);

      expect(mockPagination).toHaveBeenCalledWith(mockPollFunctions, {
        query: GET_BOOKINGS_QUERY,
        baseVariables: {},
        dataPath: "bookings",
        pageSize: 3,
        returnAll: false,
        search: "",
        options: {
          orderBy: "updatedAt",
          orderDirection: "desc",
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(3);
      expect(result[0][0].json).toMatchObject({
        id: "test1",
        eventType: "test",
        isTestRun: true,
        pollTime: expect.any(String),
      });
    });

    it("should handle test errors", async () => {
      mockPagination.mockRejectedValue(new Error("Test Error"));

      await expect(
        BookingTrigger.test(mockPollFunctions)
      ).rejects.toThrow(NodeApiError);
    });
  });

  describe("execute method", () => {
    it("should route to poll method by default", async () => {
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce({}) // triggerOptions
        .mockReturnValueOnce("any"); // eventType

      mockPagination.mockResolvedValue({
        data: [],
        meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
      });

      const result = await BookingTrigger.execute(mockPollFunctions);

      expect(result).toBeDefined();
      expect(mockPagination).toHaveBeenCalledWith(mockPollFunctions, expect.objectContaining({
        query: GET_BOOKINGS_QUERY,
        dataPath: "bookings",
      }));
    });

    it("should route to test method when mode is test", async () => {
      mockPagination.mockResolvedValue({
        data: [{ id: "test" }],
        meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
      });

      const result = await BookingTrigger.execute(mockPollFunctions, "test");

      expect(result).toBeDefined();
      expect(mockPagination).toHaveBeenCalledWith(mockPollFunctions, expect.objectContaining({
        pageSize: 3, // Test mode uses smaller page size
      }));
    });

    it("should route to poll method when mode is poll", async () => {
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce({}) // triggerOptions
        .mockReturnValueOnce("any"); // eventType

      mockPagination.mockResolvedValue({
        data: [],
        meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
      });

      const result = await BookingTrigger.execute(mockPollFunctions, "poll");

      expect(result).toBeDefined();
      expect(mockPagination).toHaveBeenCalledWith(mockPollFunctions, expect.objectContaining({
        pageSize: 50, // Poll mode uses default page size
      }));
    });
  });
});
