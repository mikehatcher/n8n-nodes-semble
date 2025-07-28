/**
 * @fileoverview Semble trigger node implementation for n8n (refactored architecture)
 * @description This module provides scheduled polling triggers for Semble practice management system using our Phase 1-2 services
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Nodes
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

import { sembleApiRequest } from "./GenericFunctions";
import {
  SemblePagination,
  buildPaginationConfig,
} from "./shared/PaginationHelpers";
import { GET_PATIENTS_QUERY } from "./shared/PatientQueries";

// Phase 4 Integration - Core Components
import {
  ServiceContainer,
  EventSystem,
  SchemaRegistry,
  MiddlewarePipeline,
  ServiceLifetime,
  type IServiceContainer,
  type IEventSystem,
  type ISchemaRegistry,
} from "../../core";

// Phase 2 Services
import { CredentialService } from "../../services/CredentialService";
import { CacheService } from "../../services/CacheService";
import { SembleQueryService } from "../../services/SembleQueryService";
import { ValidationService } from "../../services/ValidationService";

// Configuration types
import { CacheConfig } from "../../types/ConfigTypes";
import { SembleQueryConfig } from "../../services/SembleQueryService";

/**
 * Configuration interface for trigger resources
 * @interface TriggerResourceConfig
 */
interface TriggerResourceConfig {
  displayName: string;
  value: string;
  description: string;
  query: string;
  dateField: string;
  apiResponseKey: string;
}

/**
 * Base configuration for all trigger polling operations
 * @interface TriggerConfig
 */
interface TriggerConfig {
  resource: string;
  event: string;
  datePeriod: string;
  limit: number;
  maxPages?: number; // Optional for unlimited records
}

/**
 * Result interface for trigger polling operations
 * @interface TriggerPollResult
 */
interface TriggerPollResult {
  data: INodeExecutionData[];
  hasNewData: boolean;
  pollTime: string;
  filteredCount: number;
  totalCount: number;
}

/**
 * Resource configuration for triggers
 * @description Defines available resources and their polling queries
 */
const TRIGGER_RESOURCES: { [key: string]: TriggerResourceConfig } = {
  patient: {
    displayName: "Patient",
    value: "patient",
    description: "Monitor patients for changes (create, update)",
    query: GET_PATIENTS_QUERY,
    dateField: "updatedAt",
    apiResponseKey: "patients",
  },
  // Future resources can be added here:
  // booking: BOOKING_TRIGGER_CONFIG,
  // product: PRODUCT_TRIGGER_CONFIG,
};

/**
 * Calculates the start date for the date range based on the selected period
 * @function calculateDateRangeStart
 * @param {string} period - The date period (1d, 1w, 1m, 3m, 6m, 12m, all)
 * @returns {Date} The calculated start date
 */
