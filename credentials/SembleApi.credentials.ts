import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SembleApi implements ICredentialType {
	name = 'sembleApi';
	displayName = 'Semble API';
	documentationUrl = 'https://docs.semble.io/';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'The API token for your Semble account (JWT token from Semble app settings)',
			required: true,
		},
		{
			displayName: 'GraphQL Endpoint',
			name: 'baseUrl',
			type: 'string',
			default: 'https://open.semble.io/graphql',
			description: 'The GraphQL endpoint for the Semble API',
			required: true,
		},
	];

	// Use generic authentication with x-token header
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-token': '={{$credentials.apiToken}}',
				'Content-Type': 'application/json',
			},
		},
	};

	// Test the connection with GraphQL introspection
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '',
			method: 'POST',
			body: {
				query: 'query { __schema { types { name } } }',
			},
		},
	};
}
