import { INodeProperties } from 'n8n-workflow';

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
