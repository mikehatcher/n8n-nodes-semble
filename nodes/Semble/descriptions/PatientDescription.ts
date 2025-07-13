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
	createTextFieldNoDisplay,
	createEmailField,
	createEmailFieldNoDisplay,
	createPhoneField,
	createPhoneFieldNoDisplay,
	createDateField,
	createDateFieldNoDisplay,
	createBooleanField,
	createBooleanFieldNoDisplay,
	createDisplayOptions,
	createStaticOptionsField,
	createStaticOptionsFieldNoDisplay,
	createCollectionField,
	createCollectionFieldNoDisplay,
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
				name: 'Delete',
				value: 'delete',
				description: 'Remove a patient record permanently',
				action: 'Delete a patient',
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
		],
		default: 'create',
		description: 'Patient management operation: create new records, retrieve existing data, update information, or delete records from your Semble practice',
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
		displayName: 'Phone Type',
		name: 'phoneType',
		type: 'string',
		default: 'Mobile',
		displayOptions: createDisplayOptions('patient', ['create']),
		placeholder: 'Mobile, Office, Home, Fax, Other',
		description: 'The type of phone number. Valid values: Mobile, Office, Home, Fax, Other',
		required: true,
	},

	createDateField(
		'Date of Birth',
		'dateOfBirth',
		'patient',
		['create'],
		'',
		'The patient\'s date of birth (YYYY-MM-DD format)',
		true
	),

	createTextField(
		'Title',
		'title',
		'patient',
		['create'],
		'',
		'The patient\'s title (e.g., Mr, Mrs, Dr)',
		false
	),

	{
		displayName: 'Gender',
		name: 'gender',
		type: 'string',
		default: '',
		displayOptions: createDisplayOptions('patient', ['create']),
		placeholder: 'male, female, other, prefer_not_to_say (optional)',
		description: 'The patient\'s gender. Valid values: male, female, other, prefer_not_to_say. Leave blank if not specified.',
		required: false,
	},

	{
		displayName: 'Sex',
		name: 'sex',
		type: 'string',
		default: '',
		displayOptions: createDisplayOptions('patient', ['create']),
		placeholder: 'male, female, other (optional)',
		description: 'The patient\'s biological sex. Valid values: male, female, other. Leave blank if not specified.',
		required: false,
	},

	createTextField(
		'Birth Surname',
		'birthSurname',
		'patient',
		['create'],
		'',
		'The patient\'s birth surname (if different from current)',
		false
	),

	createTextField(
		'Birth Name',
		'birthName',
		'patient',
		['create'],
		'',
		'The patient\'s birth name',
		false
	),

	createTextField(
		'Birth Names',
		'birthNames',
		'patient',
		['create'],
		'',
		'The patient\'s birth names',
		false
	),

	createTextField(
		'Place of Birth',
		'placeOfBirth',
		'patient',
		['create'],
		'',
		'The patient\'s place of birth',
		false
	),

	createTextField(
		'Social Security Number',
		'socialSecurityNumber',
		'patient',
		['create'],
		'',
		'The patient\'s social security number',
		false
	),

	createTextField(
		'Occupation',
		'occupation',
		'patient',
		['create'],
		'',
		'The patient\'s occupation',
		false
	),

	createTextField(
		'Address',
		'address',
		'patient',
		['create'],
		'',
		'The patient\'s address',
		false
	),

	createTextField(
		'City',
		'city',
		'patient',
		['create'],
		'',
		'The patient\'s city',
		false
	),

	createTextField(
		'Postcode',
		'postcode',
		'patient',
		['create'],
		'',
		'The patient\'s postcode',
		false
	),

	createTextField(
		'Country',
		'country',
		'patient',
		['create'],
		'',
		'The patient\'s country',
		false
	),

	createTextField(
		'Comments',
		'comments',
		'patient',
		['create'],
		'',
		'Additional comments about the patient',
		false
	),

	createTextField(
		'On Hold',
		'onHold',
		'patient',
		['create'],
		'',
		'Whether the patient account is on hold (true, false, yes, no)'
	),

	createTextField(
		'Emergency Contact Name',
		'emergencyContactName',
		'patient',
		['create'],
		'',
		'Emergency contact name',
		false
	),

	createPhoneField(
		'Emergency Contact Phone',
		'emergencyContactPhone',
		'patient',
		['create'],
		'',
		'Emergency contact phone number',
		false
	),

	createTextField(
		'Emergency Contact Relationship',
		'emergencyContactRelationship',
		'patient',
		['create'],
		'',
		'Relationship to patient',
		false
	),

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
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: createDisplayOptions('patient', ['getAll']),
		options: [
			createTextFieldNoDisplay(
				'Search',
				'search',
				'',
				'Search patients by name, email, or phone number'
			),
			{
				displayName: 'Date Period',
				name: 'datePeriod',
				type: 'options',
				default: '1m',
				options: [
					{
						name: '1 Day',
						value: '1d',
						description: 'Patients created/updated in the last 24 hours',
					},
					{
						name: '1 Week',
						value: '1w',
						description: 'Patients created/updated in the last 7 days',
					},
					{
						name: '1 Month',
						value: '1m',
						description: 'Patients created/updated in the last 30 days',
					},
					{
						name: '3 Months',
						value: '3m',
						description: 'Patients created/updated in the last 90 days',
					},
					{
						name: '6 Months',
						value: '6m',
						description: 'Patients created/updated in the last 180 days',
					},
					{
						name: '12 Months',
						value: '12m',
						description: 'Patients created/updated in the last 365 days',
					},
					{
						name: 'All Records',
						value: 'all',
						description: 'All patients regardless of creation/update date',
					},
				],
				description: 'Time period to filter patients by creation/update date. Uses the same efficient date filtering as triggers.',
			},
			{
				displayName: 'Date Field',
				name: 'dateField',
				type: 'options',
				default: 'updatedAt',
				displayOptions: {
					show: {
						datePeriod: ['1d', '1w', '1m', '3m', '6m', '12m'],
					},
				},
				options: [
					{
						name: 'Created Date',
						value: 'createdAt',
						description: 'Filter by when the patient was created',
					},
					{
						name: 'Updated Date',
						value: 'updatedAt',
						description: 'Filter by when the patient was last updated',
					},
				],
				description: 'Whether to filter by creation date or last update date',
			},
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
			createTextFieldNoDisplay(
				'First Name',
				'firstName',
				'',
				'The patient\'s first name'
			),
			createTextFieldNoDisplay(
				'Last Name',
				'lastName',
				'',
				'The patient\'s last name'
			),
			createEmailFieldNoDisplay(
				'Email',
				'email',
				'',
				'The patient\'s email address'
			),
			createDateFieldNoDisplay(
				'Date of Birth',
				'dateOfBirth',
				'',
				'The patient\'s date of birth (YYYY-MM-DD format)'
			),
			createStaticOptionsFieldNoDisplay(
				'Gender',
				'gender',
				GENDER_OPTIONS,
				'',
				'The patient\'s gender'
			),
			createTextFieldNoDisplay(
				'Sex',
				'sex',
				'',
				'The patient\'s biological sex'
			),
			createTextFieldNoDisplay(
				'Birth Surname',
				'birthSurname',
				'',
				'The patient\'s surname at birth'
			),
			createTextFieldNoDisplay(
				'Birth Name',
				'birthName',
				'',
				'The patient\'s full name at birth'
			),
			createTextFieldNoDisplay(
				'Social Security Number',
				'socialSecurityNumber',
				'',
				'The patient\'s social security number'
			),
			createTextFieldNoDisplay(
				'Occupation',
				'occupation',
				'',
				'The patient\'s occupation'
			),
			createTextFieldNoDisplay(
				'Membership Name',
				'membershipName',
				'',
				'The patient\'s membership type'
			),
			createTextFieldNoDisplay(
				'On Hold',
				'onHold',
				'',
				'Whether the patient account is on hold (true, false, yes, no)'
			),
			createTextFieldNoDisplay(
				'Title',
				'title',
				'',
				'Patient title (Mr, Mrs, Dr, etc.)'
			),
			createTextFieldNoDisplay(
				'Address',
				'address',
				'',
				'Patient\'s street address'
			),
			createTextFieldNoDisplay(
				'City',
				'city',
				'',
				'Patient\'s city'
			),
			createTextFieldNoDisplay(
				'Postcode',
				'postcode',
				'',
				'Patient\'s postcode'
			),
			createTextFieldNoDisplay(
				'Country',
				'country',
				'',
				'Patient\'s country'
			),
			createTextFieldNoDisplay(
				'Payment Reference',
				'paymentReference',
				'',
				'Patient\'s payment reference'
			),
			createTextFieldNoDisplay(
				'Comments',
				'comments',
				'',
				'Additional comments about the patient'
			),
			createCollectionFieldNoDisplay(
				'Place of Birth',
				'placeOfBirth',
				[
					createTextFieldNoDisplay('Name', 'name', '', 'Name of birth place'),
					createTextFieldNoDisplay('Code', 'code', '', 'Code of birth place'),
				],
				'Patient\'s place of birth information'
			),
			createCollectionFieldNoDisplay(
				'Communication Preferences',
				'communicationPreferences',
				[
					createBooleanFieldNoDisplay('Receive Email', 'receiveEmail', true, 'Whether to receive email communications'),
					createBooleanFieldNoDisplay('Receive SMS', 'receiveSMS', true, 'Whether to receive SMS communications'),
					createBooleanFieldNoDisplay('Promotional Marketing', 'promotionalMarketing', false, 'Whether to receive promotional marketing'),
					createBooleanFieldNoDisplay('Payment Reminders', 'paymentReminders', true, 'Whether to receive payment reminders'),
				],
				'Patient\'s communication preferences'
			),
			createCollectionFieldNoDisplay(
				'Patient Numbers',
				'numbers',
				[
					createTextFieldNoDisplay('Name', 'name', '', 'Name of the number field'),
					createTextFieldNoDisplay('Value', 'value', '', 'Value of the number field'),
				],
				'Custom patient number fields'
			),
			createCollectionFieldNoDisplay(
				'Custom Attributes',
				'customAttributes',
				[
					createTextFieldNoDisplay('Title', 'title', '', 'Title of the custom attribute'),
					createTextFieldNoDisplay('Text', 'text', '', 'Text content of the custom attribute'),
					createTextFieldNoDisplay('Response', 'response', '', 'Response value for the custom attribute'),
					createBooleanFieldNoDisplay('Required', 'required', false, 'Whether this custom attribute is required'),
				],
				'Custom patient attributes'
			),
			// Unsupported fields - shown for reference but not functional
			{
				displayName: 'Phone (Not Supported)',
				name: 'phone',
				type: 'string',
				default: '',
				placeholder: '⚠️ Not supported in updates - use create operation instead',
				description: 'Phone field is not supported in update operations. Phone numbers can only be set during patient creation. This field will be ignored if provided.',
			},
			{
				displayName: 'Emergency Contact (Not Supported)',
				name: 'emergencyContact',
				type: 'collection',
				default: {},
				placeholder: '⚠️ Not supported in updates',
				description: 'Emergency contact information is not supported in update operations. This can only be set during patient creation. These fields will be ignored if provided.',
				options: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: '⚠️ Not supported in updates',
						description: 'This field will be ignored in update operations',
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
						placeholder: '⚠️ Not supported in updates',
						description: 'This field will be ignored in update operations',
					},
					{
						displayName: 'Relationship',
						name: 'relationship',
						type: 'string',
						default: '',
						placeholder: '⚠️ Not supported in updates',
						description: 'This field will be ignored in update operations',
					},
				],
			},
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
