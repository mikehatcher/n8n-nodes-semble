/**
 * @fileoverview Poll Time Selector component for n8n node properties
 * @description Provides polling interval configuration for trigger nodes
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Components
 */

import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { SEMBLE_CONSTANTS } from '../core/Constants';

/**
 * Available polling interval types
 * @enum PollIntervalType
 */
export enum PollIntervalType {
  MINUTES_1 = '1m',
  MINUTES_5 = '5m',
  MINUTES_15 = '15m',
  MINUTES_30 = '30m',
  HOURS_1 = '1h',
  HOURS_2 = '2h',
  HOURS_6 = '6h',
  HOURS_12 = '12h',
  DAILY = '24h',
  CUSTOM = 'custom'
}

/**
 * Date period options for monitoring
 * @enum DatePeriodType
 */
export enum DatePeriodType {
  DAY_1 = '1d',
  WEEK_1 = '1w',
  MONTH_1 = '1m',
  MONTH_3 = '3m',
  MONTH_6 = '6m',
  MONTH_12 = '12m',
  ALL = 'all'
}

/**
 * Configuration for poll time selector
 * @interface PollTimeSelectorConfig
 */
export interface PollTimeSelectorConfig {
  name?: string;
  displayName?: string;
  description?: string;
  default?: PollIntervalType;
  displayOptions?: {
    show?: { [key: string]: string[] };
    hide?: { [key: string]: string[] };
  };
  includeIntervals?: PollIntervalType[];
  excludeIntervals?: PollIntervalType[];
  allowCustom?: boolean;
}

/**
 * Configuration for date period selector
 * @interface DatePeriodSelectorConfig
 */
export interface DatePeriodSelectorConfig {
  name?: string;
  displayName?: string;
  description?: string;
  default?: DatePeriodType;
  displayOptions?: {
    show?: { [key: string]: string[] };
    hide?: { [key: string]: string[] };
  };
  includePeriods?: DatePeriodType[];
  excludePeriods?: DatePeriodType[];
}

/**
 * Poll interval definition
 * @interface PollIntervalDefinition
 */
export interface PollIntervalDefinition {
  name: string;
  value: PollIntervalType;
  description: string;
  intervalMs: number;
  isRecommended: boolean;
  apiRateImpact: 'low' | 'medium' | 'high';
}

/**
 * Date period definition
 * @interface DatePeriodDefinition
 */
export interface DatePeriodDefinition {
  name: string;
  value: DatePeriodType;
  description: string;
  daysBack: number;
  isRecommended: boolean;
  performanceImpact: 'low' | 'medium' | 'high';
}

/**
 * Poll Time Selector component class
 * @class PollTimeSelector
 * @description Generates polling interval and date period selection UI for trigger nodes
 */
export class PollTimeSelector {
  /**
   * Available polling interval definitions
   */
  private static readonly POLL_INTERVALS: PollIntervalDefinition[] = [
    {
      name: '1 Minute',
      value: PollIntervalType.MINUTES_1,
      description: 'Check every minute (high API usage)',
      intervalMs: 1 * 60 * 1000,
      isRecommended: false,
      apiRateImpact: 'high'
    },
    {
      name: '5 Minutes',
      value: PollIntervalType.MINUTES_5,
      description: 'Check every 5 minutes',
      intervalMs: 5 * 60 * 1000,
      isRecommended: true,
      apiRateImpact: 'medium'
    },
    {
      name: '15 Minutes',
      value: PollIntervalType.MINUTES_15,
      description: 'Check every 15 minutes (recommended)',
      intervalMs: 15 * 60 * 1000,
      isRecommended: true,
      apiRateImpact: 'medium'
    },
    {
      name: '30 Minutes',
      value: PollIntervalType.MINUTES_30,
      description: 'Check every 30 minutes',
      intervalMs: 30 * 60 * 1000,
      isRecommended: true,
      apiRateImpact: 'low'
    },
    {
      name: '1 Hour',
      value: PollIntervalType.HOURS_1,
      description: 'Check every hour',
      intervalMs: 1 * 60 * 60 * 1000,
      isRecommended: true,
      apiRateImpact: 'low'
    },
    {
      name: '2 Hours',
      value: PollIntervalType.HOURS_2,
      description: 'Check every 2 hours',
      intervalMs: 2 * 60 * 60 * 1000,
      isRecommended: false,
      apiRateImpact: 'low'
    },
    {
      name: '6 Hours',
      value: PollIntervalType.HOURS_6,
      description: 'Check every 6 hours',
      intervalMs: 6 * 60 * 60 * 1000,
      isRecommended: false,
      apiRateImpact: 'low'
    },
    {
      name: '12 Hours',
      value: PollIntervalType.HOURS_12,
      description: 'Check every 12 hours',
      intervalMs: 12 * 60 * 60 * 1000,
      isRecommended: false,
      apiRateImpact: 'low'
    },
    {
      name: 'Daily',
      value: PollIntervalType.DAILY,
      description: 'Check once per day',
      intervalMs: 24 * 60 * 60 * 1000,
      isRecommended: false,
      apiRateImpact: 'low'
    },
    {
      name: 'Custom',
      value: PollIntervalType.CUSTOM,
      description: 'Specify custom interval',
      intervalMs: 0, // Will be set by user
      isRecommended: false,
      apiRateImpact: 'medium'
    }
  ];

