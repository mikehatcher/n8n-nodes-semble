/**
 * @fileoverview Test suite for ProductResource action hooks
 * @description Comprehensive tests for product CRUD operations
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Resources
 */

import {
  IExecuteFunctions,
  IDataObject,
  NodeApiError,
  NodeOperationError,
} from "n8n-workflow";

import { ProductResource } from "../../nodes/Semble/resources/ProductResource";
import { sembleApiRequest } from "../../nodes/Semble/GenericFunctions";
import { SemblePagination, buildPaginationConfig } from "../../nodes/Semble/shared/PaginationHelpers";
import {
  GET_PRODUCT_QUERY,
  GET_PRODUCTS_QUERY,
  CREATE_PRODUCT_MUTATION,
  UPDATE_PRODUCT_MUTATION,
  DELETE_PRODUCT_MUTATION,
} from "../../nodes/Semble/shared/ProductQueries";

// Mock dependencies
jest.mock("../../nodes/Semble/GenericFunctions");
jest.mock("../../nodes/Semble/shared/PaginationHelpers");

const mockSembleApiRequest = sembleApiRequest as jest.MockedFunction<
  typeof sembleApiRequest
>;
const mockPagination = SemblePagination.execute as jest.MockedFunction<
  typeof SemblePagination.execute
>;
const mockBuildPaginationConfig = buildPaginationConfig as jest.MockedFunction<
  typeof buildPaginationConfig
>;

