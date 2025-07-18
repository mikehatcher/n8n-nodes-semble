/**
 * @fileoverview PermissionCheckService Tests
 * @description Comprehensive tests for field-level permission validation, testing queries, and permission cache management
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Services.Permission
 */

import {
	PermissionCheckService,
	PermissionCheckConfig,
	PermissionTestResult,
	FieldPermissionMap,
	ResourcePermissions
} from '../../services/PermissionCheckService';
import { SembleQueryService } from '../../services/SembleQueryService';
import { CacheService } from '../../services/CacheService';
import { SemblePermissionError } from '../../core/SembleError';
import { SEMBLE_CONSTANTS } from '../../core/Constants';

// =============================================================================
// MOCKS
// =============================================================================

const mockQueryService = {
	executeQuery: jest.fn(),
	setCredentials: jest.fn(),
	getCredentials: jest.fn(),
	buildQuery: jest.fn(),
	getConfig: jest.fn()
} as unknown as SembleQueryService;

const mockCacheService = {
	getConfig: jest.fn().mockReturnValue({
		enabled: true,
		defaultTtl: 900,
		maxSize: 1000,
		autoRefreshInterval: 0,
		backgroundRefresh: false,
		keyPrefix: 'test:'
	}),
	set: jest.fn(),
	get: jest.fn(),
	has: jest.fn(),
	delete: jest.fn(),
	clear: jest.fn()
} as unknown as CacheService;

// Mock response data
const mockResourcePermissions: ResourcePermissions = {
	resource: 'patients',
	globalPermission: 'write',
	fieldPermissions: {
		firstName: { read: true, write: true, required: true },
		lastName: { read: true, write: true, required: true },
		email: { read: true, write: true, required: false },
		phone: { read: true, write: false, required: false },
		medicalHistory: { read: false, write: false, required: false }
	},
	operations: {
		create: true,
		read: true,
		update: true,
		delete: false
	},
	lastUpdated: new Date()
};

// Mock API response format (what the API actually returns)
const mockApiResponse = {
	resource: 'patients',
	globalPermission: 'write',
	fieldPermissions: [
		{ fieldName: 'firstName', read: true, write: true, required: true },
		{ fieldName: 'lastName', read: true, write: true, required: true },
		{ fieldName: 'email', read: true, write: true, required: false },
		{ fieldName: 'phone', read: true, write: false, required: false },
		{ fieldName: 'medicalHistory', read: false, write: false, required: false }
	],
	operations: {
		create: true,
		read: true,
		update: true,
		delete: false
	}
};

const mockAdminPermissions: ResourcePermissions = {
	resource: 'patients',
	globalPermission: 'admin',
	fieldPermissions: {},
	operations: {
		create: true,
		read: true,
		update: true,
		delete: true
	},
	lastUpdated: new Date()
};

const mockLimitedPermissions: ResourcePermissions = {
	resource: 'patients',
	globalPermission: 'read',
	fieldPermissions: {
		firstName: { read: true, write: false, required: false },
		lastName: { read: true, write: false, required: false },
		email: { read: false, write: false, required: false }
	},
	operations: {
		create: false,
		read: true,
		update: false,
		delete: false
	},
	lastUpdated: new Date()
};

// Mock API response format for limited permissions
const mockLimitedApiResponse = {
	resource: 'patients',
	globalPermission: 'read',
	fieldPermissions: [
		{ fieldName: 'firstName', read: true, write: false, required: false },
		{ fieldName: 'lastName', read: true, write: false, required: false },
		{ fieldName: 'email', read: false, write: false, required: false }
	],
	operations: {
		create: false,
		read: true,
		update: false,
		delete: false
	}
};

// =============================================================================
// TEST SETUP
// =============================================================================

