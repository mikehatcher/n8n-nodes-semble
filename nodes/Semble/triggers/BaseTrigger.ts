/**
 * @fileoverview Base trigger functionality for Semble n8n nodes
 * @description This module provides shared trigger logic and utilities for all Semble triggers
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Triggers.Base
 */

import {
  IPollFunctions,
  IDataObject,
  INodeExecutionData,
  NodeOperationError,
} from "n8n-workflow";

import { 
  sembleApiRequestWithPermissions,
  addPermissionMetaToItem,
  PermissionMetadata,
  addExcludedFieldsToItem
} from "../GenericFunctions";

/**
 * Configuration interface for trigger resources
 * @interface TriggerResourceConfig
 */
export interface TriggerResourceConfig {
  displayName: string;
  value: string;
  description: string;
  query: string;
  dateField: string;
}

/**
 * Base configuration for all trigger polling operations
 * @interface BaseTriggerConfig
 */
export interface BaseTriggerConfig {
  resource: string;
  event: string;
  debugMode: boolean;
  datePeriod: string;
  limit: number;
  maxPages: number;
}

/**
 * Result interface for trigger polling operations
 * @interface TriggerPollResult
 */
export interface TriggerPollResult {
  data: INodeExecutionData[];
  hasNewData: boolean;
  pollTime: string;
  filteredCount: number;
  totalCount: number;
}

/**
 * Calculates the start date for the date range based on the selected period
 * @function calculateDateRangeStart
 * @param {string} period - The date period (1d, 1w, 1m, 3m, 6m, 12m)
 * @returns {Date} The calculated start date
 */
