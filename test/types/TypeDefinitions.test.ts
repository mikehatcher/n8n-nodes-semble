/**
 * @fileoverview Test suite for TypeScript type definitions
 * @description Comprehensive unit tests for all Semble API type definitions, n8n integrations, and configuration types
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Types
 * @since 2.0.0
 */

import { 
	SemblePatient, 
	SembleBooking, 
	SembleProduct,
	SembleProductTax,
	SembleProductLabel,
	SembleProductInput,
	SembleGraphQLResponse, 
	SemblePermissionError,
	SembleResourceType 
} from '../../types/SembleTypes';

import { 
	SembleActionType, 
	SembleTriggerEventType, 
	SembleExecutionContext,
	SembleOperationResult 
} from '../../types/NodeTypes';

import { 
	CacheConfig, 
	GlobalConfig, 
	ServiceConfig 
} from '../../types/ConfigTypes';

describe('SembleTypes', () => {
	describe('SemblePatient', () => {
		it('should validate required fields', () => {
			const patient: SemblePatient = {
				id: 'test-id',
				firstName: 'John',
				lastName: 'Doe',
				createdAt: '2025-01-01T00:00:00Z',
				updatedAt: '2025-01-01T00:00:00Z'
			};

			expect(patient.id).toBe('test-id');
			expect(patient.firstName).toBe('John');
			expect(patient.lastName).toBe('Doe');
		});

		it('should allow optional fields', () => {
			const patient: SemblePatient = {
				id: 'test-id',
				firstName: 'John',
				lastName: 'Doe',
				email: 'john@example.com',
				phone: '+1234567890',
				gender: 'male',
				createdAt: '2025-01-01T00:00:00Z',
				updatedAt: '2025-01-01T00:00:00Z'
			};

			expect(patient.email).toBe('john@example.com');
			expect(patient.gender).toBe('male');
		});

		it('should validate gender enum values', () => {
			// This test ensures TypeScript compiler catches invalid gender values
			const validGenders: Array<SemblePatient['gender']> = [
				'male', 'female', 'other', 'prefer-not-to-say', undefined
			];

			validGenders.forEach(gender => {
				const patient: Partial<SemblePatient> = { gender };
				expect([
'male', 'female', 'other', 'prefer-not-to-say', undefined
]).toContain(patient.gender);
			});
		});
	});

	describe('SembleBooking', () => {
		it('should validate booking status enum', () => {
			const validStatuses: Array<SembleBooking['status']> = [
				'confirmed', 'cancelled', 'completed', 'no-show', 'pending'
			];

			validStatuses.forEach(status => {
				const booking: Partial<SembleBooking> = { status };
				expect([
'confirmed', 'cancelled', 'completed', 'no-show', 'pending'
]).toContain(booking.status);
			});
		});
	});

	describe('SembleProduct', () => {
		it('should validate required fields', () => {
			const product: SembleProduct = {
				id: 'product-123',
				name: 'Test Product',
				createdAt: '2025-01-01T00:00:00Z',
				updatedAt: '2025-01-01T00:00:00Z'
			};

			expect(product.id).toBe('product-123');
			expect(product.name).toBe('Test Product');
			expect(product.createdAt).toBeDefined();
			expect(product.updatedAt).toBeDefined();
		});

		it('should allow optional fields', () => {
			const product: SembleProduct = {
				id: 'product-123',
				name: 'Test Product',
				itemCode: 'TEST001',
				productType: 'service',
				price: 99.99,
				cost: 49.99,
				stockLevel: 10,
				isBookable: true,
				duration: 60,
				requiresPayment: true,
				createdAt: '2025-01-01T00:00:00Z',
				updatedAt: '2025-01-01T00:00:00Z'
			};

			expect(product.itemCode).toBe('TEST001');
			expect(product.price).toBe(99.99);
			expect(product.isBookable).toBe(true);
		});

		it('should handle complex nested objects', () => {
			const tax: SembleProductTax = {
				taxName: 'VAT',
				taxRate: 0.2,
				taxCode: 'VAT20'
			};

			const label: SembleProductLabel = {
				id: 'label-1',
				name: 'Premium',
				color: '#FF0000'
			};

			const product: SembleProduct = {
				id: 'product-123',
				name: 'Test Product',
				tax,
				labels: [label],
				createdAt: '2025-01-01T00:00:00Z',
				updatedAt: '2025-01-01T00:00:00Z'
			};

			expect(product.tax?.taxName).toBe('VAT');
			expect(product.labels?.[0].name).toBe('Premium');
		});
	});

	describe('SembleProductInput', () => {
		it('should validate input requirements', () => {
			const productInput: SembleProductInput = {
				name: 'New Product'
			};

			expect(productInput.name).toBe('New Product');
		});

		it('should allow all optional fields', () => {
			const productInput: SembleProductInput = {
				name: 'Complete Product',
				itemCode: 'COMP001',
				price: 199.99,
				isBookable: true,
				duration: 90
			};

			expect(productInput.itemCode).toBe('COMP001');
			expect(productInput.price).toBe(199.99);
			expect(productInput.duration).toBe(90);
		});
	});

	describe('SembleGraphQLResponse', () => {
		it('should handle success response', () => {
			const response: SembleGraphQLResponse<SemblePatient> = {
				data: {
					id: 'test-id',
					firstName: 'John',
					lastName: 'Doe',
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z'
				}
			};

			expect(response.data).toBeDefined();
			expect(response.errors).toBeUndefined();
		});

		it('should handle error response', () => {
			const response: SembleGraphQLResponse = {
				errors: [{
					message: 'Permission denied',
					extensions: {
						code: 'PERMISSION_DENIED',
						permission: 'patients:read',
						field: 'email'
					}
				}]
			};

			expect(response.errors).toBeDefined();
			expect(response.errors![0].message).toBe('Permission denied');
		});
	});

	describe('SemblePermissionError', () => {
		it('should create permission error object', () => {
			const permissionError: SemblePermissionError = {
				__MISSING_PERMISSION__: {
					message: 'You do not have permission to access this field',
					requiredPermission: 'patients:read',
					field: 'email',
					code: 'PERMISSION_DENIED'
				}
			};

			expect(permissionError.__MISSING_PERMISSION__.message).toContain('permission');
			expect(permissionError.__MISSING_PERMISSION__.field).toBe('email');
		});
	});

	describe('Resource type validation', () => {
		it('should validate resource types', () => {
			const validResources: SembleResourceType[] = [
				'patient', 'booking', 'doctor', 'location', 'bookingType', 'product'
			];

			validResources.forEach(resource => {
				expect([
'patient', 'booking', 'doctor', 'location', 'bookingType', 'product'
]).toContain(resource);
			});
		});
	});
});

