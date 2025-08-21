/**
 * @fileoverview Integration tests for product operations in the main Semble node
 * @description Tests for product CRUD operations through the main Semble.node.ts execute function
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Integration
 */

import { IExecuteFunctions, IDataObject, NodeApiError, NodeOperationError } from 'n8n-workflow';
import { MockProxy, mock } from 'jest-mock-extended';
import { Semble } from '../../nodes/Semble/Semble.node';
import { sembleApiRequest } from '../../nodes/Semble/GenericFunctions';
import { SemblePagination } from '../../nodes/Semble/shared/PaginationHelpers';
import { createMockExecuteFunctions } from '../helpers';

// Mock dependencies
jest.mock('../../nodes/Semble/GenericFunctions');
jest.mock('../../nodes/Semble/shared/PaginationHelpers', () => ({
  ...jest.requireActual('../../nodes/Semble/shared/PaginationHelpers'),
  SemblePagination: {
    execute: jest.fn(),
  },
}));

const mockSembleApiRequest = sembleApiRequest as jest.MockedFunction<typeof sembleApiRequest>;
const mockSemblePagination = SemblePagination as jest.Mocked<typeof SemblePagination>;

describe('Semble Node - Product Operations Integration', () => {
  let sembleNode: Semble;
  let mockContext: MockProxy<IExecuteFunctions>;

  beforeEach(() => {
    sembleNode = new Semble();
    mockContext = createMockExecuteFunctions();
    jest.clearAllMocks();
  });

  describe('Product Get Operation', () => {
    it('should get single product successfully', async () => {
      const testProductId = '64a1b2c3d4e5f6789012345a';
      const mockProductData = {
        id: testProductId,
        name: 'Test Product',
        itemCode: 'TEST001',
        price: 99.99,
        status: 'active',
        productType: 'product'
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'get';
          case 'resource': return 'product';
          case 'productId': return testProductId;
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        product: mockProductData
      });

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual(mockProductData);
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('query GetProduct'),
        { id: testProductId },
        3,
        false
      );
    });

    it('should return placeholder object when product not found', async () => {
      const testProductId = 'nonexistent-product-id';
      
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'get';
          case 'resource': return 'product';
          case 'productId': return testProductId;
          default: return undefined;
        }
      });

      const result = await sembleNode.execute.call(mockContext);
      
      expect(result).toEqual([[{
        json: {
          id: 'nonexistent-product-id',
          name: 'Unknown Product',
          description: 'Invalid product ID format: nonexistent-product-id',
          category: 'unknown',
          price: null,
          duration: null,
          isSystemAppointment: false,
        }
      }]]);
    });

    it('should handle system appointment types', async () => {
      const testProductId = 'unavailable';
      
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'get';
          case 'resource': return 'product';
          case 'productId': return testProductId;
          default: return undefined;
        }
      });

      const result = await sembleNode.execute.call(mockContext);
      
      expect(result).toEqual([[{
        json: {
          id: 'unavailable',
          name: 'Out of office',
          description: 'System appointment type: unavailable',
          category: 'system',
          price: null,
          duration: null,
          isSystemAppointment: true,
        }
      }]]);
    });    it('should throw error when product ID is missing', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'get';
          case 'resource': return 'product';
          case 'productId': return '';
          default: return undefined;
        }
      });

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeOperationError);
      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Product ID is required for get operation'
      );
    });
  });

  describe('Product GetMany Operation', () => {
    it('should get multiple products successfully', async () => {
      const mockPaginationResult = {
        data: [
          { id: '1', name: 'Product 1', itemCode: 'PROD001', price: 99.99 },
          { id: '2', name: 'Product 2', itemCode: 'PROD002', price: 149.99 }
        ],
        meta: {
          pagesProcessed: 1,
          totalRecords: 2,
          hasMore: false
        }
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'getMany';
          case 'resource': return 'product';
          case 'limit': return 50;
          case 'returnAll': return false;
          case 'options': return {
            pageSize: 50,
            returnAll: false
          };
          default: return undefined;
        }
      });

      mockSemblePagination.execute.mockResolvedValue(mockPaginationResult);

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(2);
      expect(result[0][0].json).toEqual(mockPaginationResult.data[0]);
      expect(result[0][1].json).toEqual(mockPaginationResult.data[1]);
      expect(mockSemblePagination.execute).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          query: expect.stringContaining('query GetProducts'),
          dataPath: 'products',
          pageSize: 50,
          returnAll: false
        })
      );
    });

    it('should handle empty product list', async () => {
      const mockPaginationResult = {
        data: [],
        meta: {
          pagesProcessed: 1,
          totalRecords: 0,
          hasMore: false
        }
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'getMany';
          case 'resource': return 'product';
          case 'limit': return 50;
          case 'returnAll': return false;
          case 'options': return {
            pageSize: 50,
            returnAll: false
          };
          default: return undefined;
        }
      });

      mockSemblePagination.execute.mockResolvedValue(mockPaginationResult);

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(0);
      expect(mockSemblePagination.execute).toHaveBeenCalled();
    });

    it('should handle returnAll option', async () => {
      const mockPaginationResult = {
        data: [
          { id: '1', name: 'Product 1' },
          { id: '2', name: 'Product 2' },
          { id: '3', name: 'Product 3' }
        ],
        meta: {
          pagesProcessed: 2,
          totalRecords: 3,
          hasMore: false
        }
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'getMany';
          case 'resource': return 'product';
          case 'returnAll': return true;
          case 'options': return {
            returnAll: true
          };
          default: return undefined;
        }
      });

      mockSemblePagination.execute.mockResolvedValue(mockPaginationResult);

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(3);
      expect(mockSemblePagination.execute).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          query: expect.stringContaining('query GetProducts'),
          dataPath: 'products',
          returnAll: true
        })
      );
    });
  });

  describe('Product Create Operation', () => {
    it('should create product successfully with all fields', async () => {
      const testProductData = {
        name: 'New Test Product',
        itemCode: 'NEW001',
        productType: 'product',
        price: 199.99,
        cost: 99.99,
        stockLevel: 10,
        supplierName: 'Test Supplier',
        isBookable: true,
        duration: 60,
        color: '#FF0000'
      };

      const mockCreatedProduct = {
        id: '64a1b2c3d4e5f6789012345c',
        ...testProductData,
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z'
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'create';
          case 'resource': return 'product';
          case 'name': return testProductData.name;
          case 'additionalFields': return {
            itemCode: testProductData.itemCode,
            productType: testProductData.productType,
            price: testProductData.price,
            cost: testProductData.cost,
            stockLevel: testProductData.stockLevel,
            supplierName: testProductData.supplierName,
            isBookable: testProductData.isBookable,
            duration: testProductData.duration,
            color: testProductData.color
          };
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        createProduct: {
          data: mockCreatedProduct,
          error: null
        }
      });

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual(mockCreatedProduct);
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('mutation CreateProduct'),
        expect.objectContaining({
          productData: expect.objectContaining({
            name: testProductData.name,
            itemCode: testProductData.itemCode,
            productType: testProductData.productType
          })
        }),
        3,
        false
      );
    });

    it('should create product with minimal required fields', async () => {
      const testProductData = {
        name: 'Minimal Product',
        itemCode: 'MIN001',
        productType: 'service'
      };

      const mockCreatedProduct = {
        id: '64a1b2c3d4e5f6789012345d',
        ...testProductData,
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z'
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'create';
          case 'resource': return 'product';
          case 'name': return testProductData.name;
          case 'additionalFields': return {
            itemCode: testProductData.itemCode,
            productType: testProductData.productType
          };
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        createProduct: {
          data: mockCreatedProduct,
          error: null
        }
      });

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual(mockCreatedProduct);
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('mutation CreateProduct'),
        expect.objectContaining({
          productData: expect.objectContaining({
            name: testProductData.name,
            itemCode: testProductData.itemCode,
            productType: testProductData.productType
          })
        }),
        3,
        false
      );
    });

    it('should handle product creation API errors', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'create';
          case 'resource': return 'product';
          case 'name': return 'Test Product';
          case 'itemCode': return 'TEST001';
          case 'productType': return 'product';
          case 'additionalFields': return {};
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        createProduct: {
          data: null,
          error: 'Product with item code TEST001 already exists'
        }
      });

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeApiError);
      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Failed to create product: Product with item code TEST001 already exists'
      );
    });

    it('should handle network errors during product creation', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'create';
          case 'resource': return 'product';
          case 'name': return 'Test Product';
          case 'itemCode': return 'TEST001';
          case 'productType': return 'product';
          case 'additionalFields': return {};
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockRejectedValue(new Error('Network timeout'));

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeApiError);
      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Failed to create product'
      );
    });
  });

  describe('Product Update Operation', () => {
    it('should update product successfully', async () => {
      const testProductId = '64a1b2c3d4e5f6789012345a';
      const updateData = {
        name: 'Updated Product Name',
        price: 299.99,
        stockLevel: 15,
        supplierName: 'New Supplier'
      };

      const mockUpdatedProduct = {
        id: testProductId,
        ...updateData,
        itemCode: 'TEST001',
        status: 'active',
        updatedAt: '2024-01-01T12:00:00Z'
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'update';
          case 'resource': return 'product';
          case 'productId': return testProductId;
          case 'updateFields': return updateData;
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        updateProduct: {
          data: mockUpdatedProduct,
          error: null
        }
      });

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual(mockUpdatedProduct);
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('mutation UpdateProduct'),
        expect.objectContaining({
          id: testProductId,
          productData: updateData
        }),
        3,
        false
      );
    });

    it('should throw error when product ID is missing for update', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'update';
          case 'resource': return 'product';
          case 'productId': return '';
          case 'updateFields': return { name: 'Updated Name' };
          default: return undefined;
        }
      });

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeOperationError);
      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Product ID is required for update operation'
      );
    });

    it('should handle update errors gracefully', async () => {
      const testProductId = '64a1b2c3d4e5f6789012345a';

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'update';
          case 'resource': return 'product';
          case 'productId': return testProductId;
          case 'updateFields': return { name: 'Updated Name' };
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        updateProduct: {
          data: null,
          error: 'Product not found or update failed'
        }
      });

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeApiError);
      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Failed to update product: Product not found or update failed'
      );
    });
  });

  describe('Product Delete Operation', () => {
    it('should delete product successfully', async () => {
      const testProductId = '64a1b2c3d4e5f6789012345a';

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'delete';
          case 'resource': return 'product';
          case 'productId': return testProductId;
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        deleteProduct: {
          data: { id: testProductId, name: 'Test Product', itemCode: 'TEST001' },
          error: null
        }
      });

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual(expect.objectContaining({
        success: true,
        productId: testProductId,
        deletedProduct: expect.objectContaining({ id: testProductId }),
        message: expect.stringContaining('deleted successfully')
      }));
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('mutation DeleteProduct'),
        { id: testProductId },
        3,
        false
      );
    });

    it('should throw error when product ID is missing for delete', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'delete';
          case 'resource': return 'product';
          case 'productId': return '';
          default: return undefined;
        }
      });

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeOperationError);
      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Product ID is required for delete operation'
      );
    });

    it('should handle delete errors gracefully', async () => {
      const testProductId = '64a1b2c3d4e5f6789012345a';

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'delete';
          case 'resource': return 'product';
          case 'productId': return testProductId;
          default: return undefined;
        }
      });

      mockSembleApiRequest.mockResolvedValue({
        deleteProduct: {
          data: null,
          error: 'Product not found or cannot be deleted'
        }
      });

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeApiError);
      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Failed to delete product: Product not found or cannot be deleted'
      );
    });
  });

  describe('Product Error Handling', () => {
    it('should handle unknown product actions', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'unknownAction';
          case 'resource': return 'product';
          default: return undefined;
        }
      });

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeOperationError);
      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Unknown product action: unknownAction'
      );
    });

    it('should handle invalid product IDs gracefully', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'get';
          case 'resource': return 'product';
          case 'productId': return 'test-id';
          default: return undefined;
        }
      });

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual({
        id: 'test-id',
        name: 'Unknown Product',
        description: 'Invalid product ID format: test-id',
        price: null,
        duration: null,
        category: 'unknown',
        isSystemAppointment: false,
      });
    });

    it('should handle missing required fields appropriately', async () => {
      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'create';
          case 'resource': return 'product';
          case 'name': return '';
          case 'itemCode': return 'TEST001';
          case 'productType': return 'product';
          case 'additionalFields': return {};
          default: return undefined;
        }
      });

      // Mock API returning validation error for missing name
      mockSembleApiRequest.mockResolvedValue({
        createProduct: {
          data: null,
          error: 'Product name is required'
        }
      });

      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(NodeOperationError);
      await expect(sembleNode.execute.call(mockContext)).rejects.toThrow(
        'Product Name is required for create operation'
      );
    });
  });

  describe('Product Operations with Different Product Types', () => {
    it('should handle service type products', async () => {
      const serviceProductData = {
        name: 'Consultation Service',
        itemCode: 'CONSULT001',
        productType: 'service',
        isBookable: true,
        duration: 30,
        requiresPayment: true,
        requiresConfirmation: false
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'create';
          case 'resource': return 'product';
          case 'name': return serviceProductData.name;
          case 'additionalFields': return {
            itemCode: serviceProductData.itemCode,
            productType: serviceProductData.productType,
            isBookable: serviceProductData.isBookable,
            duration: serviceProductData.duration,
            requiresPayment: serviceProductData.requiresPayment,
            requiresConfirmation: serviceProductData.requiresConfirmation
          };
          default: return undefined;
        }
      });

      const mockCreatedService = {
        id: '64a1b2c3d4e5f6789012345e',
        ...serviceProductData,
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockSembleApiRequest.mockResolvedValue({
        createProduct: {
          data: mockCreatedService,
          error: null
        }
      });

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual(mockCreatedService);
      expect(result[0][0].json.productType).toBe('service');
      expect(result[0][0].json.isBookable).toBe(true);
    });

    it('should handle product type products with inventory', async () => {
      const inventoryProductData = {
        name: 'Medical Supply',
        itemCode: 'MED001',
        productType: 'product',
        price: 49.99,
        cost: 25.00,
        stockLevel: 100,
        supplierName: 'Medical Supplies Inc'
      };

      (mockContext.getNodeParameter as any).mockImplementation((param: string) => {
        switch (param) {
          case 'action': return 'create';
          case 'resource': return 'product';
          case 'name': return inventoryProductData.name;
          case 'additionalFields': return {
            itemCode: inventoryProductData.itemCode,
            productType: inventoryProductData.productType,
            price: inventoryProductData.price,
            cost: inventoryProductData.cost,
            stockLevel: inventoryProductData.stockLevel,
            supplierName: inventoryProductData.supplierName
          };
          default: return undefined;
        }
      });

      const mockCreatedProduct = {
        id: '64a1b2c3d4e5f6789012345f',
        ...inventoryProductData,
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockSembleApiRequest.mockResolvedValue({
        createProduct: {
          data: mockCreatedProduct,
          error: null
        }
      });

      const result = await sembleNode.execute.call(mockContext);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual(mockCreatedProduct);
      expect(result[0][0].json.productType).toBe('product');
      expect(result[0][0].json.stockLevel).toBe(100);
    });
  });
});