  /**
   * Available date period definitions
   */
  private static readonly DATE_PERIODS: DatePeriodDefinition[] = [
    {
      name: '1 Day',
      value: DatePeriodType.DAY_1,
      description: 'Monitor items from the last 24 hours',
      daysBack: 1,
      isRecommended: true,
      performanceImpact: 'low'
    },
    {
      name: '1 Week',
      value: DatePeriodType.WEEK_1,
      description: 'Monitor items from the last 7 days',
      daysBack: 7,
      isRecommended: true,
      performanceImpact: 'low'
    },
    {
      name: '1 Month',
      value: DatePeriodType.MONTH_1,
      description: 'Monitor items from the last 30 days',
      daysBack: 30,
      isRecommended: true,
      performanceImpact: 'medium'
    },
    {
      name: '3 Months',
      value: DatePeriodType.MONTH_3,
      description: 'Monitor items from the last 90 days',
      daysBack: 90,
      isRecommended: false,
      performanceImpact: 'medium'
    },
    {
      name: '6 Months',
      value: DatePeriodType.MONTH_6,
      description: 'Monitor items from the last 180 days',
      daysBack: 180,
      isRecommended: false,
      performanceImpact: 'high'
    },
    {
      name: '12 Months',
      value: DatePeriodType.MONTH_12,
      description: 'Monitor items from the last 365 days',
      daysBack: 365,
      isRecommended: false,
      performanceImpact: 'high'
    },
    {
      name: 'All Records',
      value: DatePeriodType.ALL,
      description: 'Use with caution. Recommend use in conjunction with Loop Over Items Node.',
      daysBack: -1, // Indicates all records
      isRecommended: false,
      performanceImpact: 'high'
    }
  ];

  /**
   * Default configuration for poll time selector
   */
  private static readonly DEFAULT_POLL_CONFIG: Required<PollTimeSelectorConfig> = {
    name: 'pollInterval',
    displayName: 'Poll Interval',
    description: 'How often to check for changes',
    default: PollIntervalType.MINUTES_15,
    displayOptions: {},
    includeIntervals: [],
    excludeIntervals: [],
    allowCustom: true
  };

  /**
   * Default configuration for date period selector
   */
  private static readonly DEFAULT_DATE_CONFIG: Required<DatePeriodSelectorConfig> = {
    name: 'datePeriod',
    displayName: 'Created/Updated Date',
    description: 'Time period to search for items. This filters using the Semble API\'s dateRange parameter for efficient querying.',
    default: DatePeriodType.MONTH_1,
    displayOptions: {},
    includePeriods: [],
    excludePeriods: []
  };