describe('NodeTypes', () => {
	describe('SembleActionType', () => {
		it('should validate action types', () => {
			const validActions: SembleActionType[] = [
				'get', 'getMany', 'create', 'update', 'delete'
			];

			validActions.forEach(action => {
				expect([
'get', 'getMany', 'create', 'update', 'delete'
]).toContain(action);
			});
		});
	});

	describe('SembleTriggerEventType', () => {
		it('should validate trigger event types', () => {
			const validEvents: SembleTriggerEventType[] = [
				'new', 'newAndUpdated'
			];

			validEvents.forEach(event => {
				expect(['new', 'newAndUpdated']).toContain(event);
			});
		});
	});

	describe('SembleExecutionContext', () => {
		it('should create valid execution context', () => {
			const context: SembleExecutionContext = {
				resource: 'patient',
				action: 'get',
				credentials: {
					server: 'https://api.semble.com',
					token: 'test-token'
				},
				filters: {
					search: 'test',
					limit: 10
				},
				additionalFields: {},
				inputData: [],
				itemIndex: 0
			};

			expect(context.resource).toBe('patient');
			expect(context.action).toBe('get');
			expect(context.credentials.server).toBe('https://api.semble.com');
		});
	});

	describe('SembleOperationResult', () => {
		it('should create success result', () => {
			const result: SembleOperationResult = {
				success: true,
				data: { id: 'test-id', name: 'Test' },
				metadata: {
					processingTime: 150
				}
			};

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.error).toBeUndefined();
		});

		it('should create error result', () => {
			const result: SembleOperationResult = {
				success: false,
				error: {
					message: 'Validation failed',
					code: 'VALIDATION_ERROR',
					field: 'email'
				}
			};

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error!.code).toBe('VALIDATION_ERROR');
		});
	});
});

