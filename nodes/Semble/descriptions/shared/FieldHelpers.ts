/**
 * @fileoverview Shared field helpers and constants for Semble node descriptions
 * @description DRY utilities for creating consistent field definitions across resources
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Descriptions.Shared
 */

import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

/**
 * Status options for different resource types
 */
export const STATUS_OPTIONS = {
  booking: [
    { name: 'Scheduled', value: 'scheduled' },
    { name: 'Confirmed', value: 'confirmed' },
    { name: 'Cancelled', value: 'cancelled' },
    { name: 'Completed', value: 'completed' },
  ] as INodePropertyOptions[],
  patient: [
    { name: 'Active', value: 'active' },
    { name: 'Inactive', value: 'inactive' },
    { name: 'Archived', value: 'archived' },
  ] as INodePropertyOptions[],
};

/**
 * Legacy export for backward compatibility
 * @deprecated Use STATUS_OPTIONS.booking instead
 */
export const BOOKING_STATUS_OPTIONS = STATUS_OPTIONS.booking;

/**
 * Creates a standardised display options configuration
 */
export function createDisplayOptions(resource: string, operations: string[]) {
	return {
		show: {
			resource: [resource],
			operation: operations,
		},
	};
}

/**
 * Creates a standardised ID field
 */
export function createIdField(
	displayName: string,
	name: string,
	resource: string,
	operations: string[],
	description?: string
): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		required: true,
		displayOptions: createDisplayOptions(resource, operations),
		default: '',
		description: description || `The ID of the ${displayName.toLowerCase()}`,
	};
}

/**
 * Creates a standardised date/time field
 */
export function createDateTimeField(
	displayName: string,
	name: string,
	resource: string,
	operations: string[],
	required: boolean = true,
	description?: string
): INodeProperties {
	return {
		displayName,
		name,
		type: 'dateTime',
		required,
		displayOptions: createDisplayOptions(resource, operations),
		default: '',
		description: description || `The ${displayName.toLowerCase()}`,
	};
}

/**
 * Creates a standardised status field
 */
export function createStatusField(
	resource: string,
	operations: string[],
	required: boolean = false
): INodeProperties {
	return {
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: BOOKING_STATUS_OPTIONS,
		required,
		displayOptions: createDisplayOptions(resource, operations),
		default: required ? 'scheduled' : '',
		description: 'The status of the booking',
	};
}

/**
 * Creates a standardised notes field
 */
export function createNotesField(
	resource: string,
	operations: string[],
	required: boolean = false
): INodeProperties {
	return {
		displayName: 'Notes',
		name: 'notes',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		required,
		displayOptions: createDisplayOptions(resource, operations),
		default: '',
		description: 'Additional notes for the booking',
	};
}

/**
 * Creates a standardised options field with load method
 */
export function createOptionsField(
	displayName: string,
	name: string,
	resource: string,
	operations: string[],
	loadOptionsMethod: string,
	description?: string,
	required: boolean = true
): INodeProperties {
	return {
		displayName,
		name,
		type: 'options',
		typeOptions: {
			loadOptionsMethod,
		},
		required,
		displayOptions: createDisplayOptions(resource, operations),
		default: '',
		description: description || `The ${displayName.toLowerCase()}`,
	};
}

/**
 * Creates a standardised boolean field
 */
export function createBooleanField(
	displayName: string,
	name: string,
	resource: string,
	operations: string[],
	defaultValue: boolean = false,
	description?: string
): INodeProperties {
	return {
		displayName,
		name,
		type: 'boolean',
		displayOptions: createDisplayOptions(resource, operations),
		default: defaultValue,
		description: description || displayName,
		noDataExpression: true,
	};
}

/**
 * Creates a standardised limit field for pagination
 */
export function createLimitField(resource: string): INodeProperties {
	return {
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	};
}

/**
 * Creates a standardised string field
 */
export function createStringField(
	displayName: string,
	name: string,
	resource: string,
	operations: string[],
	required: boolean = false,
	description?: string
): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		required,
		displayOptions: createDisplayOptions(resource, operations),
		default: '',
		description: description || displayName,
	};
}

/**
 * Creates a collection field with specified options
 */
export function createCollectionField(
	displayName: string,
	name: string,
	resource: string,
	operations: string[],
	options: INodeProperties[],
	placeholder?: string
): INodeProperties {
	return {
		displayName,
		name,
		type: 'collection',
		placeholder: placeholder || 'Add Field',
		default: {},
		displayOptions: createDisplayOptions(resource, operations),
		options,
	};
}