describe("ProductResource", () => {
  let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock execution functions
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getNode: jest.fn(() => ({ name: "Test Product Resource" })),
    } as unknown as jest.Mocked<IExecuteFunctions>;
  });

  describe("get method", () => {
    it("should get a single product by ID successfully", async () => {
      const productId = "62e2b7d228ec4b0013179e67";
      const mockProductData = {
        id: productId,
        name: "Test Product",
        status: "active",
        productType: "service",
        itemCode: "TEST001",
        price: 100,
        tax: {
          taxName: "No VAT",
          taxRate: 0,
          taxCode: "NONE",
        },
      };

      mockExecuteFunctions.getNodeParameter.mockReturnValue(productId);
      mockSembleApiRequest.mockResolvedValue({
        product: mockProductData,
      });

      const result = await ProductResource.get(mockExecuteFunctions, 0);

      expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
        "productId",
        0,
      );
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        GET_PRODUCT_QUERY,
        { id: productId },
        3,
        false,
      );
      expect(result).toEqual(mockProductData);
    });

    it("should throw error when product ID is missing", async () => {
      mockExecuteFunctions.getNodeParameter.mockReturnValue("");

      await expect(
        ProductResource.get(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeOperationError);
      
      expect(mockSembleApiRequest).not.toHaveBeenCalled();
    });

    it('should return placeholder object when product not found', async () => {
      mockExecuteFunctions.getNodeParameter.mockReturnValue('nonexistent');

      const result = await ProductResource.get(mockExecuteFunctions, 0);
      
      expect(result).toEqual({
        id: 'nonexistent',
        name: 'Unknown Product',
        description: 'Invalid product ID format: nonexistent',
        category: 'unknown',
        price: null,
        duration: null,
        isSystemAppointment: false,
      });
    });

    it("should handle API errors gracefully", async () => {
      const productId = "62e2b7d228ec4b0013179e67";
      
      mockExecuteFunctions.getNodeParameter.mockReturnValue(productId);
      mockSembleApiRequest.mockRejectedValue(new Error("API Error"));

      await expect(
        ProductResource.get(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeApiError);
    });
  });

  describe("getMany method", () => {
    it("should get multiple products with pagination", async () => {
      const mockOptions = {
        pageSize: 50,
        returnAll: false,
        search: "test",
      };
      const mockProductsData = [
        {
          id: "1",
          name: "Product 1",
          status: "active",
        },
        {
          id: "2", 
          name: "Product 2",
          status: "active",
        },
      ];

      mockExecuteFunctions.getNodeParameter.mockReturnValue(mockOptions);
      mockBuildPaginationConfig.mockReturnValue({
        pageSize: 50,
        returnAll: false,
        search: "test",
      });
      mockPagination.mockResolvedValue({
        data: mockProductsData,
        meta: {
          pagesProcessed: 1,
          totalRecords: 2,
          hasMore: false,
        },
      });

      const result = await ProductResource.getMany(mockExecuteFunctions, 0);

      expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
        "options",
        0,
      );
      expect(mockPagination).toHaveBeenCalledWith(
        mockExecuteFunctions,
        expect.objectContaining({
          query: GET_PRODUCTS_QUERY,
          dataPath: "products",
        })
      );
      expect(result).toEqual(mockProductsData);
    });

    it("should handle pagination errors", async () => {
      mockExecuteFunctions.getNodeParameter.mockReturnValue({});
      mockBuildPaginationConfig.mockReturnValue({
        pageSize: 50,
        returnAll: false,
      });
      mockPagination.mockRejectedValue(new Error("Pagination Error"));

      await expect(
        ProductResource.getMany(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeApiError);
    });
  });

  describe("create method", () => {
    it("should create a product with required fields", async () => {
      const productName = "New Product";
      const additionalFields = {
        itemCode: "NEW001",
        price: 150,
        status: "active",
      };
      const mockCreatedProduct = {
        id: "new-product-id",
        name: productName,
        ...additionalFields,
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(productName)
        .mockReturnValueOnce(additionalFields);
      
      mockSembleApiRequest.mockResolvedValue({
        createProduct: {
          data: mockCreatedProduct,
          error: null,
        },
      });

      const result = await ProductResource.create(mockExecuteFunctions, 0);

      expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith("name", 0);
      expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith("additionalFields", 0);
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        CREATE_PRODUCT_MUTATION,
        {
          productData: {
            name: productName,
            ...additionalFields,
          },
        },
        3,
        false,
      );
      expect(result).toEqual(mockCreatedProduct);
    });

    it("should create product with tax data", async () => {
      const productName = "Product with Tax";
      const additionalFields = {
        tax: {
          taxName: "VAT",
          taxRate: 20,
          taxCode: "VAT20",
        },
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(productName)
        .mockReturnValueOnce(additionalFields);
      
      mockSembleApiRequest.mockResolvedValue({
        createProduct: {
          data: { id: "test-id", name: productName },
          error: null,
        },
      });

      await ProductResource.create(mockExecuteFunctions, 0);

      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        CREATE_PRODUCT_MUTATION,
        {
          productData: expect.objectContaining({
            name: productName,
            tax: {
              taxName: "VAT",
              taxRate: 20,
              taxCode: "VAT20",
            },
          }),
        },
        3,
        false,
      );
    });

    it("should create product with labels", async () => {
      const productName = "Product with Labels";
      const additionalFields = {
        labels: {
          labelIds: ["label1", "label2"],
        },
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(productName)
        .mockReturnValueOnce(additionalFields);
      
      mockSembleApiRequest.mockResolvedValue({
        createProduct: {
          data: { id: "test-id", name: productName },
          error: null,
        },
      });

      await ProductResource.create(mockExecuteFunctions, 0);

      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        CREATE_PRODUCT_MUTATION,
        {
          productData: expect.objectContaining({
            name: productName,
            labels: [
              { id: "label1" },
              { id: "label2" },
            ],
          }),
        },
        3,
        false,
      );
    });

    it("should throw error when product name is missing", async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce("")
        .mockReturnValueOnce({});

      await expect(
        ProductResource.create(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeOperationError);
      
      expect(mockSembleApiRequest).not.toHaveBeenCalled();
    });

    it("should handle API errors during creation", async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce("Test Product")
        .mockReturnValueOnce({});
      
      mockSembleApiRequest.mockResolvedValue({
        createProduct: {
          data: null,
          error: "Creation failed",
        },
      });

      await expect(
        ProductResource.create(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeApiError);
    });
  });

  describe("update method", () => {
    it("should update a product successfully", async () => {
      const productId = "62e2b7d228ec4b0013179e67";
      const updateFields = {
        name: "Updated Product",
        price: 200,
      };
      const mockUpdatedProduct = {
        id: productId,
        ...updateFields,
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(productId)
        .mockReturnValueOnce(updateFields);
      
      mockSembleApiRequest.mockResolvedValue({
        updateProduct: {
          data: mockUpdatedProduct,
          error: null,
        },
      });

      const result = await ProductResource.update(mockExecuteFunctions, 0);

      expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith("productId", 0);
      expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith("updateFields", 0);
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        UPDATE_PRODUCT_MUTATION,
        {
          id: productId,
          productData: updateFields,
        },
        3,
        false,
      );
      expect(result).toEqual(mockUpdatedProduct);
    });

    it("should update product with tax data", async () => {
      const productId = "62e2b7d228ec4b0013179e67";
      const updateFields = {
        tax: {
          taxName: "Updated VAT",
          taxRate: 15,
          taxCode: "VAT15",
        },
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce(productId)
        .mockReturnValueOnce(updateFields);
      
      mockSembleApiRequest.mockResolvedValue({
        updateProduct: {
          data: { id: productId },
          error: null,
        },
      });

      await ProductResource.update(mockExecuteFunctions, 0);

      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        UPDATE_PRODUCT_MUTATION,
        {
          id: productId,
          productData: expect.objectContaining({
            tax: {
              taxName: "Updated VAT",
              taxRate: 15,
              taxCode: "VAT15",
            },
          }),
        },
        3,
        false,
      );
    });

    it("should throw error when product ID is missing", async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce("")
        .mockReturnValueOnce({});

      await expect(
        ProductResource.update(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeOperationError);
      
      expect(mockSembleApiRequest).not.toHaveBeenCalled();
    });

    it("should handle API errors during update", async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce("62e2b7d228ec4b0013179e67")
        .mockReturnValueOnce({ name: "Updated" });
      
      mockSembleApiRequest.mockResolvedValue({
        updateProduct: {
          data: null,
          error: "Update failed",
        },
      });

      await expect(
        ProductResource.update(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeApiError);
    });
  });

  describe("delete method", () => {
    it("should delete a product successfully", async () => {
      const productId = "62e2b7d228ec4b0013179e67";
      const mockDeletedProduct = {
        id: productId,
        name: "Deleted Product",
        itemCode: "DEL001",
        status: "deleted",
      };

      mockExecuteFunctions.getNodeParameter.mockReturnValue(productId);
      mockSembleApiRequest.mockResolvedValue({
        deleteProduct: {
          data: mockDeletedProduct,
          error: null,
        },
      });

      const result = await ProductResource.delete(mockExecuteFunctions, 0);

      expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith("productId", 0);
      expect(mockSembleApiRequest).toHaveBeenCalledWith(
        DELETE_PRODUCT_MUTATION,
        { id: productId },
        3,
        false,
      );
      expect(result).toEqual({
        success: true,
        productId,
        deletedProduct: mockDeletedProduct,
        message: `Product ${mockDeletedProduct.name} (${mockDeletedProduct.itemCode}) deleted successfully`,
      });
    });

    it("should handle delete result without name/itemCode", async () => {
      const productId = "62e2b7d228ec4b0013179e67";
      const mockDeletedProduct = {
        id: productId,
        status: "deleted",
      };

      mockExecuteFunctions.getNodeParameter.mockReturnValue(productId);
      mockSembleApiRequest.mockResolvedValue({
        deleteProduct: {
          data: mockDeletedProduct,
          error: null,
        },
      });

      const result = await ProductResource.delete(mockExecuteFunctions, 0);

      expect(result.message).toBe(`Product Unknown (${productId}) deleted successfully`);
    });

    it("should throw error when product ID is missing", async () => {
      mockExecuteFunctions.getNodeParameter.mockReturnValue("");

      await expect(
        ProductResource.delete(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeOperationError);
      
      expect(mockSembleApiRequest).not.toHaveBeenCalled();
    });

    it("should handle API errors during deletion", async () => {
      mockExecuteFunctions.getNodeParameter.mockReturnValue("62e2b7d228ec4b0013179e67");
      mockSembleApiRequest.mockResolvedValue({
        deleteProduct: {
          data: null,
          error: "Delete failed",
        },
      });

      await expect(
        ProductResource.delete(mockExecuteFunctions, 0)
      ).rejects.toThrow(NodeApiError);
    });
  });

  describe("executeAction method", () => {
    it("should route to correct action methods", async () => {
      // Mock successful responses for each action
      const validProductId = "62e2b7d228ec4b0013179e67"; // Valid 24-character MongoDB ObjectId
      const mockProduct = { id: validProductId, name: "Test Product" };
      
      mockExecuteFunctions.getNodeParameter.mockReturnValue(validProductId);
      mockBuildPaginationConfig.mockReturnValue({
        pageSize: 50,
        returnAll: false,
      });
      mockSembleApiRequest.mockResolvedValue({
        product: mockProduct,
        createProduct: { data: mockProduct, error: null },
        updateProduct: { data: mockProduct, error: null },
        deleteProduct: { data: mockProduct, error: null },
      });
      mockPagination.mockResolvedValue({
        data: [mockProduct],
        meta: {
          pagesProcessed: 1,
          totalRecords: 1,
        },
      });

      // Test each action
      const getResult = await ProductResource.executeAction(mockExecuteFunctions, "get", 0);
      expect(getResult).toEqual(mockProduct);

      const getManyResult = await ProductResource.executeAction(mockExecuteFunctions, "getMany", 0);
      expect(getManyResult).toEqual([mockProduct]);

      const createResult = await ProductResource.executeAction(mockExecuteFunctions, "create", 0);
      expect(createResult).toEqual(mockProduct);

      const updateResult = await ProductResource.executeAction(mockExecuteFunctions, "update", 0);
      expect(updateResult).toEqual(mockProduct);

      const deleteResult = await ProductResource.executeAction(mockExecuteFunctions, "delete", 0);
      expect(deleteResult).toHaveProperty("success", true);
    });

    it("should throw error for unknown action", async () => {
      await expect(
        ProductResource.executeAction(mockExecuteFunctions, "unknown", 0)
      ).rejects.toThrow(NodeOperationError);
    });
  });

  describe("Integration with ProductQueries", () => {
    it("should use correct GraphQL queries for each operation", async () => {
      // This test ensures our resource class uses the correct queries from ProductQueries
      expect(GET_PRODUCT_QUERY).toContain("query GetProduct");
      expect(GET_PRODUCTS_QUERY).toContain("query GetProducts");
      expect(CREATE_PRODUCT_MUTATION).toContain("mutation CreateProduct");
      expect(UPDATE_PRODUCT_MUTATION).toContain("mutation UpdateProduct");
      expect(DELETE_PRODUCT_MUTATION).toContain("mutation DeleteProduct");
    });
  });
});
