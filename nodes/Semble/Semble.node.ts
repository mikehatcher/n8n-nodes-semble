import {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

import { sembleApiRequest } from './GenericFunctions';

import { appointmentOperations, appointmentFields } from './descriptions/AppointmentDescription';
import { patientOperations, patientFields } from './descriptions/PatientDescription';
import { staffOperations, staffFields } from './descriptions/StaffDescription';

export class Semble implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Semble',
		name: 'semble',
		icon: 'file:semble.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Semble practice management system',
		defaults: {
			name: 'Semble',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'sembleApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Appointment',
						value: 'appointment',
					},
					{
						name: 'Patient',
						value: 'patient',
					},
					{
						name: 'Staff',
						value: 'staff',
					},
				],
				default: 'appointment',
			},

			// Appointment operations
			...appointmentOperations,
			...appointmentFields,

			// Patient operations
			...patientOperations,
			...patientFields,

			// Staff operations
			...staffOperations,
			...staffFields,
		],
	};

	methods = {
		loadOptions: {
			// Load staff members for appointment assignments
			async getStaff(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				
				const query = `
					query GetStaff {
						staff {
							id
							firstName
							lastName
						}
					}
				`;
				
				const response = await sembleApiRequest.call(this, query);
				const staff = response.data.staff || [];
				
				for (const member of staff) {
					returnData.push({
						name: `${member.firstName} ${member.lastName}`,
						value: member.id,
					});
				}
				
				return returnData;
			},

			// Load appointment types
			async getAppointmentTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				
				const query = `
					query GetAppointmentTypes {
						appointmentTypes {
							id
							name
						}
					}
				`;
				
				const response = await sembleApiRequest.call(this, query);
				const types = response.data.appointmentTypes || [];
				
				for (const type of types) {
					returnData.push({
						name: type.name,
						value: type.id,
					});
				}
				
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'appointment') {
					// Appointment operations
					if (operation === 'create') {
						const patientId = this.getNodeParameter('patientId', i) as string;
						const staffId = this.getNodeParameter('staffId', i) as string;
						const appointmentTypeId = this.getNodeParameter('appointmentTypeId', i) as string;
						const startTime = this.getNodeParameter('startTime', i) as string;
						const endTime = this.getNodeParameter('endTime', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const mutation = `
							mutation CreateAppointment($input: CreateAppointmentInput!) {
								createAppointment(input: $input) {
									id
									patientId
									staffId
									appointmentTypeId
									startTime
									endTime
									status
									notes
								}
							}
						`;

						const variables = {
							input: {
								patientId,
								staffId,
								appointmentTypeId,
								startTime,
								endTime,
								...additionalFields,
							},
						};

						const response = await sembleApiRequest.call(this, mutation, variables);
						responseData = response.data.createAppointment;
					}

					if (operation === 'get') {
						const appointmentId = this.getNodeParameter('appointmentId', i) as string;
						
						const query = `
							query GetAppointment($id: ID!) {
								appointment(id: $id) {
									id
									patientId
									staffId
									appointmentTypeId
									startTime
									endTime
									status
									notes
									patient {
										id
										firstName
										lastName
										email
									}
									staff {
										id
										firstName
										lastName
									}
								}
							}
						`;

						const variables = { id: appointmentId };
						const response = await sembleApiRequest.call(this, query, variables);
						responseData = response.data.appointment;
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						
						let query = `
							query GetAppointments($limit: Int, $offset: Int) {
								appointments(limit: $limit, offset: $offset) {
									id
									patientId
									staffId
									appointmentTypeId
									startTime
									endTime
									status
									notes
									patient {
										id
										firstName
										lastName
										email
									}
									staff {
										id
										firstName
										lastName
									}
								}
							}
						`;

						const variables: IDataObject = {};
						if (!returnAll) {
							variables.limit = this.getNodeParameter('limit', i) as number;
						}

						// Apply filters if provided
						Object.assign(variables, filters);

						const response = await sembleApiRequest.call(this, query, variables);
						responseData = response.data.appointments;
					}

					if (operation === 'update') {
						const appointmentId = this.getNodeParameter('appointmentId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						
						const mutation = `
							mutation UpdateAppointment($id: ID!, $input: UpdateAppointmentInput!) {
								updateAppointment(id: $id, input: $input) {
									id
									patientId
									staffId
									appointmentTypeId
									startTime
									endTime
									status
									notes
								}
							}
						`;

						const variables = {
							id: appointmentId,
							input: updateFields,
						};

						const response = await sembleApiRequest.call(this, mutation, variables);
						responseData = response.data.updateAppointment;
					}

					if (operation === 'delete') {
						const appointmentId = this.getNodeParameter('appointmentId', i) as string;
						
						const mutation = `
							mutation DeleteAppointment($id: ID!) {
								deleteAppointment(id: $id) {
									success
									message
								}
							}
						`;

						const variables = { id: appointmentId };
						const response = await sembleApiRequest.call(this, mutation, variables);
						responseData = response.data.deleteAppointment;
					}
				}

				if (resource === 'patient') {
					// Patient operations
					if (operation === 'create') {
						const firstName = this.getNodeParameter('firstName', i) as string;
						const lastName = this.getNodeParameter('lastName', i) as string;
						const email = this.getNodeParameter('email', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const mutation = `
							mutation CreatePatient($input: CreatePatientInput!) {
								createPatient(input: $input) {
									id
									firstName
									lastName
									email
									phone
									dateOfBirth
									address {
										street
										city
										state
										postcode
										country
									}
									emergencyContact {
										name
										phone
									}
								}
							}
						`;

						const variables = {
							input: {
								firstName,
								lastName,
								email,
								...additionalFields,
							},
						};

						const response = await sembleApiRequest.call(this, mutation, variables);
						responseData = response.data.createPatient;
					}

					if (operation === 'get') {
						const patientId = this.getNodeParameter('patientId', i) as string;
						
						const query = `
							query GetPatient($id: ID!) {
								patient(id: $id) {
									id
									firstName
									lastName
									email
									phone
									dateOfBirth
									address {
										street
										city
										state
										postcode
										country
									}
									emergencyContact {
										name
										phone
									}
									appointments {
										id
										startTime
										endTime
										status
									}
								}
							}
						`;

						const variables = { id: patientId };
						const response = await sembleApiRequest.call(this, query, variables);
						responseData = response.data.patient;
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						
						const query = `
							query GetPatients($limit: Int, $offset: Int) {
								patients(limit: $limit, offset: $offset) {
									id
									firstName
									lastName
									email
									phone
									dateOfBirth
									address {
										street
										city
										state
										postcode
										country
									}
								}
							}
						`;

						const variables: IDataObject = {};
						if (!returnAll) {
							variables.limit = this.getNodeParameter('limit', i) as number;
						}

						// Apply filters if provided
						Object.assign(variables, filters);

						const response = await sembleApiRequest.call(this, query, variables);
						responseData = response.data.patients;
					}

					if (operation === 'update') {
						const patientId = this.getNodeParameter('patientId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						
						const mutation = `
							mutation UpdatePatient($id: ID!, $input: UpdatePatientInput!) {
								updatePatient(id: $id, input: $input) {
									id
									firstName
									lastName
									email
									phone
									dateOfBirth
									address {
										street
										city
										state
										postcode
										country
									}
								}
							}
						`;

						const variables = {
							id: patientId,
							input: updateFields,
						};

						const response = await sembleApiRequest.call(this, mutation, variables);
						responseData = response.data.updatePatient;
					}
				}

				if (resource === 'staff') {
					// Staff operations
					if (operation === 'get') {
						const staffId = this.getNodeParameter('staffId', i) as string;
						
						const query = `
							query GetStaff($id: ID!) {
								staff(id: $id) {
									id
									firstName
									lastName
									email
									role
									specialties
									schedule {
										dayOfWeek
										startTime
										endTime
									}
								}
							}
						`;

						const variables = { id: staffId };
						const response = await sembleApiRequest.call(this, query, variables);
						responseData = response.data.staff;
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						
						const query = `
							query GetAllStaff($limit: Int, $offset: Int) {
								staff(limit: $limit, offset: $offset) {
									id
									firstName
									lastName
									email
									role
									specialties
								}
							}
						`;

						const variables: IDataObject = {};
						if (!returnAll) {
							variables.limit = this.getNodeParameter('limit', i) as number;
						}

						const response = await sembleApiRequest.call(this, query, variables);
						responseData = response.data.staff;
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else if (responseData !== undefined) {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as Error).message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
