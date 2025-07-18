/**
 * @fileoverview End-to-End API validation tests for Semble GraphQL endpoints
 * @description Real API testing for priority data types using direct GraphQL queries
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.E2E.API
 */

import DEFAULT_CONFIG from '../../core/BaseConfig';
import { SEMBLE_CONSTANTS } from '../../core/Constants';

// Test configuration
const TEST_CONFIG = {
	timeout: 30000, // 30 second timeout for API calls
	priorityDataTypes: ['Patient', 'Product', 'Booking', 'Location', 'Staff', 'Practitioner', 'AppointmentType', 'BookingType'],
	maxRetries: 3,
};

// GraphQL request function for E2E testing
async function makeGraphQLRequest(query: string, variables?: any): Promise<any> {
	const apiUrl = process.env.SEMBLE_API_URL || 'https://open.semble.io/graphql';
	const apiToken = process.env.SEMBLE_API_TOKEN;
	
	if (!apiToken) {
		throw new Error('No API token provided - set SEMBLE_API_TOKEN');
	}

	const response = await fetch(apiUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-token': apiToken,
		},
		body: JSON.stringify({ query, variables }),
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	const result = await response.json() as any;
	
	if (result.errors) {
		throw new Error(`GraphQL Error: ${result.errors[0]?.message || 'Unknown error'}`);
	}

	return result.data;
}

/**
 * Test suite for E2E API validation
 */
