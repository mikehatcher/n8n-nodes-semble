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

import { sembleApiRequest, sembleApiRequestAllItems } from './GenericFunctions';

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
				const staff = await sembleApiRequest.call(this, 'GET', '/api/staff');
				
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
				const types = await sembleApiRequest.call(this, 'GET', '/api/appointment-types');
				
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
		const qs: IDataObject = {};
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'appointment') {
					// Appointment operations
					if (operation === 'create') {
						const body: IDataObject = {};
						body.patientId = this.getNodeParameter('patientId', i) as string;
						body.staffId = this.getNodeParameter('staffId', i) as string;
						body.appointmentTypeId = this.getNodeParameter('appointmentTypeId', i) as string;
						body.startTime = this.getNodeParameter('startTime', i) as string;
						body.endTime = this.getNodeParameter('endTime', i) as string;
						
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(body, additionalFields);

						responseData = await sembleApiRequest.call(this, 'POST', '/api/appointments', body);
					}

					if (operation === 'get') {
						const appointmentId = this.getNodeParameter('appointmentId', i) as string;
						responseData = await sembleApiRequest.call(this, 'GET', `/api/appointments/${appointmentId}`);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						Object.assign(qs, filters);

						if (returnAll) {
							responseData = await sembleApiRequestAllItems.call(this, 'appointments', 'GET', '/api/appointments', {}, qs);
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;
							responseData = await sembleApiRequest.call(this, 'GET', '/api/appointments', {}, qs);
						}
					}

					if (operation === 'update') {
						const appointmentId = this.getNodeParameter('appointmentId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						
						responseData = await sembleApiRequest.call(this, 'PUT', `/api/appointments/${appointmentId}`, updateFields);
					}

					if (operation === 'delete') {
						const appointmentId = this.getNodeParameter('appointmentId', i) as string;
						responseData = await sembleApiRequest.call(this, 'DELETE', `/api/appointments/${appointmentId}`);
						responseData = { success: true };
					}
				}

				if (resource === 'patient') {
					// Patient operations
					if (operation === 'create') {
						const body: IDataObject = {};
						body.firstName = this.getNodeParameter('firstName', i) as string;
						body.lastName = this.getNodeParameter('lastName', i) as string;
						body.email = this.getNodeParameter('email', i) as string;
						
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(body, additionalFields);

						responseData = await sembleApiRequest.call(this, 'POST', '/api/patients', body);
					}

					if (operation === 'get') {
						const patientId = this.getNodeParameter('patientId', i) as string;
						responseData = await sembleApiRequest.call(this, 'GET', `/api/patients/${patientId}`);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						Object.assign(qs, filters);

						if (returnAll) {
							responseData = await sembleApiRequestAllItems.call(this, 'patients', 'GET', '/api/patients', {}, qs);
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;
							responseData = await sembleApiRequest.call(this, 'GET', '/api/patients', {}, qs);
						}
					}

					if (operation === 'update') {
						const patientId = this.getNodeParameter('patientId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						
						responseData = await sembleApiRequest.call(this, 'PUT', `/api/patients/${patientId}`, updateFields);
					}
				}

				if (resource === 'staff') {
					// Staff operations
					if (operation === 'get') {
						const staffId = this.getNodeParameter('staffId', i) as string;
						responseData = await sembleApiRequest.call(this, 'GET', `/api/staff/${staffId}`);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await sembleApiRequestAllItems.call(this, 'staff', 'GET', '/api/staff');
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;
							responseData = await sembleApiRequest.call(this, 'GET', '/api/staff', {}, qs);
						}
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
