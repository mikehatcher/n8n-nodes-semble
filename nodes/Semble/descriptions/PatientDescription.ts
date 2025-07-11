/**
 * @fileoverview Patient resource descriptions for Semble node
 * @description This module defines the UI properties and operations for patient management
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Descriptions
 */

import { INodeProperties } from 'n8n-workflow';
import {
	createIdField,
	createTextField,
	createEmailField,
	createPhoneField,
	createDateField,
	createBooleanField,
	createLimitField,
	createDisplayOptions,
	createStaticOptionsField,
	createCollectionField,
	GENDER_OPTIONS,
} from './shared/FieldHelpers';

/**
 * Operation definitions for patient resource
 * @const {INodeProperties[]} patientOperations
 * @description Defines available CRUD operations for patients (Create, Read, Update, Delete)
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
				description: 'Create a new patient record',
				action: 'Create a patient',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a specific patient by ID',
				action: 'Get a patient',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve multiple patients with optional filtering',
				action: 'Get many patients',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Modify an existing patient record',
				action: 'Update a patient',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Remove a patient record permanently',
				action: 'Delete a patient',
			},
		],
		default: 'create',
		description: 'Choose what action to perform on the patient data',
	},
	
	// Debug mode setting
	createBooleanField(
		'Debug Mode',
		'debugMode',
		'patient',
		['create', 'get', 'getAll', 'update', 'delete'],
		false,
		'Enable detailed logging for troubleshooting API requests and responses'
	),
];

/**
 * Field definitions for patient operations
 * @const {INodeProperties[]} patientFields
 * @description Defines input fields and parameters for all patient operations
 */
export const patientFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                patient:create                             */
	/* -------------------------------------------------------------------------- */
	createTextField(
		'First Name',
		'firstName',
		'patient',
		['create'],
		'',
		'The patient\'s first name',
		true
	),
	
	createTextField(
		'Last Name',
		'lastName',
		'patient',
		['create'],
		'',
		'The patient\'s last name',
		true
	),
	
	createEmailField(
		'Email',
		'email',
		'patient',
		['create'],
		'',
		'The patient\'s email address',
		true
	),
	
	createPhoneField(
		'Phone',
		'phone',
		'patient',
		['create'],
		'',
		'The patient\'s phone number',
		true
	),

	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: createDisplayOptions('patient', ['create']),
		options: [
			createDateField(
				'Date of Birth',
				'dateOfBirth',
				'patient',
				['create'],
				'',
				'The patient\'s date of birth (YYYY-MM-DD format)'
			),
			createStaticOptionsField(
				'Gender',
				'gender',
				'patient',
				['create'],
				GENDER_OPTIONS,
				'',
				'The patient\'s gender'
			),
			createCollectionField(
				'Address',
				'address',
				'patient',
				['create'],
				[
					createTextField('Line 1', 'line1', 'patient', ['create'], '', 'First line of address'),
					createTextField('Line 2', 'line2', 'patient', ['create'], '', 'Second line of address'),
					createTextField('City', 'city', 'patient', ['create'], '', 'City'),
					createTextField('Postcode', 'postcode', 'patient', ['create'], '', 'Postcode'),
					createTextField('Country', 'country', 'patient', ['create'], '', 'Country'),
				],
				'Patient\'s address information'
			),
			createCollectionField(
				'Emergency Contact',
				'emergencyContact',
				'patient',
				['create'],
				[
					createTextField('Name', 'name', 'patient', ['create'], '', 'Emergency contact name'),
					createPhoneField('Phone', 'phone', 'patient', ['create'], '', 'Emergency contact phone'),
					createTextField('Relationship', 'relationship', 'patient', ['create'], '', 'Relationship to patient'),
				],
				'Emergency contact information'
			),
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                patient:get                                */
	/* -------------------------------------------------------------------------- */
	createIdField(
		'Patient ID',
		'patientId',
		'patient',
		['get'],
		'The ID of the patient to retrieve'
	),

	/* -------------------------------------------------------------------------- */
	/*                                patient:getAll                            */
	/* -------------------------------------------------------------------------- */
	createBooleanField(
		'Return All',
		'returnAll',
		'patient',
		['getAll'],
		false,
		'Whether to return all results or only a limited number'
	),

	createLimitField('patient'),

	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: createDisplayOptions('patient', ['getAll']),
		options: [
			createTextField(
				'Search',
				'search',
				'patient',
				['getAll'],
				'',
				'Search patients by name, email, or phone number'
			),
			createDateField(
				'Created After',
				'createdAfter',
				'patient',
				['getAll'],
				'',
				'Only return patients created after this date'
			),
			createDateField(
				'Updated After',
				'updatedAfter',
				'patient',
				['getAll'],
				'',
				'Only return patients updated after this date'
			),
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                patient:update                            */
	/* -------------------------------------------------------------------------- */
	createIdField(
		'Patient ID',
		'patientId',
		'patient',
		['update'],
		'The ID of the patient to update'
	),

	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: createDisplayOptions('patient', ['update']),
		options: [
			createTextField(
				'First Name',
				'firstName',
				'patient',
				['update'],
				'',
				'The patient\'s first name'
			),
			createTextField(
				'Last Name',
				'lastName',
				'patient',
				['update'],
				'',
				'The patient\'s last name'
			),
			createEmailField(
				'Email',
				'email',
				'patient',
				['update'],
				'',
				'The patient\'s email address'
			),
			createPhoneField(
				'Phone',
				'phone',
				'patient',
				['update'],
				'',
				'The patient\'s phone number'
			),
			createDateField(
				'Date of Birth',
				'dateOfBirth',
				'patient',
				['update'],
				'',
				'The patient\'s date of birth (YYYY-MM-DD format)'
			),
			createStaticOptionsField(
				'Gender',
				'gender',
				'patient',
				['update'],
				GENDER_OPTIONS,
				'',
				'The patient\'s gender'
			),
			createCollectionField(
				'Address',
				'address',
				'patient',
				['update'],
				[
					createTextField('Line 1', 'line1', 'patient', ['update'], '', 'First line of address'),
					createTextField('Line 2', 'line2', 'patient', ['update'], '', 'Second line of address'),
					createTextField('City', 'city', 'patient', ['update'], '', 'City'),
					createTextField('Postcode', 'postcode', 'patient', ['update'], '', 'Postcode'),
					createTextField('Country', 'country', 'patient', ['update'], '', 'Country'),
				],
				'Patient\'s address information'
			),
			createCollectionField(
				'Emergency Contact',
				'emergencyContact',
				'patient',
				['update'],
				[
					createTextField('Name', 'name', 'patient', ['update'], '', 'Emergency contact name'),
					createPhoneField('Phone', 'phone', 'patient', ['update'], '', 'Emergency contact phone'),
					createTextField('Relationship', 'relationship', 'patient', ['update'], '', 'Relationship to patient'),
				],
				'Emergency contact information'
			),
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                patient:delete                            */
	/* -------------------------------------------------------------------------- */
	createIdField(
		'Patient ID',
		'patientId',
		'patient',
		['delete'],
		'The ID of the patient to delete'
	),
];
