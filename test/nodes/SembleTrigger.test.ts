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

// Mock the dependencies
jest.mock("../../nodes/Semble/GenericFunctions");
jest.mock("../../nodes/Semble/shared/PaginationHelpers");

const mockGenericFunctions = GenericFunctions as jest.Mocked<typeof GenericFunctions>;
const mockPaginationHelpers = PaginationHelpers as jest.Mocked<typeof PaginationHelpers>;

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
      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        patients: {
          data: [],
          pageInfo: { hasMore: false },
        },
      });

      const result = await triggerNode.poll.call(mockPollFunctions);

      expect(result).toBeNull();
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

      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        patients: {
          data: mockPatients,
          pageInfo: { hasMore: false },
        },
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

    it("should fetch data using correct API call", async () => {
      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        patients: {
          data: [{ id: "1", createdAt: new Date().toISOString() }],
          pageInfo: { hasMore: false },
        },
      });

      const result = await triggerNode.poll.call(mockPollFunctions);

      expect(mockGenericFunctions.sembleApiRequest).toHaveBeenCalledTimes(1);
      expect(result![0]).toHaveLength(1);
    });

    it("should use correct pagination configuration", async () => {
      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        patients: {
          data: [],
          pageInfo: { hasMore: false },
        },
      });

      await triggerNode.poll.call(mockPollFunctions);

      // With the new logic, we call the API directly with pagination parameters
      const callArgs = mockGenericFunctions.sembleApiRequest.mock.calls[0];
      const variables = callArgs[1] as IDataObject;
      
      expect(variables.pagination).toEqual({
        page: 1,
        pageSize: -1, // Default is now unlimited
      });
    });
  });

  describe("Date Filtering", () => {
    beforeEach(() => {
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("1d") // datePeriod
        .mockReturnValueOnce({}); // additionalOptions
    });

    it("should include dateRange in query variables", async () => {
      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        patients: {
          data: [],
          pageInfo: { hasMore: false },
        },
      });

      await triggerNode.poll.call(mockPollFunctions);

      const callArgs = mockGenericFunctions.sembleApiRequest.mock.calls[0];
      const variables = callArgs[1] as IDataObject;

      // New implementation uses options.updatedAt instead of dateRange
      expect(variables.options).toBeDefined();
      expect((variables.options as IDataObject).updatedAt).toBeDefined();
      expect(((variables.options as IDataObject).updatedAt as IDataObject).start).toBeDefined();
      expect(((variables.options as IDataObject).updatedAt as IDataObject).end).toBeDefined();
    });

    it("should handle 'all' date period correctly", async () => {
      // Reset mocks for this specific test
      mockPollFunctions.getNodeParameter.mockReset();
      mockGenericFunctions.sembleApiRequest.mockReset();
      
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("all") // datePeriod
        .mockReturnValueOnce({}); // additionalOptions

      // Mock workflow static data
      mockPollFunctions.getWorkflowStaticData.mockReturnValue({});

      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        patients: {
          data: [],
          pageInfo: { hasMore: false },
        },
      });

      await triggerNode.poll.call(mockPollFunctions);

      const callArgs = mockGenericFunctions.sembleApiRequest.mock.calls[0];
      const variables = callArgs[1] as IDataObject;

      // For 'all' period, should use 1970-01-01 as start date
      expect(((variables.options as IDataObject).updatedAt as IDataObject).start).toBe("1970-01-01T00:00:00.000Z");
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
        .mockReturnValueOnce("1m") // datePeriod
        .mockReturnValueOnce({}); // additionalOptions

      // For newOnly, API should only return items created after lastPoll
      const mockPatients = [
        {
          id: "1",
          createdAt: mockNewDate, // New item (created after lastPoll)
          updatedAt: null,
        },
      ];

      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        patients: {
          data: mockPatients,
          pageInfo: { hasMore: false },
        },
      });

      const result = await triggerNode.poll.call(mockPollFunctions);

      // Verify API was called with createdAt filter
      const callArgs = mockGenericFunctions.sembleApiRequest.mock.calls[0];
      const variables = callArgs[1] as IDataObject;
      expect((variables.options as IDataObject).createdAt).toBeDefined();

      expect(result![0]).toHaveLength(1);
      expect(result![0][0].json.id).toBe("1");
    });

    it("should filter for newOrUpdated events correctly", async () => {
      mockPollFunctions.getNodeParameter
        .mockReturnValueOnce("patient") // resource
        .mockReturnValueOnce("newOrUpdated") // event
        .mockReturnValueOnce("1m") // datePeriod
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

      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        patients: {
          data: mockPatients,
          pageInfo: { hasMore: false },
        },
      });

      const result = await triggerNode.poll.call(mockPollFunctions);

      // Verify API was called with updatedAt filter
      const callArgs = mockGenericFunctions.sembleApiRequest.mock.calls[0];
      const variables = callArgs[1] as IDataObject;
      expect((variables.options as IDataObject).updatedAt).toBeDefined();

      expect(result![0]).toHaveLength(2);
      expect(result![0].map((item) => item.json.id)).toEqual(["1", "2"]);
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
        .mockReturnValueOnce("1m") // datePeriod
        .mockReturnValueOnce({}); // additionalOptions

      // With server-side filtering, API would only return items updated after lastPoll
      const mockPatients = [
        {
          id: "1",
          createdAt: "2025-01-02T00:00:00.000Z", // After lastPoll
          updatedAt: null,
        },
      ];

      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        patients: {
          data: mockPatients,
          pageInfo: { hasMore: false },
        },
      });

      const result = await triggerNode.poll.call(mockPollFunctions);

      // Verify API was called with lastPoll as start date
      const callArgs = mockGenericFunctions.sembleApiRequest.mock.calls[0];
      const variables = callArgs[1] as IDataObject;
      expect(((variables.options as IDataObject).updatedAt as IDataObject).start).toBe(lastPollDate);

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

      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        patients: {
          data: mockPatients,
          pageInfo: { hasMore: false },
        },
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

      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        patients: {
          data: mockPatients,
          pageInfo: { hasMore: false },
        },
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
      mockGenericFunctions.sembleApiRequest.mockRejectedValue(apiError);

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
        .mockReturnValueOnce("1m") // datePeriod
        .mockReturnValueOnce({}); // additionalOptions

      mockGenericFunctions.sembleApiRequest.mockResolvedValue({
        patients: {
          data: [],
          pageInfo: { hasMore: false },
        },
      });

      await triggerNode.poll.call(mockPollFunctions);

      expect(mockGenericFunctions.sembleApiRequest).toHaveBeenCalledWith(
        expect.any(String), // GET_PATIENTS_QUERY
        expect.objectContaining({
          pagination: expect.any(Object),
          options: expect.any(Object),
        })
      );
    });
  });
});
