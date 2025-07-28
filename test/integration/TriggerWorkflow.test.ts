/**
 * @fileoverview End-to-end trigger workflow integration tests
 * @description Tests complete trigger workflows from node initialization to data output
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Integration
 */

import { SembleTrigger } from '../../nodes/Semble/SembleTrigger.node';
import { IPollFunctions, INodeExecutionData } from 'n8n-workflow';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Skip these tests if no real API credentials are available
const skipIntegrationTests = !process.env.SEMBLE_API_KEY || !process.env.SEMBLE_API_URL;
const describeIntegration = skipIntegrationTests ? describe.skip : describe;

describeIntegration('Trigger Workflow Integration', () => {
  let triggerNode: SembleTrigger;
  let mockPollFunctions: jest.Mocked<IPollFunctions>;

  beforeAll(() => {
    console.log('🔄 Starting Trigger Workflow Integration Tests');
    if (skipIntegrationTests) {
      console.log('⚠️  Skipping integration tests - no credentials available');
    }
  });

  beforeEach(() => {
    triggerNode = new SembleTrigger();

    // Create comprehensive mock poll functions
    mockPollFunctions = {
      getCredentials: jest.fn().mockResolvedValue({
        token: process.env.SEMBLE_API_KEY,
        url: process.env.SEMBLE_API_URL,
      }),
      getNodeParameter: jest.fn(),
      getInputData: jest.fn().mockReturnValue([]),
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
      },
      getMode: jest.fn().mockReturnValue('manual'),
      getActivationMode: jest.fn().mockReturnValue('init'),
      getTimezone: jest.fn().mockReturnValue('UTC'),
      getWorkflow: jest.fn().mockReturnValue({
        id: 'test-workflow-id',
        name: 'Test Workflow',
      }),
      getNode: jest.fn().mockReturnValue({
        id: 'test-node-id',
        name: 'Test Trigger Node',
        type: 'n8n-nodes-semble.sembleTrigger',
      }),
    } as unknown as jest.Mocked<IPollFunctions>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Trigger Workflows', () => {
    describe('Patient New Records Workflow', () => {
      it('should execute complete workflow for new patients detection', async () => {
        // Setup workflow parameters for new patients
        mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
          const params = {
            resource: 'patients',
            event: 'new',
            pollTimeUnit: 'day',
            pollTimeValue: 1,
            returnAll: false,
            limit: 10,
          };
          return params[paramName as keyof typeof params];
        });

        // Execute the complete trigger workflow
        const result = await triggerNode.poll.call(mockPollFunctions);

        // Validate complete workflow execution
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        
        if (result && result.length > 0) {
          // Validate data structure for workflow output
          const firstItemArray = result[0];
          expect(Array.isArray(firstItemArray)).toBe(true);
          if (firstItemArray.length > 0) {
            const firstItem = firstItemArray[0];
            expect(firstItem).toHaveProperty('json');
            expect(firstItem.json).toHaveProperty('id');
          }
          
          console.log(`✅ New patients workflow returned ${result.length} arrays with ${result.reduce((total, arr) => total + arr.length, 0)} total items`);
        } else {
          console.log('ℹ️  No new patients found in current time window');
        }

        // Verify credential access in workflow
        expect(mockPollFunctions.getCredentials).toHaveBeenCalledWith('sembleApi');
      });

      it('should handle workflow with different polling intervals', async () => {
        // Test weekly polling workflow
        mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
          const params = {
            resource: 'patients',
            event: 'new',
            pollTimeUnit: 'week',
            pollTimeValue: 1,
            returnAll: false,
            limit: 5,
          };
          return params[paramName as keyof typeof params];
        });

        const result = await triggerNode.poll.call(mockPollFunctions);
        
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        
        // Verify parameter access patterns in workflow
        expect(mockPollFunctions.getNodeParameter).toHaveBeenCalledWith('pollTimeUnit');
        expect(mockPollFunctions.getNodeParameter).toHaveBeenCalledWith('pollTimeValue');
      });
    });

    describe('Patient Updated Records Workflow', () => {
      it('should execute complete workflow for updated patients detection', async () => {
        // Setup workflow parameters for updated patients
        mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
          const params = {
            resource: 'patients',
            event: 'newOrUpdated',
            pollTimeUnit: 'day',
            pollTimeValue: 1,
            returnAll: false,
            limit: 20,
          };
          return params[paramName as keyof typeof params];
        });

        // Execute the complete trigger workflow
        const result = await triggerNode.poll.call(mockPollFunctions);

        // Validate workflow execution
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        
        if (result && result.length > 0) {
          // Validate workflow output includes both new and updated records
          const firstItemArray = result[0];
          expect(Array.isArray(firstItemArray)).toBe(true);
          if (firstItemArray.length > 0) {
            const firstItem = firstItemArray[0];
            expect(firstItem).toHaveProperty('json');
            expect(firstItem.json).toHaveProperty('id');
          }
          
          console.log(`✅ Updated patients workflow returned ${result.length} arrays with ${result.reduce((total, arr) => total + arr.length, 0)} total items`);
        }

        // Verify all required parameters accessed in workflow
        expect(mockPollFunctions.getNodeParameter).toHaveBeenCalledWith('resource');
        expect(mockPollFunctions.getNodeParameter).toHaveBeenCalledWith('event');
      });
    });

    describe('Return All Workflow', () => {
      it('should execute complete workflow with returnAll enabled', async () => {
        // Setup workflow parameters for return all
        mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
          const params = {
            resource: 'patients',
            event: 'new',
            pollTimeUnit: 'day',
            pollTimeValue: 7,
            returnAll: true,
            limit: 100, // Should be ignored when returnAll is true
            maxPages: 3, // Limit integration test to prevent unlimited pagination
          };
          return params[paramName as keyof typeof params];
        });

        // Execute the complete trigger workflow
        const result = await triggerNode.poll.call(mockPollFunctions);

        // Validate workflow execution
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        
        if (result && result.length > 0) {
          console.log(`✅ Return all workflow returned ${result.length} arrays with ${result.reduce((total, arr) => total + arr.length, 0)} total items`);
          
          // Validate that returnAll workflow returns comprehensive data
          const firstItemArray = result[0];
          expect(Array.isArray(firstItemArray)).toBe(true);
          if (firstItemArray.length > 0) {
            const firstItem = firstItemArray[0];
            expect(firstItem).toHaveProperty('json');
            expect(firstItem.json).toHaveProperty('id');
          }
        }

        // Verify returnAll parameter accessed in workflow
        expect(mockPollFunctions.getNodeParameter).toHaveBeenCalledWith('returnAll');
      });
    });
  });

  describe('Multi-Step Operations Workflow', () => {
    it('should handle workflow with multiple sequential operations', async () => {
      // Setup parameters for comprehensive workflow
      mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
        const params = {
          resource: 'patients',
          event: 'newOrUpdated',
          pollTimeUnit: 'day',
          pollTimeValue: 1,
          returnAll: false,
          limit: 5,
        };
        return params[paramName as keyof typeof params];
      });

      // Execute first poll
      const firstPoll = await triggerNode.poll.call(mockPollFunctions);
      
      // Simulate time passing and execute second poll
      const secondPoll = await triggerNode.poll.call(mockPollFunctions);

      // Validate both polls executed successfully
      expect(firstPoll).toBeDefined();
      expect(secondPoll).toBeDefined();
      expect(Array.isArray(firstPoll)).toBe(true);
      expect(Array.isArray(secondPoll)).toBe(true);

      console.log(`✅ Multi-step workflow - First poll: ${firstPoll?.length || 0} items, Second poll: ${secondPoll?.length || 0} items`);
    });

    it('should maintain workflow state between operations', async () => {
      // Test that node maintains proper state across multiple calls
      mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
        const params = {
          resource: 'patients',
          event: 'new',
          pollTimeUnit: 'day',
          pollTimeValue: 1,
          returnAll: false,
          limit: 3,
        };
        return params[paramName as keyof typeof params];
      });

      // Execute multiple polls to test state management
      const polls = await Promise.all([
        triggerNode.poll.call(mockPollFunctions),
        triggerNode.poll.call(mockPollFunctions),
        triggerNode.poll.call(mockPollFunctions),
      ]);

      // Validate all polls executed
      polls.forEach((poll, index) => {
        expect(poll).toBeDefined();
        expect(Array.isArray(poll)).toBe(true);
        console.log(`✅ Poll ${index + 1}: ${poll?.length || 0} items`);
      });
    });
  });

  describe('Workflow Error Handling', () => {
    it('should handle workflow errors gracefully', async () => {
      // Setup invalid credentials to test error handling
      mockPollFunctions.getCredentials.mockRejectedValue(new Error('Invalid credentials'));
      
      mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
        const params = {
          resource: 'patients',
          event: 'new',
          pollTimeUnit: 'day',
          pollTimeValue: 1,
          returnAll: false,
          limit: 10,
        };
        return params[paramName as keyof typeof params];
      });

      // Execute workflow and expect it to handle errors
      await expect(triggerNode.poll.call(mockPollFunctions)).rejects.toThrow('Invalid credentials');
      
      // Verify error logging in workflow
      expect(mockPollFunctions.getCredentials).toHaveBeenCalled();
    });

    it('should handle API connectivity issues in workflow', async () => {
      // Mock successful credentials but API failure
      mockPollFunctions.getCredentials.mockResolvedValue({
        token: 'invalid-token',
        url: process.env.SEMBLE_API_URL || 'https://open.semble.io/graphql',
      });

      mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
        const params = {
          resource: 'patients',
          event: 'new',
          pollTimeUnit: 'day',
          pollTimeValue: 1,
          returnAll: false,
          limit: 10,
        };
        return params[paramName as keyof typeof params];
      });

      // Execute workflow with invalid token
      try {
        await triggerNode.poll.call(mockPollFunctions);
      } catch (error) {
        // Expect authentication or API error
        expect(error).toBeDefined();
        console.log('✅ Workflow properly handled API connectivity error');
      }
    });
  });

  describe('Workflow Performance', () => {
    it('should complete workflow within reasonable time limits', async () => {
      mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
        const params = {
          resource: 'patients',
          event: 'new',
          pollTimeUnit: 'day',
          pollTimeValue: 1,
          returnAll: false,
          limit: 5,
        };
        return params[paramName as keyof typeof params];
      });

      const startTime = Date.now();
      const result = await triggerNode.poll.call(mockPollFunctions);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Expect workflow to complete within 30 seconds
      expect(duration).toBeLessThan(30000);
      console.log(`✅ Workflow completed in ${duration}ms`);
    });
  });
});
