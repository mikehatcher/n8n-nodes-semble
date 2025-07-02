/**
 * @fileoverview Patient resource descriptions for Semble node
 * @description This module defines the UI properties and operations for patient management
 * @author Mike Hatcher <mike.hatcher@progenious.com>
 * @website https://progenious.com
 * @version 1.1
 * @namespace N8nNodesSemble.Descriptions
 */

import { INodeProperties } from 'n8n-workflow';

/**
 * Operation definitions for patient resource
 * @const {INodeProperties[]} patientOperations
 * @description Defines available CRUD operations for patients (Create, Read, Update)
 */
export const patientOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['patient'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new patient',
				action: 'Create a patient',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a patient',
				action: 'Get a patient',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many patients',
				action: 'Get many patients',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a patient',
				action: 'Update a patient',
			},
		],
		default: 'create',
	},
];

/**
 * Field definitions for patient operations
 * @const {INodeProperties[]} patientFields
 * @description Defines input fields and parameters for all patient operations
 * @description Includes personal information, contact details, and medical notes
 */
export const patientFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                patient:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['patient'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The first name of the patient',
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['patient'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The last name of the patient',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		displayOptions: {
			show: {
				resource: ['patient'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The email address of the patient',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['patient'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'The phone number of the patient',
			},
			{
				displayName: 'Date of Birth',
				name: 'dateOfBirth',
				type: 'dateTime',
				default: '',
				description: 'The date of birth of the patient',
			},
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'The address of the patient',
			},
			{
				displayName: 'Gender',
				name: 'gender',
				type: 'options',
				options: [
					{
						name: 'Male',
						value: 'male',
					},
					{
						name: 'Female',
						value: 'female',
					},
					{
						name: 'Other',
						value: 'other',
					},
				],
				default: '',
				description: 'The gender of the patient',
			},
			{
				displayName: 'Medical Notes',
				name: 'medicalNotes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Medical notes for the patient',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                patient:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Patient ID',
		name: 'patientId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['patient'],
				operation: ['get', 'update'],
			},
		},
		default: '',
		description: 'The ID of the patient to retrieve',
	},

	/* -------------------------------------------------------------------------- */
	/*                                patient:getAll                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['patient'],
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
				resource: ['patient'],
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
				resource: ['patient'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search patients by name or email',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'Filter by email address',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                patient:update                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['patient'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'The first name of the patient',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'The last name of the patient',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'The email address of the patient',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'The phone number of the patient',
			},
			{
				displayName: 'Date of Birth',
				name: 'dateOfBirth',
				type: 'dateTime',
				default: '',
				description: 'The date of birth of the patient',
			},
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'The address of the patient',
			},
			{
				displayName: 'Medical Notes',
				name: 'medicalNotes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Medical notes for the patient',
			},
		],
	},
];
