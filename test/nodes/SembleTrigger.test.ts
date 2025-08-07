/**
 * @fileoverview Tests for SembleTrigger node implementation
 * @description Comprehensive test suite for Semble trigger node polling functionality
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Nodes.SembleTrigger
 */

import { IPollFunctions, INodeExecutionData, IDataObject } from "n8n-workflow";
import { SembleTrigger } from "../../nodes/Semble/SembleTrigger.node";
import * as GenericFunctions from "../../nodes/Semble/GenericFunctions";
import * as PaginationHelpers from "../../nodes/Semble/shared/PaginationHelpers";
import { BookingTrigger } from "../../nodes/Semble/triggers/BookingTrigger";

// Mock the dependencies
jest.mock("../../nodes/Semble/GenericFunctions");
jest.mock("../../nodes/Semble/shared/PaginationHelpers");
jest.mock("../../nodes/Semble/triggers/BookingTrigger");

const mockGenericFunctions = GenericFunctions as jest.Mocked<typeof GenericFunctions>;
const mockPaginationHelpers = PaginationHelpers as jest.Mocked<typeof PaginationHelpers>;
const mockBookingTrigger = BookingTrigger as jest.Mocked<typeof BookingTrigger>;

describe("SembleTrigger Node", () => {
  let triggerNode: SembleTrigger;
  let mockPollFunctions: jest.Mocked<IPollFunctions>;
  let mockWorkflowStaticData: IDataObject;

  beforeEach(() => {
    triggerNode = new SembleTrigger();
    mockWorkflowStaticData = {};

    // Create mock poll functions
    mockPollFunctions = {
      getNodeParameter: jest.fn(),
      getWorkflowStaticData: jest.fn(() => mockWorkflowStaticData),
      getNode: jest.fn(() => ({ type: "n8n-nodes-semble.sembleTrigger" })),
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      },
    } as any;

    // Setup default mock returns
    mockPaginationHelpers.buildPaginationConfig.mockReturnValue({
      pageSize: -1, // Updated to match new unlimited default
      returnAll: true,
    });

    // Mock SemblePagination class and its static execute method
    mockPaginationHelpers.SemblePagination = {
      execute: jest.fn().mockResolvedValue({
        data: [],
        meta: {
          pagesProcessed: 1,
          totalRecords: 0,
        },
      }),
    } as any;

    mockGenericFunctions.sembleApiRequest.mockResolvedValue({
      patients: {
        data: [],
        pageInfo: { hasMore: false },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Node Description", () => {
    it("should have correct node properties", () => {
      const description = triggerNode.description;

      expect(description.displayName).toBe("Semble Trigger");
      expect(description.name).toBe("sembleTrigger");
      expect(description.group).toEqual(["trigger"]);
      expect(description.polling).toBe(true);
      expect(description.credentials).toEqual([
        {
          name: "sembleApi",
          required: true,
        },
      ]);
    });

    it("should have required properties configured", () => {
      const description = triggerNode.description;
      const propertyNames = description.properties.map((p) => p.name);

      expect(propertyNames).toContain("resource");
      expect(propertyNames).toContain("event");
      expect(propertyNames).toContain("datePeriod");
      expect(propertyNames).toContain("additionalOptions");
    });

    it("should have correct resource options", () => {
      const description = triggerNode.description;
      const resourceProperty = description.properties.find((p) => p.name === "resource");

      expect(resourceProperty?.type).toBe("options");
      expect(resourceProperty?.options).toContainEqual({
        name: "Patient",
        value: "patient",
        description: "Monitor patients for changes (create, update)",
      });
    });

    it("should have correct event options", () => {
      const description = triggerNode.description;
      const eventProperty = description.properties.find((p) => p.name === "event");

      expect(eventProperty?.options).toContainEqual({
        name: "New or Updated",
        value: "newOrUpdated",
        description: "Trigger on new items or updates to existing items",
      });
      expect(eventProperty?.options).toContainEqual({
        name: "New Only",
        value: "newOnly",
        description: "Trigger only on newly created items",
      });
    });
  });

  describe("Poll Method", () => {
    beforeEach(() => {
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("1m") // datePeriod
        .mockReturnValueOnce({}); // additionalOptions
    });

    it("should return null when no new data is found", async () => {
      // For limited records (datePeriod != "all"), mock direct API call
      (mockGenericFunctions.sembleApiRequest as jest.Mock).mockResolvedValue({
        patients: {
          data: [],
          pageInfo: { hasMore: false }
        }
      });

      const result = await triggerNode.poll.call(mockPollFunctions);

      expect(result).toBeNull();
      // Should use direct API call, not SemblePagination
      expect(mockGenericFunctions.sembleApiRequest).toHaveBeenCalled();
      expect(mockPaginationHelpers.SemblePagination.execute).not.toHaveBeenCalled();
    });

    it("should return data when new items are found", async () => {
      const mockPatients = [
        {
          id: "1",
          first: "John",
          last: "Doe",
          createdAt: new Date().toISOString(),
          updatedAt: null,
        },
      ];

      // For limited records (datePeriod != "all"), mock direct API call
      (mockGenericFunctions.sembleApiRequest as jest.Mock).mockResolvedValue({
        patients: {
          data: mockPatients,
          pageInfo: { hasMore: false }
        }
      });

      const result = await triggerNode.poll.call(mockPollFunctions);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result![0]).toHaveLength(1);
      expect(result![0][0].json.id).toBe("1");
      expect(result![0][0].json.__meta).toMatchObject({
        resource: "patient",
        event: "newOrUpdated",
        isNew: true,
        isUpdated: false,
      });
      // Should use direct API call, not SemblePagination for date ranges
      expect(mockGenericFunctions.sembleApiRequest).toHaveBeenCalled();
      expect(mockPaginationHelpers.SemblePagination.execute).not.toHaveBeenCalled();
    });

    it("should throw error for unsupported resource", async () => {
      // Reset mocks for this specific test
      mockPollFunctions.getNodeParameter.mockReset();
      
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("unsupported") // resource
        .mockReturnValueOnce("newOrUpdated") // event  
        .mockReturnValueOnce("1m") // datePeriod
        .mockReturnValueOnce({}); // additionalOptions

      await expect(triggerNode.poll.call(mockPollFunctions)).rejects.toThrow(
        'Resource "unsupported" is not supported'
      );
    });

    it("should use additional options for limit and maxPages with new logic", async () => {
      // Reset mocks for this specific test
      mockPollFunctions.getNodeParameter.mockReset();
      mockGenericFunctions.sembleApiRequest.mockReset();
      
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("1m") // datePeriod
        .mockReturnValueOnce({ limit: 50, maxPages: 3 }); // additionalOptions

      // Mock workflow static data
      mockPollFunctions.getWorkflowStaticData.mockReturnValue({});

      // Mock API response - return exactly 50 items
      const mockPatients = Array(50).fill(null).map((_, i) => ({ 
        id: `${i + 1}`, 
        firstName: `Patient${i + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        patients: {
          data: mockPatients,
          pageInfo: { hasMore: true },
        },
      });

      const result = await triggerNode.poll.call(mockPollFunctions);

      // Should return the data since hasNewData = true
      expect(result).toHaveLength(1);
      expect(result![0]).toHaveLength(50); // Exactly the limit

      // Should have made 1 API call since 50 items fit in one page
      expect(mockGenericFunctions.sembleApiRequest).toHaveBeenCalledTimes(1);
      
      // API call should use pageSize of 50 (min of limit=50 and apiPageSize=100)
      expect(mockGenericFunctions.sembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('patients'),
        expect.objectContaining({
          pagination: { page: 1, pageSize: 50 },
          options: expect.objectContaining({
            updatedAt: expect.objectContaining({
              start: expect.any(String),
              end: expect.any(String),
            }),
          }),
        })
      );
    });
  });

  describe("Polling Logic", () => {
    beforeEach(() => {
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("1m") // datePeriod
        .mockReturnValueOnce({}); // additionalOptions
    });

    it("should fetch data using SemblePagination for unlimited records", async () => {
      // Override setup to use "all" datePeriod for unlimited records
      mockPollFunctions.getNodeParameter.mockReset();
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("all") // datePeriod - for unlimited records
        .mockReturnValueOnce({}); // additionalOptions

      (mockPaginationHelpers.SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: [{ id: "1", createdAt: new Date().toISOString() }],
        meta: {
          pagesProcessed: 1,
          totalRecords: 1,
        },
      });

      const result = await triggerNode.poll.call(mockPollFunctions);

      expect(mockPaginationHelpers.SemblePagination.execute).toHaveBeenCalledTimes(1);
      expect(result![0]).toHaveLength(1);
    });

    it("should use correct pagination configuration for unlimited records", async () => {
      // Override setup to use "all" datePeriod for unlimited records
      mockPollFunctions.getNodeParameter.mockReset();
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("all") // datePeriod - for unlimited records
        .mockReturnValueOnce({}); // additionalOptions

      (mockPaginationHelpers.SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: [],
        meta: {
          pagesProcessed: 1,
          totalRecords: 0,
        },
      });

      await triggerNode.poll.call(mockPollFunctions);

      // With unlimited records (datePeriod: 'all'), we use SemblePagination.execute
      expect(mockPaginationHelpers.SemblePagination.execute).toHaveBeenCalledWith(
        mockPollFunctions,
        expect.objectContaining({
          returnAll: true,
          pageSize: 100, // SemblePagination uses 100 for efficiency
          baseVariables: expect.objectContaining({
            options: expect.objectContaining({
              updatedAt: expect.any(Object)
            })
          })
        })
      );
    });

    it("should use direct API calls for limited records", async () => {
      // Reset mocks for this specific test
      mockPollFunctions.getNodeParameter.mockReset();
      
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("1m") // datePeriod
        .mockReturnValueOnce({ limit: 50 }); // additionalOptions with limit

      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        patients: {
          data: [{ id: "1", createdAt: new Date().toISOString() }],
          pageInfo: { hasMore: false },
        },
      });

      await triggerNode.poll.call(mockPollFunctions);

      // With limited records, we use direct API calls
      expect(mockGenericFunctions.sembleApiRequest).toHaveBeenCalledTimes(1);
      expect(mockPaginationHelpers.SemblePagination.execute).not.toHaveBeenCalled();
      
      const callArgs = mockGenericFunctions.sembleApiRequest.mock.calls[0];
      const variables = callArgs[1] as IDataObject;
      
      expect(variables.pagination).toEqual({
        page: 1,
        pageSize: 50, // Limited to the requested amount
      });
    });
  });

  describe("Date Filtering", () => {
    it("should include dateRange in query variables", async () => {
      // Use "all" datePeriod to test unlimited records path
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("all") // datePeriod - for unlimited records
        .mockReturnValueOnce({}); // additionalOptions

      (mockPaginationHelpers.SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: [],
        meta: {
          pagesProcessed: 1,
          totalRecords: 0,
        },
      });

      await triggerNode.poll.call(mockPollFunctions);

      // With unlimited records, check SemblePagination.execute call
      expect(mockPaginationHelpers.SemblePagination.execute).toHaveBeenCalledWith(
        mockPollFunctions,
        expect.objectContaining({
          baseVariables: expect.objectContaining({
            options: expect.objectContaining({
              updatedAt: expect.objectContaining({
                start: expect.any(String),
                end: expect.any(String),
              })
            })
          })
        })
      );
    });

    it("should handle 'all' date period correctly", async () => {
      // Reset mocks for this specific test
      mockPollFunctions.getNodeParameter.mockReset();
      
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("all") // datePeriod
        .mockReturnValueOnce({}); // additionalOptions

      // Mock workflow static data
      mockPollFunctions.getWorkflowStaticData.mockReturnValue({});

      (mockPaginationHelpers.SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: [],
        meta: {
          pagesProcessed: 1,
          totalRecords: 0,
        },
      });

      await triggerNode.poll.call(mockPollFunctions);

      // For 'all' period, should use 1970-01-01 as start date
      expect(mockPaginationHelpers.SemblePagination.execute).toHaveBeenCalledWith(
        mockPollFunctions,
        expect.objectContaining({
          baseVariables: expect.objectContaining({
            options: expect.objectContaining({
              updatedAt: expect.objectContaining({
                start: "1970-01-01T00:00:00.000Z"
              })
            })
          })
        })
      );
    });
  });

  describe("Event Filtering", () => {
    const mockOldDate = "2025-01-01T00:00:00.000Z";
    const mockNewDate = new Date().toISOString();

    beforeEach(() => {
      mockWorkflowStaticData.lastPoll = mockOldDate;
    });

    it("should filter for newOnly events correctly", async () => {
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOnly") // event
        .mockReturnValueOnce("all") // datePeriod - for unlimited records
        .mockReturnValueOnce({}); // additionalOptions

      // For newOnly, API should only return items created after lastPoll
      const mockPatients = [
        {
          id: "1",
          createdAt: mockNewDate, // New item (created after lastPoll)
          updatedAt: null,
        },
      ];

      (mockPaginationHelpers.SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: mockPatients,
        meta: {
          pagesProcessed: 1,
          totalRecords: 1,
        },
      });

      const result = await triggerNode.poll.call(mockPollFunctions);

      // Verify SemblePagination was called with createdAt filter
      expect(mockPaginationHelpers.SemblePagination.execute).toHaveBeenCalledWith(
        mockPollFunctions,
        expect.objectContaining({
          baseVariables: expect.objectContaining({
            options: expect.objectContaining({
              createdAt: expect.any(Object)
            })
          })
        })
      );

      expect(result![0]).toHaveLength(1);
      expect(result![0][0].json.id).toBe("1");
    });

    it("should filter for newOrUpdated events correctly", async () => {
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("all") // datePeriod - for unlimited records
        .mockReturnValueOnce({}); // additionalOptions

      // For newOrUpdated, API should return both new and updated items
      const mockPatients = [
        {
          id: "1",
          createdAt: mockNewDate, // New item
          updatedAt: null,
        },
        {
          id: "2",
          createdAt: mockOldDate, // Old item
          updatedAt: mockNewDate, // Updated recently
        },
      ];

      (mockPaginationHelpers.SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: mockPatients,
        meta: {
          pagesProcessed: 1,
          totalRecords: 2,
        },
      });

      const result = await triggerNode.poll.call(mockPollFunctions);

      // Verify SemblePagination was called with updatedAt filter
      expect(mockPaginationHelpers.SemblePagination.execute).toHaveBeenCalledWith(
        mockPollFunctions,
        expect.objectContaining({
          baseVariables: expect.objectContaining({
            options: expect.objectContaining({
              updatedAt: expect.any(Object)
            })
          })
        })
      );

      expect(result![0]).toHaveLength(2);
      expect(result![0].map((item: any) => item.json.id)).toEqual(["1", "2"]);
    });
  });

  describe("State Management", () => {
    it("should update lastPoll time in workflow static data", async () => {
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("1m") // datePeriod
        .mockReturnValueOnce({}); // additionalOptions

      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        patients: {
          data: [],
          pageInfo: { hasMore: false },
        },
      });

      await triggerNode.poll.call(mockPollFunctions);

      expect(mockWorkflowStaticData.lastPoll).toBeDefined();
      expect(typeof mockWorkflowStaticData.lastPoll).toBe("string");
    });

    it("should use lastPoll as cutoff date when available", async () => {
      const lastPollDate = "2025-01-01T00:00:00.000Z";
      mockWorkflowStaticData.lastPoll = lastPollDate;

      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("all") // datePeriod - for unlimited records
        .mockReturnValueOnce({}); // additionalOptions

      // With server-side filtering, API would only return items updated after lastPoll
      const mockPatients = [
        {
          id: "1",
          createdAt: "2025-01-02T00:00:00.000Z", // After lastPoll
          updatedAt: null,
        },
      ];

      // Mock SemblePagination.execute to return expected data
      (mockPaginationHelpers.SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: mockPatients,
        meta: { pagesProcessed: 1 },
      });

      const result = await triggerNode.poll.call(mockPollFunctions);

      // Verify SemblePagination.execute was called with lastPoll as start date
      expect(mockPaginationHelpers.SemblePagination.execute).toHaveBeenCalledWith(
        mockPollFunctions,
        {
          query: expect.any(String),
          baseVariables: {
            options: {
              updatedAt: {
                start: lastPollDate,
                end: expect.any(String),
              },
            },
          },
          dataPath: "patients",
          pageSize: 100,
          returnAll: true,
          maxPages: 5, // Limited in test environment for safety
        }
      );

      expect(result![0]).toHaveLength(1);
      expect(result![0][0].json.id).toBe("1");
    });
  });

  describe("Metadata", () => {
    it("should add correct metadata to returned items", async () => {
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("1m") // datePeriod
        .mockReturnValueOnce({}); // additionalOptions

      const mockPatients = [
        {
          id: "1",
          first: "John",
          last: "Doe",
          createdAt: new Date().toISOString(),
          updatedAt: null,
        },
      ];

      // For limited records (datePeriod != "all"), mock direct API call
      (mockGenericFunctions.sembleApiRequest as jest.Mock).mockResolvedValue({
        patients: {
          data: mockPatients,
          pageInfo: { hasMore: false }
        }
      });

      const result = await triggerNode.poll.call(mockPollFunctions);

      const item = result![0][0];
      expect(item.json.__meta).toMatchObject({
        resource: "patient",
        event: "newOrUpdated",
        isNew: true,
        isUpdated: false,
      });
      expect((item.json.__meta as IDataObject).pollTime).toBeDefined();
    });

    it("should correctly identify updated items", async () => {
      const pastDate = "2025-01-01T00:00:00.000Z";
      const recentDate = new Date().toISOString();
      mockWorkflowStaticData.lastPoll = pastDate;

      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("1m") // datePeriod
        .mockReturnValueOnce({}); // additionalOptions

      const mockPatients = [
        {
          id: "1",
          createdAt: pastDate, // Created before lastPoll
          updatedAt: recentDate, // Updated after lastPoll
        },
      ];

      // For limited records (datePeriod != "all"), mock direct API call
      (mockGenericFunctions.sembleApiRequest as jest.Mock).mockResolvedValue({
        patients: {
          data: mockPatients,
          pageInfo: { hasMore: false }
        }
      });

      const result = await triggerNode.poll.call(mockPollFunctions);

      const item = result![0][0];
      expect(item.json.__meta).toMatchObject({
        isNew: false,
        isUpdated: true,
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("1m") // datePeriod
        .mockReturnValueOnce({}); // additionalOptions

      const apiError = new Error("API Error");
      // For limited records (datePeriod != "all"), mock direct API call error
      (mockGenericFunctions.sembleApiRequest as jest.Mock).mockRejectedValue(apiError);

      await expect(triggerNode.poll.call(mockPollFunctions)).rejects.toThrow("API Error");
    });
  });

  describe("Integration with Shared Components", () => {
    it("should call sembleApiRequest with correct pagination parameters", async () => {
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("1m") // datePeriod
        .mockReturnValueOnce({ limit: 25 }); // additionalOptions

      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        patients: {
          data: [],
          pageInfo: { hasMore: false },
        },
      });

      await triggerNode.poll.call(mockPollFunctions);

      // Verify API was called with correct pagination structure
      const callArgs = mockGenericFunctions.sembleApiRequest.mock.calls[0];
      const variables = callArgs[1] as IDataObject;
      
      expect(variables.pagination).toEqual({
        page: 1,
        pageSize: 25,
      });
    });

    it("should call sembleApiRequest with correct query and variables", async () => {
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("all") // datePeriod - for unlimited records
        .mockReturnValueOnce({}); // additionalOptions

      // Mock SemblePagination.execute for unlimited records
      (mockPaginationHelpers.SemblePagination.execute as jest.Mock).mockResolvedValue({
        data: [],
        meta: { pagesProcessed: 1 },
      });

      await triggerNode.poll.call(mockPollFunctions);

      // For unlimited records, verify SemblePagination.execute was called
      expect(mockPaginationHelpers.SemblePagination.execute).toHaveBeenCalledWith(
        mockPollFunctions,
        expect.objectContaining({
          query: expect.any(String),
          baseVariables: expect.objectContaining({
            options: expect.any(Object),
          }),
          dataPath: "patients",
          pageSize: 100,
          returnAll: true,
        })
      );
    });
  });

  describe("Resource Handling - All Resources Use Same Logic", () => {
    beforeEach(() => {
      // Mock BookingTrigger.poll to return sample data
      mockBookingTrigger.poll = jest.fn().mockResolvedValue([
        [
          {
            json: {
              id: "booking1",
              patientId: "patient123",
              status: "confirmed",
              eventType: "any",
              pollTime: new Date().toISOString(),
            },
          },
        ],
      ]);
    });

    it("should use generic logic for all resources including booking", async () => {
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("booking") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("1m") // datePeriod
        .mockReturnValueOnce({}); // additionalOptions

      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        bookings: {
          data: [{ id: "booking1", patientId: "patient123", status: "confirmed" }],
          pageInfo: { hasMore: false },
        },
      });

      const result = await triggerNode.poll.call(mockPollFunctions);

      // Should NOT delegate to BookingTrigger (no longer exists)
      expect(mockBookingTrigger.poll).not.toHaveBeenCalled();
      
      // Should use the generic polling logic for all resources
      expect(mockGenericFunctions.sembleApiRequest).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result![0]).toHaveLength(1);
      expect(result![0][0].json.id).toBe("booking1");
    });

    it("should still use generic logic for non-booking resources", async () => {
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource (NOT booking)
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("1m") // datePeriod
        .mockReturnValueOnce({}); // additionalOptions

      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        patients: {
          data: [{ id: "patient1", firstName: "John" }],
          pageInfo: { hasMore: false },
        },
      });

      const result = await triggerNode.poll.call(mockPollFunctions);

      // Should NOT delegate to BookingTrigger
      expect(mockBookingTrigger.poll).not.toHaveBeenCalled();
      
      // Should use the generic polling logic
      expect(mockGenericFunctions.sembleApiRequest).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result![0]).toHaveLength(1);
      expect(result![0][0].json.id).toBe("patient1");
    });
  });
});