  /**
   * Create poll interval selector property for n8n nodes
   * @static
   * @param {PollTimeSelectorConfig} config - Configuration options
   * @returns {INodeProperties} Generated poll interval selector property
   */
  static generatePollIntervalProperty(config: PollTimeSelectorConfig = {}): INodeProperties {
    const finalConfig = { ...this.DEFAULT_POLL_CONFIG, ...config };

    return {
      displayName: finalConfig.displayName,
      name: finalConfig.name,
      type: 'options',
      noDataExpression: true,
      options: this.getFilteredPollIntervals(finalConfig),
      default: finalConfig.default,
      description: finalConfig.description,
      ...(finalConfig.displayOptions && Object.keys(finalConfig.displayOptions).length > 0 && {
        displayOptions: finalConfig.displayOptions
      })
    };
  }

  /**
   * Create date period selector property for n8n nodes
   * @static
   * @param {DatePeriodSelectorConfig} config - Configuration options
   * @returns {INodeProperties} Generated date period selector property
   */
  static generateDatePeriodProperty(config: DatePeriodSelectorConfig = {}): INodeProperties {
    const finalConfig = { ...this.DEFAULT_DATE_CONFIG, ...config };

    return {
      displayName: finalConfig.displayName,
      name: finalConfig.name,
      type: 'options',
      noDataExpression: true,
      options: this.getFilteredDatePeriods(finalConfig),
      default: finalConfig.default,
      description: finalConfig.description,
      ...(finalConfig.displayOptions && Object.keys(finalConfig.displayOptions).length > 0 && {
        displayOptions: finalConfig.displayOptions
      })
    };
  }

  /**
   * Get filtered poll interval options
   * @static
   * @param {Required<PollTimeSelectorConfig>} config - Filter configuration
   * @returns {INodePropertyOptions[]} Filtered poll interval options
   */
  private static getFilteredPollIntervals(
    config: Required<PollTimeSelectorConfig>
  ): INodePropertyOptions[] {
    let intervals = [...this.POLL_INTERVALS];

    // Remove custom if not allowed
    if (!config.allowCustom) {
      intervals = intervals.filter(interval => interval.value !== PollIntervalType.CUSTOM);
    }

    // Apply include filter
    if (config.includeIntervals.length > 0) {
      intervals = intervals.filter(interval =>
        config.includeIntervals.includes(interval.value)
      );
    }

    // Apply exclude filter
    if (config.excludeIntervals.length > 0) {
      intervals = intervals.filter(interval =>
        !config.excludeIntervals.includes(interval.value)
      );
    }

    return intervals.map(interval => ({
      name: interval.name,
      value: interval.value,
      description: interval.description
    }));
  }

  /**
   * Get filtered date period options
   * @static
   * @param {Required<DatePeriodSelectorConfig>} config - Filter configuration
   * @returns {INodePropertyOptions[]} Filtered date period options
   */
  private static getFilteredDatePeriods(
    config: Required<DatePeriodSelectorConfig>
  ): INodePropertyOptions[] {
    let periods = [...this.DATE_PERIODS];

    // Apply include filter
    if (config.includePeriods.length > 0) {
      periods = periods.filter(period =>
        config.includePeriods.includes(period.value)
      );
    }

    // Apply exclude filter
    if (config.excludePeriods.length > 0) {
      periods = periods.filter(period =>
        !config.excludePeriods.includes(period.value)
      );
    }

    return periods.map(period => ({
      name: period.name,
      value: period.value,
      description: period.description
    }));
  }

  /**
   * Get poll interval definition by type
   * @static
   * @param {PollIntervalType} intervalType - Interval type to lookup
   * @returns {PollIntervalDefinition | undefined} Poll interval definition
   */
  static getPollIntervalDefinition(intervalType: PollIntervalType): PollIntervalDefinition | undefined {
    return this.POLL_INTERVALS.find(interval => interval.value === intervalType);
  }

  /**
   * Get date period definition by type
   * @static
   * @param {DatePeriodType} periodType - Period type to lookup
   * @returns {DatePeriodDefinition | undefined} Date period definition
   */
  static getDatePeriodDefinition(periodType: DatePeriodType): DatePeriodDefinition | undefined {
    return this.DATE_PERIODS.find(period => period.value === periodType);
  }

