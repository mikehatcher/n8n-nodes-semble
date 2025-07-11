/**
 * @fileoverview Base resource class for Semble node operations
 * @description Provides shared functionality for all resource operations
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Resources
 */

import { IExecuteFunctions, IDataObject, NodeApiError } from 'n8n-workflow';
import { sembleApiRequest } from '../GenericFunctions';

/**
 * Base class for all resource operations
 * @abstract
 * @class BaseResource
 * @description Provides common functionality for CRUD operations
 */
export abstract class BaseResource {
  /**
   * Resource name identifier
   * @abstract
   * @type {string}
   */
  abstract readonly resourceName: string;

  /**
   * Execute a resource operation
   * @param {IExecuteFunctions} context - n8n execution context
   * @param {string} operation - The operation to perform
   * @param {number} itemIndex - The current item index
   * @returns {Promise<IDataObject | IDataObject[]>} The operation result
   */
  async execute(
    context: IExecuteFunctions,
    operation: string,
    itemIndex: number
  ): Promise<IDataObject | IDataObject[]> {
    const debugMode = context.getNodeParameter('debugMode', itemIndex, false) as boolean;
    
    if (debugMode && context.logger) {
      context.logger.info(`[SEMBLE-DEBUG] Executing ${this.resourceName}:${operation} operation`);
    }

    switch (operation) {
      case 'create':
        return this.create(context, itemIndex, debugMode);
      case 'get':
        return this.get(context, itemIndex, debugMode);
      case 'getAll':
        return this.getAll(context, itemIndex, debugMode);
      case 'update':
        return this.update(context, itemIndex, debugMode);
      case 'delete':
        return this.delete(context, itemIndex, debugMode);
      default:
        throw new NodeApiError(context.getNode(), {
          message: `Unknown operation: ${operation}`,
          description: `The operation "${operation}" is not supported for ${this.resourceName}`,
        });
    }
  }

  /**
   * Create a new resource
   * @abstract
   * @protected
   */
  protected abstract create(
    context: IExecuteFunctions,
    itemIndex: number,
    debugMode: boolean
  ): Promise<IDataObject>;

  /**
   * Get a resource by ID
   * @abstract
   * @protected
   */
  protected abstract get(
    context: IExecuteFunctions,
    itemIndex: number,
    debugMode: boolean
  ): Promise<IDataObject>;

  /**
   * Get all resources
   * @abstract
   * @protected
   */
  protected abstract getAll(
    context: IExecuteFunctions,
    itemIndex: number,
    debugMode: boolean
  ): Promise<IDataObject[]>;

  /**
   * Update a resource
   * @abstract
   * @protected
   */
  protected abstract update(
    context: IExecuteFunctions,
    itemIndex: number,
    debugMode: boolean
  ): Promise<IDataObject>;

  /**
   * Delete a resource
   * @abstract
   * @protected
   */
  protected abstract delete(
    context: IExecuteFunctions,
    itemIndex: number,
    debugMode: boolean
  ): Promise<IDataObject>;

  /**
   * Make a GraphQL request to the Semble API
   * @protected
   * @param {IExecuteFunctions} context - n8n execution context
   * @param {string} query - GraphQL query or mutation
   * @param {IDataObject} variables - GraphQL variables
   * @param {boolean} debugMode - Whether debug mode is enabled
   * @returns {Promise<any>} API response
   */
  protected async makeRequest(
    context: IExecuteFunctions,
    query: string,
    variables: IDataObject = {},
    debugMode: boolean = false
  ): Promise<any> {
    return sembleApiRequest.call(context, query, variables, 3, debugMode);
  }
}
