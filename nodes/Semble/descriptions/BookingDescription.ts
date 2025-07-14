/**
 * @fileoverview Booking resource descriptions for Semble node
 * @description This module defines the UI properties and operations for booking management
 * @author Mike Hatcher
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
	{
		displayName: 'Doctor ID',
		name: 'doctorId',
		type: 'string',
		required: true,
		displayOptions: createDisplayOptions('booking', ['create']),
		default: '',
		description: 'The ID of the doctor for this booking',
	},
	{
		displayName: 'Location ID',
		name: 'locationId',
		type: 'string',
		required: true,
		displayOptions: createDisplayOptions('booking', ['create']),
		default: '',
		description: 'The ID of the location for this booking',
	},
	{
		displayName: 'Booking Type ID',
		name: 'bookingTypeId',
		type: 'string',
		required: true,
		displayOptions: createDisplayOptions('booking', ['create']),
		default: '',
		description: 'The ID of the booking type',
	},
	{
		displayName: 'Start Time',
		name: 'startTime',
		type: 'string',
		required: true,
		displayOptions: createDisplayOptions('booking', ['create']),
		default: '',
		placeholder: 'YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD HH:MM:SS',
		description: 'The start time of the booking in ISO 8601 format (e.g., 2024-12-25T14:30:00 or 2024-12-25 14:30:00)',
	},
	{
		displayName: 'End Time',
		name: 'endTime',
		type: 'string',
		required: true,
		displayOptions: createDisplayOptions('booking', ['create']),
		default: '',
		placeholder: 'YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD HH:MM:SS',
		description: 'The end time of the booking in ISO 8601 format (e.g., 2024-12-25T15:30:00 or 2024-12-25 15:30:00)',
	},
	{
		displayName: 'Comments',
		name: 'comments',
		type: 'string',
		displayOptions: createDisplayOptions('booking', ['create']),
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		description: 'Additional comments for the booking',
	},
	{
		displayName: 'Video URL',
		name: 'videoUrl',
		type: 'string',
		displayOptions: createDisplayOptions('booking', ['create']),
		default: '',
		description: 'Video URL for the booking',
	},
	{
		displayName: 'Reference',
		name: 'reference',
		type: 'string',
		displayOptions: createDisplayOptions('booking', ['create']),
		default: '',
		description: 'Reference for the booking',
	},
	{
		displayName: 'Billed',
		name: 'billed',
		type: 'string',
		displayOptions: createDisplayOptions('booking', ['create']),
		default: 'false',
		placeholder: 'true, false, yes, no',
		description: 'Whether the booking has been billed (true, false, yes, no)',
	},
	{
		displayName: 'Online Booking Payment Status',
		name: 'onlineBookingPaymentStatus',
		type: 'string',
		displayOptions: createDisplayOptions('booking', ['create']),
		default: '',
		description: 'Payment status for online bookings',
	},
	{
		displayName: 'Send Confirmation Message',
		name: 'sendConfirmationMessage',
		type: 'string',
		displayOptions: createDisplayOptions('booking', ['create']),
		default: 'true',
		placeholder: 'true, false, yes, no',
		description: 'Send booking confirmation to patient (true, false, yes, no)',
	},
	{
		displayName: 'Send Reminder Message',
		name: 'sendReminderMessage',
		type: 'string',
		displayOptions: createDisplayOptions('booking', ['create']),
		default: 'true',
		placeholder: 'true, false, yes, no',
		description: 'Send appointment reminder to patient (true, false, yes, no)',
	},
	{
		displayName: 'Send Followup Message',
		name: 'sendFollowupMessage',
		type: 'string',
		displayOptions: createDisplayOptions('booking', ['create']),
		default: 'false',
		placeholder: 'true, false, yes, no',
		description: 'Send follow-up message to patient (true, false, yes, no)',
	},
	{
		displayName: 'Send Cancellation Message',
		name: 'sendCancellationMessage',
		type: 'string',
		displayOptions: createDisplayOptions('booking', ['create']),
		default: 'false',
		placeholder: 'true, false, yes, no',
		description: 'Send cancellation message to patient (true, false, yes, no)',
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
	/*                                booking:delete                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Send Cancellation Messages',
		name: 'sendCancellationMessages',
		type: 'boolean',
		displayOptions: createDisplayOptions('booking', ['delete']),
		default: false,
		description: 'Whether to send cancellation messages to the patient',
	},

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
				displayName: 'Doctor ID',
				name: 'doctorId',
				type: 'string',
				default: '',
				description: 'Filter by doctor ID',
			},
			{
				displayName: 'Patient ID',
				name: 'patientId',
				type: 'string',
				default: '',
				description: 'Filter by patient ID',
			},
			{
				displayName: 'Location ID',
				name: 'locationId',
				type: 'string',
				default: '',
				description: 'Filter by location ID',
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
				displayName: 'Deleted',
				name: 'deleted',
				type: 'boolean',
				default: false,
				description: 'Include deleted bookings',
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
				displayName: 'Doctor ID',
				name: 'doctorId',
				type: 'string',
				default: '',
				description: 'The ID of the doctor for this booking',
			},
			{
				displayName: 'Location ID',
				name: 'locationId',
				type: 'string',
				default: '',
				description: 'The ID of the location for this booking',
			},
			{
				displayName: 'Booking Type ID',
				name: 'bookingTypeId',
				type: 'string',
				default: '',
				description: 'The ID of the booking type',
			},
			{
				displayName: 'Start Time',
				name: 'startTime',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD HH:MM:SS',
				description: 'The start time of the booking in ISO 8601 format (e.g., 2024-12-25T14:30:00 or 2024-12-25 14:30:00)',
			},
			{
				displayName: 'End Time',
				name: 'endTime',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD HH:MM:SS',
				description: 'The end time of the booking in ISO 8601 format (e.g., 2024-12-25T15:30:00 or 2024-12-25 15:30:00)',
			},
			{
				displayName: 'Comments',
				name: 'comments',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Additional comments for the booking',
			},
			{
				displayName: 'Send Patient Messages',
				name: 'sendPatientMessages',
				type: 'collection',
				placeholder: 'Add Message Setting',
				default: {},
				description: 'Configure patient messaging settings',
				options: [
					{
						displayName: 'Confirmation',
						name: 'confirmation',
						type: 'boolean',
						default: true,
						description: 'Send booking confirmation to patient',
					},
					{
						displayName: 'Reminder',
						name: 'reminder',
						type: 'boolean',
						default: true,
						description: 'Send appointment reminder to patient',
					},
					{
						displayName: 'Followup',
						name: 'followup',
						type: 'boolean',
						default: false,
						description: 'Send follow-up message to patient',
					},
					{
						displayName: 'Cancellation',
						name: 'cancellation',
						type: 'boolean',
						default: false,
						description: 'Send cancellation message to patient',
					},
				],
			},
		],
	},
];
