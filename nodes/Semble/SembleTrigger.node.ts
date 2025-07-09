/**
 * @fileoverview Semble trigger node implementation for n8n
 * @description This module provides scheduled polling triggers for Semble practice management system
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Triggers
 */

import {
  IPollFunctions,
  IDataObject,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
  NodeConnectionType,
} from "n8n-workflow";

import { 
  sembleApiRequest, 
  sembleApiRequestWithPermissions,
  addPermissionMetaToItem,
  PermissionMetadata 
} from "./GenericFunctions";

/**
 * Resource configuration for triggers
 * @description Defines available resources and their polling queries
 */
const TRIGGER_RESOURCES = {
  booking: {
    displayName: 'Booking',
    value: 'booking',
    description: 'Monitor bookings/appointments for changes (appointments are just a new UI view for the same data)',
    query: `
      query GetBookings($pagination: Pagination, $dateRange: DateRange) {
        bookings(pagination: $pagination, dateRange: $dateRange) {
          data {
            id
            patientId
            start
            end
            createdAt
            updatedAt
            comments
            reference
            deleted
            patient {
              id
            }
            doctor {
              id
            }
          }
          pageInfo {
            page
            pageSize
            hasMore
          }
        }
      }
    `,
    dateField: 'updatedAt'
  }
  // Note: The "Appointment (Beta)" UI in Semble is just a new calendar view
  // for the same underlying bookings data. The API only has 'bookings' resource.
  // Keeping this placeholder for potential future API expansion:
  // 
  // appointment: {
  //   displayName: 'Appointment (Beta)',
  //   value: 'appointment', 
  //   description: 'Monitor appointments (when API support is added)',
  //   query: `...`, // Would use appointments query when available
  //   dateField: 'updatedAt'
  // }

  // Future resources can be added here when available in the API:
  // patient: { displayName: 'Patient', value: 'patient', ... },
  // staff: { displayName: 'Staff', value: 'staff', ... },
  // product: { displayName: 'Product', value: 'product', ... }
};

/**
 * Calculates the start date for the date range based on the selected period
 * @function calculateDateRangeStart
 * @param {string} period - The date period (1d, 1w, 1m, 3m, 6m, 12m)
 * @returns {Date} The calculated start date
 */
function calculateDateRangeStart(period: string): Date {
  const now = new Date();
  
  switch (period) {
    case '1d':
      return new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000)); // 1 day
    case '1w':
      return new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days
    case '1m':
      return new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days
    case '3m':
      return new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days
    case '6m':
      return new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000)); // 180 days
    case '12m':
      return new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000)); // 365 days
    default:
      return new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); // Default to 30 days
  }
}

/**
 * Main Semble trigger node class for n8n
 * @class SembleTrigger
 * @implements {INodeType}
 * @description Provides scheduled polling access to Semble API for monitoring changes
 */
