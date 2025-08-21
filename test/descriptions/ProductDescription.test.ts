/**
 * @fileoverview Unit tests for ProductDescription field definitions
 * @description Tests product field configurations and validation functions
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Descriptions
 */

import {
  PRODUCT_ID_FIELD,
  PRODUCT_NAME_FIELD,
  PRODUCT_TYPE_FIELD,
  PRODUCT_STATUS_FIELD,
  PRODUCT_ADDITIONAL_FIELDS,
  PRODUCT_UPDATE_FIELDS,
  PRODUCT_FILTERS,
  PRODUCT_FIELDS,
  ProductValidation,
  PRODUCT_FIELD_HELP,
} from "../../nodes/Semble/descriptions/ProductDescription";

describe("ProductDescription", () => {
  describe("Field Definitions", () => {
    it("should define PRODUCT_ID_FIELD correctly", () => {
      expect(PRODUCT_ID_FIELD.displayName).toBe("Product ID");
      expect(PRODUCT_ID_FIELD.name).toBe("productId");
      expect(PRODUCT_ID_FIELD.type).toBe("string");
      expect(PRODUCT_ID_FIELD.required).toBe(true);
      expect(PRODUCT_ID_FIELD.displayOptions?.show?.resource).toContain("product");
    });

    it("should define PRODUCT_NAME_FIELD correctly", () => {
      expect(PRODUCT_NAME_FIELD.displayName).toBe("Product Name");
      expect(PRODUCT_NAME_FIELD.name).toBe("name");
      expect(PRODUCT_NAME_FIELD.type).toBe("string");
      expect(PRODUCT_NAME_FIELD.required).toBe(true);
    });

    it("should define PRODUCT_TYPE_FIELD with valid options", () => {
      expect(PRODUCT_TYPE_FIELD.displayName).toBe("Product Type");
      expect(PRODUCT_TYPE_FIELD.name).toBe("productType");
      expect(PRODUCT_TYPE_FIELD.type).toBe("options");
      expect(PRODUCT_TYPE_FIELD.options).toHaveLength(4);
      expect(PRODUCT_TYPE_FIELD.default).toBe("service");
    });

    it("should define PRODUCT_STATUS_FIELD with valid options", () => {
      expect(PRODUCT_STATUS_FIELD.displayName).toBe("Status");
      expect(PRODUCT_STATUS_FIELD.name).toBe("status");
      expect(PRODUCT_STATUS_FIELD.type).toBe("options");
      expect(PRODUCT_STATUS_FIELD.options).toHaveLength(3);
      expect(PRODUCT_STATUS_FIELD.default).toBe("active");
    });

    it("should define PRODUCT_ADDITIONAL_FIELDS as collection", () => {
      expect(PRODUCT_ADDITIONAL_FIELDS.displayName).toBe("Additional Fields");
      expect(PRODUCT_ADDITIONAL_FIELDS.name).toBe("additionalFields");
      expect(PRODUCT_ADDITIONAL_FIELDS.type).toBe("collection");
      expect(PRODUCT_ADDITIONAL_FIELDS.options).toBeDefined();
      expect(PRODUCT_ADDITIONAL_FIELDS.options!.length).toBeGreaterThan(10);
    });

    it("should define PRODUCT_UPDATE_FIELDS as collection", () => {
      expect(PRODUCT_UPDATE_FIELDS.displayName).toBe("Update Fields");
      expect(PRODUCT_UPDATE_FIELDS.name).toBe("updateFields");
      expect(PRODUCT_UPDATE_FIELDS.type).toBe("collection");
      expect(PRODUCT_UPDATE_FIELDS.displayOptions?.show?.action).toContain("update");
    });

    it("should define PRODUCT_FILTERS as collection", () => {
      expect(PRODUCT_FILTERS.displayName).toBe("Filters");
      expect(PRODUCT_FILTERS.name).toBe("filters");
      expect(PRODUCT_FILTERS.type).toBe("collection");
      expect(PRODUCT_FILTERS.displayOptions?.show?.action).toContain("getAll");
    });

    it("should export complete PRODUCT_FIELDS array", () => {
      expect(Array.isArray(PRODUCT_FIELDS)).toBe(true);
      expect(PRODUCT_FIELDS.length).toBeGreaterThan(3);
      
      // Check that main fields are included
      const fieldNames = PRODUCT_FIELDS.map(field => field.name);
      expect(fieldNames).toContain("productId");
      expect(fieldNames).toContain("name");
      expect(fieldNames).toContain("additionalFields");
    });
  });

  describe("Field Validation", () => {
    describe("validateName", () => {
      it("should validate product names correctly", () => {
        expect(ProductValidation.validateName("Valid Product")).toBe(true);
        expect(ProductValidation.validateName("AB")).toBe(true);
        expect(ProductValidation.validateName("A")).toBe(false);
        expect(ProductValidation.validateName("")).toBe(false);
        expect(ProductValidation.validateName("A".repeat(101))).toBe(false);
      });

      it("should handle whitespace correctly", () => {
        expect(ProductValidation.validateName("  Valid  ")).toBe(true);
        expect(ProductValidation.validateName("   ")).toBe(false);
      });
    });

    describe("validatePrice", () => {
      it("should validate prices correctly", () => {
        expect(ProductValidation.validatePrice(0)).toBe(true);
        expect(ProductValidation.validatePrice(10.50)).toBe(true);
        expect(ProductValidation.validatePrice(999999.99)).toBe(true);
        expect(ProductValidation.validatePrice(-1)).toBe(false);
        expect(ProductValidation.validatePrice(1000000)).toBe(false);
      });

      it("should handle invalid types", () => {
        expect(ProductValidation.validatePrice(NaN)).toBe(false);
        expect(ProductValidation.validatePrice(Infinity)).toBe(false);
      });
    });

    describe("validateDuration", () => {
      it("should validate duration for bookable services", () => {
        expect(ProductValidation.validateDuration(30, true)).toBe(true);
        expect(ProductValidation.validateDuration(480, true)).toBe(true);
        expect(ProductValidation.validateDuration(0, true)).toBe(false);
        expect(ProductValidation.validateDuration(481, true)).toBe(false);
      });

      it("should allow any duration for non-bookable products", () => {
        expect(ProductValidation.validateDuration(0, false)).toBe(true);
        expect(ProductValidation.validateDuration(-1, false)).toBe(true);
        expect(ProductValidation.validateDuration(1000, false)).toBe(true);
      });
    });

    describe("validateStockLevel", () => {
      it("should validate stock levels correctly", () => {
        expect(ProductValidation.validateStockLevel(0)).toBe(true);
        expect(ProductValidation.validateStockLevel(100)).toBe(true);
        expect(ProductValidation.validateStockLevel(-1)).toBe(false);
      });
    });

    describe("validateTaxRate", () => {
      it("should validate tax rates correctly", () => {
        expect(ProductValidation.validateTaxRate(0)).toBe(true);
        expect(ProductValidation.validateTaxRate(20)).toBe(true);
        expect(ProductValidation.validateTaxRate(100)).toBe(true);
        expect(ProductValidation.validateTaxRate(-1)).toBe(false);
        expect(ProductValidation.validateTaxRate(101)).toBe(false);
      });
    });
  });

  describe("Field Help Text", () => {
    it("should provide help text for key fields", () => {
      expect(PRODUCT_FIELD_HELP.name).toBeDefined();
      expect(PRODUCT_FIELD_HELP.productType).toBeDefined();
      expect(PRODUCT_FIELD_HELP.price).toBeDefined();
      expect(PRODUCT_FIELD_HELP.isBookable).toBeDefined();
      expect(PRODUCT_FIELD_HELP.duration).toBeDefined();
    });

    it("should have meaningful help text", () => {
      expect(PRODUCT_FIELD_HELP.name.length).toBeGreaterThan(20);
      expect(PRODUCT_FIELD_HELP.productType).toContain("Service");
      expect(PRODUCT_FIELD_HELP.isBookable).toContain("appointment");
    });
  });

  describe("Field Structure Validation", () => {
    it("should have options defined for collection fields", () => {
      expect(PRODUCT_ADDITIONAL_FIELDS.options).toBeDefined();
      expect(PRODUCT_UPDATE_FIELDS.options).toBeDefined();
      expect(PRODUCT_FILTERS.options).toBeDefined();
    });

    it("should have proper display options for different actions", () => {
      // Create action
      expect(PRODUCT_ADDITIONAL_FIELDS.displayOptions?.show?.action).toContain("create");
      expect(PRODUCT_ADDITIONAL_FIELDS.displayOptions?.show?.resource).toContain("product");
      
      // Update action
      expect(PRODUCT_UPDATE_FIELDS.displayOptions?.show?.action).toContain("update");
      expect(PRODUCT_UPDATE_FIELDS.displayOptions?.show?.resource).toContain("product");
      
      // GetAll action
      expect(PRODUCT_FILTERS.displayOptions?.show?.action).toContain("getAll");
      expect(PRODUCT_FILTERS.displayOptions?.show?.resource).toContain("product");
    });

    it("should have proper default values", () => {
      expect(PRODUCT_TYPE_FIELD.default).toBe("service");
      expect(PRODUCT_STATUS_FIELD.default).toBe("active");
      expect(PRODUCT_ADDITIONAL_FIELDS.default).toEqual({});
      expect(PRODUCT_UPDATE_FIELDS.default).toEqual({});
      expect(PRODUCT_FILTERS.default).toEqual({});
    });
  });

  describe("Exported Aliases", () => {
    it("should export field aliases correctly", () => {
      // Test that the aliases work by importing them
      const {
        ProductIdField,
        ProductNameField,
        ProductTypeField,
        ProductStatusField,
        ProductAdditionalFields,
        ProductUpdateFields,
        ProductFilters,
        ProductFieldsComplete,
      } = require("../../nodes/Semble/descriptions/ProductDescription");

      expect(ProductIdField).toBe(PRODUCT_ID_FIELD);
      expect(ProductNameField).toBe(PRODUCT_NAME_FIELD);
      expect(ProductTypeField).toBe(PRODUCT_TYPE_FIELD);
      expect(ProductStatusField).toBe(PRODUCT_STATUS_FIELD);
      expect(ProductAdditionalFields).toBe(PRODUCT_ADDITIONAL_FIELDS);
      expect(ProductUpdateFields).toBe(PRODUCT_UPDATE_FIELDS);
      expect(ProductFilters).toBe(PRODUCT_FILTERS);
      expect(ProductFieldsComplete).toBe(PRODUCT_FIELDS);
    });
  });
});