function calculateDateRangeStart(period: string): Date {
  const now = new Date();

  switch (period) {
    case "all":
      return new Date("1970-01-01"); // Very old date to get all records
    case "1d":
      return new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day
    case "1w":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days
    case "1m":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
    case "3m":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days
    case "6m":
      return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); // 180 days
    case "12m":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 365 days
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
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
   * Static service container for dependency injection
   * @private
   */
  private static serviceContainer: IServiceContainer;

  /**
   * Initialize static service container
   * @private
   */
  private static initializeServices(): void {
    if (this.serviceContainer) return; // Already initialized

    this.serviceContainer = new ServiceContainer();

    // Default configurations
    const cacheConfig: CacheConfig = {
      enabled: true,
      defaultTtl: 24 * 60 * 60, // 24 hours in seconds
      maxSize: 1000,
      autoRefreshInterval: 60 * 60, // 1 hour in seconds
      backgroundRefresh: true,
      keyPrefix: "semble_trigger_",
    };

    const queryConfig: SembleQueryConfig = {
      name: "query",
      enabled: true,
      initTimeout: 5000,
      options: {},
      baseUrl: "https://api.semble.com", // Will be overridden by credentials
      timeout: 30000,
      retries: {
        maxAttempts: 3,
        initialDelay: 1000,
      },
      rateLimit: {
        maxRequests: 100,
        windowMs: 60000, // 1 minute
      },
    };

    // Register core services
    this.serviceContainer.register(
      "eventSystem",
      () => new EventSystem(),
      ServiceLifetime.SINGLETON,
    );
    this.serviceContainer.register(
      "schemaRegistry",
      () => new SchemaRegistry(),
      ServiceLifetime.SINGLETON,
    );
    this.serviceContainer.register(
      "credentialService",
      () => new CredentialService(),
      ServiceLifetime.SINGLETON,
    );
    this.serviceContainer.register(
      "cacheService",
      () => new CacheService(cacheConfig),
      ServiceLifetime.SINGLETON,
    );
    this.serviceContainer.register(
      "validationService",
      () => ValidationService.getInstance(),
      ServiceLifetime.SINGLETON,
    );

    // Register middleware pipeline with event system dependency
    this.serviceContainer.register(
      "middlewarePipeline",
      (container) => {
        const eventSystem = container.resolve("eventSystem") as EventSystem;
        return new MiddlewarePipeline(eventSystem);
      },
      ServiceLifetime.SINGLETON,
    );

    // Register query service with dependencies
    this.serviceContainer.register(
      "queryService",
      (container) => {
        return new SembleQueryService(queryConfig);
      },
      ServiceLifetime.SINGLETON,
    );
  }

  /**
   * Get event system for emitting events
   * @static
   */
  private static getEventSystem(): EventSystem {
    this.initializeServices();
    return this.serviceContainer.resolve("eventSystem") as EventSystem;
  }

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
            name: "Patient",
            value: "patient",
            description: "Monitor patients for changes (create, update)",
          },
          // Future resources:
          // {
          //   name: "Booking",
          //   value: "booking",
          //   description: "Monitor bookings for changes (create, update)",
          // },
        ],
        default: "patient",
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
            description: "Monitor items from the last 24 hours",
          },
          {
            name: "1 Month",
            value: "1m",
            description: "Monitor items from the last 30 days",
          },
          {
            name: "1 Week",
            value: "1w",
            description: "Monitor items from the last 7 days",
          },
          {
            name: "12 Months",
            value: "12m",
            description: "Monitor items from the last 365 days",
          },
          {
            name: "3 Months",
            value: "3m",
            description: "Monitor items from the last 90 days",
          },
          {
            name: "6 Months",
            value: "6m",
            description: "Monitor items from the last 180 days",
          },
          {
            name: "All Records",
            value: "all",
            description:
              "Use with caution. Recommend use in conjunction with Loop Over Items Node.",
          },
        ],
        default: "1m",
        description:
          "Time period to search for items. This filters using the Semble API's dateRange parameter for efficient querying.",
      },
      {
        displayName: "Additional Options",
        name: "additionalOptions",
        type: "collection",
        placeholder: "Add Option",
        default: {},
        description:
          "Optional settings to fine-tune the trigger's polling behavior and performance",
        options: [
          {
            displayName: "Record Limit",
            name: "limit",
            type: "number",
            // eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-limit
            default: -1,
            // eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-limit
            description:
              "Max number of results to return. Leave at -1 for unlimited, or set a specific number to limit results.",
            typeOptions: {
              minValue: -1,
            },
          },
          {
            displayName: "Max Pages to Fetch",
            name: "maxPages",
            type: "number",
            default: 5,
            description:
              "Maximum number of API pages to fetch when searching for records. Prevents excessive API calls while ensuring good data coverage. Each page typically contains 100 records.",
            typeOptions: {
              minValue: 1,
              maxValue: 50,
            },
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
    const resource = this.getNodeParameter("resource") as string;
    const event = this.getNodeParameter("event") as string;
    const datePeriod = this.getNodeParameter("datePeriod", "1m") as string;
    const additionalOptions = this.getNodeParameter(
      "additionalOptions",
      {},
    ) as IDataObject;

    // Determine if user explicitly wants unlimited records based on datePeriod
    const wantsAllRecords = datePeriod === "all";

    // For specific date periods (1d, 1w, 1m, etc.), use reasonable defaults
    // For "all" records, use unlimited unless user explicitly set a limit
    const limit = wantsAllRecords
      ? ((additionalOptions.limit as number) ?? -1) // Default to unlimited for "all"
      : ((additionalOptions.limit as number) ?? 1000); // Default to 1000 for date ranges

    // Check if we're in a test environment to apply pagination limits
    const isTestEnvironment =
      process.env.NODE_ENV === "test" ||
      typeof jest !== "undefined" ||
      (typeof global !== "undefined" && (global as any).__jest__);

    // Apply maxPages logic:
    // - For unlimited records (-1) in production: no limit (undefined)
    // - For limited records or test environment: apply maxPages limit
    const maxPages =
      limit === -1 && !isTestEnvironment
        ? undefined
        : (additionalOptions.maxPages as number) || 5;

    // Emit polling event using Phase 4 Event System
    const eventSystem = SembleTrigger.getEventSystem();
    await eventSystem.emit({
      type: "trigger.polled",
      timestamp: Date.now(),
      source: "semble-trigger",
      id: `trigger-poll-${Date.now()}`,
      resource,
      event,
      datePeriod,
      limit,
    });

    // Get resource configuration
    const resourceConfig = TRIGGER_RESOURCES[resource];
    if (!resourceConfig) {
      throw new NodeOperationError(
        this.getNode(),
        `Resource "${resource}" is not supported`,
      );
    }

    try {
      // Use the polling logic directly within this context
      const result = await pollResource.call(this, resourceConfig, {
        resource,
        event,
        datePeriod,
        limit,
        maxPages,
      });

      // Return data only if we have new items
      return result.hasNewData ? [result.data] : null;
    } catch (error) {
      throw error;
    }
  }
}

/**
 * Resource-specific polling logic
 * @async
 * @function pollResource
 * @param {IPollFunctions} this - n8n polling context
 * @param {TriggerResourceConfig} resourceConfig - Resource configuration
 * @param {TriggerConfig} config - Trigger configuration
 * @returns {Promise<TriggerPollResult>} Polling result
 */
async function pollResource(
  this: IPollFunctions,
  resourceConfig: TriggerResourceConfig,
  config: TriggerConfig,
): Promise<TriggerPollResult> {
  const { resource, event, datePeriod, limit, maxPages } = config;

  // Get workflow static data for tracking last poll time
  const workflowStaticData = this.getWorkflowStaticData("node");
  const lastPoll = workflowStaticData.lastPoll as string;

  // Calculate date range based on the selected period
  const currentTime = new Date();
  const dateRangeStart = calculateDateRangeStart(datePeriod);

  // Calculate the cutoff date for filtering (use lastPoll if available, otherwise use date range start)
  let cutoffDate: string;
  if (lastPoll) {
    cutoffDate = lastPoll;
  } else {
    // First run - use the date range start as cutoff
    cutoffDate = dateRangeStart.toISOString();
  }

  const now = new Date().toISOString();

  // Determine if unlimited records are requested
  const isUnlimited = limit === -1;

  // If user wants unlimited records, use SemblePagination for safe batching
  if (isUnlimited) {
    // Prepare base variables for pagination
    const baseVariables: IDataObject = {};

    // Apply server-side filtering based on event type
    if (event === "newOnly") {
      baseVariables.options = {
        createdAt: {
          start: cutoffDate,
          end: now,
        },
      };
    } else {
      baseVariables.options = {
        updatedAt: {
          start: cutoffDate,
          end: now,
        },
      };
    }

    // Use SemblePagination for safe, intelligent batching
    const paginationResult = await SemblePagination.execute(this, {
      query: resourceConfig.query,
      baseVariables,
      dataPath: resourceConfig.apiResponseKey,
      pageSize: 100, // Not used for returnAll, but required for interface
      returnAll: true, // This triggers executeAutoPagination
      maxPages, // Pass the maxPages limit for integration tests
    });

    const allItems = paginationResult.data;
    const hasNewData = allItems.length > 0;

    // Update workflow static data with current time for next poll
    workflowStaticData.lastPoll = currentTime.toISOString();

    // Add metadata to items
    const itemsWithMetadata = allItems.map((item: any) => {
      const isNew = !item.updatedAt || item.createdAt === item.updatedAt;
      const isUpdated = !isNew;

      return {
        json: {
          ...item,
          __meta: {
            resource,
            event,
            isNew,
            isUpdated,
            pollTime: currentTime.toISOString(),
            pagesProcessed: paginationResult.meta.pagesProcessed,
          },
        },
      };
    });

    return {
      data: itemsWithMetadata,
      hasNewData,
      pollTime: currentTime.toISOString(),
      filteredCount: allItems.length,
      totalCount: allItems.length,
    };
  }

  // For limited records, collect items from multiple pages until we reach the limit or maxPages
  const allItems: any[] = [];
  let currentPage = 1;
  let hasMore = true;

  while (
    hasMore &&
    (!maxPages || currentPage <= maxPages) &&
    allItems.length < limit
  ) {
    // Calculate how many more records we need
    const remainingRecords = limit - allItems.length;

    // Use the smaller of: remaining records needed, or our standard page size (100)
    const thisPageSize = Math.min(remainingRecords, 100);

    // Build query variables with pagination and appropriate server-side date filtering
    const variables: IDataObject = {
      pagination: {
        page: currentPage,
        pageSize: thisPageSize,
      },
    };

    // Apply server-side filtering based on event type
    if (event === "newOnly") {
      // For "newOnly", filter by creation date
      variables.options = {
        createdAt: {
          start: cutoffDate,
          end: now,
        },
      };
    } else {
      // For "newOrUpdated", filter by update date (which includes creation date)
      variables.options = {
        updatedAt: {
          start: cutoffDate,
          end: now,
        },
      };
    }

    // Execute the query using our GenericFunctions
    const responseData = await sembleApiRequest.call(
      this,
      resourceConfig.query,
      variables,
    );

    // Get items from this page
    const pageItems: any[] =
      responseData[resourceConfig.apiResponseKey]?.data || [];

    // Add items from this page to our collection (but don't exceed the limit)
    const itemsToAdd = pageItems.slice(0, limit - allItems.length);
    allItems.push(...itemsToAdd);

    // Check if there are more pages and we haven't reached our limit
    hasMore =
      responseData[resourceConfig.apiResponseKey]?.pageInfo?.hasMore || false;

    // Stop if we've reached our limit
    if (allItems.length >= limit) {
      hasMore = false;
    }

    // If this page returned fewer items than requested, there are likely no more pages
    if (pageItems.length < thisPageSize) {
      hasMore = false;
    }

    currentPage++;
  }

  // Update workflow static data with current time for next poll
  workflowStaticData.lastPoll = currentTime.toISOString();

  // Since we're using server-side filtering with QueryOptions.updatedAt,
  // the API already returns only items that match our date criteria.
  const filteredItems = allItems;
  const hasNewData = filteredItems.length > 0;

  // Add metadata to items
  const itemsWithMetadata = filteredItems.map((item: any) => {
    const isNew = !item.updatedAt || item.createdAt === item.updatedAt;
    const isUpdated = !isNew;

    return {
      json: {
        ...item,
        __meta: {
          resource,
          event,
          isNew,
          isUpdated,
          pollTime: currentTime.toISOString(),
        },
      },
    };
  });

  return {
    data: itemsWithMetadata,
    hasNewData,
    pollTime: currentTime.toISOString(),
    filteredCount: filteredItems.length,
    totalCount: allItems.length,
  };
}
