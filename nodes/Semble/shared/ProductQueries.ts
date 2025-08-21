/**
 * @fileoverview Product-specific GraphQL queries and field definitions
 * @description Provides reusable product queries for use with pagination helpers
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Nodes.Shared
 */

/**
 * Complete product fields for GraphQL queries
 * Matches exact Semble API Product type schema
 */
export const PRODUCT_FIELDS = `
  id
  status
  productType
  labels {
    id
  }
  itemCode
  name
  serialNumber
  tax {
    taxName
    taxRate
    taxCode
  }
  stockLevel
  price
  cost
  supplierName
  supplierDisplayName
  comments
  appointments {
    id
  }
  isBookable
  duration
  color
  isVideoConsultation
  requiresPayment
  requiresConfirmation
  createdAt
  updatedAt
`;

/**
 * GraphQL query for getting a single product by ID
 */
export const GET_PRODUCT_QUERY = `
  query GetProduct($id: ID!) {
    product(id: $id) {
      ${PRODUCT_FIELDS}
    }
  }
`;

/**
 * GraphQL query for getting multiple products with pagination
 */
export const GET_PRODUCTS_QUERY = `
  query GetProducts($pagination: Pagination, $search: String, $options: QueryOptions) {
    products(
      pagination: $pagination
      search: $search
      options: $options
    ) {
      data {
        ${PRODUCT_FIELDS}
      }
      pageInfo {
        hasMore
      }
    }
  }
`;

/**
 * GraphQL mutation for creating a new product
 */
export const CREATE_PRODUCT_MUTATION = `
  mutation CreateProduct($productData: CreateProductDataInput!) {
    createProduct(productData: $productData) {
      data {
        ${PRODUCT_FIELDS}
      }
      error
    }
  }
`;

/**
 * GraphQL mutation for updating a product
 */
export const UPDATE_PRODUCT_MUTATION = `
  mutation UpdateProduct($id: ID!, $productData: UpdateProductDataInput!) {
    updateProduct(id: $id, productData: $productData) {
      data {
        ${PRODUCT_FIELDS}
      }
      error
    }
  }
`;

/**
 * GraphQL mutation for deleting a product
 */
export const DELETE_PRODUCT_MUTATION = `
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id) {
      data {
        id
        name
        itemCode
        status
      }
      error
    }
  }
`;
