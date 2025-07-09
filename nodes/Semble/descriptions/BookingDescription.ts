/**
 * @fileoverview Booking resource descriptions for Semble node
 * @description This module defines the UI properties and operations for booking management
 * @author Mike Hatcher <mike.hatcher@progenious.com>
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Descriptions
 */

import { INodeProperties } from 'n8n-workflow';
import {
	createIdField,
	createDateTimeField,
	createStatusField,
	createNotesField,
	createOptionsField,
	createBooleanField,
	createLimitField,
	createDisplayOptions,
	BOOKING_STATUS_OPTIONS,
} from './shared/FieldHelpers';

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
				description: 'Create a new booking appointment',
				action: 'Create a booking',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a specific booking by ID',
				action: 'Get a booking',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve multiple bookings with optional filtering',
				action: 'Get many bookings',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Modify an existing booking appointment',
				action: 'Update a booking',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Remove a booking appointment permanently',
				action: 'Delete a booking',
			},
		],
		default: 'create',
		description: 'Choose what action to perform on the booking data',
	},
	
	// Debug mode setting
	createBooleanField(
		'Debug Mode',
		'debugMode',
		'booking',
		['create', 'get', 'getAll', 'update', 'delete'],
		false,
		'Enable detailed logging for troubleshooting API requests and responses'
	),
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
		displayOptions: createDisplayOptions('booking', ['create']),
		default: '',
		description: 'The ID of the patient for this booking',
	},
	createOptionsField(
		'Staff',
		'staffId',
		'booking',
		['create'],
		'getStaff',
		'The staff member for this booking'
	),
	createOptionsField(
		'Booking Type',
		'bookingTypeId',
		'booking',
		['create'],
		'getBookingTypes',
		'The type of booking'
	),
	createDateTimeField(
		'Start Time',
		'startTime',
		'booking',
		['create'],
		true,
		'The start time of the booking'
	),
	createDateTimeField(
		'End Time',
		'endTime',
		'booking',
		['create'],
		true,
		'The end time of the booking'
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: createDisplayOptions('booking', ['create']),
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
				options: BOOKING_STATUS_OPTIONS,
				default: 'scheduled',
				description: 'The status of the booking',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                booking:get                            */
	/* -------------------------------------------------------------------------- */
	createIdField(
		'Booking ID',
		'bookingId',
		'booking',
		['get', 'update', 'delete'],
		'The ID of the booking to retrieve'
	),

	/* -------------------------------------------------------------------------- */
	/*                                booking:getAll                         */
	/* -------------------------------------------------------------------------- */
	createBooleanField(
		'Return All',
		'returnAll',
		'booking',
		['getAll'],
		false,
		'Whether to return all results or only up to a given limit'
	),
	createLimitField('booking'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: createDisplayOptions('booking', ['getAll']),
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
				options: BOOKING_STATUS_OPTIONS,
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
		displayOptions: createDisplayOptions('booking', ['update']),
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
				options: BOOKING_STATUS_OPTIONS,
				default: '',
				description: 'The status of the booking',
			},
		],
	},
];
