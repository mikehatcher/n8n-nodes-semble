/**
 * @fileoverview Product field descriptions and UI configuration for Semble n8n node
 * @description Provides reusable field definitions, validation rules, and UI configuration for product operations
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Nodes.Descriptions
 */

import { INodeProperties } from "n8n-workflow";

/**
 * Product ID field for get, delete, and update operations
 * @constant {INodeProperties}
 */
export const PRODUCT_ID_FIELD: INodeProperties = {
  displayName: "Product ID",
  name: "productId",
  type: "string",
  required: true,
  displayOptions: {
    show: {
      action: ["get", "delete", "update"],
      resource: ["product"],
    },
  },
  default: "",
  placeholder: "e.g., 62e2b7d228ec4b0013179e67",
  description: "The ID of the product to retrieve, update or delete",
};

/**
 * Product name field for creation and updates
 * @constant {INodeProperties}
 */
export const PRODUCT_NAME_FIELD: INodeProperties = {
  displayName: "Product Name",
  name: "name",
  type: "string",
  required: true,
  displayOptions: {
    show: {
      action: ["create"],
      resource: ["product"],
    },
  },
  default: "",
  description: "Product name (required)",
};

/**
 * Product type selection field
 * @constant {INodeProperties}
 */
export const PRODUCT_TYPE_FIELD: INodeProperties = {
  displayName: "Product Type",
  name: "productType",
  type: "options",
  options: [
    {
      name: "Service",
      value: "service",
      description: "A service offering (appointments, consultations)",
    },
    {
      name: "Product",
      value: "product", 
      description: "A physical product with inventory",
    },
    {
      name: "Package",
      value: "package",
      description: "A bundled service or product package",
    },
    {
      name: "Other",
      value: "other",
      description: "Other type of product or service",
    },
  ],
  default: "service",
  description: "Type of product or service",
};

/**
 * Product status field
 * @constant {INodeProperties}
 */
export const PRODUCT_STATUS_FIELD: INodeProperties = {
  displayName: "Status",
  name: "status",
  type: "options",
  options: [
    {
      name: "Active",
      value: "active",
      description: "Product is available for booking/purchase",
    },
    {
      name: "Inactive", 
      value: "inactive",
      description: "Product is not available for booking/purchase",
    },
    {
      name: "Archived",
      value: "archived",
      description: "Product is archived and hidden from normal views",
    },
  ],
  default: "active",
  description: "Current status of the product",
};

/**
 * Product pricing fields collection
 * @constant {INodeProperties[]}
 */
export const PRODUCT_PRICING_FIELDS: INodeProperties[] = [
  {
    displayName: "Price",
    name: "price",
    type: "number",
    default: 0,
    description: "Product price (in the practice's currency)",
    typeOptions: {
      minValue: 0,
      numberPrecision: 2,
    },
  },
  {
    displayName: "Cost",
    name: "cost",
    type: "number",
    default: 0,
    description: "Product cost (for profit calculations)",
    typeOptions: {
      minValue: 0,
      numberPrecision: 2,
    },
  },
];

/**
 * Product inventory fields collection
 * @constant {INodeProperties[]}
 */
export const PRODUCT_INVENTORY_FIELDS: INodeProperties[] = [
  {
    displayName: "Item Code",
    name: "itemCode",
    type: "string",
    default: "",
    description: "Product item code, SKU, or barcode identifier",
    placeholder: "e.g., PROD-001, SKU123456",
  },
  {
    displayName: "Serial Number",
    name: "serialNumber",
    type: "string",
    default: "",
    description: "Unique serial number for tracking individual items",
    placeholder: "e.g., SN123456789",
  },
  {
    displayName: "Stock Level",
    name: "stockLevel",
    type: "number",
    default: 0,
    description: "Current available stock quantity",
    typeOptions: {
      minValue: 0,
    },
  },
];

/**
 * Product supplier fields collection
 * @constant {INodeProperties[]}
 */
export const PRODUCT_SUPPLIER_FIELDS: INodeProperties[] = [
  {
    displayName: "Supplier Name",
    name: "supplierName",
    type: "string",
    default: "",
    description: "Name of the product supplier or vendor",
    placeholder: "e.g., Medical Supplies Co.",
  },
  {
    displayName: "Supplier Display Name",
    name: "supplierDisplayName",
    type: "string",
    default: "",
    description: "Display name for the supplier (may differ from legal name)",
    placeholder: "e.g., MedSupplies",
  },
];

/**
 * Product booking and service fields collection
 * @constant {INodeProperties[]}
 */
