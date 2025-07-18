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

  describe('Patient Update Operation', () => {
    it('should update patient successfully with basic fields', async () => {
      const testPatientId = '68740bc493985f7d03d4f8c9';
      const mockUpdateResponse = {
        updatePatient: {
          error: null,
          data: {
            id: testPatientId,
            firstName: 'Michael',
            lastName: 'Hatcher-Updated',
            email: 'michael.updated@example.com',
            status: 'active'
          }
        }
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'update';
          case 'resource': return 'patient';
          case 'patientId': return testPatientId;
          case 'updateFields': return {
            firstName: 'Michael',
            lastName: 'Hatcher-Updated',
            email: 'michael.updated@example.com'
          };
          case 'placeOfBirth': return {};
          case 'communicationPreferences': return {};
          case 'customAttributes': return {};
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue(mockUpdateResponse);

      const result = await sembleNode.execute.call(mockContext);

      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('mutation UpdatePatient'),
        {
          id: testPatientId,
          patientData: {
            first: 'Michael',
            last: 'Hatcher-Updated',
            email: 'michael.updated@example.com'
          }
        },
        3,
        false
      );

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual(mockUpdateResponse.updatePatient.data);
    });

    it('should update patient with all available fields', async () => {
      const testPatientId = '68740bc493985f7d03d4f8c9';
      const mockUpdateResponse = {
        updatePatient: {
          error: null,
          data: {
            id: testPatientId,
            firstName: 'Michael',
            lastName: 'Hatcher-Complete',
            email: 'complete@example.com',
            status: 'active',
            title: 'Dr',
            gender: 'male',
            address: '123 Updated St',
            city: 'Updated City',
            postcode: 'UPD123'
          }
        }
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'update';
          case 'resource': return 'patient';
          case 'patientId': return testPatientId;
          case 'updateFields': return {
            firstName: 'Michael',
            lastName: 'Hatcher-Complete',
            email: 'complete@example.com',
            title: 'Dr',
            gender: 'male',
            address: '123 Updated St',
            city: 'Updated City',
            postcode: 'UPD123',
            phoneType: 'Mobile',
            phoneNumber: '+1234567890',
            comments: 'Updated patient information'
          };
          case 'placeOfBirth': return {
            name: 'Updated City',
            code: 'UPD123'
          };
          case 'communicationPreferences': return {
            receiveEmail: true,
            receiveSMS: false,
            promotionalMarketing: true
          };
          case 'customAttributes': return {
            customAttribute: [
              {
                title: 'Updated Preference',
                text: 'Updated preference description',
                response: 'Updated response'
              }
            ]
          };
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue(mockUpdateResponse);

      const result = await sembleNode.execute.call(mockContext);

      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('mutation UpdatePatient'),
        {
          id: testPatientId,
          patientData: {
            first: 'Michael',
            last: 'Hatcher-Complete',
            email: 'complete@example.com',
            title: 'Dr',
            gender: 'male',
            address: '123 Updated St',
            city: 'Updated City',
            postcode: 'UPD123',
            phoneType: 'Mobile',
            phoneNumber: '+1234567890',
            comments: 'Updated patient information',
            placeOfBirth: {
              name: 'Updated City',
              code: 'UPD123'
            },
            communicationPreferences: {
              receiveEmail: true,
              receiveSMS: false,
              promotionalMarketing: true
            },
            customAttributes: [
              {
                title: 'Updated Preference',
                text: 'Updated preference description',
                response: 'Updated response'
              }
            ]
          }
        },
        3,
        false
      );

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual(mockUpdateResponse.updatePatient.data);
    });

    it('should handle API error during patient update', async () => {
      const testPatientId = '68740bc493985f7d03d4f8c9';
      const mockErrorResponse = {
        updatePatient: {
          error: 'Patient not found',
          data: null
        }
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'update';
          case 'resource': return 'patient';
          case 'patientId': return testPatientId;
          case 'updateFields': return { firstName: 'Test' };
          case 'placeOfBirth': return {};
          case 'communicationPreferences': return {};
          case 'customAttributes': return {};
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue(mockErrorResponse);

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Failed to update patient: Patient not found'
      );
    });

    it('should handle network error during patient update', async () => {
      const testPatientId = '68740bc493985f7d03d4f8c9';

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'update';
          case 'resource': return 'patient';
          case 'patientId': return testPatientId;
          case 'updateFields': return { firstName: 'Test' };
          case 'placeOfBirth': return {};
          case 'communicationPreferences': return {};
          case 'customAttributes': return {};
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockRejectedValue(new Error('Network error'));

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Failed to update patient: Network error'
      );
    });

    it('should require patient ID for update operation', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'update';
          case 'resource': return 'patient';
          case 'patientId': return '';
          default: return undefined;
        }
      });

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Patient ID is required for update operation'
      );
    });

    it('should properly map firstName and lastName to API format', async () => {
      const testPatientId = '68740bc493985f7d03d4f8c9';
      const mockUpdateResponse = {
        updatePatient: {
          error: null,
          data: { id: testPatientId, firstName: 'John', lastName: 'Doe' }
        }
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'update';
          case 'resource': return 'patient';
          case 'patientId': return testPatientId;
          case 'updateFields': return {
            firstName: 'John',
            lastName: 'Doe'
          };
          case 'placeOfBirth': return {};
          case 'communicationPreferences': return {};
          case 'customAttributes': return {};
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue(mockUpdateResponse);

      await sembleNode.execute.call(mockContext);

      // Verify that firstName/lastName are mapped to first/last
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('mutation UpdatePatient'),
        expect.objectContaining({
          patientData: expect.objectContaining({
            first: 'John',
            last: 'Doe'
          })
        }),
        3,
        false
      );

      // Verify that original firstName/lastName are removed from patientData
      const calledArgs = mockSembleApiRequest.mock.calls[0][1] as any;
      expect(calledArgs.patientData).not.toHaveProperty('firstName');
      expect(calledArgs.patientData).not.toHaveProperty('lastName');
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

  describe('Patient Create Operation', () => {
    describe('Basic Patient Creation', () => {
      it('should create patient with required fields only', async () => {
        const mockPatientData = {
          id: '687a6e0edccdade55eceed98',
          firstName: 'John',
          lastName: 'Doe',
          email: null,
          dob: null
        };

        (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
          switch (param) {
            case 'action': return 'create';
            case 'resource': return 'patient';
            case 'firstName': return 'John';
            case 'lastName': return 'Doe';
            case 'additionalFields': return {};
            case 'placeOfBirth': return {};
            case 'communicationPreferences': return {};
            case 'customAttributes': return {};
            default: return undefined;
          }
        });

        mockSembleApiRequest.mockResolvedValue({
          createPatient: {
            data: mockPatientData,
            error: null
          }
        });

        const result = await sembleNode.execute.call(mockContext);

        expect(result[0]).toHaveLength(1);
        expect(result[0][0].json).toEqual(mockPatientData);
        expect(mockSembleApiRequest).toHaveBeenCalledWith(
          expect.stringContaining('mutation CreatePatient'),
          {
            patientData: {
              first: 'John',
              last: 'Doe'
            }
          },
          3,
          false
        );
      });

      it('should throw error when firstName is missing', async () => {
        (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
          switch (param) {
            case 'action': return 'create';
            case 'resource': return 'patient';
            case 'firstName': return '';
            case 'lastName': return 'Doe';
            default: return undefined;
          }
        });

        await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeOperationError);
        await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
          'First Name and Last Name are required for create operation'
        );
      });

      it('should throw error when lastName is missing', async () => {
        (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
          switch (param) {
            case 'action': return 'create';
            case 'resource': return 'patient';
            case 'firstName': return 'John';
            case 'lastName': return '';
            default: return undefined;
          }
        });

        await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeOperationError);
        await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
          'First Name and Last Name are required for create operation'
        );
      });
    });

    describe('Patient Creation with Additional Fields', () => {
      it('should create patient with all basic additional fields', async () => {
        const additionalFields = {
          title: 'Dr',
          email: 'john.doe@example.com',
          dob: '1990-01-01',
          gender: 'Male',
          sex: 'Male',
          address: '123 Main St',
          city: 'New York',
          postcode: '10001',
          country: 'US',
          phoneType: 'Mobile',
          phoneNumber: '+1-555-123-4567',
          paymentReference: 'PAY-001',
          comments: 'Test patient'
        };

        const expectedPatientData = {
          first: 'John',
          last: 'Doe',
          ...additionalFields
        };

        (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
          switch (param) {
            case 'action': return 'create';
            case 'resource': return 'patient';
            case 'firstName': return 'John';
            case 'lastName': return 'Doe';
            case 'additionalFields': return additionalFields;
            case 'placeOfBirth': return {};
            case 'communicationPreferences': return {};
            case 'customAttributes': return {};
            default: return undefined;
          }
        });

        mockSembleApiRequest.mockResolvedValue({
          createPatient: {
            data: { id: 'test-id', ...expectedPatientData },
            error: null
          }
        });

        const result = await sembleNode.execute.call(mockContext);

        expect(mockSembleApiRequest).toHaveBeenCalledWith(
          expect.stringContaining('mutation CreatePatient'),
          { patientData: expectedPatientData },
          3,
          false
        );
        expect(result[0]).toHaveLength(1);
      });

      it('should validate phone type enum values', async () => {
        const validPhoneTypes = ['Mobile', 'Office', 'Home', 'Fax', 'Other'];
        
        for (const phoneType of validPhoneTypes) {
          const additionalFields = {
            phoneType,
            phoneNumber: '+1-555-123-4567'
          };

          (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
            switch (param) {
              case 'action': return 'create';
              case 'resource': return 'patient';
              case 'firstName': return 'John';
              case 'lastName': return 'Doe';
              case 'additionalFields': return additionalFields;
              case 'placeOfBirth': return {};
              case 'communicationPreferences': return {};
              case 'customAttributes': return {};
              default: return undefined;
            }
          });

          mockSembleApiRequest.mockResolvedValue({
            createPatient: {
              data: { id: 'test-id', first: 'John', last: 'Doe' },
              error: null
            }
          });

          const result = await sembleNode.execute.call(mockContext);
          expect(result[0]).toHaveLength(1);
          
          // Reset mock for next iteration
          jest.clearAllMocks();
        }
      });
    });

    describe('Patient Creation with Place of Birth', () => {
      it('should include placeOfBirth when provided', async () => {
        const placeOfBirth = {
          name: 'New York',
          code: 'NY'
        };

        (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
          switch (param) {
            case 'action': return 'create';
            case 'resource': return 'patient';
            case 'firstName': return 'John';
            case 'lastName': return 'Doe';
            case 'additionalFields': return {};
            case 'placeOfBirth': return placeOfBirth;
            case 'communicationPreferences': return {};
            case 'customAttributes': return {};
            default: return undefined;
          }
        });

        mockSembleApiRequest.mockResolvedValue({
          createPatient: {
            data: { id: 'test-id', first: 'John', last: 'Doe' },
            error: null
          }
        });

        await sembleNode.execute.call(mockContext);

        expect(mockSembleApiRequest).toHaveBeenCalledWith(
          expect.stringContaining('mutation CreatePatient'),
          {
            patientData: {
              first: 'John',
              last: 'Doe',
              placeOfBirth
            }
          },
          3,
          false
        );
      });

      it('should not include placeOfBirth when empty', async () => {
        (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
          switch (param) {
            case 'action': return 'create';
            case 'resource': return 'patient';
            case 'firstName': return 'John';
            case 'lastName': return 'Doe';
            case 'additionalFields': return {};
            case 'placeOfBirth': return {};
            case 'communicationPreferences': return {};
            case 'customAttributes': return {};
            default: return undefined;
          }
        });

        mockSembleApiRequest.mockResolvedValue({
          createPatient: {
            data: { id: 'test-id', first: 'John', last: 'Doe' },
            error: null
          }
        });

        await sembleNode.execute.call(mockContext);

        expect(mockSembleApiRequest).toHaveBeenCalledWith(
          expect.stringContaining('mutation CreatePatient'),
          {
            patientData: {
              first: 'John',
              last: 'Doe'
            }
          },
          3,
          false
        );
      });
    });

    describe('Patient Creation with Communication Preferences', () => {
      it('should include communicationPreferences when provided', async () => {
        const communicationPreferences = {
          receiveEmail: true,
          receiveSMS: false,
          promotionalMarketing: false,
          paymentReminders: true,
          privacyPolicy: 'accepted'
        };

        (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
          switch (param) {
            case 'action': return 'create';
            case 'resource': return 'patient';
            case 'firstName': return 'John';
            case 'lastName': return 'Doe';
            case 'additionalFields': return {};
            case 'placeOfBirth': return {};
            case 'communicationPreferences': return communicationPreferences;
            case 'customAttributes': return {};
            default: return undefined;
          }
        });

        mockSembleApiRequest.mockResolvedValue({
          createPatient: {
            data: { id: 'test-id', first: 'John', last: 'Doe' },
            error: null
          }
        });

        await sembleNode.execute.call(mockContext);

        expect(mockSembleApiRequest).toHaveBeenCalledWith(
          expect.stringContaining('mutation CreatePatient'),
          {
            patientData: {
              first: 'John',
              last: 'Doe',
              communicationPreferences
            }
          },
          3,
          false
        );
      });

      it('should not include communicationPreferences when empty', async () => {
        (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
          switch (param) {
            case 'action': return 'create';
            case 'resource': return 'patient';
            case 'firstName': return 'John';
            case 'lastName': return 'Doe';
            case 'additionalFields': return {};
            case 'placeOfBirth': return {};
            case 'communicationPreferences': return {};
            case 'customAttributes': return {};
            default: return undefined;
          }
        });

        mockSembleApiRequest.mockResolvedValue({
          createPatient: {
            data: { id: 'test-id', first: 'John', last: 'Doe' },
            error: null
          }
        });

        await sembleNode.execute.call(mockContext);

        expect(mockSembleApiRequest).toHaveBeenCalledWith(
          expect.stringContaining('mutation CreatePatient'),
          {
            patientData: {
              first: 'John',
              last: 'Doe'
            }
          },
          3,
          false
        );
      });
    });

    describe('Patient Creation with Custom Attributes', () => {
      it('should include customAttributes when provided', async () => {
        const customAttributesData = {
          customAttribute: [
            {
              title: 'Emergency Contact',
              text: 'Emergency contact information',
              response: 'Jane Doe - 555-0123'
            },
            {
              title: 'Medical Alerts',
              text: 'Any allergies or medical conditions?',
              response: 'Allergic to penicillin'
            }
          ]
        };

        const expectedCustomAttributes = [
          {
            title: 'Emergency Contact',
            text: 'Emergency contact information',
            response: 'Jane Doe - 555-0123'
          },
          {
            title: 'Medical Alerts',
            text: 'Any allergies or medical conditions?',
            response: 'Allergic to penicillin'
          }
        ];

        (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
          switch (param) {
            case 'action': return 'create';
            case 'resource': return 'patient';
            case 'firstName': return 'John';
            case 'lastName': return 'Doe';
            case 'additionalFields': return {};
            case 'placeOfBirth': return {};
            case 'communicationPreferences': return {};
            case 'customAttributes': return customAttributesData;
            default: return undefined;
          }
        });

        mockSembleApiRequest.mockResolvedValue({
          createPatient: {
            data: { id: 'test-id', first: 'John', last: 'Doe' },
            error: null
          }
        });

        await sembleNode.execute.call(mockContext);

        expect(mockSembleApiRequest).toHaveBeenCalledWith(
          expect.stringContaining('mutation CreatePatient'),
          {
            patientData: {
              first: 'John',
              last: 'Doe',
              customAttributes: expectedCustomAttributes
            }
          },
          3,
          false
        );
      });

      it('should not include customAttributes when empty', async () => {
        (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
          switch (param) {
            case 'action': return 'create';
            case 'resource': return 'patient';
            case 'firstName': return 'John';
            case 'lastName': return 'Doe';
            case 'additionalFields': return {};
            case 'placeOfBirth': return {};
            case 'communicationPreferences': return {};
            case 'customAttributes': return {};
            default: return undefined;
          }
        });

        mockSembleApiRequest.mockResolvedValue({
          createPatient: {
            data: { id: 'test-id', first: 'John', last: 'Doe' },
            error: null
          }
        });

        await sembleNode.execute.call(mockContext);

        expect(mockSembleApiRequest).toHaveBeenCalledWith(
          expect.stringContaining('mutation CreatePatient'),
          {
            patientData: {
              first: 'John',
              last: 'Doe'
            }
          },
          3,
          false
        );
      });
    });

    describe('Comprehensive Patient Creation', () => {
      it('should create patient with all fields populated', async () => {
        const additionalFields = {
          title: 'Dr',
          email: 'john.comprehensive@example.com',
          dob: '1980-12-25',
          gender: 'Male',
          sex: 'Male',
          address: '789 Complete Test Street',
          city: 'Complete City',
          postcode: '12345',
          country: 'GB',
          phoneType: 'Mobile',
          phoneNumber: '1234567890',
          paymentReference: 'PAY-COMPLETE-001',
          comments: 'Complete test patient with all available fields'
        };

        const placeOfBirth = {
          name: 'Complete Hospital',
          code: 'CH001'
        };

        const communicationPreferences = {
          receiveEmail: true,
          receiveSMS: true,
          promotionalMarketing: false,
          paymentReminders: true,
          privacyPolicy: 'accepted'
        };

        const customAttributesData = {
          customAttribute: [
            {
              title: 'Test Attribute',
              text: 'Test attribute description',
              response: 'Test response value'
            }
          ]
        };

        (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
          switch (param) {
            case 'action': return 'create';
            case 'resource': return 'patient';
            case 'firstName': return 'John';
            case 'lastName': return 'Comprehensive';
            case 'additionalFields': return additionalFields;
            case 'placeOfBirth': return placeOfBirth;
            case 'communicationPreferences': return communicationPreferences;
            case 'customAttributes': return customAttributesData;
            default: return undefined;
          }
        });

        mockSembleApiRequest.mockResolvedValue({
          createPatient: {
            data: { id: 'comprehensive-test-id', first: 'John', last: 'Comprehensive' },
            error: null
          }
        });

        await sembleNode.execute.call(mockContext);

        expect(mockSembleApiRequest).toHaveBeenCalledWith(
          expect.stringContaining('mutation CreatePatient'),
          {
            patientData: {
              first: 'John',
              last: 'Comprehensive',
              ...additionalFields,
              placeOfBirth,
              communicationPreferences,
              customAttributes: [
                {
                  title: 'Test Attribute',
                  text: 'Test attribute description',
                  response: 'Test response value'
                }
              ]
            }
          },
          3,
          false
        );
      });
    });

    describe('Patient Creation Error Handling', () => {
      it('should handle API errors gracefully', async () => {
        (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
          switch (param) {
            case 'action': return 'create';
            case 'resource': return 'patient';
            case 'firstName': return 'John';
            case 'lastName': return 'Doe';
            case 'additionalFields': return {};
            case 'placeOfBirth': return {};
            case 'communicationPreferences': return {};
            case 'customAttributes': return {};
            default: return undefined;
          }
        });

        mockSembleApiRequest.mockRejectedValue(new Error('Network error'));

        await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeApiError);
        await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
          'Failed to create patient'
        );
      });

      it('should handle Semble API mutation errors', async () => {
        (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
          switch (param) {
            case 'action': return 'create';
            case 'resource': return 'patient';
            case 'firstName': return 'John';
            case 'lastName': return 'Doe';
            case 'additionalFields': return {};
            case 'placeOfBirth': return {};
            case 'communicationPreferences': return {};
            case 'customAttributes': return {};
            default: return undefined;
          }
        });

        mockSembleApiRequest.mockResolvedValue({
          createPatient: {
            data: null,
            error: 'Validation failed: email already exists'
          }
        });

        await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeApiError);
        await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
          'Failed to create patient: Validation failed: email already exists'
        );
      });

      it('should continue on fail when configured', async () => {
        (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
          switch (param) {
            case 'action': return 'create';
            case 'resource': return 'patient';
            case 'firstName': return 'John';
            case 'lastName': return 'Doe';
            case 'additionalFields': return {};
            case 'placeOfBirth': return {};
            case 'communicationPreferences': return {};
            case 'customAttributes': return {};
            default: return undefined;
          }
        });

        mockContext.continueOnFail.mockReturnValue(true);
        mockSembleApiRequest.mockRejectedValue(new Error('API Error'));

        const result = await sembleNode.execute.call(mockContext);

        expect(result[0]).toHaveLength(1);
        expect(result[0][0].json).toHaveProperty('error');
        expect(result[0][0].json.error).toContain('Failed to create patient');
      });
    });
  });
});
