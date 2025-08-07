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

      // Mock getNodeParameter for additionalOptions
      mockPollFunctions.getNodeParameter.mockReturnValue({});

      mockPagination.mockResolvedValue({
        data: mockBookingsData,
        meta: {
          pagesProcessed: 1,
          totalRecords: 2,
          hasMore: false,
        },
      });

      const result = await BookingTrigger.poll(mockPollFunctions);

      expect(mockPollFunctions.getNodeParameter).toHaveBeenCalledWith("additionalOptions", {});
      expect(mockPagination).toHaveBeenCalledWith(mockPollFunctions, {
        query: GET_BOOKINGS_QUERY,
        baseVariables: expect.objectContaining({
          dateRange: expect.objectContaining({
            start: expect.any(String),
            end: expect.any(String),
          }),
          options: expect.objectContaining({
            updatedAt: expect.objectContaining({
              start: expect.any(String),
              end: expect.any(String),
            }),
          }),
        }),
        dataPath: "bookings",
        pageSize: 50, // Default when additionalOptions is empty
        returnAll: false,
        search: "",
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
      expect(result[0][0].json).toMatchObject({
        id: "booking1",
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

      // Mock getNodeParameter for additionalOptions
      mockPollFunctions.getNodeParameter.mockReturnValue({});

      mockPagination.mockResolvedValue({
        data: mockBookingsData,
        meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
      });

      const result = await BookingTrigger.poll(mockPollFunctions);

      expect(mockPollFunctions.getNodeParameter).toHaveBeenCalledWith("additionalOptions", {});
      expect(mockPagination).toHaveBeenCalledWith(mockPollFunctions, {
        query: GET_BOOKINGS_QUERY,
        baseVariables: {
          dateRange: {
            start: lastPollTime,
            end: expect.any(String),
          },
          options: {
            updatedAt: {
              start: lastPollTime,
              end: expect.any(String),
            },
          },
        },
        dataPath: "bookings",
        pageSize: 50,
        returnAll: false,
        search: "",
      });

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toMatchObject({
        id: "booking3",
        lastPollTime,
      });
    });

    // TEMPORARILY COMMENTED OUT - SIMPLIFIED TO MATCH PATIENT/PRODUCT TRIGGERS

    // TEMPORARILY COMMENTED OUT - SIMPLIFIED TO MATCH PATIENT/PRODUCT TRIGGERS
    // it("should filter by trigger options", async () => {
    //   const triggerOptions = {
    //     patientId: "patient123",
    //     practitionerId: "practitioner456",
    //     locationId: "location789",
    //     limit: 25,
    //   };

    //   mockPollFunctions.getNodeParameter
    //     .mockReturnValueOnce(triggerOptions)
    //     .mockReturnValueOnce("updated");

    //   mockPagination.mockResolvedValue({
    //     data: [],
    //     meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
    //   });

    //   await BookingTrigger.poll(mockPollFunctions);

    //   expect(mockPagination).toHaveBeenCalledWith(mockPollFunctions, {
    //     query: GET_BOOKINGS_QUERY,
    //     baseVariables: expect.objectContaining({
    //       dateRange: expect.objectContaining({
    //         start: expect.any(String),
    //         end: expect.any(String),
    //       }),
    //       options: expect.objectContaining({
    //         patientId: "patient123",
    //         practitionerId: "practitioner456",
    //         locationId: "location789",
    //         updatedAt: expect.objectContaining({
    //           start: expect.any(String),
    //           end: expect.any(String),
    //         }),
    //       }),
    //     }),
    //     dataPath: "bookings",
    //     pageSize: 25,
    //     returnAll: false,
    //     search: "",
    //   });
    // });

    // it("should filter by booking type ID option", async () => {
    //   const triggerOptions = {
    //     bookingTypeId: "type123",
    //     limit: 25,
    //   };

    //   mockPollFunctions.getNodeParameter
    //     .mockReturnValueOnce(triggerOptions)
    //     .mockReturnValueOnce("created");

    //   mockPagination.mockResolvedValue({
    //     data: [],
    //     meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
    //   });

    //   await BookingTrigger.poll(mockPollFunctions);

    //   expect(mockPagination).toHaveBeenCalledWith(mockPollFunctions, {
    //     query: GET_BOOKINGS_QUERY,
    //     baseVariables: expect.objectContaining({
    //       dateRange: expect.objectContaining({
    //         start: expect.any(String),
    //         end: expect.any(String),
    //       }),
    //       options: expect.objectContaining({
    //         bookingTypeId: "type123",
    //         createdAt: expect.objectContaining({
    //           start: expect.any(String),
    //           end: expect.any(String),
    //         }),
    //       }),
    //     }),
    //     dataPath: "bookings",
    //     pageSize: 25,
    //     returnAll: false,
    //     search: "",
    //   });
    // });

    // it("should handle cancelled event type filtering", async () => {
    //   const lastPollTime = "2024-01-10T08:00:00Z";
    //   mockWorkflowStaticData.lastPollTime = lastPollTime;

    //   mockPollFunctions.getNodeParameter
    //     .mockReturnValueOnce({}) // triggerOptions
    //     .mockReturnValueOnce("cancelled"); // eventType

    //   mockPagination.mockResolvedValue({
    //     data: [],
    //     meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
    //   });

    //   await BookingTrigger.poll(mockPollFunctions);

    //   expect(mockPagination).toHaveBeenCalledWith(mockPollFunctions, {
    //     query: GET_BOOKINGS_QUERY,
    //     baseVariables: {
    //       dateRange: {
    //         start: lastPollTime,
    //         end: expect.any(String),
    //       },
    //       options: {
    //         updatedAt: {
    //           start: lastPollTime,
    //           end: expect.any(String),
    //         },
    //       },
    //     },
    //     dataPath: "bookings",
    //     pageSize: 50,
    //     returnAll: false,
    //     search: "",
    //   });
    // });

    // it("should handle confirmed event type filtering", async () => {
    //   const lastPollTime = "2024-01-10T08:00:00Z";
    //   mockWorkflowStaticData.lastPollTime = lastPollTime;

    //   mockPollFunctions.getNodeParameter
    //     .mockReturnValueOnce({})        .mockReturnValueOnce("confirmed"); // eventType

    //   mockPagination.mockResolvedValue({
    //     data: [],
    //     meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
    //   });
    // });

    // TEMPORARILY COMMENTED OUT - SIMPLIFIED TO MATCH PATIENT/PRODUCT TRIGGERS
    // it("should filter by booking type ID option", async () => {
    //   const triggerOptions = {
    //     bookingTypeId: "type123",
    //     limit: 25,
    //   };

    //   mockPollFunctions.getNodeParameter
    //     .mockReturnValueOnce(triggerOptions)
    //     .mockReturnValueOnce("created");

    //   mockPagination.mockResolvedValue({
    //     data: [],
    //     meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
    //   });

    //   await BookingTrigger.poll(mockPollFunctions);

    //   expect(mockPagination).toHaveBeenCalledWith(mockPollFunctions, {
    //     query: GET_BOOKINGS_QUERY,
    //     baseVariables: expect.objectContaining({
    //       dateRange: expect.objectContaining({
    //         start: expect.any(String),
    //         end: expect.any(String),
    //       }),
    //       options: expect.objectContaining({
    //         bookingTypeId: "type123",
    //         createdAt: expect.objectContaining({
    //           start: expect.any(String),
    //           end: expect.any(String),
    //         }),
    //       }),
    //     }),
    //     dataPath: "bookings",
    //     pageSize: 25,
    //     returnAll: false,
    //     search: "",
    //   });
    // });

    // it("should handle cancelled event type filtering", async () => {
    //   const lastPollTime = "2024-01-10T08:00:00Z";
    //   mockWorkflowStaticData.lastPollTime = lastPollTime;

    //   mockPollFunctions.getNodeParameter
    //     .mockReturnValueOnce({}) // triggerOptions
    //     .mockReturnValueOnce("cancelled"); // eventType

    //   mockPagination.mockResolvedValue({
    //     data: [],
    //     meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
    //   });

    //   await BookingTrigger.poll(mockPollFunctions);

    //   expect(mockPagination).toHaveBeenCalledWith(mockPollFunctions, {
    //     query: GET_BOOKINGS_QUERY,
    //     baseVariables: {
    //       dateRange: {
    //         start: lastPollTime,
    //         end: expect.any(String),
    //       },
    //       options: {
    //         updatedAt: {
    //           start: lastPollTime,
    //           end: expect.any(String),
    //         },
    //       },
    //     },
    //     dataPath: "bookings",
    //     pageSize: 50,
    //     returnAll: false,
    //     search: "",
    //   });
    // });

    // it("should handle confirmed event type filtering", async () => {
    //   const lastPollTime = "2024-01-10T08:00:00Z";
    //   mockWorkflowStaticData.lastPollTime = lastPollTime;

    //   mockPollFunctions.getNodeParameter
    //     .mockReturnValueOnce({}) // triggerOptions
    //     .mockReturnValueOnce("confirmed"); // eventType

    //   mockPagination.mockResolvedValue({
    //     data: [],
    //     meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
    //   });

    //   await BookingTrigger.poll(mockPollFunctions);

    //   expect(mockPagination).toHaveBeenCalledWith(mockPollFunctions, {
    //     query: GET_BOOKINGS_QUERY,
    //     baseVariables: {
    //       dateRange: {
    //         start: lastPollTime,
    //         end: expect.any(String),
    //       },
    //       options: {
    //         updatedAt: {
    //           start: lastPollTime,
    //           end: expect.any(String),
    //         },
    //       },
    //     },
    //     dataPath: "bookings",
    //     pageSize: 50,
    //     returnAll: false,
    //     search: "",
    //   });
    // });

    it("should return empty array when no changes found", async () => {
      mockWorkflowStaticData.lastPollTime = "2024-01-10T08:00:00Z";

      // Mock getNodeParameter for additionalOptions
      mockPollFunctions.getNodeParameter.mockReturnValue({});

      mockPagination.mockResolvedValue({
        data: [],
        meta: { pagesProcessed: 1, totalRecords: 1, hasMore: false },
      });

      const result = await BookingTrigger.poll(mockPollFunctions);

      expect(result).toEqual([[]]);
    });

    it("should handle API errors gracefully on subsequent runs", async () => {
      mockWorkflowStaticData.lastPollTime = "2024-01-10T08:00:00Z";

      // Mock getNodeParameter for additionalOptions
      mockPollFunctions.getNodeParameter.mockReturnValue({});

      mockPagination.mockRejectedValue(new Error("API Error"));

      await expect(
        BookingTrigger.poll(mockPollFunctions)
      ).rejects.toThrow(NodeApiError);
    });

    it("should not throw errors on first run", async () => {
      // No lastPollTime set (first run)
      // Mock getNodeParameter for additionalOptions
      mockPollFunctions.getNodeParameter.mockReturnValue({});
      
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
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(3);
      expect(result[0][0].json).toMatchObject({
        id: "test1",
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
      // Mock getNodeParameter for additionalOptions
      mockPollFunctions.getNodeParameter.mockReturnValue({});
      
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
      // Mock getNodeParameter for additionalOptions
      mockPollFunctions.getNodeParameter.mockReturnValue({});
      
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