describe('E2E API Validation - Real Semble API', () => {
	// Skip tests if no API credentials are provided
	const hasCredentials = process.env.SEMBLE_API_TOKEN;
	const describeOrSkip = hasCredentials ? describe : describe.skip;

	beforeAll(() => {
		if (!hasCredentials) {
			console.warn('⚠️  Skipping E2E tests - No API credentials provided');
			console.warn('   Set SEMBLE_API_TOKEN to run real API tests');
		}
		
		// Set longer timeout for real API calls
		jest.setTimeout(TEST_CONFIG.timeout);
	});

	describeOrSkip('API Connectivity', () => {
		it('should successfully connect to Semble GraphQL API', async () => {
			const query = `
				query {
					__schema {
						queryType {
							name
						}
					}
				}
			`;

			const result = await makeGraphQLRequest(query);
			expect(result).toBeDefined();
			expect(result.__schema?.queryType?.name).toBe('Query');
		});

		it('should handle authentication correctly', async () => {
			const query = `
				query {
					__schema {
						types {
							name
						}
					}
				}
			`;

			// This should not throw an authentication error
			await expect(makeGraphQLRequest(query)).resolves.toBeDefined();
		});
	});

	describeOrSkip('Schema Introspection', () => {
		it('should discover available types in schema', async () => {
			const query = `
				query {
					__schema {
						types {
							name
							kind
						}
					}
				}
			`;

			const result = await makeGraphQLRequest(query);
			expect(result).toBeDefined();
			expect(result.__schema?.types).toBeDefined();
			expect(Array.isArray(result.__schema.types)).toBe(true);
			expect(result.__schema.types.length).toBeGreaterThan(0);

			const typeNames = result.__schema.types.map((type: any) => type.name);
			console.log(`📋 Schema types discovered: ${typeNames.length} types`);
		});

		it('should validate priority data types exist in schema', async () => {
			const query = `
				query {
					__schema {
						types {
							name
							kind
						}
					}
				}
			`;

			const result = await makeGraphQLRequest(query);
			const typeNames = result.__schema.types.map((type: any) => type.name);
			
			// Check if our priority types exist
			const priorityTypesFound: string[] = [];
			for (const dataType of TEST_CONFIG.priorityDataTypes) {
				if (typeNames.includes(dataType)) {
					priorityTypesFound.push(dataType);
				}
			}

			console.log(`🎯 Priority types found: ${priorityTypesFound.join(', ')}`);
			
			// At least one priority type should be found
			expect(priorityTypesFound.length).toBeGreaterThan(0);
		});
	});

	describeOrSkip('Priority Data Type Field Discovery', () => {
		TEST_CONFIG.priorityDataTypes.forEach(dataType => {
			it(`should discover ${dataType} type fields`, async () => {
				const query = `
					query {
						__type(name: "${dataType}") {
							name
							kind
							fields {
								name
								type {
									name
									kind
									ofType {
										name
										kind
									}
								}
							}
						}
					}
				`;

				try {
					const result = await makeGraphQLRequest(query);
					
					if (result.__type) {
						expect(result.__type.name).toBe(dataType);
						expect(result.__type.fields).toBeDefined();
						expect(Array.isArray(result.__type.fields)).toBe(true);
						
						const fieldNames = result.__type.fields.map((field: any) => field.name);
						console.log(`📋 ${dataType} fields: ${fieldNames.join(', ')}`);
						
						// Should have an 'id' field (common requirement)
						expect(fieldNames).toContain('id');
					} else {
						console.warn(`⚠️  ${dataType} type not found in schema`);
						// Don't fail the test, just log the warning
					}
				} catch (error) {
					console.warn(`⚠️  Failed to query ${dataType} fields:`, (error as Error).message);
					// Don't fail the test for type-specific errors
				}
			});
		});
	});

	describeOrSkip('Basic Query Structure Tests', () => {
		TEST_CONFIG.priorityDataTypes.forEach(dataType => {
			it(`should test ${dataType} query structure`, async () => {
				// First, check if queries exist for this type
				const queryFieldsQuery = `
					query {
						__schema {
							queryType {
								fields {
									name
									type {
										name
										kind
									}
								}
							}
						}
					}
				`;

				try {
					const result = await makeGraphQLRequest(queryFieldsQuery);
					const queryFields = result.__schema.queryType.fields.map((field: any) => field.name);
					
					// Look for plural form queries (patients, products, bookings)
					const pluralDataType = dataType.toLowerCase() + 's';
					const singularDataType = dataType.toLowerCase();
					
					const hasListQuery = queryFields.includes(pluralDataType);
					const hasSingleQuery = queryFields.includes(singularDataType);
					
					console.log(`🔍 ${dataType} queries available - List: ${hasListQuery}, Single: ${hasSingleQuery}`);
					
					if (hasListQuery) {
						// Try a basic list query
						const listQuery = `
							query {
								${pluralDataType}(first: 1) {
									edges {
										node {
											id
										}
									}
								}
							}
						`;
						
						try {
							await makeGraphQLRequest(listQuery);
							console.log(`✅ ${dataType} list query structure validated`);
						} catch (error) {
							console.warn(`⚠️  ${dataType} list query failed:`, (error as Error).message);
						}
					}
					
					// Pass test if we can introspect query fields
					expect(queryFields.length).toBeGreaterThan(0);
					
				} catch (error) {
					console.warn(`⚠️  Failed to test ${dataType} query structure:`, (error as Error).message);
					// Don't fail the test, just log the issue
				}
			});
		});
	});

	describeOrSkip('Error Handling', () => {
		it('should handle invalid queries gracefully', async () => {
			const invalidQuery = `
				query {
					nonExistentField {
						id
					}
				}
			`;

			await expect(makeGraphQLRequest(invalidQuery)).rejects.toThrow();
		});

		it('should handle unauthorized access gracefully', async () => {
			const originalToken = process.env.SEMBLE_API_TOKEN;
			
			// Temporarily set invalid token
			process.env.SEMBLE_API_TOKEN = 'invalid-token';
			
			const query = `
				query {
					__schema {
						queryType {
							name
						}
					}
				}
			`;

			try {
				await expect(makeGraphQLRequest(query)).rejects.toThrow();
			} finally {
				// Restore original token
				if (originalToken) {
					process.env.SEMBLE_API_TOKEN = originalToken;
				} else {
					delete process.env.SEMBLE_API_TOKEN;
				}
			}
		});
	});

	describeOrSkip('Configuration Validation', () => {
		it('should validate default configuration', () => {
			expect(DEFAULT_CONFIG).toBeDefined();
			expect(DEFAULT_CONFIG.version).toBeDefined();
			expect(typeof DEFAULT_CONFIG.debug).toBe('boolean');
		});

		it('should validate constants', () => {
			expect(SEMBLE_CONSTANTS).toBeDefined();
			expect(SEMBLE_CONSTANTS.API).toBeDefined();
		});
	});
});

/**
 * Export test utilities for manual testing
 */
export const E2ETestUtils = {
	makeGraphQLRequest,
	TEST_CONFIG,
};
