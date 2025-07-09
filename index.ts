/**
 * @fileoverview Entry point for n8n-nodes-semble package
 * @description This module exports all node types and credentials for the Semble n8n integration
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble
 */

/**
 * @namespace N8nNodesSemble
 * @description Main namespace for the n8n-nodes-semble package
 */

/**
 * @namespace N8nNodesSemble.Credentials
 * @description Authentication and credential types for Semble API
 */

/**
 * @namespace N8nNodesSemble.Nodes
 * @description Main node implementations for Semble operations
 */

/**
 * @namespace N8nNodesSemble.Triggers
 * @description Trigger node implementations for Semble events
 */

/**
 * @namespace N8nNodesSemble.Descriptions
 * @description UI property definitions for node operations and fields
 */

/**
 * @namespace N8nNodesSemble.Utils
 * @description Utility functions for API communication and rate limiting
 */

// Re-export all node types and credentials
export { SembleApi } from "./credentials/SembleApi.credentials";
export { Semble } from "./nodes/Semble/Semble.node";
export { default as SembleTrigger } from "./nodes/Semble/SembleTrigger.node";
