import { INodeProperties } from 'n8n-workflow';

export const appointmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['appointment'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new appointment',
				action: 'Create an appointment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an appointment',
				action: 'Get an appointment',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many appointments',
				action: 'Get many appointments',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an appointment',
				action: 'Update an appointment',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an appointment',
				action: 'Delete an appointment',
			},
		],
		default: 'create',
	},
];

export const appointmentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                appointment:create                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Patient ID',
		name: 'patientId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The ID of the patient for this appointment',
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
				resource: ['appointment'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The staff member for this appointment',
	},
	{
		displayName: 'Appointment Type',
		name: 'appointmentTypeId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getAppointmentTypes',
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The type of appointment',
	},
	{
		displayName: 'Start Time',
		name: 'startTime',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The start time of the appointment',
	},
	{
		displayName: 'End Time',
		name: 'endTime',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The end time of the appointment',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['appointment'],
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
				description: 'Additional notes for the appointment',
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
				description: 'The status of the appointment',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                appointment:get                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Appointment ID',
		name: 'appointmentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['get', 'update', 'delete'],
			},
		},
		default: '',
		description: 'The ID of the appointment to retrieve',
	},

	/* -------------------------------------------------------------------------- */
	/*                                appointment:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['appointment'],
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
				resource: ['appointment'],
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
				resource: ['appointment'],
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
				description: 'Filter appointments from this date',
			},
			{
				displayName: 'Date To',
				name: 'dateTo',
				type: 'dateTime',
				default: '',
				description: 'Filter appointments to this date',
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
				description: 'Filter by appointment status',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                appointment:update                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['appointment'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Start Time',
				name: 'startTime',
				type: 'dateTime',
				default: '',
				description: 'The start time of the appointment',
			},
			{
				displayName: 'End Time',
				name: 'endTime',
				type: 'dateTime',
				default: '',
				description: 'The end time of the appointment',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Additional notes for the appointment',
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
				description: 'The status of the appointment',
			},
		],
	},
];