describe('ConfigTypes', () => {
	describe('CacheConfig', () => {
		it('should create valid cache configuration', () => {
			const config: CacheConfig = {
				enabled: true,
				defaultTtl: 3600,
				maxSize: 1000,
				autoRefreshInterval: 86400,
				backgroundRefresh: true,
				keyPrefix: 'semble:'
			};

			expect(config.enabled).toBe(true);
			expect(config.defaultTtl).toBe(3600);
			expect(config.keyPrefix).toBe('semble:');
		});
	});

	describe('ServiceConfig', () => {
		it('should create credential service config', () => {
			const config: ServiceConfig = {
				name: 'credential',
				enabled: true,
				initTimeout: 5000,
				options: {
					validateOnStartup: true,
					validationTimeout: 3000,
					cacheValidCredentials: true,
					environmentSafety: {
						enabled: true,
						allowedEnvironments: ['production', 'staging'],
						requireEnvVariable: true
					}
				}
			};

			expect(config.name).toBe('credential');
			expect(config.options.validateOnStartup).toBe(true);
		});
	});

	describe('GlobalConfig', () => {
		it('should create minimal global configuration', () => {
			const config: GlobalConfig = {
				version: '2.0.0',
				debug: false,
				logging: {
					enabled: true,
					level: 'info',
					console: true,
					format: 'json',
					includeTimestamp: true,
					includeStackTrace: false
				},
				cache: {
					enabled: true,
					defaultTtl: 3600,
					maxSize: 1000,
					autoRefreshInterval: 86400,
					backgroundRefresh: true,
					keyPrefix: 'semble:'
				},
				services: [],
				fieldRegistry: {
					dynamicLoading: true,
					cacheDefinitions: true,
					definitionCacheTtl: 3600,
					autoRefresh: true,
					validationRules: {
						enforceTypes: true,
						enforceRequired: true,
						enforceFormat: true,
						customPatterns: {},
						lengthConstraints: {}
					}
				},
				defaultOperations: [],
				performance: {
					enabled: true,
					trackTiming: true,
					trackMemory: true,
					trackApiCalls: true,
					dataRetention: 86400,
					alertThresholds: {
						operationTimeout: 30000,
						memoryUsage: 100,
						errorRate: 0.05
					}
				}
			};

			expect(config.version).toBe('2.0.0');
			expect(config.cache.enabled).toBe(true);
			expect(config.performance.enabled).toBe(true);
		});
	});
});

describe('Type Integration', () => {
	it('should work together across type files', () => {
		// This test ensures our types work together properly
		const patient: SemblePatient = {
			id: 'test-id',
			firstName: 'John',
			lastName: 'Doe',
			createdAt: '2025-01-01T00:00:00Z',
			updatedAt: '2025-01-01T00:00:00Z'
		};

		const context: SembleExecutionContext = {
			resource: 'patient',
			action: 'get',
			credentials: {
				server: 'https://api.semble.com',
				token: 'test-token'
			},
			filters: {},
			additionalFields: {},
			inputData: [],
			itemIndex: 0
		};

		const result: SembleOperationResult = {
			success: true,
			data: patient
		};

		expect(context.resource).toBe('patient');
		expect(result.data.id).toBe('test-id');
	});
});
