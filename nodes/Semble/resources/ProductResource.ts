/**
 * @fileoverview Product Resource implementation for n8n Semble integration (Action Hooks)
 * @description Provides CRUD operations for products following the established patient patterns
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Nodes.Resources
 */

import {
  IExecuteFunctions,
  IDataObject,
  INodeExecutionData,
  NodeApiError,
  NodeOperationError,
} from "n8n-workflow";

import { sembleApiRequest } from "../GenericFunctions";
import {
  SemblePagination,
  buildPaginationConfig,
} from "../shared/PaginationHelpers";
import {
  GET_PRODUCT_QUERY,
  GET_PRODUCTS_QUERY,
  CREATE_PRODUCT_MUTATION,
  UPDATE_PRODUCT_MUTATION,
  DELETE_PRODUCT_MUTATION,
} from "../shared/ProductQueries";

/**
 * Product Resource class providing CRUD action hooks
 * @class ProductResource
 * @description Implements all product-related CRUD operations following established patterns
 */
export class ProductResource {
  /**
   * Get a single product by ID
   * @param executeFunctions - n8n execution context
   * @param itemIndex - Current item index
   * @returns Promise<IDataObject> - Single product data
   */
  static async get(
    executeFunctions: IExecuteFunctions,
    itemIndex: number,
  ): Promise<IDataObject> {
    const productId = executeFunctions.getNodeParameter(
      "productId",
      itemIndex,
    ) as string;

    if (!productId) {
      throw new NodeOperationError(
        executeFunctions.getNode(),
        "Product ID is required for get operation",
      );
    }

    const variables = { id: productId };

    try {
      const response = await sembleApiRequest.call(
        executeFunctions,
        GET_PRODUCT_QUERY,
        variables,
        3,
        false,
      );

      if (!response.product) {
        throw new NodeApiError(executeFunctions.getNode(), {
          message: `Product with ID ${productId} not found`,
          description: "The specified product ID does not exist",
        });
      }

      return response.product;
    } catch (error) {
      if (error instanceof NodeApiError) {
        throw error;
      }

      throw new NodeApiError(executeFunctions.getNode(), {
        message: `Failed to get product: ${(error as Error).message}`,
        description: (error as Error).message,
      });
    }
  }

  /**
   * Get multiple products with pagination
   * @param executeFunctions - n8n execution context
   * @param itemIndex - Current item index
   * @returns Promise<IDataObject[]> - Array of product data
   */
  static async getMany(
    executeFunctions: IExecuteFunctions,
    itemIndex: number,
  ): Promise<IDataObject[]> {
    const options = executeFunctions.getNodeParameter(
      "options",
      itemIndex,
    ) as IDataObject;
    const paginationConfig = buildPaginationConfig(options);

    try {
      const paginationResult = await SemblePagination.execute(executeFunctions, {
        query: GET_PRODUCTS_QUERY,
        baseVariables: {},
        dataPath: "products",
        pageSize: paginationConfig.pageSize,
        returnAll: paginationConfig.returnAll,
        search: paginationConfig.search,
        options: {},
      });

      return paginationResult.data;
    } catch (error) {
      throw new NodeApiError(executeFunctions.getNode(), {
        message: `Failed to get products: ${(error as Error).message}`,
        description: (error as Error).message,
      });
    }
  }

  /**
   * Create a new product
   * @param executeFunctions - n8n execution context
   * @param itemIndex - Current item index
   * @returns Promise<IDataObject> - Created product data
   */
  static async create(
    executeFunctions: IExecuteFunctions,
    itemIndex: number,
  ): Promise<IDataObject> {
    const name = executeFunctions.getNodeParameter("name", itemIndex) as string;
    const additionalFields = executeFunctions.getNodeParameter(
      "additionalFields",
      itemIndex,
    ) as IDataObject;

    if (!name) {
      throw new NodeOperationError(
        executeFunctions.getNode(),
        "Product Name is required for create operation",
      );
    }

    // Build product data object from the API specification
    const productData: IDataObject = {
      name,
      ...additionalFields,
    };

    // Handle tax data if provided
    if (additionalFields.tax && typeof additionalFields.tax === 'object') {
      const taxData = additionalFields.tax as IDataObject;
      productData.tax = {
        taxName: taxData.taxName || "No VAT",
        taxRate: taxData.taxRate || 0,
        taxCode: taxData.taxCode || "NONE",
      };
    }

    // Handle labels if provided
    if (additionalFields.labels) {
      const labels = additionalFields.labels as IDataObject;
      if (labels.labelIds && Array.isArray(labels.labelIds)) {
        productData.labels = (labels.labelIds as string[]).map((id: string) => ({ id }));
      }
    }

    const variables = { productData };

    try {
      const response = await sembleApiRequest.call(
        executeFunctions,
        CREATE_PRODUCT_MUTATION,
        variables,
        3,
        false,
      );
      const result = response.createProduct;

      if (result.error) {
        throw new NodeApiError(executeFunctions.getNode(), {
          message: `Failed to create product: ${result.error}`,
          description: result.error,
        });
      }

      return result.data;
    } catch (error) {
      if (error instanceof NodeApiError) {
        throw error;
      }

      throw new NodeApiError(executeFunctions.getNode(), {
        message: `Failed to create product: ${(error as Error).message}`,
        description: (error as Error).message,
      });
    }
  }

