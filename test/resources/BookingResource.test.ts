/**
 * @fileoverview Test suite for BookingResource action hooks
 * @description Comprehensive tests for booking CRUD operations following ProductResource pattern
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Resources
 */

import {
  IExecuteFunctions,
  IDataObject,
  NodeApiError,
  NodeOperationError,
} from "n8n-workflow";

import { BookingResource } from "../../nodes/Semble/resources/BookingResource";
import { sembleApiRequest } from "../../nodes/Semble/GenericFunctions";
import { SemblePagination, buildPaginationConfig } from "../../nodes/Semble/shared/PaginationHelpers";
import {
  GET_BOOKING_QUERY,
  GET_BOOKINGS_QUERY,
  CREATE_BOOKING_MUTATION,
  UPDATE_BOOKING_MUTATION,
  DELETE_BOOKING_MUTATION,
  UPDATE_BOOKING_JOURNEY_MUTATION,
} from "../../nodes/Semble/shared/BookingQueries";

// Mock dependencies
jest.mock("../../nodes/Semble/GenericFunctions");
jest.mock("../../nodes/Semble/shared/PaginationHelpers");

const mockSembleApiRequest = sembleApiRequest as jest.MockedFunction<
  typeof sembleApiRequest
>;
const mockPagination = SemblePagination.execute as jest.MockedFunction<
  typeof SemblePagination.execute
>;
const mockBuildPaginationConfig = buildPaginationConfig as jest.MockedFunction<
  typeof buildPaginationConfig
>;