export const PRODUCT_BOOKING_FIELDS: INodeProperties[] = [
  {
    displayName: "Is Bookable",
    name: "isBookable",
    type: "boolean",
    default: false,
    description: "Whether this product/service can be booked for appointments",
  },
  {
    displayName: "Duration",
    name: "duration",
    type: "number",
    default: 0,
    description: "Duration in minutes (for bookable services)",
    displayOptions: {
      show: {
        isBookable: [true],
      },
    },
    typeOptions: {
      minValue: 0,
      maxValue: 480, // 8 hours max
    },
  },
  {
    displayName: "Is Video Consultation",
    name: "isVideoConsultation",
    type: "boolean",
    default: false,
    description: "Whether this is a video consultation service",
    displayOptions: {
      show: {
        isBookable: [true],
      },
    },
  },
  {
    displayName: "Requires Payment",
    name: "requiresPayment",
    type: "boolean",
    default: true,
    description: "Whether payment is required for this product/service",
  },
  {
    displayName: "Requires Confirmation",
    name: "requiresConfirmation",
    type: "boolean",
    default: false,
    description: "Whether booking confirmation is required before appointment",
    displayOptions: {
      show: {
        isBookable: [true],
      },
    },
  },
];

/**
 * Product tax information field
 * @constant {INodeProperties}
 */
export const PRODUCT_TAX_FIELD: INodeProperties = {
  displayName: "Tax Information",
  name: "tax",
  type: "collection",
  default: {},
  description: "Tax information for the product",
  options: [
    {
      displayName: "Tax Name",
      name: "taxName",
      type: "string",
      default: "No VAT",
      description: "Name or description of the tax",
      placeholder: "e.g., VAT, GST, Sales Tax",
    },
    {
      displayName: "Tax Rate",
      name: "taxRate",
      type: "number",
      default: 0,
      description: "Tax rate as a percentage (e.g., 20 for 20%)",
      typeOptions: {
        minValue: 0,
        maxValue: 100,
        numberPrecision: 2,
      },
    },
    {
      displayName: "Tax Code",
      name: "taxCode",
      type: "string",
      default: "NONE",
      description: "Tax code identifier for accounting systems",
      placeholder: "e.g., VAT20, GST10, EXEMPT",
    },
  ],
};

/**
 * Product appearance and metadata fields
 * @constant {INodeProperties[]}
 */
export const PRODUCT_METADATA_FIELDS: INodeProperties[] = [
  {
    displayName: "Color",
    name: "color",
    type: "color",
    default: "#3498db",
    description: "Color for UI display and calendar representation",
  },
  {
    displayName: "Comments",
    name: "comments",
    type: "string",
    default: "",
    description: "Additional notes or comments about the product",
    typeOptions: {
      rows: 3,
    },
    placeholder: "e.g., Special handling instructions, notes for staff...",
  },
];

/**
 * Complete additional fields collection for product creation
 * @constant {INodeProperties}
 */
export const PRODUCT_ADDITIONAL_FIELDS: INodeProperties = {
  displayName: "Additional Fields",
  name: "additionalFields",
  type: "collection",
  placeholder: "Add Field",
  displayOptions: {
    show: {
      action: ["create"],
      resource: ["product"],
    },
  },
  default: {},
  options: [
    // Core product information
    PRODUCT_TYPE_FIELD,
    PRODUCT_STATUS_FIELD,
    
    // Pricing
    ...PRODUCT_PRICING_FIELDS,
    
    // Inventory management
    ...PRODUCT_INVENTORY_FIELDS,
    
    // Supplier information
    ...PRODUCT_SUPPLIER_FIELDS,
    
    // Booking and service configuration
    ...PRODUCT_BOOKING_FIELDS,
    
    // Tax information
    PRODUCT_TAX_FIELD,
    
    // Appearance and metadata
    ...PRODUCT_METADATA_FIELDS,
  ],
};

/**
 * Product update fields for existing products
 * @constant {INodeProperties}
 */
export const PRODUCT_UPDATE_FIELDS: INodeProperties = {
  displayName: "Update Fields",
  name: "updateFields",
  type: "collection",
  placeholder: "Add Field",
  displayOptions: {
    show: {
      action: ["update"],
      resource: ["product"],
    },
  },
  default: {},
  options: [
    // Allow updating the name
    {
      ...PRODUCT_NAME_FIELD,
      required: false,
      displayOptions: {
        show: {},
      },
    },
    
    // All other fields from additional fields
    ...PRODUCT_ADDITIONAL_FIELDS.options!,
  ],
};

/**
 * Product search and filtering options
 * @constant {INodeProperties}
 */