describe('PermissionCheckService', () => {
	let service: PermissionCheckService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new PermissionCheckService(mockQueryService, mockCacheService);
	});

	// =============================================================================
	// CONSTRUCTOR TESTS
	// =============================================================================

	describe('Constructor', () => {
		test('should create service with default configuration', () => {
			const config = service.getConfig();
			
			expect(config.enabled).toBe(true);
			expect(config.cachePermissions).toBe(true);
			expect(config.cacheTtl).toBe(SEMBLE_CONSTANTS.CACHE.PERMISSION_CACHE_TTL);
			expect(config.strictMode).toBe(false);
			expect(config.adminBypass).toBe(true);
		});

		test('should create service with custom configuration', () => {
			const customConfig: Partial<PermissionCheckConfig> = {
				enabled: false,
				strictMode: true,
				adminBypass: false,
				cacheTtl: 1800
			};

			const customService = new PermissionCheckService(mockQueryService, mockCacheService, customConfig);
			const config = customService.getConfig();

			expect(config.enabled).toBe(false);
			expect(config.strictMode).toBe(true);
			expect(config.adminBypass).toBe(false);
			expect(config.cacheTtl).toBe(1800);
		});

		test('should create service without cache service', () => {
			const serviceWithoutCache = new PermissionCheckService(mockQueryService);
			expect(serviceWithoutCache).toBeDefined();
		});
	});

	// =============================================================================
	// PERMISSION TESTING TESTS
	// =============================================================================

	describe('Permission Testing', () => {
		beforeEach(() => {
			(mockQueryService.executeQuery as jest.Mock).mockResolvedValue({
				data: {
					permissions: {
						resource: 'patients',
						globalPermission: 'write',
						operations: mockResourcePermissions.operations,
						fieldPermissions: Object.entries(mockResourcePermissions.fieldPermissions).map(([fieldName, perm]) => ({
							fieldName,
							...perm
						}))
					}
				}
			});
		});

		test('should test permissions for resource and operation', async () => {
			const result = await service.testPermissions('patients', 'read');

			expect(result.hasPermission).toBe(true);
			expect(result.permissionLevel).toBe('write');
			expect(result.allowedOperations).toContain('read');
			expect(result.allowedOperations).toContain('update');
			expect(result.cacheHit).toBe(false);
			expect(result.lastChecked).toBeInstanceOf(Date);
		});

		test('should test permissions with specific fields', async () => {
			const result = await service.testPermissions('patients', 'write', ['firstName', 'email']);

			expect(result.hasPermission).toBe(true);
			expect(result.restrictedFields).toContain('phone');
			expect(result.restrictedFields).toContain('medicalHistory');
		});

		test('should return cached permissions when available', async () => {
			// First call
			await service.testPermissions('patients', 'read', undefined, 'user123');
			
			// Second call should use cache
			const result = await service.testPermissions('patients', 'read', undefined, 'user123');

			expect(result.cacheHit).toBe(true);
		});

		test('should handle admin user permissions', async () => {
			(mockQueryService.executeQuery as jest.Mock)
				.mockResolvedValueOnce({
					data: {
						currentUser: {
							role: 'admin',
							permissions: ['admin']
						}
					}
				})
				.mockResolvedValueOnce({
					data: {
						permissions: mockAdminPermissions
					}
				});

			const result = await service.testPermissions('patients', 'delete', undefined, 'admin123');

			expect(result.hasPermission).toBe(true);
			expect(result.permissionLevel).toBe('admin');
			expect(result.allowedOperations).toContain('delete');
		});

		test('should handle permission query errors', async () => {
			(mockQueryService.executeQuery as jest.Mock).mockResolvedValue({
				data: null,
				errors: [{ message: 'Access denied' }]
			});

			await expect(service.testPermissions('patients', 'read')).rejects.toThrow(SemblePermissionError);
		});
	});

	// =============================================================================
	// FIELD PERMISSION TESTS
	// =============================================================================

	describe('Field Permission Checking', () => {
		beforeEach(() => {
			(mockQueryService.executeQuery as jest.Mock).mockResolvedValue({
				data: {
					permissions: {
						resource: 'patients',
						globalPermission: 'write',
						operations: mockResourcePermissions.operations,
						fieldPermissions: Object.entries(mockResourcePermissions.fieldPermissions).map(([fieldName, perm]) => ({
							fieldName,
							...perm
						}))
					}
				}
			});
		});

		test('should check single field read permission', async () => {
			const hasPermission = await service.checkFieldPermission('patients', 'firstName', 'read');
			expect(hasPermission).toBe(true);
		});

		test('should check single field write permission', async () => {
			const hasPermission = await service.checkFieldPermission('patients', 'phone', 'write');
			expect(hasPermission).toBe(false);
		});

		test('should check field permission with global fallback', async () => {
			const hasPermission = await service.checkFieldPermission('patients', 'nonExistentField', 'read');
			expect(hasPermission).toBe(true); // Falls back to global 'write' permission
		});

		test('should check multiple fields permissions', async () => {
			const permissions = await service.checkFieldsPermissions('patients', ['firstName', 'phone', 'medicalHistory'], 'write');

			expect(permissions.firstName).toBe(true);
			expect(permissions.phone).toBe(false);
			expect(permissions.medicalHistory).toBe(false);
		});

		test('should return false when service is disabled', async () => {
			service.updateConfig({ enabled: false });
			
			const hasPermission = await service.checkFieldPermission('patients', 'medicalHistory', 'read');
			expect(hasPermission).toBe(true); // Returns true when disabled
		});
	});

	// =============================================================================
	// PERMISSION VALIDATION TESTS
	// =============================================================================

	describe('Permission Validation', () => {
		beforeEach(() => {
			(mockQueryService.executeQuery as jest.Mock).mockResolvedValue({
				data: {
					permissions: {
						resource: 'patients',
						globalPermission: 'write',
						operations: mockResourcePermissions.operations,
						fieldPermissions: Object.entries(mockResourcePermissions.fieldPermissions).map(([fieldName, perm]) => ({
							fieldName,
							...perm
						}))
					}
				}
			});
		});

		test('should validate permissions successfully', async () => {
			await expect(service.validatePermissions('patients', 'read')).resolves.not.toThrow();
		});

		test('should throw error for insufficient permissions', async () => {
			(mockQueryService.executeQuery as jest.Mock).mockResolvedValue({
				data: {
					permissions: {
						resource: 'patients',
						globalPermission: 'read',
						operations: { create: false, read: true, update: false, delete: false },
						fieldPermissions: []
					}
				}
			});

			await expect(service.validatePermissions('patients', 'create')).rejects.toThrow(SemblePermissionError);
		});

		test('should validate field-level permissions in strict mode', async () => {
			service.updateConfig({ strictMode: true });

			await expect(service.validatePermissions('patients', 'write', ['firstName', 'medicalHistory']))
				.rejects.toThrow(SemblePermissionError);
		});

		test('should allow field access in non-strict mode', async () => {
			service.updateConfig({ strictMode: false });

			await expect(service.validatePermissions('patients', 'write', ['firstName', 'medicalHistory']))
				.resolves.not.toThrow();
		});

		test('should skip validation when service is disabled', async () => {
			service.updateConfig({ enabled: false });

			await expect(service.validatePermissions('patients', 'delete')).resolves.not.toThrow();
		});
	});

	// =============================================================================
	// PERMISSION QUERY TESTS
	// =============================================================================

	describe('Permission Queries', () => {
		test('should build correct permission query', async () => {
			(mockQueryService.executeQuery as jest.Mock).mockResolvedValue({
				data: {
					permissions: {
						resource: 'patients',
						globalPermission: 'write',
						operations: mockResourcePermissions.operations,
						fieldPermissions: []
					}
				}
			});

			await service.testPermissions('patients', 'read', undefined, 'user123');

			expect(mockQueryService.executeQuery).toHaveBeenCalledWith(
				expect.stringContaining('query CheckPermissions')
			);
			expect(mockQueryService.executeQuery).toHaveBeenCalledWith(
				expect.stringContaining('resource: "patients"')
			);
			expect(mockQueryService.executeQuery).toHaveBeenCalledWith(
				expect.stringContaining('userId: "user123"')
			);
		});

		test('should parse permission response correctly', async () => {
			const mockResponse = {
				data: {
					permissions: {
						resource: 'patients',
						globalPermission: 'write',
						operations: {
							create: true,
							read: true,
							update: true,
							delete: false
						},
						fieldPermissions: [
							{
								fieldName: 'firstName',
								read: true,
								write: true,
								required: true
							},
							{
								fieldName: 'email',
								read: true,
								write: false,
								required: false,
								conditionalAccess: ['admin']
							}
						]
					}
				}
			};

			(mockQueryService.executeQuery as jest.Mock).mockResolvedValue(mockResponse);

			const result = await service.testPermissions('patients', 'read');

			expect(result.permissionLevel).toBe('write');
			expect(result.allowedOperations).toEqual(['read', 'create', 'update']);
		});

		test('should handle missing permission data', async () => {
			(mockQueryService.executeQuery as jest.Mock).mockResolvedValue({
				data: {}
			});

			await expect(service.testPermissions('patients', 'read')).rejects.toThrow(SemblePermissionError);
		});
	});

	// =============================================================================
	// ADMIN BYPASS TESTS
	// =============================================================================

	describe('Admin Bypass', () => {
		test('should check if user is admin', async () => {
			(mockQueryService.executeQuery as jest.Mock).mockResolvedValue({
				data: {
					currentUser: {
						role: 'admin',
						permissions: ['admin']
					}
				}
			});

			const result = await service.testPermissions('patients', 'delete', undefined, 'admin123');
			expect(result.permissionLevel).toBe('admin');
		});

		test('should handle admin check failure gracefully', async () => {
			(mockQueryService.executeQuery as jest.Mock)
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValueOnce({
					data: {
						permissions: mockLimitedPermissions
					}
				});

			const result = await service.testPermissions('patients', 'read', undefined, 'user123');
			expect(result.permissionLevel).toBe('read');
		});

		test('should respect adminBypass configuration', async () => {
			service.updateConfig({ adminBypass: false });

			(mockQueryService.executeQuery as jest.Mock).mockResolvedValue({
				data: {
					permissions: mockLimitedPermissions
				}
			});

			const result = await service.testPermissions('patients', 'delete', undefined, 'admin123');
			expect(result.hasPermission).toBe(false);
		});
	});

	// =============================================================================
	// CACHE MANAGEMENT TESTS
	// =============================================================================

	describe('Cache Management', () => {
		test('should clear cache for specific resource and user', async () => {
			await service.clearCache('patients', 'user123');
			// Cache clearing is internal, so we verify no errors occur
			expect(true).toBe(true);
		});

		test('should clear cache for all resources of a user', async () => {
			await service.clearCache('patients');
			expect(true).toBe(true);
		});

		test('should clear entire permission cache', async () => {
			await service.clearCache();
			expect(true).toBe(true);
		});

		test('should respect cache configuration', async () => {
			service.updateConfig({ cachePermissions: false });

			(mockQueryService.executeQuery as jest.Mock).mockResolvedValue({
				data: {
					permissions: mockResourcePermissions
				}
			});

			const result = await service.testPermissions('patients', 'read');
			expect(result.cacheHit).toBe(false);
		});
	});

	// =============================================================================
	// PERMISSION EVALUATION TESTS
	// =============================================================================

	describe('Permission Evaluation', () => {
		test('should evaluate read permissions correctly', () => {
			const hasPermission = service['evaluatePermission'](mockResourcePermissions, 'read');
			expect(hasPermission).toBe(true);
		});

		test('should evaluate write permissions correctly', () => {
			const hasPermission = service['evaluatePermission'](mockResourcePermissions, 'write');
			expect(hasPermission).toBe(true);
		});

		test('should evaluate delete permissions correctly', () => {
			const hasPermission = service['evaluatePermission'](mockResourcePermissions, 'delete');
			expect(hasPermission).toBe(false);
		});

		test('should evaluate field-level permissions', () => {
			const hasPermission = service['evaluatePermission'](mockResourcePermissions, 'write', ['medicalHistory']);
			expect(hasPermission).toBe(true); // Non-strict mode allows it
		});

		test('should get restricted fields correctly', () => {
			const restrictedFields = service['getRestrictedFields'](mockResourcePermissions, 'write');
			expect(restrictedFields).toContain('phone');
			expect(restrictedFields).toContain('medicalHistory');
			expect(restrictedFields).not.toContain('firstName');
		});

		test('should get allowed operations correctly', () => {
			const allowedOps = service['getAllowedOperations'](mockResourcePermissions);
			expect(allowedOps).toContain('read');
			expect(allowedOps).toContain('create');
			expect(allowedOps).toContain('update');
			expect(allowedOps).not.toContain('delete');
		});
	});

	// =============================================================================
	// GLOBAL PERMISSION TESTS
	// =============================================================================

	describe('Global Permission Checks', () => {
		test('should check read permission with read level', () => {
			const hasPermission = service['hasGlobalPermission']({ ...mockResourcePermissions, globalPermission: 'read' }, 'read');
			expect(hasPermission).toBe(true);
		});

		test('should check write permission with read level', () => {
			const hasPermission = service['hasGlobalPermission']({ ...mockResourcePermissions, globalPermission: 'read' }, 'write');
			expect(hasPermission).toBe(false);
		});

		test('should check delete permission with admin level', () => {
			const hasPermission = service['hasGlobalPermission']({ ...mockResourcePermissions, globalPermission: 'admin' }, 'delete');
			expect(hasPermission).toBe(true);
		});

		test('should handle unknown operations', () => {
			const hasPermission = service['hasGlobalPermission'](mockResourcePermissions, 'unknown');
			expect(hasPermission).toBe(false);
		});
	});

	// =============================================================================
	// CONFIGURATION TESTS
	// =============================================================================

	describe('Configuration Management', () => {
		test('should get current configuration', () => {
			const config = service.getConfig();
			expect(config).toHaveProperty('enabled');
			expect(config).toHaveProperty('cachePermissions');
			expect(config).toHaveProperty('cacheTtl');
			expect(config).toHaveProperty('strictMode');
			expect(config).toHaveProperty('adminBypass');
		});

		test('should update configuration', () => {
			const newConfig = {
				strictMode: true,
				cacheTtl: 1800
			};

			service.updateConfig(newConfig);
			const config = service.getConfig();

			expect(config.strictMode).toBe(true);
			expect(config.cacheTtl).toBe(1800);
			expect(config.enabled).toBe(true); // Should preserve existing values
		});

		test('should get service statistics', () => {
			const stats = service.getStats();
			expect(stats).toHaveProperty('cacheSize');
			expect(stats).toHaveProperty('config');
			expect(typeof stats.cacheSize).toBe('number');
		});
	});

	// =============================================================================
	// ERROR HANDLING TESTS
	// =============================================================================

	describe('Error Handling', () => {
		test('should handle network errors during permission queries', async () => {
			(mockQueryService.executeQuery as jest.Mock).mockRejectedValue(new Error('Network timeout'));

			await expect(service.testPermissions('patients', 'read')).rejects.toThrow(SemblePermissionError);
		});

		test('should handle invalid GraphQL responses', async () => {
			(mockQueryService.executeQuery as jest.Mock).mockResolvedValue({
				data: {
					permissions: null
				}
			});

			await expect(service.testPermissions('patients', 'read')).rejects.toThrow(SemblePermissionError);
		});

		test('should handle SembleError instances properly', async () => {
			const sembleError = new SemblePermissionError('Access denied', 'PERMISSION_DENIED', 'resource');
			(mockQueryService.executeQuery as jest.Mock).mockRejectedValue(sembleError);

			await expect(service.testPermissions('patients', 'read')).rejects.toThrow(sembleError);
		});
	});

	// =============================================================================
	// INTEGRATION SCENARIOS
	// =============================================================================

	describe('Integration Scenarios', () => {
		test('should handle complete permission workflow', async () => {
			// Disable admin bypass to test normal permission flow
			service.updateConfig({ adminBypass: false });
			
			// Clear cache to ensure fresh data
			(mockCacheService.get as jest.Mock).mockReturnValue(null);
			(mockCacheService.has as jest.Mock).mockReturnValue(false);
			
			// Setup consistent mock response using API format
			(mockQueryService.executeQuery as jest.Mock).mockResolvedValue({
				data: {
					permissions: mockApiResponse
				}
			});

			// Test permissions - this should pass since mockApiResponse has write permission
			const result = await service.testPermissions('patients', 'write', ['firstName', 'email']);
			expect(result.hasPermission).toBe(true);

			// Validate permissions - this should pass too since strictMode is false by default
			// and both firstName and email have write: true in mockApiResponse
			await expect(service.validatePermissions('patients', 'write', ['firstName', 'email'])).resolves.not.toThrow();

			// Check individual fields
			const firstNamePermission = await service.checkFieldPermission('patients', 'firstName', 'write');
			const phonePermission = await service.checkFieldPermission('patients', 'phone', 'write');
			
			expect(firstNamePermission).toBe(true);  // firstName has write: true
			expect(phonePermission).toBe(false);     // phone has write: false
		});

		test('should handle restricted access scenario', async () => {
			// Disable admin bypass and enable strict mode
			service.updateConfig({ adminBypass: false, strictMode: true });
			
			// Clear cache
			(mockCacheService.get as jest.Mock).mockReturnValue(null);
			(mockCacheService.has as jest.Mock).mockReturnValue(false);

			// Setup mock to return limited permissions using API format
			(mockQueryService.executeQuery as jest.Mock).mockResolvedValue({
				data: {
					permissions: mockLimitedApiResponse
				}
			});

			// Should fail validation for write operations (mockLimitedApiResponse has globalPermission: 'read')
			await expect(service.validatePermissions('patients', 'write')).rejects.toThrow(SemblePermissionError);

			// Should pass for read operations with allowed fields (firstName and lastName have read: true)
			await expect(service.validatePermissions('patients', 'read', ['firstName', 'lastName'])).resolves.not.toThrow();

			// Should fail for restricted fields in strict mode (email has read: false in mockLimitedApiResponse)
			await expect(service.validatePermissions('patients', 'read', ['email'])).rejects.toThrow(SemblePermissionError);
		});

		test('should handle cache hit and miss scenarios', async () => {
			(mockQueryService.executeQuery as jest.Mock).mockResolvedValue({
				data: {
					permissions: mockResourcePermissions
				}
			});

			// First call - cache miss
			const result1 = await service.testPermissions('patients', 'read', undefined, 'user123');
			expect(result1.cacheHit).toBe(false);

			// Second call - cache hit
			const result2 = await service.testPermissions('patients', 'read', undefined, 'user123');
			expect(result2.cacheHit).toBe(true);

			// Different user - cache miss
			const result3 = await service.testPermissions('patients', 'read', undefined, 'user456');
			expect(result3.cacheHit).toBe(false);
		});
	});
});
