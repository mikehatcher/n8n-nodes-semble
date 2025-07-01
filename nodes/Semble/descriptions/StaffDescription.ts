/**
 * @fileoverview Staff resource descriptions for Semble node
 * @description This module defines the UI properties and operations for staff management
 * @author Mike Hatcher <mike.hatcher@progenious.com>
 * @website https://progenious.com
 * @version 1.0
 * @namespace N8nNodesSemble.Descriptions
 */

import { INodeProperties } from 'n8n-workflow';

/**
 * Operation definitions for staff resource
 * @const {INodeProperties[]} staffOperations
 * @description Defines available read operations for staff (Get, Get Many)
 */
export const staffOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['staff'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a staff member',
				action: 'Get a staff member',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many staff members',
				action: 'Get many staff members',
			},
		],
		default: 'getAll',
	},
];

/**
 * Field definitions for staff operations
 * @const {INodeProperties[]} staffFields
 * @description Defines input fields and parameters for staff operations
 * @description Read-only operations for retrieving staff member information
 */
export const staffFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                staff:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Staff ID',
		name: 'staffId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['staff'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'The ID of the staff member to retrieve',
	},

	/* -------------------------------------------------------------------------- */
	/*                                staff:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['staff'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['staff'],
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
	},
];