  /**
   * Convert poll interval to milliseconds
   * @static
   * @param {PollIntervalType} intervalType - Interval type to convert
   * @returns {number} Interval in milliseconds
   */
  static getIntervalMs(intervalType: PollIntervalType): number {
    const definition = this.getPollIntervalDefinition(intervalType);
    return definition?.intervalMs || (15 * 60 * 1000); // Default 15 minutes
  }

  /**
   * Convert date period to days back
   * @static
   * @param {DatePeriodType} periodType - Period type to convert
   * @returns {number} Number of days back (-1 for all records)
   */
  static getDaysBack(periodType: DatePeriodType): number {
    const definition = this.getDatePeriodDefinition(periodType);
    return definition?.daysBack || 30;
  }

  /**
   * Calculate start date from period type
   * @static
   * @param {DatePeriodType} periodType - Period type to calculate from
   * @returns {Date} Calculated start date
   */
  static calculateStartDate(periodType: DatePeriodType): Date {
    const daysBack = this.getDaysBack(periodType);
    
    if (daysBack === -1) {
      return new Date('1970-01-01'); // Very old date for all records
    }
    
    const now = new Date();
    return new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
  }

  /**
   * Validate poll interval type
   * @static
   * @param {string} intervalType - Interval type to validate
   * @throws {Error} If interval type is invalid
   */
  static validatePollInterval(intervalType: string): void {
    const validTypes = Object.values(PollIntervalType);
    if (!validTypes.includes(intervalType as PollIntervalType)) {
      throw new Error(`Invalid poll interval type: ${intervalType}. Valid types: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Validate date period type
   * @static
   * @param {string} periodType - Period type to validate
   * @throws {Error} If period type is invalid
   */
  static validateDatePeriod(periodType: string): void {
    const validTypes = Object.values(DatePeriodType);
    if (!validTypes.includes(periodType as DatePeriodType)) {
      throw new Error(`Invalid date period type: ${periodType}. Valid types: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Get recommended intervals for API rate management
   * @static
   * @returns {PollIntervalType[]} Array of recommended interval types
   */
  static getRecommendedIntervals(): PollIntervalType[] {
    return this.POLL_INTERVALS
      .filter(interval => interval.isRecommended)
      .map(interval => interval.value);
  }

  /**
   * Get recommended date periods for performance
   * @static
   * @returns {DatePeriodType[]} Array of recommended period types
   */
  static getRecommendedPeriods(): DatePeriodType[] {
    return this.DATE_PERIODS
      .filter(period => period.isRecommended)
      .map(period => period.value);
  }
}

/**
 * Poll time selector factory for common use cases
 * @class PollTimeSelectorFactory
 * @description Provides pre-configured poll time selectors for common scenarios
 */
export class PollTimeSelectorFactory {
  /**
   * Generate poll time selectors for standard trigger node
   * @static
   * @returns {INodeProperties[]} Array of poll time properties
   */
  static forStandardTrigger(): INodeProperties[] {
    return [
      PollTimeSelector.generateDatePeriodProperty(),
      // Note: Poll interval is typically handled by n8n's built-in trigger polling
    ];
  }

  /**
   * Generate date period selector for patient triggers
   * @static
   * @returns {INodeProperties} Patient trigger date period selector
   */
  static forPatientTrigger(): INodeProperties {
    return PollTimeSelector.generateDatePeriodProperty({
      displayOptions: {
        show: {
          resource: ['patient']
        }
      }
    });
  }

  /**
   * Generate date period selector for high-frequency monitoring
   * @static
   * @returns {INodeProperties} High-frequency date period selector
   */
  static forHighFrequencyMonitoring(): INodeProperties {
    return PollTimeSelector.generateDatePeriodProperty({
      includePeriods: [DatePeriodType.DAY_1, DatePeriodType.WEEK_1],
      default: DatePeriodType.DAY_1
    });
  }

  /**
   * Generate date period selector for batch processing
   * @static
   * @returns {INodeProperties} Batch processing date period selector
   */
  static forBatchProcessing(): INodeProperties {
    return PollTimeSelector.generateDatePeriodProperty({
      includePeriods: [DatePeriodType.MONTH_1, DatePeriodType.MONTH_3, DatePeriodType.ALL],
      default: DatePeriodType.MONTH_1
    });
  }
}
