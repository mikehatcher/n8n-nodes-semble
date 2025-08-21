/**
 * @fileoverview Integration tests for booking operations
 * @description Comprehensive integration tests for booking CRUD operations, including edge cases and error handling
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Integration
 */

import { IExecuteFunctions, IDataObject, NodeApiError, NodeOperationError } from 'n8n-workflow';
import { MockProxy, mock } from 'jest-mock-extended';
import { BookingResource } from '../../nodes/Semble/resources/BookingResource';
import { sembleApiRequest } from '../../nodes/Semble/GenericFunctions';
import { SemblePagination } from '../../nodes/Semble/shared/PaginationHelpers';
import { createMockExecuteFunctions } from '../helpers';

// Mock dependencies
jest.mock('../../nodes/Semble/GenericFunctions');
jest.mock('../../nodes/Semble/shared/PaginationHelpers', () => ({
  ...jest.requireActual('../../nodes/Semble/shared/PaginationHelpers'),
  SemblePagination: {
    execute: jest.fn(),
  },
}));

const mockSembleApiRequest = sembleApiRequest as jest.MockedFunction<typeof sembleApiRequest>;
const mockSemblePagination = SemblePagination as jest.Mocked<typeof SemblePagination>;

describe('BookingOperations Integration Tests', () => {
  let mockContext: MockProxy<IExecuteFunctions>;

  beforeEach(() => {
    mockContext = createMockExecuteFunctions();
    jest.clearAllMocks();
  });

  describe('Booking Get Operation', () => {
    it('should get single booking successfully', async () => {
      const testBookingId = '507f1f77bcf86cd799439012';
      const mockBookingData = {
        id: testBookingId,
        patient: {
          id: 'patient1',
          firstName: 'John',
          lastName: 'Doe'
        },
        doctor: {
          id: 'doctor1',
          firstName: 'Dr.',
          lastName: 'Smith'
        },
        location: {
          id: 'location1',
          name: 'Main Clinic'
        },
        bookingType: {
          id: 'type1',
          name: 'Consultation'
        },
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        status: 'confirmed',
        notes: 'Initial consultation'
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'bookingId': return testBookingId;
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        booking: mockBookingData
      });

      const result = await BookingResource.get(mockContext, 0);

      expect(result).toEqual(mockBookingData);
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('query GetBooking'),
        { id: testBookingId },
        3,
        false
      );
    });

    it('should throw error when booking not found', async () => {
      const testBookingId = 'nonexistent-id';

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'bookingId': return testBookingId;
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        booking: null
      });

      await expect(BookingResource.get(mockContext, 0)).rejects.toThrow(NodeApiError);
      await expect(BookingResource.get(mockContext, 0)).rejects.toThrow(
        'Booking with ID "nonexistent-id" not found'
      );
    });

    it('should throw error when booking ID is missing', async () => {
      (mockContext.getNodeParameter as any).mockImplementation(() => undefined);

      await expect(BookingResource.get(mockContext, 0)).rejects.toThrow(NodeOperationError);
      await expect(BookingResource.get(mockContext, 0)).rejects.toThrow(
        'Booking ID is required for get operation'
      );
    });
  });

  describe('Booking GetMany Operation', () => {
    it('should get multiple bookings using pagination', async () => {
      const mockBookingsData = [
        {
          id: 'booking1',
          patient: { id: 'patient1', firstName: 'John', lastName: 'Doe' },
          doctor: { id: 'doctor1', firstName: 'Dr.', lastName: 'Smith' },
          start: '2024-01-15T10:00:00Z',
          end: '2024-01-15T11:00:00Z',
          status: 'confirmed'
        },
        {
          id: 'booking2',
          patient: { id: 'patient2', firstName: 'Jane', lastName: 'Smith' },
          doctor: { id: 'doctor2', firstName: 'Dr.', lastName: 'Johnson' },
          start: '2024-01-16T14:00:00Z',
          end: '2024-01-16T15:00:00Z',
          status: 'pending'
        }
      ];

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'options': return {};
          default: return undefined;
        }
      });

      mockSemblePagination.execute.mockResolvedValue({
        data: mockBookingsData,
        meta: {
          pagesProcessed: 1,
          totalRecords: 2,
          hasMore: false
        }
      });

      const result = await BookingResource.getMany(mockContext, 0);

      expect(result).toEqual(mockBookingsData);
      expect(mockSemblePagination.execute).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          query: expect.stringContaining('query GetBookings'),
          dataPath: 'bookings',
          baseVariables: expect.objectContaining({
            options: {}
          })
        })
      );
    });

    it('should handle empty pagination results', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'options': return {};
          default: return undefined;
        }
      });

      mockSemblePagination.execute.mockResolvedValue({
        data: [],
        meta: {
          pagesProcessed: 1,
          totalRecords: 0,
          hasMore: false
        }
      });

      const result = await BookingResource.getMany(mockContext, 0);

      expect(result).toEqual([]);
      expect(mockSemblePagination.execute).toHaveBeenCalled();
    });

    it('should handle pagination errors', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'options': return {};
          default: return undefined;
        }
      });

      mockSemblePagination.execute.mockRejectedValue(new Error('Pagination failed'));

      await expect(BookingResource.getMany(mockContext, 0)).rejects.toThrow(NodeApiError);
      await expect(BookingResource.getMany(mockContext, 0)).rejects.toThrow(
        'Failed to retrieve bookings'
      );
    });
  });

  describe('Booking Create Operation', () => {
    it('should create booking with all required fields', async () => {
      const mockCreatedBooking = {
        id: 'new-booking-123',
        patient: { id: 'patient1', firstName: 'John', lastName: 'Doe' },
        doctor: { id: 'doctor1', firstName: 'Dr.', lastName: 'Smith' },
        location: { id: 'location1', name: 'Main Clinic' },
        bookingType: { id: 'type1', name: 'Consultation' },
        start: '2024-02-01T09:00:00Z',
        end: '2024-02-01T10:00:00Z',
        status: 'confirmed',
        duration: 60
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'patient': return 'patient1';
          case 'doctor': return 'doctor1';
          case 'location': return 'location1';
          case 'bookingType': return 'type1';
          case 'start': return '2024-02-01T09:00:00Z';
          case 'end': return '2024-02-01T10:00:00Z';
          case 'additionalFields': return {};
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        createBooking: {
          data: mockCreatedBooking,
          error: null
        }
      });

      const result = await BookingResource.create(mockContext, 0);

      expect(result).toEqual(mockCreatedBooking);
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('mutation CreateBooking'),
        expect.objectContaining({
          bookingData: expect.objectContaining({
            patient: 'patient1',
            doctor: 'doctor1',
            location: 'location1',
            bookingType: 'type1',
            start: '2024-02-01T09:00:00Z',
            end: '2024-02-01T10:00:00Z'
          })
        }),
        3,
        false
      );
    });

    it('should throw error when required fields are missing', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'patient': return 'patient1';
          case 'doctor': return undefined; // Missing required field
          case 'location': return 'location1';
          case 'bookingType': return 'type1';
          case 'start': return '2024-02-01T09:00:00Z';
          case 'end': return '2024-02-01T10:00:00Z';
          case 'additionalFields': return {};
          default: return undefined;
        }
      });

      await expect(BookingResource.create(mockContext, 0)).rejects.toThrow(NodeOperationError);
      await expect(BookingResource.create(mockContext, 0)).rejects.toThrow(
        'Patient, Doctor, Location, Booking Type, Start Time, and End Time are required for create operation'
      );
    });

    it('should handle API errors during creation', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'patient': return 'patient1';
          case 'doctor': return 'doctor1';
          case 'location': return 'location1';
          case 'bookingType': return 'type1';
          case 'start': return '2024-02-01T09:00:00Z';
          case 'end': return '2024-02-01T10:00:00Z';
          case 'additionalFields': return {};
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        createBooking: {
          data: null,
          error: 'Time slot already booked'
        }
      });

      await expect(BookingResource.create(mockContext, 0)).rejects.toThrow(NodeApiError);
      await expect(BookingResource.create(mockContext, 0)).rejects.toThrow(
        'Failed to create booking'
      );
    });

    it('should create booking with additional fields', async () => {
      const mockCreatedBooking = {
        id: 'new-booking-456',
        patient: { id: 'patient1', firstName: 'John', lastName: 'Doe' },
        doctor: { id: 'doctor1', firstName: 'Dr.', lastName: 'Smith' },
        location: { id: 'location1', name: 'Main Clinic' },
        bookingType: { id: 'type1', name: 'Consultation' },
        start: '2024-02-01T09:00:00Z',
        end: '2024-02-01T10:00:00Z',
        status: 'confirmed',
        notes: 'Follow-up appointment',
        priority: 'high',
        reminder: true
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'patient': return 'patient1';
          case 'doctor': return 'doctor1';
          case 'location': return 'location1';
          case 'bookingType': return 'type1';
          case 'start': return '2024-02-01T09:00:00Z';
          case 'end': return '2024-02-01T10:00:00Z';
          case 'additionalFields': return {
            notes: 'Follow-up appointment',
            priority: 'high',
            reminder: true
          };
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        createBooking: {
          data: mockCreatedBooking,
          error: null
        }
      });

      const result = await BookingResource.create(mockContext, 0);

      expect(result).toEqual(mockCreatedBooking);
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('mutation CreateBooking'),
        expect.objectContaining({
          bookingData: expect.objectContaining({
            notes: 'Follow-up appointment',
            priority: 'high',
            reminder: true
          })
        }),
        3,
        false
      );
    });
  });

  describe('Booking Update Operation', () => {
    it('should update booking successfully', async () => {
      const bookingId = '507f1f77bcf86cd799439012';
      const mockUpdatedBooking = {
        id: bookingId,
        patient: { id: 'patient1', firstName: 'John', lastName: 'Doe' },
        doctor: { id: 'doctor2', firstName: 'Dr.', lastName: 'Johnson' }, // Changed doctor
        location: { id: 'location1', name: 'Main Clinic' },
        bookingType: { id: 'type1', name: 'Consultation' },
        start: '2024-02-01T10:00:00Z', // Changed time
        end: '2024-02-01T11:00:00Z',
        status: 'confirmed',
        notes: 'Updated appointment details'
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'bookingId': return bookingId;
          case 'updateFields': return {
            doctor: 'doctor2',
            start: '2024-02-01T10:00:00Z',
            end: '2024-02-01T11:00:00Z',
            notes: 'Updated appointment details'
          };
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        updateBooking: {
          data: mockUpdatedBooking,
          error: null
        }
      });

      const result = await BookingResource.update(mockContext, 0);

      expect(result).toEqual(mockUpdatedBooking);
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('mutation UpdateBooking'),
        expect.objectContaining({
          id: bookingId,
          bookingData: expect.objectContaining({
            doctor: 'doctor2',
            start: '2024-02-01T10:00:00Z',
            end: '2024-02-01T11:00:00Z',
            notes: 'Updated appointment details'
          })
        }),
        3,
        false
      );
    });

    it('should throw error when booking ID is missing for update', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'bookingId': return undefined;
          case 'updateFields': return { notes: 'Updated notes' };
          default: return undefined;
        }
      });

      await expect(BookingResource.update(mockContext, 0)).rejects.toThrow(NodeOperationError);
      await expect(BookingResource.update(mockContext, 0)).rejects.toThrow(
        'Booking ID is required for update operation'
      );
    });

    it('should handle API errors during update', async () => {
      const bookingId = '507f1f77bcf86cd799439012';

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'bookingId': return bookingId;
          case 'updateFields': return { start: '2024-02-01T10:00:00Z' };
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        updateBooking: {
          data: null,
          error: 'Booking cannot be modified - already completed'
        }
      });

      await expect(BookingResource.update(mockContext, 0)).rejects.toThrow(NodeApiError);
      await expect(BookingResource.update(mockContext, 0)).rejects.toThrow(
        'Failed to update booking'
      );
    });
  });

  describe('Booking UpdateJourney Operation', () => {
    it('should update booking journey successfully', async () => {
      const bookingId = '507f1f77bcf86cd799439012';
      const mockUpdatedBooking = {
        id: bookingId,
        patient: { id: 'patient1', firstName: 'John', lastName: 'Doe' },
        status: 'in-progress',
        journey: {
          currentStage: 'consultation',
          completedStages: ['check-in', 'waiting'],
          nextStage: 'follow-up'
        }
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'bookingId': return bookingId;
          case 'journeyStage': return 'consultation';
          case 'customDate': return false;
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        updateBookingJourney: {
          data: mockUpdatedBooking,
          error: null
        }
      });

      const result = await BookingResource.updateJourney(mockContext, 0);

      expect(result).toEqual(mockUpdatedBooking);
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('mutation UpdateBookingJourney'),
        expect.objectContaining({
          id: bookingId,
          journeyStage: 'consultation',
          date: expect.any(String)
        }),
        3,
        false
      );
    });

    it('should throw error when booking ID is missing for journey update', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'bookingId': return undefined;
          case 'journeyStage': return 'consultation';
          default: return undefined;
        }
      });

      await expect(BookingResource.updateJourney(mockContext, 0)).rejects.toThrow(NodeOperationError);
      await expect(BookingResource.updateJourney(mockContext, 0)).rejects.toThrow(
        'Booking ID is required for journey update'
      );
    });
  });

  describe('Booking Delete Operation', () => {
    it('should delete booking successfully', async () => {
      const bookingId = '507f1f77bcf86cd799439012';
      const mockDeletedBooking = {
        id: bookingId,
        patient: { id: 'patient1', firstName: 'John', lastName: 'Doe' },
        start: '2024-02-01T09:00:00Z',
        status: 'cancelled'
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'bookingId': return bookingId;
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        deleteBooking: {
          data: mockDeletedBooking,
          error: null
        }
      });

      const result = await BookingResource.delete(mockContext, 0);

      expect(result).toEqual({
        success: true,
        bookingId,
        deletedBooking: mockDeletedBooking,
        message: `Booking with ID "${bookingId}" deleted successfully`
      });
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('mutation DeleteBooking'),
        { id: bookingId },
        3,
        false
      );
    });

    it('should throw error when booking ID is missing for delete', async () => {
      (mockContext.getNodeParameter as any).mockImplementation(() => undefined);

      await expect(BookingResource.delete(mockContext, 0)).rejects.toThrow(NodeOperationError);
      await expect(BookingResource.delete(mockContext, 0)).rejects.toThrow(
        'Booking ID is required for delete operation'
      );
    });

    it('should handle API errors during deletion', async () => {
      const bookingId = '507f1f77bcf86cd799439012';

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'bookingId': return bookingId;
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        deleteBooking: {
          data: null,
          error: 'Booking cannot be deleted - already completed'
        }
      });

      await expect(BookingResource.delete(mockContext, 0)).rejects.toThrow(NodeApiError);
      await expect(BookingResource.delete(mockContext, 0)).rejects.toThrow(
        'Failed to delete booking'
      );
    });
  });

  describe('Booking ExecuteAction Integration', () => {
    it('should route actions correctly through executeAction', async () => {
      const testCases = [
        { action: 'get', expectedMethod: 'get' },
        { action: 'getMany', expectedMethod: 'getMany' },
        { action: 'create', expectedMethod: 'create' },
        { action: 'update', expectedMethod: 'update' },
        { action: 'updateJourney', expectedMethod: 'updateJourney' },
        { action: 'delete', expectedMethod: 'delete' }
      ];

      for (const testCase of testCases) {
        // Mock successful execution for each action
        const mockResult = { id: 'test-booking', action: testCase.action };
        
        // Mock the specific method being tested
        jest.spyOn(BookingResource, testCase.expectedMethod as any).mockResolvedValue(mockResult);

        const result = await BookingResource.executeAction(mockContext, testCase.action, 0);

        expect(result).toEqual(mockResult);
        expect(BookingResource[testCase.expectedMethod as keyof typeof BookingResource]).toHaveBeenCalledWith(mockContext, 0);

        // Restore the mock for next iteration
        (BookingResource[testCase.expectedMethod as keyof typeof BookingResource] as jest.Mock).mockRestore();
      }
    });

    it('should throw error for unknown booking action', async () => {
      await expect(BookingResource.executeAction(mockContext, 'unknownAction', 0))
        .rejects.toThrow(NodeOperationError);
      await expect(BookingResource.executeAction(mockContext, 'unknownAction', 0))
        .rejects.toThrow('Unknown booking action: unknownAction');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      const bookingId = '507f1f77bcf86cd799439012';

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'bookingId': return bookingId;
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockRejectedValue(new Error('Network timeout'));

      await expect(BookingResource.get(mockContext, 0)).rejects.toThrow(NodeApiError);
      await expect(BookingResource.get(mockContext, 0)).rejects.toThrow(
        'Failed to retrieve booking'
      );
    });

    it('should handle malformed API responses', async () => {
      const bookingId = '507f1f77bcf86cd799439012';

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'bookingId': return bookingId;
          default: return undefined;
        }
      });

      // Mock a malformed response (missing expected structure)
      mockSembleApiRequest.mockResolvedValue({
        unexpectedField: 'unexpected value'
      });

      await expect(BookingResource.get(mockContext, 0)).rejects.toThrow(NodeApiError);
    });

    it('should handle concurrent booking conflicts', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'patient': return 'patient1';
          case 'doctor': return 'doctor1';
          case 'location': return 'location1';
          case 'bookingType': return 'type1';
          case 'start': return '2024-02-01T09:00:00Z';
          case 'end': return '2024-02-01T10:00:00Z';
          case 'additionalFields': return {};
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        createBooking: {
          data: null,
          error: 'Concurrent booking conflict detected - time slot no longer available'
        }
      });

      await expect(BookingResource.create(mockContext, 0)).rejects.toThrow(NodeApiError);
      await expect(BookingResource.create(mockContext, 0)).rejects.toThrow(
        'Failed to create booking'
      );
    });
  });
});