export const PRODUCT_FILTERS: INodeProperties = {
  displayName: "Filters",
  name: "filters",
  type: "collection",
  placeholder: "Add Filter",
  displayOptions: {
    show: {
      action: ["getAll"],
      resource: ["product"],
    },
  },
  default: {},
  description: "Filter products by specific criteria",
  options: [
    {
      displayName: "Search",
      name: "search",
      type: "string",
      default: "",
      description: "Search products by name, item code, or description",
      placeholder: "e.g., consultation, vaccine, equipment",
    },
    {
      displayName: "Product Type",
      name: "productType",
      type: "multiOptions",
      options: PRODUCT_TYPE_FIELD.options!,
      default: [],
      description: "Filter by product type(s)",
    },
    {
      displayName: "Status",
      name: "status",
      type: "multiOptions",
      options: PRODUCT_STATUS_FIELD.options!,
      default: [],
      description: "Filter by product status(es)",
    },
    {
      displayName: "Is Bookable",
      name: "isBookable",
      type: "boolean",
      default: false,
      description: "Filter to only bookable products/services",
    },
    {
      displayName: "Price Range",
      name: "priceRange",
      type: "collection",
      default: {},
      description: "Filter by price range",
      options: [
        {
          displayName: "Minimum Price",
          name: "min",
          type: "number",
          default: 0,
          description: "Minimum price filter",
          typeOptions: {
            minValue: 0,
            numberPrecision: 2,
          },
        },
        {
          displayName: "Maximum Price",
          name: "max",
          type: "number",
          default: 1000,
          description: "Maximum price filter",
          typeOptions: {
            minValue: 0,
            numberPrecision: 2,
          },
        },
      ],
    },
  ],
};

/**
 * Complete product field configuration for n8n node
 * @constant {INodeProperties[]}
 */
export const PRODUCT_FIELDS: INodeProperties[] = [
  PRODUCT_ID_FIELD,
  PRODUCT_NAME_FIELD,
  PRODUCT_ADDITIONAL_FIELDS,
  PRODUCT_UPDATE_FIELDS,
  PRODUCT_FILTERS,
];

/**
 * Field validation helper functions
 * @namespace ProductValidation
 */
export const ProductValidation = {
  /**
   * Validate product name
   * @param {string} name - Product name to validate
   * @returns {boolean} - Whether the name is valid
   */
  validateName: (name: string): boolean => {
    return Boolean(name && name.trim().length >= 2 && name.trim().length <= 100);
  },

  /**
   * Validate price
   * @param {number} price - Price to validate
   * @returns {boolean} - Whether the price is valid
   */
  validatePrice: (price: number): boolean => {
    return typeof price === 'number' && price >= 0 && price <= 999999.99;
  },

  /**
   * Validate duration for bookable services
   * @param {number} duration - Duration in minutes
   * @param {boolean} isBookable - Whether the product is bookable
   * @returns {boolean} - Whether the duration is valid
   */
  validateDuration: (duration: number, isBookable: boolean): boolean => {
    if (!isBookable) return true; // Duration not required for non-bookable
    return typeof duration === 'number' && duration > 0 && duration <= 480;
  },

  /**
   * Validate stock level
   * @param {number} stockLevel - Stock level to validate
   * @returns {boolean} - Whether the stock level is valid
   */
  validateStockLevel: (stockLevel: number): boolean => {
    return typeof stockLevel === 'number' && stockLevel >= 0;
  },

  /**
   * Validate tax rate
   * @param {number} taxRate - Tax rate percentage
   * @returns {boolean} - Whether the tax rate is valid
   */
  validateTaxRate: (taxRate: number): boolean => {
    return typeof taxRate === 'number' && taxRate >= 0 && taxRate <= 100;
  },
};

/**
 * Product field tooltips and help text
 * @constant {Record<string, string>}
 */
export const PRODUCT_FIELD_HELP: Record<string, string> = {
  name: "Choose a clear, descriptive name that staff and patients will easily recognize",
  productType: "Select 'Service' for appointments/consultations, 'Product' for physical items",
  price: "Set the price patients will pay. Use 0 for free services",
  cost: "Track your costs for profit analysis. Optional but recommended",
  isBookable: "Enable this if patients can book appointments for this service",
  duration: "How long appointments should be scheduled for this service",
  stockLevel: "Current inventory count. Useful for physical products and consumables",
  itemCode: "Internal reference code for inventory management and reporting",
  tax: "Configure tax rates for proper invoicing and compliance",
  color: "Choose a color for calendar display and visual organization",
  status: "Set to 'Inactive' to hide from booking but keep in system",
};

/**
 * Export all product field definitions for easy import
 */
export {
  PRODUCT_ID_FIELD as ProductIdField,
  PRODUCT_NAME_FIELD as ProductNameField,
  PRODUCT_TYPE_FIELD as ProductTypeField,
  PRODUCT_STATUS_FIELD as ProductStatusField,
  PRODUCT_ADDITIONAL_FIELDS as ProductAdditionalFields,
  PRODUCT_UPDATE_FIELDS as ProductUpdateFields,
  PRODUCT_FILTERS as ProductFilters,
  PRODUCT_FIELDS as ProductFieldsComplete,
};