export class SembleTrigger implements INodeType {
  /**
   * Node type description and configuration
   * @type {INodeTypeDescription}
   * @description Defines the trigger node's appearance, properties, and polling behavior
   */
  description: INodeTypeDescription = {
    displayName: "Semble Trigger",
    name: "sembleTrigger",
    icon: "file:semble.svg",
    group: ["trigger"],
    version: 1,
    subtitle: '={{$parameter["event"] + ": " + $parameter["resource"]}}',
    description: "Monitor Semble practice management system for changes",
    defaults: {
      name: "Semble Trigger",
    },
    inputs: [],
    outputs: [NodeConnectionType.Main],
    credentials: [
      {
        name: "sembleApi",
        required: true,
      },
    ],
    polling: true,
    properties: [
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          {
            name: 'Booking',
            value: 'booking',
            description: 'Monitor bookings/appointments for changes (appointments are just a new UI view for bookings)'
          }
          // Future resources can be added here when available in the API:
          // { name: 'Patient', value: 'patient', description: 'Monitor patients for changes' },
          // { name: 'Staff', value: 'staff', description: 'Monitor staff for changes' },
        ],
        default: "booking",
        description: "The resource type to monitor for changes",
      },
      {
        displayName: "Event",
        name: "event",
        type: "options",
        options: [
          {
            name: "New or Updated",
            value: "newOrUpdated",
            description: "Trigger on new items or updates to existing items",
          },
          {
            name: "New Only",
            value: "newOnly", 
            description: "Trigger only on newly created items",
          },
        ],
        default: "newOrUpdated",
        description: "What changes should trigger the workflow",
      },
      {
        displayName: "Created/Updated Date",
        name: "datePeriod",
        type: "options",
        options: [
          {
            name: "1 Day",
            value: "1d",
            description: "Monitor bookings from the last 24 hours",
          },
          {
            name: "1 Week",
            value: "1w", 
            description: "Monitor bookings from the last 7 days",
          },
          {
            name: "1 Month",
            value: "1m",
            description: "Monitor bookings from the last 30 days",
          },
          {
            name: "3 Months",
            value: "3m",
            description: "Monitor bookings from the last 90 days",
          },
          {
            name: "6 Months", 
            value: "6m",
            description: "Monitor bookings from the last 180 days",
          },
          {
            name: "12 Months",
            value: "12m",
            description: "Monitor bookings from the last 365 days",
          },
        ],
        default: "1m",
        description: "Time period to search for bookings. This filters bookings using the Semble API's dateRange parameter for efficient querying.",
      },
      {
        displayName: "Additional Options",
        name: "additionalOptions",
        type: "collection",
        placeholder: "Add Option",
        default: {},
        description: "Optional settings to fine-tune the trigger's polling behavior and performance",
        options: [
          {
            displayName: "Limit",
            name: "limit",
            type: "number",
            default: 50,
            description: "Maximum number of items to fetch per polling cycle. Higher values may impact performance but ensure you don't miss changes in busy practices.",
            typeOptions: {
              minValue: 1,
              maxValue: 1000,
            },
          },
          {
            displayName: "Max Pages to Fetch",
            name: "maxPages",
            type: "number",
            default: 1,
            description: "Maximum number of pages to fetch per polling cycle. Higher values increase data coverage but may impact performance.",
            typeOptions: {
              minValue: 1,
              maxValue: 100,
            },
          },
        ],
      },
      {
        displayName: "Debug Mode",
        name: "debugMode",
        type: "boolean",
        default: false,
        description: "Enable detailed logging for troubleshooting API requests and responses",
        displayOptions: {
          show: {
            "@version": [{ _cnd: { gte: 1 } }],
          },
        },
        routing: {
          send: {
            preSend: [],
          },
        },
        options: [
          {
            name: "Settings",
            value: "settings",
          },
        ],
      },
    ],
  };

  /**
   * Main polling method for the Semble trigger
   * @async
   * @method poll
   * @param {IPollFunctions} this - n8n polling context
   * @returns {Promise<INodeExecutionData[][] | null>} Array of execution data or null if no new data
   * @throws {NodeOperationError} When resource is not supported or parameters are invalid
   * @description Polls Semble API for changes and returns new/updated items
   */
  async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
    const returnData: INodeExecutionData[] = [];
    
    const resource = this.getNodeParameter("resource") as string;
    const event = this.getNodeParameter("event") as string;
    const debugMode = this.getNodeParameter("debugMode", false) as boolean;
    const datePeriod = this.getNodeParameter("datePeriod", "1m") as string;
    const additionalOptions = this.getNodeParameter("additionalOptions", {}) as IDataObject;
    
    const limit = additionalOptions.limit as number || 50;
    const maxPages = additionalOptions.maxPages as number || 1;

    if (debugMode && this.logger) {
      this.logger.info(`[SEMBLE-TRIGGER-DEBUG] Polling ${resource} for ${event} events`);
    }

    // Get resource configuration
    const resourceConfig = TRIGGER_RESOURCES[resource as keyof typeof TRIGGER_RESOURCES];
    if (!resourceConfig) {
      throw new NodeOperationError(this.getNode(), `Resource "${resource}" is not supported`);
    }

    // Get workflow static data for tracking last poll time
    const workflowStaticData = this.getWorkflowStaticData("node");
    const lastPoll = workflowStaticData.lastPoll as string;
    
    // Calculate date range based on the selected period
    const currentTime = new Date();
    const dateRangeStart = calculateDateRangeStart(datePeriod);
    
    if (debugMode && this.logger) {
      this.logger.info(`[SEMBLE-TRIGGER-DEBUG] Using date range: ${dateRangeStart.toISOString()} to ${currentTime.toISOString()}`);
    }
    
    // Calculate the cutoff date for filtering (use lastPoll if available, otherwise use date range start)
    let cutoffDate: string;
    if (lastPoll) {
      cutoffDate = lastPoll;
      if (debugMode && this.logger) {
        this.logger.info(`[SEMBLE-TRIGGER-DEBUG] Last poll: ${lastPoll}`);
      }
    } else {
      // First run - use the date range start as cutoff
      cutoffDate = dateRangeStart.toISOString();
      if (debugMode && this.logger) {
        this.logger.info(`[SEMBLE-TRIGGER-DEBUG] First run, using date range start: ${cutoffDate}`);
      }
    }

    const now = new Date().toISOString();

    try {
      if (debugMode && this.logger) {
        this.logger.info(`[SEMBLE-TRIGGER-DEBUG] Fetching up to ${maxPages} pages with date filtering`);
      }

      // Collect items from multiple pages
      let allItems: any[] = [];
      let totalPermissionMeta = {
        hasPermissionIssues: false,
        missingFields: [] as any[],
        partialData: false,
        timestamp: currentTime.toISOString()
      };

      // Fetch multiple pages
      for (let pageOffset = 0; pageOffset < maxPages; pageOffset++) {
        const currentPage = 1 + pageOffset; // Always start from page 1 since we're using date filtering
        
        // Build query variables with dateRange and pagination
        const variables: IDataObject = {
          dateRange: {
            start: dateRangeStart.toISOString().split('T')[0], // Format as YYYY-MM-DD
            end: currentTime.toISOString().split('T')[0] // Format as YYYY-MM-DD
          },
          pagination: {
            page: currentPage,
            pageSize: limit
          }
        };

        if (debugMode && this.logger) {
          this.logger.info(`[SEMBLE-TRIGGER-DEBUG] Fetching page ${currentPage} with variables:`, variables);
        }

        // Execute the query with permission handling
        const { data: responseData, permissionMeta } = await sembleApiRequestWithPermissions.call(
          this,
          resourceConfig.query,
          variables,
          3,
          debugMode
        );

        // Merge permission metadata
        if (permissionMeta.hasPermissionIssues) {
          totalPermissionMeta.hasPermissionIssues = true;
          totalPermissionMeta.partialData = totalPermissionMeta.partialData || permissionMeta.partialData;
          // Merge missing fields (avoid duplicates)
          permissionMeta.missingFields.forEach(field => {
            if (!totalPermissionMeta.missingFields.find(f => f.fieldName === field.fieldName)) {
              totalPermissionMeta.missingFields.push(field);
            }
          });
        }

        // Get items based on resource type
        let pageItems: any[] = [];
        if (resource === 'booking') {
          pageItems = responseData.bookings?.data || [];
        } else if (resource === 'appointment') {
          pageItems = responseData.appointments?.data || [];
        } else {
          // Fallback: try to find data in response
          const dataKeys = Object.keys(responseData || {});
          const dataKey = dataKeys.find(key => key.endsWith('s')); // plural form
          if (dataKey && responseData[dataKey]?.data) {
            pageItems = responseData[dataKey].data;
          }
        }

        if (debugMode && this.logger) {
          this.logger.info(`[SEMBLE-TRIGGER-DEBUG] Page ${currentPage} returned ${pageItems.length} items`);
        }

        allItems = allItems.concat(pageItems);

        // Check if there are more pages available
        const hasMore = resource === 'booking' 
          ? responseData.bookings?.pageInfo?.hasMore 
          : responseData.appointments?.pageInfo?.hasMore;
        
        if (!hasMore && debugMode && this.logger) {
          this.logger.info(`[SEMBLE-TRIGGER-DEBUG] API indicates no more pages after page ${currentPage}, stopping pagination`);
          break;
        }

        // If we got fewer items than pageSize, there might not be more data
        if (pageItems.length < limit && debugMode && this.logger) {
          this.logger.info(`[SEMBLE-TRIGGER-DEBUG] Page ${currentPage} returned fewer items than requested (${pageItems.length} < ${limit}), might be at end`);
        }
      }

      if (debugMode && this.logger) {
        this.logger.info(`[SEMBLE-TRIGGER-DEBUG] Found ${allItems.length} total items from ${maxPages} pages within date range`);
        if (totalPermissionMeta.hasPermissionIssues) {
          this.logger.info(`[SEMBLE-TRIGGER-DEBUG] Permission issues detected:`, {
            missingFields: totalPermissionMeta.missingFields.map(f => f.fieldName),
            partialData: totalPermissionMeta.partialData
          });
        }
      }

      // Filter items based on event type and last poll time
      let filteredItems = allItems;
      
      if (event === "newOnly" && lastPoll) {
        // Only include items created after last poll
        filteredItems = allItems.filter((item: IDataObject) => {
          const createdAt = item.createdAt as string;
          return createdAt && new Date(createdAt) > new Date(cutoffDate);
        });
        
        if (debugMode && this.logger) {
          this.logger.info(`[SEMBLE-TRIGGER-DEBUG] Filtered to ${filteredItems.length} new items only (created after ${cutoffDate})`);
        }
      } else {
        // For "newOrUpdated", use updatedAt field  
        filteredItems = allItems.filter((item: IDataObject) => {
          const updatedAt = item.updatedAt as string;
          return updatedAt && new Date(updatedAt) > new Date(cutoffDate);
        });
        
        if (debugMode && this.logger) {
          this.logger.info(`[SEMBLE-TRIGGER-DEBUG] Filtered to ${filteredItems.length} new or updated items (updated after ${cutoffDate})`);
        }
      }

      // Convert to execution data with permission metadata
      for (let index = 0; index < filteredItems.length; index++) {
        const item = filteredItems[index];
        
        // Add permission metadata to each item (pass the original item index for proper field mapping)
        const originalIndex = allItems.indexOf(item);
        const enhancedItem = addPermissionMetaToItem(item, totalPermissionMeta, originalIndex);
        
        returnData.push({
          json: {
            ...enhancedItem,
            __meta: {
              resource,
              event,
              pollTime: now,
              isNew: lastPoll ? new Date(item.createdAt as string) > new Date(cutoffDate) : true,
              // Include permission summary in metadata
              permissions: {
                hasIssues: totalPermissionMeta.hasPermissionIssues,
                missingFieldCount: totalPermissionMeta.missingFields.length,
                partialData: totalPermissionMeta.partialData
              }
            },
          },
        });
      }

      // Update last poll time
      workflowStaticData.lastPoll = now;

      if (debugMode && this.logger) {
        this.logger.info(`[SEMBLE-TRIGGER-DEBUG] Returning ${returnData.length} items, updated lastPoll to ${now}`);
        if (totalPermissionMeta.hasPermissionIssues) {
          this.logger.info(`[SEMBLE-TRIGGER-DEBUG] Items include permission metadata for ${totalPermissionMeta.missingFields.length} missing fields`);
        }
      }

      // Return data only if we have new items
      return returnData.length > 0 ? [returnData] : null;

    } catch (error) {
      if (debugMode && this.logger) {
        this.logger.error(`[SEMBLE-TRIGGER-DEBUG] Polling failed: ${(error as Error).message}`);
      }
      throw error;
    }
  }
}

// Export for n8n
export default SembleTrigger;