describe("BookingResource", () => {
  let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock execution functions
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getNode: jest.fn(() => ({ name: "Test Booking Resource" })),
      getInputData: jest.fn(),
    } as unknown as jest.Mocked<IExecuteFunctions>;
  });

  describe("get method", () => {
    it("should get a single booking by ID successfully", async () => {
      const bookingId = "62e2b7d228ec4b0013179e67";
      const mockBookingData = {
        id: bookingId,
        status: "confirmed",
        startTime: "2024-01-15T10:00:00Z",
        endTime: "2024-01-15T11:00:00Z",
        duration: 60,
        notes: "Test booking",
        patient: {
          id: "patient123",
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
        },
        practitioner: {
          id: "practitioner123",
          firstName: "Dr. Jane",
          lastName: "Smith",
        },
        location: {
          id: "location123",
          name: "Main Office",
        },
        bookingType: {
          id: "type123",
          name: "Consultation",
          duration: 60,
        },
      };

      mockExecuteFunctions.getNodeParameter.mockReturnValue(bookingId);
      mockSembleApiRequest.mockResolvedValue({
        booking: mockBookingData,
      });

      const result = await BookingResource.get(mockExecuteFunctions, 0);

      expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
        "bookingId",
        0,
      );
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        GET_BOOKING_QUERY,
        { id: bookingId },
        3,
        false,
      );
      expect(result).toEqual(mockBookingData);
    });

    it("should throw error when booking ID is missing", async () => {
      mockExecuteFunctions.getNodeParameter.mockReturnValue("");

      await expect(
        BookingResource.get(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeOperationError);
      
      expect(mockSembleApiRequest).not.toHaveBeenCalled();
    });

    it("should throw error when booking not found", async () => {
      const bookingId = "nonexistent";
      mockExecuteFunctions.getNodeParameter.mockReturnValue(bookingId);
      mockSembleApiRequest.mockResolvedValue({ booking: null });

      await expect(
        BookingResource.get(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeApiError);
    });

    it("should handle API errors gracefully", async () => {
      const bookingId = "62e2b7d228ec4b0013179e67";
      mockExecuteFunctions.getNodeParameter.mockReturnValue(bookingId);
      mockSembleApiRequest.mockRejectedValue(new Error("API Error"));

      await expect(
        BookingResource.get(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeApiError);
    });
  });

  describe("getMany method", () => {
    it("should get multiple bookings with pagination", async () => {
      const mockBookingsData = [
        {
          id: "booking1",
          status: "confirmed",
          startTime: "2024-01-15T10:00:00Z",
          patient: { firstName: "John", lastName: "Doe" },
        },
        {
          id: "booking2", 
          status: "pending",
          startTime: "2024-01-15T14:00:00Z",
          patient: { firstName: "Jane", lastName: "Smith" },
        },
      ];

      const mockOptions = {
        limit: 100,
        returnAll: false,
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      };

      const mockPaginationConfig = {
        pageSize: 100,
        returnAll: false,
        search: "",
      };

      mockExecuteFunctions.getNodeParameter.mockReturnValue(mockOptions);
      mockBuildPaginationConfig.mockReturnValue(mockPaginationConfig);
      mockPagination.mockResolvedValue({
        data: mockBookingsData,
        meta: {
          pagesProcessed: 1,
          totalRecords: 2,
          hasMore: false,
        },
      });

      const result = await BookingResource.getMany(mockExecuteFunctions, 0);

      expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
        "options",
        0,
      );
      expect(mockBuildPaginationConfig).toHaveBeenCalledWith(mockOptions);
      expect(mockPagination).toHaveBeenCalledWith(mockExecuteFunctions, {
        query: GET_BOOKINGS_QUERY,
        baseVariables: {
          dateRange: {
            start: "2024-01-01",
            end: "2024-01-31",
          },
          options: {},
        },
        dataPath: "bookings",
        pageSize: mockPaginationConfig.pageSize,
        returnAll: mockPaginationConfig.returnAll,
        options: {},
      });
      expect(result).toEqual(mockBookingsData);
    });

    it("should handle pagination errors", async () => {
      mockExecuteFunctions.getNodeParameter.mockReturnValue({});
      mockBuildPaginationConfig.mockReturnValue({
        pageSize: 100,
        returnAll: false,
        search: "",
      });
      mockPagination.mockRejectedValue(new Error("Pagination Error"));

      await expect(
        BookingResource.getMany(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeApiError);
    });
  });

  describe("create method", () => {
    it("should create a new booking successfully", async () => {
      const mockBookingData = {
        patient: "patient123",
        doctor: "practitioner123", 
        location: "location123",
        bookingType: "type123",
        start: "2024-01-15T10:00:00Z",
        end: "2024-01-15T11:00:00Z",
        comments: "Test booking",
      };

      const mockAdditionalFields = {
        status: "confirmed",
      };

      const mockCreatedBooking = {
        id: "newBooking123",
        ...mockBookingData,
        ...mockAdditionalFields,
        createdAt: "2024-01-10T09:00:00Z",
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(mockBookingData.patient)
        .mockReturnValueOnce(mockBookingData.doctor) 
        .mockReturnValueOnce(mockBookingData.location)
        .mockReturnValueOnce(mockBookingData.bookingType)
        .mockReturnValueOnce(mockBookingData.start)
        .mockReturnValueOnce(mockBookingData.end)
        .mockReturnValueOnce(mockBookingData.comments)
        .mockReturnValueOnce(mockAdditionalFields);

      mockSembleApiRequest.mockResolvedValue({
        createBooking: {
          data: mockCreatedBooking,
          error: null,
        },
      });

      const result = await BookingResource.create(mockExecuteFunctions, 0);

      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        CREATE_BOOKING_MUTATION,
        {
          patient: mockBookingData.patient,
          location: mockBookingData.location,
          bookingType: mockBookingData.bookingType,
          doctor: mockBookingData.doctor,
          comments: mockBookingData.comments,
          start: mockBookingData.start,
          end: mockBookingData.end,
          bookingData: {
            patient: mockBookingData.patient,
            location: mockBookingData.location,
            bookingType: mockBookingData.bookingType,
            doctor: mockBookingData.doctor,
            start: mockBookingData.start,
            end: mockBookingData.end,
            comments: mockBookingData.comments,
            ...mockAdditionalFields,
          },
        },
        3,
        false,
      );
      expect(result).toEqual(mockCreatedBooking);
    });

    it("should throw error when required fields are missing", async () => {
      mockExecuteFunctions.getNodeParameter.mockReturnValue("");

      await expect(
        BookingResource.create(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeOperationError);
    });

    it("should handle creation errors from API", async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce("patient123")
        .mockReturnValueOnce("practitioner123")
        .mockReturnValueOnce("location123")
        .mockReturnValueOnce("type123")
        .mockReturnValueOnce("2024-01-15T10:00:00Z")
        .mockReturnValueOnce(60)
        .mockReturnValueOnce({});

      mockSembleApiRequest.mockResolvedValue({
        createBooking: {
          data: null,
          error: "Patient not found",
        },
      });

      await expect(
        BookingResource.create(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeApiError);
    });
  });

  describe("update method", () => {
    it("should update an existing booking successfully", async () => {
      const bookingId = "booking123";
      const updateFields = {
        notes: "Updated notes",
        status: "cancelled",
      };

      const mockUpdatedBooking = {
        id: bookingId,
        ...updateFields,
        updatedAt: "2024-01-10T10:00:00Z",
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(bookingId)
        .mockReturnValueOnce(updateFields);

      mockSembleApiRequest.mockResolvedValue({
        updateBooking: {
          data: mockUpdatedBooking,
          error: null,
        },
      });

      const result = await BookingResource.update(mockExecuteFunctions, 0);

      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        UPDATE_BOOKING_MUTATION,
        {
          id: bookingId,
          bookingData: updateFields,
        },
        3,
        false,
      );
      expect(result).toEqual(mockUpdatedBooking);
    });

    it("should throw error when booking ID is missing", async () => {
      mockExecuteFunctions.getNodeParameter.mockReturnValue("");

      await expect(
        BookingResource.update(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeOperationError);
    });
  });

  describe("updateJourney method", () => {
    it("should update booking journey stage successfully", async () => {
      const bookingId = "booking123";
      const journeyStage = "arrived";
      const customDate = true;
      const date = "2024-01-15";
      const mockJourneyResponse = {
        updateBookingJourney: {
          success: true,
          data: { id: bookingId },
          error: null,
        },
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(bookingId)
        .mockReturnValueOnce(journeyStage)
        .mockReturnValueOnce(customDate)
        .mockReturnValueOnce(date);
      
      mockSembleApiRequest.mockResolvedValue(mockJourneyResponse);

      const result = await BookingResource.updateJourney(mockExecuteFunctions, 0);

      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        UPDATE_BOOKING_JOURNEY_MUTATION,
        {
          id: bookingId,
          journeyStage: journeyStage,
          date: date,
        },
        3,
        false,
      );
      expect(result).toEqual(mockJourneyResponse.updateBookingJourney.data);
    });

    it("should use current timestamp when no custom date provided", async () => {
      const bookingId = "booking123";
      const journeyStage = "consultation";
      const customDate = false;
      const mockJourneyResponse = {
        updateBookingJourney: {
          success: true,
          data: { id: bookingId },
          error: null,
        },
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(bookingId)
        .mockReturnValueOnce(journeyStage)
        .mockReturnValueOnce(customDate);

      mockSembleApiRequest.mockResolvedValue(mockJourneyResponse);

      const result = await BookingResource.updateJourney(mockExecuteFunctions, 0);

      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        UPDATE_BOOKING_JOURNEY_MUTATION,
        {
          id: bookingId,
          journeyStage: journeyStage,
          date: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
        },
        3,
        false,
      );
      expect(result).toEqual(mockJourneyResponse.updateBookingJourney.data);
    });

    it("should throw error when booking ID is missing", async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce("") // Empty booking ID
        .mockReturnValueOnce("arrived")
        .mockReturnValueOnce(false);

      await expect(
        BookingResource.updateJourney(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeOperationError);
    });

    it("should handle API errors gracefully", async () => {
      const bookingId = "booking123";
      const journeyStage = "departed";

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(bookingId)
        .mockReturnValueOnce(journeyStage)
        .mockReturnValueOnce("");

      mockSembleApiRequest.mockRejectedValue(new Error("API Error"));

      await expect(
        BookingResource.updateJourney(mockExecuteFunctions, 0)
      ).rejects.toThrow("API Error");
    });
  });

  describe("delete method", () => {
    it("should delete a booking successfully", async () => {
      const bookingId = "booking123";
      const sendCancellationMessages = true;
      const mockDeletedBooking = {
        id: bookingId,
        status: "cancelled",
        startTime: "2024-01-15T10:00:00Z",
        endTime: "2024-01-15T11:00:00Z",
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(bookingId)
        .mockReturnValueOnce(sendCancellationMessages);
      mockSembleApiRequest.mockResolvedValue({
        deleteBooking: {
          data: mockDeletedBooking,
          error: null,
        },
      });

      const result = await BookingResource.delete(mockExecuteFunctions, 0);

      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        DELETE_BOOKING_MUTATION,
        { 
          id: bookingId,
          sendCancellationMessages: sendCancellationMessages
        },
        3,
        false,
      );
      expect(result).toEqual({
        success: true,
        bookingId,
        deletedBooking: mockDeletedBooking,
        message: expect.stringContaining("deleted successfully"),
      });
    });

    it("should throw error when booking ID is missing", async () => {
      mockExecuteFunctions.getNodeParameter.mockReturnValue("");

      await expect(
        BookingResource.delete(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeOperationError);
    });
  });

  describe("executeAction method", () => {
    it("should route to correct methods based on action", async () => {
      const actions = ["get", "getMany", "create", "update", "delete", "updateJourney"];
      
      // Mock all required parameters for different actions
      mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
        if (paramName === "bookingId") return "booking123";
        if (paramName === "id") return "booking123";
        if (paramName === "journeyStage") return "arrived";
        if (paramName === "customDate") return false;
        if (paramName === "date") return "2024-01-15";
        if (paramName === "patient") return "patient123";
        if (paramName === "doctor") return "practitioner123";
        if (paramName === "location") return "location123";
        if (paramName === "bookingType") return "type123";
        if (paramName === "start") return "2024-01-15T10:00:00Z";
        if (paramName === "end") return "2024-01-15T11:00:00Z";
        if (paramName === "comments") return "test comments";
        if (paramName === "sendCancellationMessages") return true;
        if (paramName === "additionalFields") return {};
        if (paramName === "updateFields") return { comments: "test" };
        if (paramName === "options") return {};
        return "";
      });

      // Mock API responses for all actions
      mockSembleApiRequest.mockResolvedValue({
        booking: { id: "booking123" },
        createBooking: { data: { id: "booking123" }, error: null },
        updateBooking: { data: { id: "booking123" }, error: null },
        deleteBooking: { data: { id: "booking123" }, error: null },
        updateBookingJourney: { success: true, data: { id: "booking123" }, error: null },
      });

      mockBuildPaginationConfig.mockReturnValue({
        pageSize: 100,
        returnAll: false,
        search: "",
      });

      mockPagination.mockResolvedValue({
        data: [{ id: "booking123" }],
        meta: {
          pagesProcessed: 1,
          totalRecords: 1,
          hasMore: false,
        },
      });

      for (const action of actions) {
        await expect(
          BookingResource.executeAction(mockExecuteFunctions, action, 0)
        ).resolves.toBeDefined();
      }
    });

    it("should throw error for unknown action", async () => {
      await expect(
        BookingResource.executeAction(mockExecuteFunctions, "unknownAction", 0)
      ).rejects.toThrow(NodeOperationError);
    });
  });

  describe("getPatientBookings", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should throw error when patient ID is missing", async () => {
      mockExecuteFunctions.getNodeParameter.mockReturnValue({});

      await expect(
        BookingResource.getPatientBookings(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeOperationError);
    });

    it("should retrieve patient bookings with explicit date range", async () => {
      const mockOptions = {
        patientId: "test-patient-123",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
      };
      const mockResponse = {
        patient: {
          id: "test-patient-123",
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          bookings: [
            {
              id: "booking-1",
              start: "2025-08-21T10:00:00Z",
              end: "2025-08-21T11:00:00Z",
              status: "confirmed",
            },
          ],
        },
      };

      mockExecuteFunctions.getNodeParameter.mockReturnValue(mockOptions);
      mockSembleApiRequest.mockResolvedValue(mockResponse);

      const result = await BookingResource.getPatientBookings(mockExecuteFunctions, 0);

      expect(result).toEqual(mockResponse.patient.bookings);
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining("GetPatientBookings"),
        {
          id: "test-patient-123",
          start: "2025-01-01",
          end: "2025-12-31",
        },
        3,
        false
      );
    });

    it("should calculate date range from trigger metadata", async () => {
      const mockOptions = {
        patientId: "test-patient-123",
      };
      const mockInputData = [
        {
          json: {
            __meta: {
              pollTime: "2025-08-21T12:00:00.000Z",
            },
          },
        },
      ];
      const mockResponse = {
        patient: {
          id: "test-patient-123",
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          bookings: [],
        },
      };

      mockExecuteFunctions.getNodeParameter.mockReturnValue(mockOptions);
      mockExecuteFunctions.getInputData.mockReturnValue(mockInputData);
      mockSembleApiRequest.mockResolvedValue(mockResponse);

      const result = await BookingResource.getPatientBookings(mockExecuteFunctions, 0);

      expect(result).toEqual([]);
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining("GetPatientBookings"),
        expect.objectContaining({
          id: "test-patient-123",
          start: expect.any(String),
          end: expect.any(String),
        }),
        3,
        false
      );

      // Verify date range calculation
      const callArgs = mockSembleApiRequest.mock.calls[0][1] as IDataObject;
      const startDate = new Date(callArgs.start as string);
      const endDate = new Date(callArgs.end as string);
      const triggerTime = new Date("2025-08-21T12:00:00.000Z");
      const expectedStartTime = new Date(triggerTime.getTime() - (24 * 60 * 60 * 1000));

      expect(startDate.getTime()).toBeLessThanOrEqual(expectedStartTime.getTime() + 1000); // Allow 1s tolerance
      expect(endDate.getTime()).toBeGreaterThan(Date.now());
    });

    it("should use fallback date range when no trigger metadata", async () => {
      const mockOptions = {
        patientId: "test-patient-123",
      };
      const mockInputData = [{ json: {} }];
      const mockResponse = {
        patient: {
          id: "test-patient-123",
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          bookings: [],
        },
      };

      mockExecuteFunctions.getNodeParameter.mockReturnValue(mockOptions);
      mockExecuteFunctions.getInputData.mockReturnValue(mockInputData);
      mockSembleApiRequest.mockResolvedValue(mockResponse);

      const result = await BookingResource.getPatientBookings(mockExecuteFunctions, 0);

      expect(result).toEqual([]);
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining("GetPatientBookings"),
        {
          id: "test-patient-123",
          start: "2020-01-01",
          end: "2030-12-31",
        },
        3,
        false
      );
    });

    it("should use provided fallback dates from options", async () => {
      const mockOptions = {
        patientId: "test-patient-123",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      };
      const mockInputData = [{ json: {} }];
      const mockResponse = {
        patient: {
          id: "test-patient-123",
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          bookings: [],
        },
      };

      mockExecuteFunctions.getNodeParameter.mockReturnValue(mockOptions);
      mockExecuteFunctions.getInputData.mockReturnValue(mockInputData);
      mockSembleApiRequest.mockResolvedValue(mockResponse);

      const result = await BookingResource.getPatientBookings(mockExecuteFunctions, 0);

      expect(result).toEqual([]);
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining("GetPatientBookings"),
        {
          id: "test-patient-123",
          start: "2024-01-01",
          end: "2024-12-31",
        },
        3,
        false
      );
    });

    it("should throw NodeApiError when patient not found", async () => {
      const mockOptions = {
        patientId: "nonexistent-patient",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
      };
      const mockResponse = {
        patient: null,
      };

      mockExecuteFunctions.getNodeParameter.mockReturnValue(mockOptions);
      mockSembleApiRequest.mockResolvedValue(mockResponse);

      await expect(
        BookingResource.getPatientBookings(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeApiError);
    });

    it("should handle API errors gracefully", async () => {
      const mockOptions = {
        patientId: "test-patient-123",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
      };

      mockExecuteFunctions.getNodeParameter.mockReturnValue(mockOptions);
      mockSembleApiRequest.mockRejectedValue(new Error("API connection failed"));

      await expect(
        BookingResource.getPatientBookings(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeApiError);
    });

    it("should return empty array when patient has no bookings", async () => {
      const mockOptions = {
        patientId: "test-patient-123",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
      };
      const mockResponse = {
        patient: {
          id: "test-patient-123",
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          bookings: null,
        },
      };

      mockExecuteFunctions.getNodeParameter.mockReturnValue(mockOptions);
      mockSembleApiRequest.mockResolvedValue(mockResponse);

      const result = await BookingResource.getPatientBookings(mockExecuteFunctions, 0);

      expect(result).toEqual([]);
    });
  });
});