export function calculateDateRangeStart(period: string): Date {
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
 * Debugs logging utility for triggers
 * @function debugLog
 * @param {IPollFunctions} context - n8n polling context
 * @param {boolean} debugMode - Whether debug mode is enabled
 * @param {string} message - Debug message
 * @param {any} data - Optional data to log
 */
export function debugLog(
  context: IPollFunctions,
  debugMode: boolean,
  message: string,
  data?: any
): void {
  if (debugMode && context.logger) {
    context.logger.info(`[SEMBLE-TRIGGER-DEBUG] ${message}`, data ? { debugData: data } : undefined);
  }
}

/**
 * Base trigger class providing common polling functionality
 * @class BaseTrigger
 * @description Provides shared polling logic for all Semble triggers
 */
export class BaseTrigger {
  /**
   * Generic polling method for Semble triggers
   * @async
   * @method poll
   * @param {IPollFunctions} context - n8n polling context
   * @param {TriggerResourceConfig} resourceConfig - Resource configuration
   * @param {BaseTriggerConfig} config - Trigger configuration
   * @returns {Promise<TriggerPollResult>} Polling result
   */
  static async poll(
    context: IPollFunctions,
    resourceConfig: TriggerResourceConfig,
    config: BaseTriggerConfig
  ): Promise<TriggerPollResult> {
    const { resource, event, debugMode, datePeriod, limit, maxPages } = config;

    debugLog(context, debugMode, `Polling ${resource} for ${event} events`);

    // Get workflow static data for tracking last poll time
    const workflowStaticData = context.getWorkflowStaticData("node");
    const lastPoll = workflowStaticData.lastPoll as string;
    
    // Calculate date range based on the selected period
    const currentTime = new Date();
    const dateRangeStart = calculateDateRangeStart(datePeriod);
    
    debugLog(context, debugMode, `Using date range: ${dateRangeStart.toISOString()} to ${currentTime.toISOString()}`);
    
    // Calculate the cutoff date for filtering (use lastPoll if available, otherwise use date range start)
    let cutoffDate: string;
    if (lastPoll) {
      cutoffDate = lastPoll;
      debugLog(context, debugMode, `Last poll: ${lastPoll}`);
    } else {
      // First run - use the date range start as cutoff
      cutoffDate = dateRangeStart.toISOString();
      debugLog(context, debugMode, `First run, using date range start: ${cutoffDate}`);
    }

    const now = new Date().toISOString();

    debugLog(context, debugMode, `Fetching up to ${maxPages} pages with date filtering`);

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

      debugLog(context, debugMode, `Fetching page ${currentPage} with variables:`, variables);

      // Execute the query with permission handling
      const { data: responseData, permissionMeta } = await sembleApiRequestWithPermissions.call(
        context,
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
      } else if (resource === 'patient') {
        pageItems = responseData.patients?.data || [];
      } else {
        // Fallback: try to find data in response
        const dataKeys = Object.keys(responseData || {});
        const dataKey = dataKeys.find(key => key.endsWith('s')); // plural form
        if (dataKey && responseData[dataKey]?.data) {
          pageItems = responseData[dataKey].data;
        }
      }

      debugLog(context, debugMode, `Page ${currentPage} returned ${pageItems.length} items`);

      allItems = allItems.concat(pageItems);

      // Check if there are more pages available
      const hasMore = resource === 'booking' 
        ? responseData.bookings?.pageInfo?.hasMore 
        : resource === 'patient'
        ? responseData.patients?.pageInfo?.hasMore
        : responseData.appointments?.pageInfo?.hasMore;
      
      if (!hasMore) {
        debugLog(context, debugMode, `API indicates no more pages after page ${currentPage}, stopping pagination`);
        break;
      }

      // If we got fewer items than pageSize, there might not be more data
      if (pageItems.length < limit) {
        debugLog(context, debugMode, `Page ${currentPage} returned fewer items than requested (${pageItems.length} < ${limit}), might be at end`);
      }
    }

    debugLog(context, debugMode, `Found ${allItems.length} total items from ${maxPages} pages within date range`);
    if (totalPermissionMeta.hasPermissionIssues) {
      debugLog(context, debugMode, `Permission issues detected:`, {
        missingFields: totalPermissionMeta.missingFields.map(f => f.fieldName),
        partialData: totalPermissionMeta.partialData
      });
    }

    // Filter items based on event type and last poll time
    let filteredItems = allItems;
    
    if (event === "newOnly" && lastPoll) {
      // Only include items created after last poll
      filteredItems = allItems.filter((item: IDataObject) => {
        const createdAt = item.createdAt as string;
        return createdAt && new Date(createdAt) > new Date(cutoffDate);
      });
      
      debugLog(context, debugMode, `Filtered to ${filteredItems.length} new items only (created after ${cutoffDate})`);
    } else {
      // For "newOrUpdated", use updatedAt field  
      filteredItems = allItems.filter((item: IDataObject) => {
        const updatedAt = item.updatedAt as string;
        return updatedAt && new Date(updatedAt) > new Date(cutoffDate);
      });
      
      debugLog(context, debugMode, `Filtered to ${filteredItems.length} new or updated items (updated after ${cutoffDate})`);
    }

    // Convert to execution data with permission metadata
    const returnData: INodeExecutionData[] = [];
    for (let index = 0; index < filteredItems.length; index++) {
      const item = filteredItems[index];
      
      // Add permission metadata to each item (pass the original item index for proper field mapping)
      const originalIndex = allItems.indexOf(item);
      const enhancedItem = addPermissionMetaToItem(item, totalPermissionMeta, originalIndex);
      
      // Add excluded fields with explanatory messages
      const itemWithExcludedFields = addExcludedFieldsToItem(enhancedItem, resource);
      
      returnData.push({
        json: {
          ...itemWithExcludedFields,
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

    debugLog(context, debugMode, `Returning ${returnData.length} items, updated lastPoll to ${now}`);
    if (totalPermissionMeta.hasPermissionIssues) {
      debugLog(context, debugMode, `Items include permission metadata for ${totalPermissionMeta.missingFields.length} missing fields`);
    }

    return {
      data: returnData,
      hasNewData: returnData.length > 0,
      pollTime: now,
      filteredCount: filteredItems.length,
      totalCount: allItems.length
    };
  }
}
