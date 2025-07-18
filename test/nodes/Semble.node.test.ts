/**
 * @fileoverview Tests for updated Semble node with modular patient operations
 * @description Comprehe      /**
 * @file Comprehensive tests for patient CRUD operations using modular architecture
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Nodes
 */

import { IExecuteFunctions, IDataObject, NodeApiError, NodeOperationError } from 'n8n-workflow';
import { MockProxy, mock } from 'jest-mock-extended';
import { Semble } from '../../nodes/Semble/Semble.node';
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

describe('Semble Node - Patient Operations', () => {
  let sembleNode: Semble;
  let mockContext: MockProxy<IExecuteFunctions>;

  beforeEach(() => {
    sembleNode = new Semble();
    mockContext = createMockExecuteFunctions();
    jest.clearAllMocks();
  });

  describe('Patient Get Operation', () => {
    it('should get single patient successfully', async () => {
      const testPatientId = '68740bc493985f7d03d4f8c9';
      const mockPatientData = {
        id: testPatientId,
        firstName: 'Mike',
        lastName: 'Hatcher',
        email: 'mike@example.com',
        status: 'active'
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'get';
          case 'resource': return 'patient';
          case 'patientId': return testPatientId;
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        patient: mockPatientData
      });

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual(mockPatientData);
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('query GetPatient'),
        { id: testPatientId },
        3,
        false
      );
    });

    it('should throw error when patient not found', async () => {
      const testPatientId = 'nonexistent-id';

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'get';
          case 'resource': return 'patient';
          case 'patientId': return testPatientId;
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        patient: null
      });

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeApiError);
      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Patient with ID nonexistent-id not found'
      );
    });

    it('should throw error when patient ID is missing', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'get';
          case 'resource': return 'patient';
          case 'patientId': return '';
          default: return undefined;
        }
      });

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeOperationError);
      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Patient ID is required for get operation'
      );
    });

    it('should handle API errors gracefully', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'get';
          case 'resource': return 'patient';
          case 'patientId': return 'test-id';
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockRejectedValue(new Error('Network error'));

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeApiError);
      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Failed to get patient'
      );
    });
  });

  describe('Patient Get Many Operation', () => {
    it('should get multiple patients using pagination', async () => {
      const mockPaginationResult = {
        data: [
          { id: '1', firstName: 'John', lastName: 'Doe' },
          { id: '2', firstName: 'Jane', lastName: 'Smith' }
        ],
        meta: {
          pagesProcessed: 1,
          totalRecords: 2,
          hasMore: false
        }
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string, itemIndex?: number) => {
        console.log(`Mock called with param: ${param}, itemIndex: ${itemIndex}`);
        switch (param) {
          case 'action': return 'getMany';
          case 'resource': return 'patient';
          case 'options': return {
            pageSize: 50,
            returnAll: false,
            search: 'test'
          };
          default: return undefined;
        }
      });

      mockSemblePagination.execute.mockResolvedValue(mockPaginationResult);

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(2);
      expect(result[0][0].json).toEqual({ id: '1', firstName: 'John', lastName: 'Doe' });
      expect(result[0][1].json).toEqual({ id: '2', firstName: 'Jane', lastName: 'Smith' });

      expect(mockSemblePagination.execute).toHaveBeenCalledWith(mockContext, {
        query: expect.stringContaining('query GetPatients'),
        baseVariables: {},
        dataPath: 'patients',
        pageSize: 50,
        returnAll: false,
        search: 'test',
        options: {}
      });
    });

    it('should handle empty pagination results', async () => {
      const mockPaginationResult = {
        data: [],
        meta: {
          pagesProcessed: 1,
          totalRecords: 0,
          hasMore: false
        }
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'getMany';
          case 'resource': return 'patient';
          case 'options': return {
            pageSize: 50,
            returnAll: false
          };
          default: return undefined;
        }
      });

      mockSemblePagination.execute.mockResolvedValue(mockPaginationResult);

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(0);
    });

    it('should handle pagination errors', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'getMany';
          case 'resource': return 'patient';
          case 'options': return {
            pageSize: 50,
            returnAll: false
          };
          default: return undefined;
        }
      });

      mockSemblePagination.execute.mockRejectedValue(new Error('Pagination failed'));

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeApiError);
      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Failed to get patients'
      );
    });
  });

  describe('Patient Delete Operation', () => {
    it('should delete patient successfully', async () => {
      const testPatientId = 'test-patient-id';
      const mockDeleteResponse = {
        deletePatient: {
          error: null,
          data: {
            id: testPatientId,
            firstName: 'John',
            lastName: 'Doe'
          }
        }
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'delete';
          case 'resource': return 'patient';
          case 'patientId': return testPatientId;
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue(mockDeleteResponse);

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual({
        success: true,
        patientId: testPatientId,
        deletedPatient: mockDeleteResponse.deletePatient.data,
        message: 'Patient John Doe (test-patient-id) deleted successfully'
      });

      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('mutation DeletePatient'),
        { id: testPatientId },
        3,
        false
      );
    });

    it('should handle delete errors from API', async () => {
      const testPatientId = 'test-patient-id';
      const mockDeleteResponse = {
        deletePatient: {
          error: 'Patient not found or cannot be deleted',
          data: null
        }
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'delete';
          case 'resource': return 'patient';
          case 'patientId': return testPatientId;
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue(mockDeleteResponse);

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeApiError);
      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Failed to delete patient: Patient not found or cannot be deleted'
      );
    });

    it('should throw error when patient ID is missing for delete', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'delete';
          case 'resource': return 'patient';
          case 'patientId': return '';
          default: return undefined;
        }
      });

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeOperationError);
      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Patient ID is required for delete operation'
      );
    });

    it('should handle API connection errors for delete', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'delete';
          case 'resource': return 'patient';
          case 'patientId': return 'test-id';
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockRejectedValue(new Error('Connection timeout'));

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeApiError);
      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Failed to delete patient'
      );
    });
  });

  describe('Not Yet Implemented Operations', () => {
    it('should return placeholder for create patient', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'create';
          case 'resource': return 'patient';
          default: return undefined;
        }
      });

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual({
        message: 'Create patient action not yet implemented'
      });
    });

    it('should return placeholder for update patient', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'update';
          case 'resource': return 'patient';
          default: return undefined;
        }
      });

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual({
        message: 'Update patient action not yet implemented'
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle unknown patient actions', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'unknownAction';
          case 'resource': return 'patient';
          default: return undefined;
        }
      });

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeOperationError);
      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Unknown patient action: unknownAction'
      );
    });

    it('should handle unknown resources', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'get';
          case 'resource': return 'unknownResource';
          default: return '';
        }
      });

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual({
        message: 'Get action not yet implemented'
      });
    });

    it('should continue on fail when configured', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'get';
          case 'resource': return 'patient';
          case 'patientId': return 'test-id';
          default: return undefined;
        }
      });

      mockContext.continueOnFail.mockReturnValue(true);
      mockSembleApiRequest.mockRejectedValue(new Error('API Error'));

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toHaveProperty('error');
      expect(result[0][0].json.error).toContain('Failed to get patient');
    });

    it('should process multiple input items', async () => {
      // Setup context with multiple input items
      mockContext.getInputData.mockReturnValue([
        { json: {} },
        { json: {} }
      ]);

      (mockContext.getNodeParameter as any).mockImplementation((param: string, itemIndex?: number) => {
        switch (param) {
          case 'action': return 'get';
          case 'resource': return 'patient';
          case 'patientId': return itemIndex === 0 ? 'patient1' : 'patient2';
          default: return undefined;
        }
      });

      mockSembleApiRequest
        .mockResolvedValueOnce({
          patient: { id: 'patient1', firstName: 'John', lastName: 'Doe' }
        })
        .mockResolvedValueOnce({
          patient: { id: 'patient2', firstName: 'Jane', lastName: 'Smith' }
        });

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(2);
      expect(result[0][0].json.id).toBe('patient1');
      expect(result[0][1].json.id).toBe('patient2');
    });
  });
});
