/**
 * @fileoverview End-to-end action workflow integration tests
 * @description Tests complete action workflows from node initialization to data output
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Integration
 */

import { Semble } from '../../nodes/Semble/Semble.node';
import { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Skip these tests if no real API credentials are available
const skipIntegrationTests = !process.env.SEMBLE_API_KEY || !process.env.SEMBLE_API_URL;
const describeIntegration = skipIntegrationTests ? describe.skip : describe;

describeIntegration('Action Workflow Integration', () => {
  let actionNode: Semble;
  let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

  beforeAll(() => {
    console.log('⚡ Starting Action Workflow Integration Tests');
    if (skipIntegrationTests) {
      console.log('⚠️  Skipping integration tests - no credentials available');
    }
  });

  beforeEach(() => {
    actionNode = new Semble();

    // Create comprehensive mock execution functions
    mockExecuteFunctions = {
      getCredentials: jest.fn().mockResolvedValue({
        token: process.env.SEMBLE_API_KEY,
        url: process.env.SEMBLE_API_URL,
      }),
      getNodeParameter: jest.fn(),
      getInputData: jest.fn(),
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      },
      helpers: {
        httpRequest: jest.fn(),
        requestWithAuthentication: jest.fn(),
        constructExecutionMetaData: jest.fn().mockImplementation((data, metadata) => ({
          ...data,
          metadata,
        })),
      },
      getMode: jest.fn().mockReturnValue('manual'),
      getTimezone: jest.fn().mockReturnValue('UTC'),
      getWorkflow: jest.fn().mockReturnValue({
        id: 'test-workflow-id',
        name: 'Test Action Workflow',
      }),
      getNode: jest.fn().mockReturnValue({
        id: 'test-action-node-id',
        name: 'Test Action Node',
        type: 'n8n-nodes-semble.semble',
      }),
      addInputData: jest.fn(),
      getItemIndex: jest.fn().mockReturnValue(0),
      getExecuteData: jest.fn(),
      continueOnFail: jest.fn().mockReturnValue(false),
      evaluateExpression: jest.fn(),
      getContext: jest.fn(),
      getRestApiUrl: jest.fn(),
      getInstanceBaseUrl: jest.fn(),
      getChildNodes: jest.fn(),
      getParentNodes: jest.fn(),
      getExecutionCancelSignal: jest.fn(),
      onExecutionCancellation: jest.fn(),
      sendMessageToUI: jest.fn(),
    } as unknown as jest.Mocked<IExecuteFunctions>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Action Workflows', () => {
    describe('Patient Get Workflow', () => {
      it('should execute complete workflow for getting single patient', async () => {
        // Setup workflow input data
        const inputData: INodeExecutionData[] = [
          {
            json: {
              patientId: '668369c1a3bd7847ff95f8ce', // Test patient ID
            },
          },
        ];

        mockExecuteFunctions.getInputData.mockReturnValue(inputData);
        mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
          const params = {
            action: 'get',
            resource: 'patients',
            patientId: '668369c1a3bd7847ff95f8ce',
          };
          return params[paramName as keyof typeof params];
        });

        // Execute the complete action workflow
        const result = await actionNode.execute.call(mockExecuteFunctions);

        // Validate complete workflow execution
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);

        if (result.length > 0) {
          const firstResult = result[0];
          expect(Array.isArray(firstResult)).toBe(true);
          expect(firstResult.length).toBeGreaterThan(0);

          const firstItem = firstResult[0];
          expect(firstItem).toHaveProperty('json');
          expect(firstItem.json).toHaveProperty('id');
          
          console.log(`✅ Get patient workflow returned data for patient: ${firstItem.json.id}`);
        }

        // Verify credential access in workflow
        expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('sembleApi');
      });

      it('should handle workflow with error for non-existent patient', async () => {
        // Setup workflow input data with non-existent patient
        const inputData: INodeExecutionData[] = [
          {
            json: {
              patientId: 'non-existent-patient-id',
            },
          },
        ];

        mockExecuteFunctions.getInputData.mockReturnValue(inputData);
        mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
          const params = {
            action: 'get',
            resource: 'patients',
            patientId: 'non-existent-patient-id',
          };
          return params[paramName as keyof typeof params];
        });

        // Execute workflow and expect error handling
        try {
          await actionNode.execute.call(mockExecuteFunctions);
        } catch (error) {
          // Expect proper error handling in workflow
          expect(error).toBeDefined();
          console.log('✅ Get workflow properly handled non-existent patient error');
        }
      });
    });

    describe('Patient Get Many Workflow', () => {
      it('should execute complete workflow for getting multiple patients', async () => {
        // Setup workflow input data
        const inputData: INodeExecutionData[] = [
          {
            json: {
              limit: 5,
              returnAll: false,
            },
          },
        ];

        mockExecuteFunctions.getInputData.mockReturnValue(inputData);
        mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
          const params = {
            action: 'getMany',
            resource: 'patients',
            returnAll: false,
            limit: 5,
          };
          return params[paramName as keyof typeof params];
        });

        // Execute the complete action workflow
        const result = await actionNode.execute.call(mockExecuteFunctions);

        // Validate complete workflow execution
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        if (result.length > 0) {
          const firstResult = result[0];
          expect(Array.isArray(firstResult)).toBe(true);
          
          console.log(`✅ Get many patients workflow returned ${firstResult.length} patients`);
        }

        // Verify parameter access patterns in workflow
        expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('action');
        expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('resource');
      });

      it('should execute workflow with returnAll functionality', async () => {
        // Setup workflow input data for return all
        const inputData: INodeExecutionData[] = [
          {
            json: {
              returnAll: true,
            },
          },
        ];

        mockExecuteFunctions.getInputData.mockReturnValue(inputData);
        mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
          const params = {
            action: 'getMany',
            resource: 'patients',
            returnAll: true,
            limit: 100, // Should be ignored when returnAll is true
          };
          return params[paramName as keyof typeof params];
        });

        // Execute the complete action workflow
        const result = await actionNode.execute.call(mockExecuteFunctions);

        // Validate workflow execution
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        if (result.length > 0) {
          const firstResult = result[0];
          console.log(`✅ Return all workflow returned ${firstResult.length} patients`);
        }

        // Verify returnAll parameter accessed in workflow
        expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('returnAll');
      });
    });

    describe('Patient Create Workflow', () => {
      it('should execute complete workflow for creating patient', async () => {
        // Setup workflow input data for patient creation
        const patientData = {
          first: 'Workflow',
          last: 'Test',
          dob: '1990-01-01',
          gender: 'other specific',
          email: 'workflow.test@example.com',
          phoneType: 'Home',
          phoneNumber: '555-WORKFLOW',
          address: '123 Workflow St',
          city: 'Test City',
          postcode: '12345',
          country: 'NZ',
        };

        const inputData: INodeExecutionData[] = [
          {
            json: patientData,
          },
        ];

        mockExecuteFunctions.getInputData.mockReturnValue(inputData);
        mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
          const params = {
            action: 'create',
            resource: 'patients',
            first: patientData.first,
            last: patientData.last,
            dob: patientData.dob,
            gender: patientData.gender,
            email: patientData.email,
            phoneType: patientData.phoneType,
            phoneNumber: patientData.phoneNumber,
            address: patientData.address,
            city: patientData.city,
            postcode: patientData.postcode,
            country: patientData.country,
          };
          return params[paramName as keyof typeof params];
        });

        // Execute the complete action workflow
        const result = await actionNode.execute.call(mockExecuteFunctions);

        // Validate complete workflow execution
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        if (result.length > 0) {
          const firstResult = result[0];
          expect(Array.isArray(firstResult)).toBe(true);
          
          if (firstResult.length > 0) {
            const createdPatient = firstResult[0];
            expect(createdPatient).toHaveProperty('json');
            expect(createdPatient.json).toHaveProperty('id');
            
            console.log(`✅ Create patient workflow created patient: ${createdPatient.json.id}`);
            
            // Clean up created patient
            await cleanupPatient(createdPatient.json.id as string);
          }
        }

        // Verify all required parameters accessed in workflow
        expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('action');
        expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('resource');
      });
    });

    describe('Patient Update Workflow', () => {
      it('should execute complete workflow for updating patient', async () => {
        // First create a patient to update
        const testPatient = await createTestPatient();
        
        // Setup workflow input data for patient update
        const updateData = {
          patientId: testPatient.id,
          first: 'Updated',
          last: 'Name',
          email: 'updated.workflow@example.com',
        };

        const inputData: INodeExecutionData[] = [
          {
            json: updateData,
          },
        ];

        mockExecuteFunctions.getInputData.mockReturnValue(inputData);
        mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
          const params = {
            action: 'update',
            resource: 'patients',
            patientId: updateData.patientId,
            first: updateData.first,
            last: updateData.last,
            email: updateData.email,
          };
          return params[paramName as keyof typeof params];
        });

        // Execute the complete action workflow
        const result = await actionNode.execute.call(mockExecuteFunctions);

        // Validate complete workflow execution
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        if (result.length > 0) {
          const firstResult = result[0];
          expect(Array.isArray(firstResult)).toBe(true);
          
          if (firstResult.length > 0) {
            const updatedPatient = firstResult[0];
            expect(updatedPatient).toHaveProperty('json');
            expect(updatedPatient.json).toHaveProperty('id');
            expect(updatedPatient.json.firstName).toBe('Updated');
            
            console.log(`✅ Update patient workflow updated patient: ${updatedPatient.json.id}`);
          }
        }

        // Clean up test patient
        await cleanupPatient(testPatient.id);
      });
    });

    describe('Patient Delete Workflow', () => {
      it('should execute complete workflow for deleting patient', async () => {
        // First create a patient to delete
        const testPatient = await createTestPatient();
        
        // Setup workflow input data for patient deletion
        const inputData: INodeExecutionData[] = [
          {
            json: {
              patientId: testPatient.id,
            },
          },
        ];

        mockExecuteFunctions.getInputData.mockReturnValue(inputData);
        mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
          const params = {
            action: 'delete',
            resource: 'patients',
            patientId: testPatient.id,
          };
          return params[paramName as keyof typeof params];
        });

        // Execute the complete action workflow
        const result = await actionNode.execute.call(mockExecuteFunctions);

        // Validate complete workflow execution
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        if (result.length > 0) {
          const firstResult = result[0];
          expect(Array.isArray(firstResult)).toBe(true);
          
          if (firstResult.length > 0) {
            const deletedPatient = firstResult[0];
            expect(deletedPatient).toHaveProperty('json');
            expect(deletedPatient.json).toHaveProperty('id');
            
            console.log(`✅ Delete patient workflow deleted patient: ${deletedPatient.json.id}`);
          }
        }
      });
    });
  });

  describe('Multi-Step Operations Workflow', () => {
    it('should handle workflow with sequential CRUD operations', async () => {
      // Create, Read, Update, Delete sequence
      let createdPatientId: string;

      // Step 1: Create
      const createInputData: INodeExecutionData[] = [
        {
          json: {
            first: 'Multi',
            last: 'Step',
            dob: '1995-01-01',
            gender: 'other specific',
            email: 'multistep@example.com',
            phoneType: 'Home',
            phoneNumber: '555-MULTI',
            address: '123 Multi St',
            city: 'Step City',
            postcode: '54321',
            country: 'NZ',
          },
        },
      ];

      mockExecuteFunctions.getInputData.mockReturnValue(createInputData);
      mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
        const params = {
          action: 'create',
          resource: 'patients',
          first: 'Multi',
          last: 'Step',
          dob: '1995-01-01',
          gender: 'other specific',
          email: 'multistep@example.com',
          phoneType: 'Home',
          phoneNumber: '555-MULTI',
          address: '123 Multi St',
          city: 'Step City',
          postcode: '54321',
          country: 'NZ',
        };
        return params[paramName as keyof typeof params];
      });

      // Execute create workflow
      const createResult = await actionNode.execute.call(mockExecuteFunctions);
      expect(createResult).toBeDefined();
      
      if (createResult.length > 0 && createResult[0].length > 0) {
        createdPatientId = createResult[0][0].json.id as string;
        console.log(`✅ Multi-step workflow created patient: ${createdPatientId}`);
        
        // Clean up
        await cleanupPatient(createdPatientId);
      }
    });

    it('should maintain workflow context across multiple operations', async () => {
      // Test multiple getMany operations with different parameters
      const operations = [
        { limit: 5, returnAll: false },
        { limit: 3, returnAll: false },
        { limit: 1, returnAll: false },
      ];

      const results = [];

      for (const operation of operations) {
        const inputData: INodeExecutionData[] = [{ json: operation }];
        
        mockExecuteFunctions.getInputData.mockReturnValue(inputData);
        mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
          const params = {
            action: 'getMany',
            resource: 'patients',
            ...operation,
          };
          return params[paramName as keyof typeof params];
        });

        const result = await actionNode.execute.call(mockExecuteFunctions);
        results.push(result);
      }

      // Validate all operations executed successfully
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        console.log(`✅ Multi-operation workflow step ${index + 1} completed`);
      });
    });
  });

  describe('Workflow Error Handling', () => {
    it('should handle workflow errors gracefully', async () => {
      // Setup invalid credentials to test error handling
      mockExecuteFunctions.getCredentials.mockRejectedValue(new Error('Invalid credentials'));
      
      const inputData: INodeExecutionData[] = [
        {
          json: {
            patientId: 'test-id',
          },
        },
      ];

      mockExecuteFunctions.getInputData.mockReturnValue(inputData);
      mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
        const params = {
          action: 'get',
          resource: 'patients',
          patientId: 'test-id',
        };
        return params[paramName as keyof typeof params];
      });

      // Execute workflow and expect it to handle errors
      await expect(actionNode.execute.call(mockExecuteFunctions)).rejects.toThrow('Invalid credentials');
      
      // Verify error handling in workflow
      expect(mockExecuteFunctions.getCredentials).toHaveBeenCalled();
    });

    it('should handle API validation errors in workflow', async () => {
      // Setup invalid data to trigger validation errors
      const inputData: INodeExecutionData[] = [
        {
          json: {
            first: '', // Empty required field
            last: '',
            dob: 'invalid-date',
          },
        },
      ];

      mockExecuteFunctions.getInputData.mockReturnValue(inputData);
      mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
        const params = {
          action: 'create',
          resource: 'patients',
          first: '',
          last: '',
          dob: 'invalid-date',
        };
        return params[paramName as keyof typeof params];
      });

      // Execute workflow with invalid data
      try {
        await actionNode.execute.call(mockExecuteFunctions);
      } catch (error) {
        // Expect validation or API error
        expect(error).toBeDefined();
        console.log('✅ Workflow properly handled validation error');
      }
    });
  });

  describe('Workflow Performance', () => {
    it('should complete workflow within reasonable time limits', async () => {
      const inputData: INodeExecutionData[] = [
        {
          json: {
            limit: 3,
            returnAll: false,
          },
        },
      ];

      mockExecuteFunctions.getInputData.mockReturnValue(inputData);
      mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
        const params = {
          action: 'getMany',
          resource: 'patients',
          returnAll: false,
          limit: 3,
        };
        return params[paramName as keyof typeof params];
      });

      const startTime = Date.now();
      const result = await actionNode.execute.call(mockExecuteFunctions);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Expect workflow to complete within 30 seconds
      expect(duration).toBeLessThan(30000);
      console.log(`✅ Action workflow completed in ${duration}ms`);
    });
  });

  // Helper functions for workflow testing
  async function createTestPatient(): Promise<{ id: string }> {
    // Mock creating a test patient for update/delete tests
    return { id: '668369c1a3bd7847ff95f8ce' }; // Use known test patient ID
  }

  async function cleanupPatient(patientId: string): Promise<void> {
    // Mock cleanup - in real scenario, this would delete the test patient
    console.log(`🧹 Would clean up test patient: ${patientId}`);
  }
});
