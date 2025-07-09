/**
 * @fileoverview Booking resource descriptions for Semble node
 * @description This module defines the UI properties and operations for booking management
 * @author Mike Hatcher <mike.hatcher@progenious.com>
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Descriptions
 */

import { INodeProperties } from 'n8n-workflow';

/**
 * Operation definitions for booking resource
 * @const {INodeProperties[]} bookingOperations
 * @description Defines available CRUD operations for bookings (Create, Read, Update, Delete)
 */
export const bookingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['booking'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new booking',
				action: 'Create a booking',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a booking',
				action: 'Get a booking',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many bookings',
				action: 'Get many bookings',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a booking',
				action: 'Update a booking',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a booking',
				action: 'Delete a booking',
			},
		],
		default: 'create',
	},
];

/**
 * Field definitions for booking operations
 * @const {INodeProperties[]} bookingFields
 * @description Defines input fields and parameters for all booking operations
 * @description Organized by operation type (create, read, update, delete) with conditional display logic
 */
export const bookingFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                booking:create                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Patient ID',
		name: 'patientId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The ID of the patient for this booking',
	},
	{
		displayName: 'Staff',
		name: 'staffId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getStaff',
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The staff member for this booking',
	},
	{
		displayName: 'Booking Type',
		name: 'bookingTypeId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBookingTypes',
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The type of booking',
	},
	{
		displayName: 'Start Time',
		name: 'startTime',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The start time of the booking',
	},
	{
		displayName: 'End Time',
		name: 'endTime',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The end time of the booking',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Additional notes for the booking',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Scheduled',
						value: 'scheduled',
					},
					{
						name: 'Confirmed',
						value: 'confirmed',
					},
					{
						name: 'Cancelled',
						value: 'cancelled',
					},
				],
				default: 'scheduled',
				description: 'The status of the booking',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                booking:get                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Booking ID',
		name: 'bookingId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['get', 'update', 'delete'],
			},
		},
		default: '',
		description: 'The ID of the booking to retrieve',
	},

	/* -------------------------------------------------------------------------- */
	/*                                booking:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['booking'],
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
				resource: ['booking'],
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
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Staff ID',
				name: 'staffId',
				type: 'string',
				default: '',
				description: 'Filter by staff member ID',
			},
			{
				displayName: 'Patient ID',
				name: 'patientId',
				type: 'string',
				default: '',
				description: 'Filter by patient ID',
			},
			{
				displayName: 'Date From',
				name: 'dateFrom',
				type: 'dateTime',
				default: '',
				description: 'Filter bookings from this date',
			},
			{
				displayName: 'Date To',
				name: 'dateTo',
				type: 'dateTime',
				default: '',
				description: 'Filter bookings to this date',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Scheduled',
						value: 'scheduled',
					},
					{
						name: 'Confirmed',
						value: 'confirmed',
					},
					{
						name: 'Cancelled',
						value: 'cancelled',
					},
					{
						name: 'Completed',
						value: 'completed',
					},
				],
				default: '',
				description: 'Filter by booking status',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                booking:update                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Start Time',
				name: 'startTime',
				type: 'dateTime',
				default: '',
				description: 'The start time of the booking',
			},
			{
				displayName: 'End Time',
				name: 'endTime',
				type: 'dateTime',
				default: '',
				description: 'The end time of the booking',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Additional notes for the booking',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Scheduled',
						value: 'scheduled',
					},
					{
						name: 'Confirmed',
						value: 'confirmed',
					},
					{
						name: 'Cancelled',
						value: 'cancelled',
					},
					{
						name: 'Completed',
						value: 'completed',
					},
				],
				default: '',
				description: 'The status of the booking',
			},
		],
	},
];
