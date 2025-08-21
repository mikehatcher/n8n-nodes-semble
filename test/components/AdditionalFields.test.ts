/**
 * @fileoverview Additional Fields System Tests
 * @description Test suite for field registration, dynamic loading, and record limit logic
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Components
 */

import { 
	AdditionalFieldsRegistry,
	registerField,
	getAdditionalFields,
	defaultFieldsRegistry
} from '../../components/AdditionalFieldsRegistry';
import { RecordLimitField, RecordLimitConfig } from '../../components/RecordLimitField';
import { SembleResourceType } from '../../types/SembleTypes';
import { SembleActionType } from '../../types/NodeTypes';
import { INodePropertyOptions } from 'n8n-workflow';

describe('Additional Fields System', () => {
	// Global cleanup to prevent Jest from hanging
	afterAll(() => {
		defaultFieldsRegistry.cleanup();
	});
	// Global cleanup after all tests
	afterAll(() => {
		// Clean up the default registry instance
		const { defaultFieldsRegistry } = require('../../components/AdditionalFieldsRegistry');
		defaultFieldsRegistry.cleanup();
	});

	describe('AdditionalFieldsRegistry', () => {
		let registry: AdditionalFieldsRegistry;

		beforeEach(() => {
			registry = new AdditionalFieldsRegistry({
				enableCaching: false,
				autoRegisterCommon: false,
			});
		});

		afterEach(() => {
			// Clean up any timers that might be running
			if (registry) {
				registry.cleanup();
			}
		});

		describe('Field Registration', () => {
			test('should register a new field successfully', () => {
				const result = registry.registerField('patient', 'create', {
					name: 'testField',
					displayName: 'Test Field',
					type: 'string',
					description: 'A test field',
				});

				expect(result.success).toBe(true);
				expect(result.fieldId).toBe('patient:create:testField');
				expect(result.message).toBe('Field registered successfully');
			});

			test('should detect field conflicts', () => {
				// Register first field
				registry.registerField('patient', 'create', {
					name: 'duplicateField',
					displayName: 'First Field',
					type: 'string',
				});

				// Try to register duplicate
				const result = registry.registerField('patient', 'create', {
					name: 'duplicateField',
					displayName: 'Second Field',
					type: 'number',
				});

				expect(result.success).toBe(false);
				expect(result.conflicts).toHaveLength(1);
				expect(result.conflicts![0]).toContain('already exists');
			});

			test('should validate field definitions', () => {
				const result = registry.registerField('patient', 'create', {
					name: '', // Invalid name
					displayName: 'Invalid Field',
					type: 'string',
				});

				expect(result.success).toBe(false);
				expect(result.message).toBe('Field definition validation failed');
			});

			test('should reject invalid field names', () => {
				const invalidNames = ['123invalid', 'field-name', 'field name', 'field.name'];

				for (const name of invalidNames) {
					const result = registry.registerField('patient', 'create', {
						name,
						displayName: 'Test Field',
						type: 'string',
					});

					expect(result.success).toBe(false);
				}
			});

			test('should accept valid field names', () => {
				const validNames = ['validField', 'field123', '_privateField', '$specialField'];

				for (const name of validNames) {
					const result = registry.registerField('patient', 'create', {
						name,
						displayName: 'Test Field',
						type: 'string',
					});

					expect(result.success).toBe(true);
				}
			});
		});

		describe('Field Retrieval', () => {
			beforeEach(() => {
				registry.registerField('patient', 'create', {
					name: 'firstName',
					displayName: 'First Name',
					type: 'string',
					required: true,
					priority: 100,
				});

				registry.registerField('patient', 'create', {
					name: 'age',
					displayName: 'Age',
					type: 'number',
					default: 0,
					priority: 50,
				});
			});

			test('should retrieve fields for specific resource and action', () => {
				const fields = registry.getFields('patient', 'create');

				expect(fields).toHaveLength(2);
				expect(fields[0].name).toBe('firstName'); // Higher priority first
				expect(fields[1].name).toBe('age');
			});

			test('should return empty array for non-existent resource/action', () => {
				const fields = registry.getFields('booking', 'delete');
				expect(fields).toHaveLength(0);
			});

			test('should convert field definitions to node properties correctly', () => {
				const fields = registry.getFields('patient', 'create');

				expect(fields[0]).toMatchObject({
					displayName: 'First Name',
					name: 'firstName',
					type: 'string',
					description: undefined,
				});

				expect(fields[1]).toMatchObject({
					displayName: 'Age',
					name: 'age',
					type: 'number',
					default: 0,
				});
			});
		});

		describe('Field Management', () => {
			test('should unregister fields successfully', () => {
				registry.registerField('patient', 'update', {
					name: 'tempField',
					displayName: 'Temporary Field',
					type: 'string',
				});

				let fields = registry.getFields('patient', 'update');
				expect(fields).toHaveLength(1);

				const unregistered = registry.unregisterField('patient', 'update', 'tempField');
				expect(unregistered).toBe(true);

				fields = registry.getFields('patient', 'update');
				expect(fields).toHaveLength(0);
			});

			test('should get resource fields', () => {
				registry.registerField('patient', 'create', {
					name: 'field1',
					displayName: 'Field 1',
					type: 'string',
				});

				registry.registerField('patient', 'update', {
					name: 'field2',
					displayName: 'Field 2',
					type: 'string',
				});

				registry.registerField('booking', 'create', {
					name: 'field3',
					displayName: 'Field 3',
					type: 'string',
				});

				const patientEntries = registry.getResourceFields('patient');
				expect(patientEntries).toHaveLength(2);

				const bookingEntries = registry.getResourceFields('booking');
				expect(bookingEntries).toHaveLength(1);
			});

			test('should clear registry', () => {
				registry.registerField('patient', 'create', {
					name: 'testField',
					displayName: 'Test Field',
					type: 'string',
				});

				let stats = registry.getStats();
				expect(stats.registryEntries).toBeGreaterThan(0);

				registry.clear();

				stats = registry.getStats();
				expect(stats.registryEntries).toBe(0);
				expect(stats.fieldDefinitions).toBe(0);
			});
		});

		describe('Auto-registration', () => {
			test('should auto-register common fields when enabled', () => {
				const autoRegistry = new AdditionalFieldsRegistry({
					autoRegisterCommon: true,
				});

				const patientFields = autoRegistry.getFields('patient', 'getMany');
				expect(patientFields.length).toBeGreaterThan(0);

				const limitField = patientFields.find((field) => field.name === 'limit');
				expect(limitField).toBeDefined();
				expect(limitField!.type).toBe('number');
			});

			test('should not auto-register when disabled', () => {
				const stats = registry.getStats();
				expect(stats.registryEntries).toBe(0);
			});
		});

		describe('Caching', () => {
			test('should cache field results when enabled', (done) => {
				const cachingRegistry = new AdditionalFieldsRegistry({
					enableCaching: true,
					cacheTtl: 1, // 1 second
				});

				// Clean up after test
				const cleanup = () => {
					cachingRegistry.cleanup();
					done();
				};

				cachingRegistry.registerField('patient', 'get', {
					name: 'cachedField',
					displayName: 'Cached Field',
					type: 'string',
				});

				// First call should populate cache
				const fields1 = cachingRegistry.getFields('patient', 'get');
				expect(fields1).toHaveLength(1);

				// Second call should return cached result immediately
				const fields2 = cachingRegistry.getFields('patient', 'get');
				expect(fields2).toHaveLength(1);

				// Wait for cache to expire
				setTimeout(() => {
					// Modify registry after cache is populated
					cachingRegistry.unregisterField('patient', 'get', 'cachedField');
					
					// Should now return fresh result (empty)
					const fields3 = cachingRegistry.getFields('patient', 'get');
					expect(fields3).toHaveLength(0);
					cleanup();
				}, 1100);
			});
		});
	});

	describe('RecordLimitField', () => {
		let limitField: RecordLimitField;

		beforeEach(() => {
			limitField = new RecordLimitField();
		});

		describe('Field Generation', () => {
			test('should generate standard limit field property', () => {
				const property = limitField.generateProperty();

				expect(property.name).toBe('limit');
				expect(property.type).toBe('number');
				expect(property.default).toBe(50);
				expect(property.typeOptions).toBeDefined();
				expect(property.typeOptions!.minValue).toBe(-1);
			});

			test('should generate unlimited toggle field', () => {
				const property = limitField.generateUnlimitedToggle();

				expect(property.name).toBe('limitUnlimited');
				expect(property.type).toBe('boolean');
				expect(property.default).toBe(false);
			});

			test('should generate preset options field', () => {
				const property = limitField.generatePresetOptions();

				expect(property.name).toBe('limit');
				expect(property.type).toBe('options');
				expect(property.options).toBeDefined();
				expect(property.options!.length).toBeGreaterThan(5);

				const unlimitedOption = property.options!.find((opt: any) => 'value' in opt && opt.value === -1);
				expect(unlimitedOption).toBeDefined();
			});

			test('should generate collection field', () => {
				const property = limitField.generateLimitCollection();

				expect(property.name).toBe('resultLimits');
				expect(property.type).toBe('collection');
				expect(property.options).toBeDefined();
				expect(property.options!.length).toBe(2);
			});
		});

		describe('Validation', () => {
			test('should validate valid limits', () => {
				const validLimits = [1, 50, 100, 1000];

				for (const limit of validLimits) {
					const result = limitField.validateLimit(limit);
					expect(result.isValid).toBe(true);
					expect(result.value).toBe(limit);
					expect(result.isUnlimited).toBe(false);
				}
			});

			test('should validate unlimited value', () => {
				const result = limitField.validateLimit(-1);
				expect(result.isValid).toBe(true);
				expect(result.value).toBe(-1);
				expect(result.isUnlimited).toBe(true);
			});

			test('should reject invalid limits', () => {
				const invalidLimits = [0, -2, 20000, 'invalid', null, undefined];

				for (const limit of invalidLimits) {
					const result = limitField.validateLimit(limit);
					expect(result.isValid).toBe(false);
					expect(result.message).toBeDefined();
				}
			});

			test('should handle string numbers', () => {
				const result = limitField.validateLimit('100');
				expect(result.isValid).toBe(true);
				expect(result.value).toBe(100);
			});
		});

		describe('API Processing', () => {
			test('should process valid limits for API', () => {
				expect(limitField.processLimitForApi(50)).toBe(50);
				expect(limitField.processLimitForApi('100')).toBe(100);
			});

			test('should return null for unlimited', () => {
				expect(limitField.processLimitForApi(-1)).toBe(null);
			});

			test('should throw for invalid limits', () => {
				expect(() => limitField.processLimitForApi(0)).toThrow();
				expect(() => limitField.processLimitForApi('invalid')).toThrow();
			});
		});

		describe('Collection Processing', () => {
			test('should extract limit from collection', () => {
				const collection = { limit: 100, returnAll: false };
				const result = limitField.extractLimitFromCollection(collection);
				expect(result).toBe(100);
			});

			test('should return null for returnAll enabled', () => {
				const collection = { limit: 50, returnAll: true };
				const result = limitField.extractLimitFromCollection(collection);
				expect(result).toBe(null);
			});

			test('should use default for empty collection', () => {
				const result = limitField.extractLimitFromCollection({});
				expect(result).toBe(50); // Default value
			});

			test('should handle invalid collection values', () => {
				const result = limitField.extractLimitFromCollection(null);
				expect(result).toBe(50); // Default value
			});
		});

		describe('Display Values', () => {
			test('should generate correct display values', () => {
				expect(limitField.getDisplayValue(50)).toBe('50 records');
				expect(limitField.getDisplayValue(-1)).toBe('All records (unlimited)');
				expect(limitField.getDisplayValue('invalid')).toBe('Invalid');
			});
		});

		describe('Static Helpers', () => {
			test('should create standard field via static method', () => {
				const property = RecordLimitField.createStandard({
					name: 'customLimit',
					default: 25,
				});

				expect(property.name).toBe('customLimit');
				expect(property.default).toBe(25);
			});

			test('should create preset options via static method', () => {
				const property = RecordLimitField.createPresetOptions();
				expect(property.type).toBe('options');
				expect(property.options).toBeDefined();
			});

			test('should create collection via static method', () => {
				const property = RecordLimitField.createCollection();
				expect(property.type).toBe('collection');
			});
		});
	});

	describe('Convenience Functions', () => {
		describe('Global Registry Functions', () => {
			test('should register field via convenience function', () => {
				const result = registerField('patient', 'delete', {
					name: 'confirmDelete',
					displayName: 'Confirm Delete',
					type: 'boolean',
					default: false,
				});

				expect(result.success).toBe(true);
			});

			test('should get fields via convenience function', () => {
				registerField('booking', 'create', {
					name: 'title',
					displayName: 'Title',
					type: 'string',
				});

				const fields = getAdditionalFields('booking', 'create');
				expect(fields).toHaveLength(1);
				expect(fields[0].name).toBe('title');
			});
		});

		describe('Convenience Functions', () => {
			test('should create limit field via static method', () => {
				const property = RecordLimitField.createStandard({
					name: 'pageSize',
					default: 25,
				});

				expect(property.name).toBe('pageSize');
				expect(property.default).toBe(25);
			});

			test('should validate via instance method', () => {
				const limitField = new RecordLimitField();
				const result = limitField.validateLimit(100);
				expect(result.isValid).toBe(true);
				expect(result.value).toBe(100);
			});

			test('should process for API via instance method', () => {
				const limitField = new RecordLimitField();
				expect(limitField.processLimitForApi(50)).toBe(50);
				expect(limitField.processLimitForApi(-1)).toBe(null);
			});
		});
	});

	describe('Integration', () => {
		test('should work together with registry and limit fields', () => {
			const registry = new AdditionalFieldsRegistry({
				autoRegisterCommon: false, // Disable auto-registration for cleaner test
			});

			// Clean up after test
			const cleanup = () => registry.cleanup();

			// Register a limit field using RecordLimitField
			const limitProperty = RecordLimitField.createStandard({
				name: 'pageLimit',
				default: 100,
			});

			const result = registry.registerField('patient', 'getMany', {
				name: limitProperty.name!,
				displayName: limitProperty.displayName!,
				type: limitProperty.type as any,
				default: limitProperty.default,
				description: limitProperty.description,
			});

			expect(result.success).toBe(true);

			const fields = registry.getFields('patient', 'getMany');
			expect(fields).toHaveLength(1);
			expect(fields[0].name).toBe('pageLimit');
			
			cleanup();
		});

		test('should handle complex field scenarios', () => {
			const registry = new AdditionalFieldsRegistry({
				autoRegisterCommon: true,
			});

			// Clean up after test
			const cleanup = () => registry.cleanup();

			// Should have auto-registered fields
			let fields = registry.getFields('patient', 'getMany');
			const initialCount = fields.length;

			// Add custom limit field
			registry.registerField('patient', 'getMany', {
				name: 'customPageSize',
				displayName: 'Custom Page Size',
				type: 'number',
				default: 75,
				priority: 200, // Higher priority
			});

			fields = registry.getFields('patient', 'getMany');
			expect(fields.length).toBe(initialCount + 1);
			expect(fields[0].name).toBe('customPageSize'); // Should be first due to priority
			
			cleanup();
		});
	});
});
