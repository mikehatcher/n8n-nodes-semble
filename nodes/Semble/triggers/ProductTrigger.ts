/**
 * @fileoverview Product trigger functionality for Semble n8n nodes
 * @description This module provides product-specific trigger logic
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Triggers.Product
 */

import { TriggerResourceConfig } from './BaseTrigger';

/**
 * Product trigger resource configuration
 * @const {TriggerResourceConfig} PRODUCT_TRIGGER_CONFIG
 */
export const PRODUCT_TRIGGER_CONFIG: TriggerResourceConfig = {
  displayName: 'Product',
  value: 'product',
  description: 'Monitor products/services for changes (pricing, availability, etc.)',
  query: `
    query GetProducts($pagination: Pagination) {
      products(pagination: $pagination) {
        data {
          id
          status
          productType
          labels {
            id
            color
            text
            referenceId
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
            status
            productType
            labels {
              id
              color
              text
              referenceId
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
            isBookable
            duration
            color
            isVideoConsultation
            requiresPayment
            requiresConfirmation
            createdAt
            updatedAt
          }
          isBookable
          duration
          color
          isVideoConsultation
          requiresPayment
          requiresConfirmation
          createdAt
          updatedAt
        }
        pageInfo {
          page
          pageSize
          hasMore
        }
      }
    }
  `,
  dateField: 'updatedAt'
};

/**
 * UI property definition for product resource selection
 * @const {Object} PRODUCT_RESOURCE_OPTION
 */
export const PRODUCT_RESOURCE_OPTION = {
  name: 'Product',
  value: 'product',
  description: 'Monitor products/services for changes (pricing, availability, etc.)'
};
