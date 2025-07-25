/**
 * @fileoverview Resource dropdown component for n8n Semble integration
 * @description Reusable resource selector component with dynamic resource loading and conditional field display
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Components
 * @since 2.0.0
 */

import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { SembleResourceType } from '../types/SembleTypes';

/**
 * Configuration for resource selector component
 */
export interface ResourceSelectorConfig {
  name?: string;
  displayName?: string;
  description?: string;
  required?: boolean;
  default?: SembleResourceType;
  displayOptions?: any;
  includeResources?: SembleResourceType[];
  excludeResources?: SembleResourceType[];
}

/**
 * Resource definition for UI display
 */
export interface ResourceDefinition {
  name: string;
  value: SembleResourceType;
  description: string;
  isEnabled: boolean;
  requiredPermissions?: string[];
}

/**
 * Resource selector component class
 * @class ResourceSelector
 * @description Generates dynamic resource dropdown for n8n node properties
 */
export class ResourceSelector {
  /**
   * Default resource definitions available in Semble
   */
  private static readonly DEFAULT_RESOURCES: ResourceDefinition[] = [
    {
      name: 'Patient',
      value: 'patient',
      description: 'Patient management operations (create, read, update, delete)',
      isEnabled: true,
      requiredPermissions: ['patients:read']
    },
    {
      name: 'Booking',
      value: 'booking', 
      description: 'Booking management operations (create, read, update, delete)',
      isEnabled: true,
      requiredPermissions: ['bookings:read']
    },
    {
      name: 'Doctor',
      value: 'doctor',
      description: 'Doctor/practitioner management operations',
      isEnabled: false, // Future implementation
      requiredPermissions: ['doctors:read']
    },
    {
      name: 'Location',
      value: 'location',
      description: 'Practice location management operations',
      isEnabled: false, // Future implementation
      requiredPermissions: ['locations:read']
    },
    {
      name: 'Booking Type',
      value: 'bookingType',
      description: 'Booking type configuration management',
      isEnabled: false, // Future implementation
      requiredPermissions: ['booking_types:read']
    }
  ];

  /**
   * Default configuration for resource selector
   */
  private static readonly DEFAULT_CONFIG: Required<ResourceSelectorConfig> = {
    name: 'resource',
    displayName: 'Resource',
    description: 'The resource you want to work with',
    required: true,
    default: 'patient',
    displayOptions: {},
    includeResources: [],
    excludeResources: []
  };

  /**
   * Create a resource selector property for n8n node
   * @param config - Configuration options for the selector
   * @returns INodeProperties configuration for resource dropdown
   */
  public static create(config: ResourceSelectorConfig = {}): INodeProperties {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    return {
      displayName: finalConfig.displayName,
      name: finalConfig.name,
      type: 'options',
      noDataExpression: true,
      required: finalConfig.required,
      default: finalConfig.default,
      description: finalConfig.description,
      displayOptions: finalConfig.displayOptions,
      options: this.getFilteredResources(finalConfig)
    };
  }

  /**
   * Create a resource selector specifically for trigger nodes
   * @param config - Configuration options for the selector
   * @returns INodeProperties configuration for trigger resource dropdown
   */
  public static createForTrigger(config: ResourceSelectorConfig = {}): INodeProperties {
    const triggerConfig: ResourceSelectorConfig = {
      ...config,
      description: 'The resource you want to monitor for changes',
      includeResources: ['patient'] // Only patient triggers are currently implemented
    };
    
    return this.create(triggerConfig);
  }

  /**
   * Create a resource selector specifically for action nodes
   * @param config - Configuration options for the selector
   * @returns INodeProperties configuration for action resource dropdown
   */
  public static createForAction(config: ResourceSelectorConfig = {}): INodeProperties {
    const actionConfig: ResourceSelectorConfig = {
      ...config,
      description: 'The resource you want to perform actions on',
      includeResources: ['patient', 'booking'] // Currently implemented resources
    };
    
    return this.create(actionConfig);
  }

  /**
   * Get available resources filtered by configuration
   * @param config - Filter configuration
   * @returns Array of filtered resource options
   */
  private static getFilteredResources(config: Required<ResourceSelectorConfig>): INodePropertyOptions[] {
    let resources = this.DEFAULT_RESOURCES.filter(resource => resource.isEnabled);

    // Apply include filter
    if (config.includeResources.length > 0) {
      resources = resources.filter(resource => 
        config.includeResources.includes(resource.value)
      );
    }

    // Apply exclude filter
    if (config.excludeResources.length > 0) {
      resources = resources.filter(resource => 
        !config.excludeResources.includes(resource.value)
      );
    }

    return resources.map(resource => ({
      name: resource.name,
      value: resource.value,
      description: resource.description
    }));
  }

  /**
   * Get all available resource types
   * @returns Array of all resource values
   */
  public static getAllResourceTypes(): SembleResourceType[] {
    return this.DEFAULT_RESOURCES.map(resource => resource.value);
  }

  /**
   * Get enabled resource types only
   * @returns Array of enabled resource values
   */
  public static getEnabledResourceTypes(): SembleResourceType[] {
    return this.DEFAULT_RESOURCES
      .filter(resource => resource.isEnabled)
      .map(resource => resource.value);
  }

  /**
   * Check if a resource type is enabled
   * @param resourceType - Resource type to check
   * @returns True if resource is enabled
   */
  public static isResourceEnabled(resourceType: SembleResourceType): boolean {
    const resource = this.DEFAULT_RESOURCES.find(r => r.value === resourceType);
    return resource?.isEnabled ?? false;
  }

  /**
   * Get resource definition by type
   * @param resourceType - Resource type to get definition for
   * @returns Resource definition or undefined
   */
  public static getResourceDefinition(resourceType: SembleResourceType): ResourceDefinition | undefined {
    return this.DEFAULT_RESOURCES.find(r => r.value === resourceType);
  }

  /**
   * Update resource enabled status (for future dynamic configuration)
   * @param resourceType - Resource type to update
   * @param enabled - New enabled status
   */
  public static updateResourceStatus(resourceType: SembleResourceType, enabled: boolean): void {
    const resource = this.DEFAULT_RESOURCES.find(r => r.value === resourceType);
    if (resource) {
      resource.isEnabled = enabled;
    }
  }

  /**
   * Get resources that require specific permissions
   * @param permissions - Array of permission strings to check
   * @returns Array of resources that require these permissions
   */
  public static getResourcesByPermissions(permissions: string[]): ResourceDefinition[] {
    return this.DEFAULT_RESOURCES.filter(resource =>
      resource.requiredPermissions?.some(permission =>
        permissions.includes(permission)
      )
    );
  }
}
