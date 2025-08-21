/**
 * @fileoverview Tests for Product GraphQL queries and field definitions
 * @description Tests for shared product query constants and field definitions
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Shared
 */

import { 
  GET_PRODUCT_QUERY, 
  GET_PRODUCTS_QUERY, 
  CREATE_PRODUCT_MUTATION,
  UPDATE_PRODUCT_MUTATION,
  DELETE_PRODUCT_MUTATION,
  PRODUCT_FIELDS 
} from '../../nodes/Semble/shared/ProductQueries';

describe('ProductQueries', () => {
  describe('PRODUCT_FIELDS', () => {
    it('should contain required core fields', () => {
      expect(PRODUCT_FIELDS).toContain('id');
      expect(PRODUCT_FIELDS).toContain('status');
      expect(PRODUCT_FIELDS).toContain('productType');
      expect(PRODUCT_FIELDS).toContain('name');
      expect(PRODUCT_FIELDS).toContain('itemCode');
      expect(PRODUCT_FIELDS).toContain('serialNumber');
      expect(PRODUCT_FIELDS).toContain('createdAt');
      expect(PRODUCT_FIELDS).toContain('updatedAt');
    });

    it('should contain pricing and inventory fields', () => {
      expect(PRODUCT_FIELDS).toContain('price');
      expect(PRODUCT_FIELDS).toContain('cost');
      expect(PRODUCT_FIELDS).toContain('stockLevel');
      expect(PRODUCT_FIELDS).toContain('tax {');
    });

    it('should contain supplier information fields', () => {
      expect(PRODUCT_FIELDS).toContain('supplierName');
      expect(PRODUCT_FIELDS).toContain('supplierDisplayName');
    });

    it('should contain booking and service fields', () => {
      expect(PRODUCT_FIELDS).toContain('isBookable');
      expect(PRODUCT_FIELDS).toContain('duration');
      expect(PRODUCT_FIELDS).toContain('color');
      expect(PRODUCT_FIELDS).toContain('isVideoConsultation');
      expect(PRODUCT_FIELDS).toContain('requiresPayment');
      expect(PRODUCT_FIELDS).toContain('requiresConfirmation');
    });

    it('should contain metadata fields', () => {
      expect(PRODUCT_FIELDS).toContain('comments');
      expect(PRODUCT_FIELDS).toContain('labels {');
      expect(PRODUCT_FIELDS).toContain('appointments {');
    });

    it('should contain complex object fields with proper structure', () => {
      // Tax object structure
      expect(PRODUCT_FIELDS).toContain('tax {');
      expect(PRODUCT_FIELDS).toContain('taxName');
      expect(PRODUCT_FIELDS).toContain('taxRate');
      expect(PRODUCT_FIELDS).toContain('taxCode');
      
      // Labels array structure
      expect(PRODUCT_FIELDS).toContain('labels {');
      expect(PRODUCT_FIELDS).toContain('id');
      
      // Appointments array structure
      expect(PRODUCT_FIELDS).toContain('appointments {');
    });
  });

  describe('GET_PRODUCT_QUERY', () => {
    it('should be a valid GraphQL query structure', () => {
      expect(GET_PRODUCT_QUERY).toContain('query GetProduct');
      expect(GET_PRODUCT_QUERY).toContain('$id: ID!');
      expect(GET_PRODUCT_QUERY).toContain('product(id: $id)');
    });

    it('should include all product fields', () => {
      expect(GET_PRODUCT_QUERY).toContain(PRODUCT_FIELDS);
    });

    it('should use correct parameter binding', () => {
      expect(GET_PRODUCT_QUERY).toContain('id: $id');
    });
  });

  describe('GET_PRODUCTS_QUERY', () => {
    it('should be a valid GraphQL query structure', () => {
      expect(GET_PRODUCTS_QUERY).toContain('query GetProducts');
      expect(GET_PRODUCTS_QUERY).toContain('$pagination: Pagination');
      expect(GET_PRODUCTS_QUERY).toContain('$search: String');
      expect(GET_PRODUCTS_QUERY).toContain('$options: QueryOptions');
    });

    it('should include pagination and search parameters', () => {
      expect(GET_PRODUCTS_QUERY).toContain('pagination: $pagination');
      expect(GET_PRODUCTS_QUERY).toContain('search: $search');
      expect(GET_PRODUCTS_QUERY).toContain('options: $options');
    });

    it('should include data and pageInfo fields', () => {
      expect(GET_PRODUCTS_QUERY).toContain('data {');
      expect(GET_PRODUCTS_QUERY).toContain('pageInfo {');
      expect(GET_PRODUCTS_QUERY).toContain('hasMore');
    });

    it('should include all product fields in data section', () => {
      expect(GET_PRODUCTS_QUERY).toContain(PRODUCT_FIELDS);
    });
  });

  describe('CREATE_PRODUCT_MUTATION', () => {
    it('should be a valid GraphQL mutation structure', () => {
      expect(CREATE_PRODUCT_MUTATION).toContain('mutation CreateProduct');
      expect(CREATE_PRODUCT_MUTATION).toContain('$productData: CreateProductDataInput!');
      expect(CREATE_PRODUCT_MUTATION).toContain('createProduct(');
      expect(CREATE_PRODUCT_MUTATION).toContain('productData: $productData');
    });

    it('should include error and data fields', () => {
      expect(CREATE_PRODUCT_MUTATION).toContain('error');
      expect(CREATE_PRODUCT_MUTATION).toContain('data {');
    });

    it('should include all product fields in data section', () => {
      expect(CREATE_PRODUCT_MUTATION).toContain(PRODUCT_FIELDS);
    });

    it('should use CreateProductDataInput type', () => {
      expect(CREATE_PRODUCT_MUTATION).toContain('CreateProductDataInput!');
    });

    it('should include comprehensive product fields for response', () => {
      // Check for core fields that should be in the response
      expect(CREATE_PRODUCT_MUTATION).toContain('id');
      expect(CREATE_PRODUCT_MUTATION).toContain('name');
      expect(CREATE_PRODUCT_MUTATION).toContain('itemCode');
      expect(CREATE_PRODUCT_MUTATION).toContain('price');
      expect(CREATE_PRODUCT_MUTATION).toContain('createdAt');
      
      // Check for complex object fields
      expect(CREATE_PRODUCT_MUTATION).toContain('tax {');
      expect(CREATE_PRODUCT_MUTATION).toContain('labels {');
      expect(CREATE_PRODUCT_MUTATION).toContain('appointments {');
    });
  });

  describe('UPDATE_PRODUCT_MUTATION', () => {
    it('should be a valid GraphQL mutation structure', () => {
      expect(UPDATE_PRODUCT_MUTATION).toContain('mutation UpdateProduct');
      expect(UPDATE_PRODUCT_MUTATION).toContain('$id: ID!');
      expect(UPDATE_PRODUCT_MUTATION).toContain('$productData: UpdateProductDataInput!');
      expect(UPDATE_PRODUCT_MUTATION).toContain('updateProduct(');
      expect(UPDATE_PRODUCT_MUTATION).toContain('id: $id');
      expect(UPDATE_PRODUCT_MUTATION).toContain('productData: $productData');
    });

    it('should include error and data fields', () => {
      expect(UPDATE_PRODUCT_MUTATION).toContain('error');
      expect(UPDATE_PRODUCT_MUTATION).toContain('data {');
    });

    it('should include all product fields in data section', () => {
      expect(UPDATE_PRODUCT_MUTATION).toContain(PRODUCT_FIELDS);
    });

    it('should use UpdateProductDataInput type', () => {
      expect(UPDATE_PRODUCT_MUTATION).toContain('UpdateProductDataInput!');
    });

    it('should require product ID parameter', () => {
      expect(UPDATE_PRODUCT_MUTATION).toContain('$id: ID!');
      expect(UPDATE_PRODUCT_MUTATION).toContain('id: $id');
    });

    it('should include comprehensive product fields for response', () => {
      // Check for core fields that should be in the response
      expect(UPDATE_PRODUCT_MUTATION).toContain('id');
      expect(UPDATE_PRODUCT_MUTATION).toContain('name');
      expect(UPDATE_PRODUCT_MUTATION).toContain('itemCode');
      expect(UPDATE_PRODUCT_MUTATION).toContain('price');
      expect(UPDATE_PRODUCT_MUTATION).toContain('updatedAt');
      
      // Check for complex object fields
      expect(UPDATE_PRODUCT_MUTATION).toContain('tax {');
      expect(UPDATE_PRODUCT_MUTATION).toContain('labels {');
      expect(UPDATE_PRODUCT_MUTATION).toContain('appointments {');
    });

    it('should not include product-specific creation fields', () => {
      // Update should not have creation-specific requirements that create might have
      // This test ensures we're not accidentally including create-only fields
      expect(UPDATE_PRODUCT_MUTATION).not.toContain('CreateProductDataInput');
    });
  });

  describe('DELETE_PRODUCT_MUTATION', () => {
    it('should be a valid GraphQL mutation structure', () => {
      expect(DELETE_PRODUCT_MUTATION).toContain('mutation DeleteProduct');
      expect(DELETE_PRODUCT_MUTATION).toContain('$id: ID!');
      expect(DELETE_PRODUCT_MUTATION).toContain('deleteProduct(id: $id)');
    });

    it('should include error and data fields', () => {
      expect(DELETE_PRODUCT_MUTATION).toContain('error');
      expect(DELETE_PRODUCT_MUTATION).toContain('data {');
      expect(DELETE_PRODUCT_MUTATION).toContain('id');
      expect(DELETE_PRODUCT_MUTATION).toContain('name');
      expect(DELETE_PRODUCT_MUTATION).toContain('itemCode');
    });

    it('should return minimal fields on delete', () => {
      // Delete mutation should only return essential fields, not all product data
      expect(DELETE_PRODUCT_MUTATION).toContain('name');
      expect(DELETE_PRODUCT_MUTATION).toContain('itemCode');
      expect(DELETE_PRODUCT_MUTATION).toContain('status');
      expect(DELETE_PRODUCT_MUTATION).not.toContain('tax {');
      expect(DELETE_PRODUCT_MUTATION).not.toContain('labels {');
    });
  });

  describe('query validation', () => {
    it('should have consistent variable naming', () => {
      // All queries should use consistent variable naming patterns
      const queries = [
        GET_PRODUCT_QUERY,
        GET_PRODUCTS_QUERY,
        CREATE_PRODUCT_MUTATION,
        UPDATE_PRODUCT_MUTATION,
        DELETE_PRODUCT_MUTATION
      ];

      queries.forEach(query => {
        // Should not have undefined variables
        expect(query).not.toMatch(/\$undefined/);
      });
    });
  });
});
