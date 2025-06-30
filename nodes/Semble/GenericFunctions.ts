import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

import { IDataObject, NodeApiError, IHttpRequestOptions, IHttpRequestMethods } from 'n8n-workflow';

export async function sembleApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	query: string,
	variables: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('sembleApi');

	const options: IHttpRequestOptions = {
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
			'x-token': credentials.apiToken as string,
		},
		method: 'POST',
		body: {
			query,
			variables,
		},
		url: credentials.baseUrl as string,
		json: true,
	};

	try {
		const response = await this.helpers.httpRequest(options);
		
		if (response.errors) {
			throw new NodeApiError(this.getNode(), { 
				message: `GraphQL Error: ${response.errors[0].message}`,
				description: response.errors.map((err: any) => err.message).join(', ')
			});
		}
		
		return response.data;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as any);
	}
}

export async function sembleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	query: string,
	variables: IDataObject = {},
): Promise<any> {
	// For GraphQL, we'll need to implement cursor-based pagination
	// This is a simplified version - actual implementation depends on Semble's schema
	return await sembleApiRequest.call(this, query, variables);
}
