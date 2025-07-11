/**
 * @fileoverview Resource exports for Semble node
 * @description Centralizes resource class exports
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Resources
 */

export { BaseResource } from './BaseResource';
export { BookingResource } from './BookingResource';

// Import for registry
import { BookingResource } from './BookingResource';

// Resource registry for dynamic instantiation
export const RESOURCE_REGISTRY = {
  booking: BookingResource,
} as const;

export type ResourceName = keyof typeof RESOURCE_REGISTRY;