  /**
   * Update an existing product
   * @param executeFunctions - n8n execution context
   * @param itemIndex - Current item index
   * @returns Promise<IDataObject> - Updated product data
   */
  static async update(
    executeFunctions: IExecuteFunctions,
    itemIndex: number,
  ): Promise<IDataObject> {
    const productId = executeFunctions.getNodeParameter(
      "productId",
      itemIndex,
    ) as string;
    const updateFields = executeFunctions.getNodeParameter(
      "updateFields",
      itemIndex,
    ) as IDataObject;

    if (!productId) {
      throw new NodeOperationError(
        executeFunctions.getNode(),
        "Product ID is required for update operation",
      );
    }

    // Build product update data object
    const productData: IDataObject = {
      ...updateFields,
    };

    // Handle tax data if provided
    if (updateFields.tax && typeof updateFields.tax === 'object') {
      const taxData = updateFields.tax as IDataObject;
      productData.tax = {
        taxName: taxData.taxName,
        taxRate: taxData.taxRate,
        taxCode: taxData.taxCode,
      };
    }

    // Handle labels if provided
    if (updateFields.labels) {
      const labels = updateFields.labels as IDataObject;
      if (labels.labelIds && Array.isArray(labels.labelIds)) {
        productData.labels = (labels.labelIds as string[]).map((id: string) => ({ id }));
      }
    }

    const variables = {
      id: productId,
      productData,
    };

    try {
      const response = await sembleApiRequest.call(
        executeFunctions,
        UPDATE_PRODUCT_MUTATION,
        variables,
        3,
        false,
      );
      const result = response.updateProduct;

      if (result.error) {
        throw new NodeApiError(executeFunctions.getNode(), {
          message: `Failed to update product: ${result.error}`,
          description: result.error,
        });
      }

      return result.data;
    } catch (error) {
      if (error instanceof NodeApiError) {
        throw error;
      }

      throw new NodeApiError(executeFunctions.getNode(), {
        message: `Failed to update product: ${(error as Error).message}`,
        description: (error as Error).message,
      });
    }
  }

  /**
   * Delete a product
   * @param executeFunctions - n8n execution context
   * @param itemIndex - Current item index
   * @returns Promise<IDataObject> - Deletion result with metadata
   */
  static async delete(
    executeFunctions: IExecuteFunctions,
    itemIndex: number,
  ): Promise<IDataObject> {
    const productId = executeFunctions.getNodeParameter(
      "productId",
      itemIndex,
    ) as string;

    if (!productId) {
      throw new NodeOperationError(
        executeFunctions.getNode(),
        "Product ID is required for delete operation",
      );
    }

    const variables = { id: productId };

    try {
      const response = await sembleApiRequest.call(
        executeFunctions,
        DELETE_PRODUCT_MUTATION,
        variables,
        3,
        false,
      );
      const result = response.deleteProduct;

      if (result.error) {
        throw new NodeApiError(executeFunctions.getNode(), {
          message: `Failed to delete product: ${result.error}`,
          description: result.error,
        });
      }

      return {
        success: true,
        productId,
        deletedProduct: result.data,
        message: `Product ${result.data?.name || 'Unknown'} (${result.data?.itemCode || productId}) deleted successfully`,
      };
    } catch (error) {
      if (error instanceof NodeApiError) {
        throw error;
      }

      throw new NodeApiError(executeFunctions.getNode(), {
        message: `Failed to delete product: ${(error as Error).message}`,
        description: (error as Error).message,
      });
    }
  }

  /**
   * Execute product action based on action type
   * @param executeFunctions - n8n execution context
   * @param action - Action to perform (get, getMany, create, update, delete)
   * @param itemIndex - Current item index
   * @returns Promise<IDataObject | IDataObject[]> - Action result
   */
  static async executeAction(
    executeFunctions: IExecuteFunctions,
    action: string,
    itemIndex: number,
  ): Promise<IDataObject | IDataObject[]> {
    switch (action) {
      case "get":
        return await this.get(executeFunctions, itemIndex);
      case "getMany":
        return await this.getMany(executeFunctions, itemIndex);
      case "create":
        return await this.create(executeFunctions, itemIndex);
      case "update":
        return await this.update(executeFunctions, itemIndex);
      case "delete":
        return await this.delete(executeFunctions, itemIndex);
      default:
        throw new NodeOperationError(
          executeFunctions.getNode(),
          `Unknown product action: ${action}`,
        );
    }
  }
}
