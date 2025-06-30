import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

import { IDataObject, NodeApiError, IHttpRequestOptions, IHttpRequestMethods } from 'n8n-workflow';

export async function sembleApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('sembleApi');

	let options: IHttpRequestOptions = {
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${credentials.apiKey}`,
		},
		method,
		qs,
		body,
		url: uri || `${credentials.baseUrl}${resource}`,
		json: true,
	};

	options = Object.assign({}, options, option);

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.httpRequest(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as any);
	}
}

export async function sembleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 1;
	query.per_page = 100;

	do {
		responseData = await sembleApiRequest.call(this, method, endpoint, body, query);
		
		if (responseData[propertyName]) {
			returnData.push.apply(returnData, responseData[propertyName]);
		} else if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData);
		} else {
			returnData.push(responseData);
		}

		query.page++;
	} while (
		responseData.meta &&
		responseData.meta.pagination &&
		responseData.meta.pagination.current_page < responseData.meta.pagination.total_pages
	);

	return returnData;
}
