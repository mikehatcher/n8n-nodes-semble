/**
 * @fileoverview SchemaRegistry.ts
 * @description Central schema registry for field definitions, validation rules, and schema versioning. Provides schema management, lookup, and validation capabilities.
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Core.SchemaRegistry
 * @since 2.0.0
 */

import { SembleError } from './SembleError';
import { INodeProperties, NodePropertyTypes } from 'n8n-workflow';
import { SembleResourceType } from '../types/SembleTypes';
import { SembleActionType } from '../types/NodeTypes';

/**
 * Schema version information
 */
export interface SchemaVersion {
    version: string;
    timestamp: number;
    author: string;
    description: string;
    breaking: boolean;
}

/**
 * Field schema definition
 */
export interface FieldSchema {
    name: string;
    type: string;
    required: boolean;
    description?: string;
    validation?: FieldValidationRule[];
    dependencies?: string[];
    conditional?: FieldConditionalRule[];
    metadata?: Record<string, any>;
}

/**
 * Validation rule interface
 */
export interface FieldValidationRule {
    type: 'required' | 'type' | 'pattern' | 'range' | 'custom';
    params?: any;
    message?: string;
}

/**
 * Conditional field rule
 */
export interface FieldConditionalRule {
    condition: string; // JavaScript expression
    action: 'show' | 'hide' | 'require' | 'disable';
    target?: string; // field name to apply action to
}

/**
 * Resource schema definition
 */
export interface ResourceSchema {
    name: string;
    type: SembleResourceType;
    version: SchemaVersion;
    fields: FieldSchema[];
    actions: SembleActionType[];
    permissions?: string[];
    metadata?: Record<string, any>;
}

/**
 * Schema registry interface
 */
export interface ISchemaRegistry {
    registerSchema(schema: ResourceSchema): void;
    getSchema(resourceType: SembleResourceType, version?: string): ResourceSchema | undefined;
    getLatestSchema(resourceType: SembleResourceType): ResourceSchema | undefined;
    getAllSchemas(): ResourceSchema[];
    validateSchema(schema: ResourceSchema): ValidationResult;
    generateNodeProperties(schema: ResourceSchema, action?: SembleActionType): INodeProperties[];
}

/**
 * Schema validation result
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Schema change impact analysis
 */
export interface SchemaChangeImpact {
    breaking: boolean;
    addedFields: string[];
    removedFields: string[];
    modifiedFields: string[];
    compatibilityIssues: string[];
}

/**
 * Schema registry implementation
 */
export class SchemaRegistry implements ISchemaRegistry {
    private schemas = new Map<string, Map<string, ResourceSchema>>();
    private latestVersions = new Map<string, string>();
    private schemaHistory = new Map<string, SchemaVersion[]>();
    private dependencies = new Map<string, Set<string>>();

    /**
     * Register a new schema version
     */
    registerSchema(schema: ResourceSchema): void {
        const key = this.getSchemaKey(schema.type);
        const version = schema.version.version;

        // Validate schema before registration
        const validation = this.validateSchema(schema);
        if (!validation.isValid) {
            throw new SembleError(`Schema validation failed: ${validation.errors.join(', ')}`);
        }

        // Initialize maps if needed
        if (!this.schemas.has(key)) {
            this.schemas.set(key, new Map());
            this.schemaHistory.set(key, []);
        }

        // Check for version conflicts
        if (this.schemas.get(key)!.has(version)) {
            throw new SembleError(`Schema version ${version} already exists for ${schema.type}`);
        }

        // Analyze change impact if not the first version
        const existingVersions = this.schemaHistory.get(key)!;
        if (existingVersions.length > 0) {
            const latestSchema = this.getLatestSchema(schema.type);
            if (latestSchema) {
                const impact = this.analyzeSchemaChanges(latestSchema, schema);
                if (impact.breaking && !schema.version.breaking) {
                    console.warn(`Schema ${schema.type} v${version} introduces breaking changes but is not marked as breaking`);
                }
            }
        }

        // Register schema
        this.schemas.get(key)!.set(version, schema);
        this.schemaHistory.get(key)!.push(schema.version);
        this.latestVersions.set(key, version);

        // Update dependencies
        this.updateDependencies(schema);

        console.log(`Registered schema ${schema.type} v${version}`);
    }

    /**
     * Get schema by resource type and version
     */
    getSchema(resourceType: SembleResourceType, version?: string): ResourceSchema | undefined {
        const key = this.getSchemaKey(resourceType);
        const schemaMap = this.schemas.get(key);
        
        if (!schemaMap) {
            return undefined;
        }

        if (version) {
            return schemaMap.get(version);
        }

        // Return latest version
        const latestVersion = this.latestVersions.get(key);
        return latestVersion ? schemaMap.get(latestVersion) : undefined;
    }

    /**
     * Get latest schema version
     */
    getLatestSchema(resourceType: SembleResourceType): ResourceSchema | undefined {
        return this.getSchema(resourceType);
    }

    /**
     * Get all schemas
     */
    getAllSchemas(): ResourceSchema[] {
        const result: ResourceSchema[] = [];
        
        for (const schemaMap of this.schemas.values()) {
            for (const schema of schemaMap.values()) {
                result.push(schema);
            }
        }
        
        return result;
    }

    /**
     * Get all versions of a schema
     */
    getSchemaVersions(resourceType: SembleResourceType): SchemaVersion[] {
        const key = this.getSchemaKey(resourceType);
        return [...(this.schemaHistory.get(key) || [])];
    }

    /**
     * Get schema by version pattern (e.g., "1.x", ">=2.0.0")
     */
    getSchemaByPattern(resourceType: SembleResourceType, pattern: string): ResourceSchema | undefined {
        const versions = this.getSchemaVersions(resourceType);
        
        // Simple pattern matching - can be extended with semver
        for (const version of versions.reverse()) {
            if (this.matchesPattern(version.version, pattern)) {
                return this.getSchema(resourceType, version.version);
            }
        }

        return undefined;
    }

    /**
     * Validate a schema definition
     */
    validateSchema(schema: ResourceSchema): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic schema validation
        if (!schema.name) {
            errors.push('Schema name is required');
        }

        if (!schema.type) {
            errors.push('Schema type is required');
        }

        if (!schema.version) {
            errors.push('Schema version is required');
        }

        if (!Array.isArray(schema.fields)) {
            errors.push('Schema fields must be an array');
        } else {
            // Validate fields
            const fieldNames = new Set<string>();
            
            for (const field of schema.fields) {
                // Check for duplicate field names
                if (fieldNames.has(field.name)) {
                    errors.push(`Duplicate field name: ${field.name}`);
                } else {
                    fieldNames.add(field.name);
                }

                // Validate field structure
                if (!field.name) {
                    errors.push('Field name is required');
                }

                if (!field.type) {
                    errors.push(`Field type is required for field: ${field.name}`);
                }

                // Validate field dependencies
                if (field.dependencies) {
                    for (const dep of field.dependencies) {
                        if (!fieldNames.has(dep)) {
                            warnings.push(`Field ${field.name} depends on undefined field: ${dep}`);
                        }
                    }
                }
            }
        }

        // Validate actions
        if (schema.actions && Array.isArray(schema.actions)) {
            for (const action of schema.actions) {
                if (!this.isValidAction(action)) {
                    errors.push(`Invalid action: ${action}`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Generate n8n node properties from schema
     */
    generateNodeProperties(schema: ResourceSchema, action?: SembleActionType): INodeProperties[] {
        const properties: INodeProperties[] = [];

        for (const field of schema.fields) {
            // Skip fields not relevant to the action
            if (action && !this.isFieldRelevantForAction(field, action)) {
                continue;
            }

            const property: INodeProperties = {
                displayName: this.formatDisplayName(field.name),
                name: field.name,
                type: this.mapFieldTypeToNodeType(field.type),
                default: this.getFieldDefault(field),
                description: field.description || `${field.name} field`,
                required: field.required
            };

            // Add validation rules
            if (field.validation && field.validation.length > 0) {
                this.applyValidationRules(property, field.validation);
            }

            // Add conditional display rules
            if (field.conditional && field.conditional.length > 0) {
                this.applyConditionalRules(property, field.conditional);
            }

            properties.push(property);
        }

        return properties;
    }

    /**
     * Analyze changes between schema versions
     */
    analyzeSchemaChanges(oldSchema: ResourceSchema, newSchema: ResourceSchema): SchemaChangeImpact {
        const oldFields = new Map(oldSchema.fields.map(f => [f.name, f]));
        const newFields = new Map(newSchema.fields.map(f => [f.name, f]));

        const addedFields: string[] = [];
        const removedFields: string[] = [];
        const modifiedFields: string[] = [];
        const compatibilityIssues: string[] = [];

        // Find added fields
        for (const fieldName of newFields.keys()) {
            if (!oldFields.has(fieldName)) {
                addedFields.push(fieldName);
            }
        }

        // Find removed fields
        for (const fieldName of oldFields.keys()) {
            if (!newFields.has(fieldName)) {
                removedFields.push(fieldName);
                compatibilityIssues.push(`Field removed: ${fieldName}`);
            }
        }

        // Find modified fields
        for (const [fieldName, newField] of newFields) {
            const oldField = oldFields.get(fieldName);
            if (oldField && this.isFieldModified(oldField, newField)) {
                modifiedFields.push(fieldName);
                
                // Check for breaking changes
                if (oldField.required !== newField.required && newField.required) {
                    compatibilityIssues.push(`Field ${fieldName} is now required`);
                }
                
                if (oldField.type !== newField.type) {
                    compatibilityIssues.push(`Field ${fieldName} type changed from ${oldField.type} to ${newField.type}`);
                }
            }
        }

        const breaking = removedFields.length > 0 || compatibilityIssues.length > 0;

        return {
            breaking,
            addedFields,
            removedFields,
            modifiedFields,
            compatibilityIssues
        };
    }

    /**
     * Clear all schemas
     */
    clear(): void {
        this.schemas.clear();
        this.latestVersions.clear();
        this.schemaHistory.clear();
        this.dependencies.clear();
    }

    /**
     * Get schema dependencies
     */
    getSchemaDependencies(resourceType: SembleResourceType): string[] {
        const key = this.getSchemaKey(resourceType);
        return Array.from(this.dependencies.get(key) || []);
    }

    /**
     * Export schema to JSON
     */
    exportSchema(resourceType: SembleResourceType, version?: string): string {
        const schema = this.getSchema(resourceType, version);
        if (!schema) {
            throw new SembleError(`Schema not found: ${resourceType}${version ? ` v${version}` : ''}`);
        }
        
        return JSON.stringify(schema, null, 2);
    }

    /**
     * Import schema from JSON
     */
    importSchema(jsonString: string): void {
        try {
            const schema: ResourceSchema = JSON.parse(jsonString);
            this.registerSchema(schema);
        } catch (error) {
            throw new SembleError(`Failed to import schema: ${error}`);
        }
    }

    /**
     * Get schema statistics
     */
    getStatistics(): {
        totalSchemas: number;
        schemasByType: Record<string, number>;
        totalFields: number;
        averageFieldsPerSchema: number;
    } {
        const allSchemas = this.getAllSchemas();
        const schemasByType: Record<string, number> = {};
        let totalFields = 0;

        for (const schema of allSchemas) {
            schemasByType[schema.type] = (schemasByType[schema.type] || 0) + 1;
            totalFields += schema.fields.length;
        }

        return {
            totalSchemas: allSchemas.length,
            schemasByType,
            totalFields,
            averageFieldsPerSchema: allSchemas.length > 0 ? totalFields / allSchemas.length : 0
        };
    }

    // Private helper methods

    private getSchemaKey(resourceType: SembleResourceType): string {
        return resourceType.toLowerCase();
    }

    private matchesPattern(version: string, pattern: string): boolean {
        // Simple pattern matching - could be extended with proper semver
        if (pattern.includes('x')) {
            const regex = new RegExp(pattern.replace('x', '\\d+'));
            return regex.test(version);
        }
        
        return version === pattern;
    }

    private isValidAction(action: SembleActionType): boolean {
        const validActions: SembleActionType[] = ['create', 'get', 'getMany', 'update', 'delete'];
        return validActions.includes(action);
    }

    private isFieldRelevantForAction(field: FieldSchema, action: SembleActionType): boolean {
        // Logic to determine if field is relevant for the action
        // For example, 'id' field might not be relevant for 'create' action
        if (action === 'create' && field.name === 'id') {
            return false;
        }
        
        return true;
    }

    private formatDisplayName(fieldName: string): string {
        return fieldName
            .split(/(?=[A-Z])/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    private mapFieldTypeToNodeType(fieldType: string): NodePropertyTypes {
        const typeMap: Record<string, NodePropertyTypes> = {
            'string': 'string',
            'number': 'number',
            'boolean': 'boolean',
            'date': 'dateTime',
            'enum': 'options',
            'array': 'multiOptions',
            'object': 'json'
        };
        
        return typeMap[fieldType] || 'string';
    }

    private getFieldDefault(field: FieldSchema): any {
        if (field.metadata?.default !== undefined) {
            return field.metadata.default;
        }
        
        switch (field.type) {
            case 'boolean': return false;
            case 'number': return 0;
            case 'array': return [];
            case 'object': return {};
            default: return '';
        }
    }

    private applyValidationRules(property: INodeProperties, rules: FieldValidationRule[]): void {
        for (const rule of rules) {
            switch (rule.type) {
                case 'pattern':
                    // @ts-ignore - n8n property extension
                    property.typeOptions = {
                        ...property.typeOptions,
                        regex: rule.params.pattern
                    };
                    break;
                case 'range':
                    if (property.type === 'number') {
                        // @ts-ignore - n8n property extension
                        property.typeOptions = {
                            ...property.typeOptions,
                            minValue: rule.params.min,
                            maxValue: rule.params.max
                        };
                    }
                    break;
            }
        }
    }

    private applyConditionalRules(property: INodeProperties, rules: FieldConditionalRule[]): void {
        for (const rule of rules) {
            if (rule.action === 'show' || rule.action === 'hide') {
                property.displayOptions = {
                    ...property.displayOptions,
                    [rule.action]: {
                        // Convert condition to n8n format
                        // This is a simplified implementation
                        '@version': [1]
                    }
                };
            }
        }
    }

    private isFieldModified(oldField: FieldSchema, newField: FieldSchema): boolean {
        return (
            oldField.type !== newField.type ||
            oldField.required !== newField.required ||
            JSON.stringify(oldField.validation) !== JSON.stringify(newField.validation) ||
            JSON.stringify(oldField.dependencies) !== JSON.stringify(newField.dependencies)
        );
    }

    private updateDependencies(schema: ResourceSchema): void {
        const key = this.getSchemaKey(schema.type);
        const deps = new Set<string>();

        for (const field of schema.fields) {
            if (field.dependencies) {
                for (const dep of field.dependencies) {
                    deps.add(dep);
                }
            }
        }

        this.dependencies.set(key, deps);
    }
}

/**
 * Default schema registry instance
 */
export const schemaRegistry = new SchemaRegistry();

/**
 * Utility functions for schema management
 */
export class SchemaRegistryUtils {
    /**
     * Create schema from field definitions
     */
    static createSchema(
        name: string,
        type: SembleResourceType,
        fields: Partial<FieldSchema>[],
        version: string = '1.0.0'
    ): ResourceSchema {
        const processedFields: FieldSchema[] = fields.map(field => ({
            name: field.name || '',
            type: field.type || 'string',
            required: field.required || false,
            description: field.description,
            validation: field.validation || [],
            dependencies: field.dependencies || [],
            conditional: field.conditional || [],
            metadata: field.metadata || {}
        }));

        return {
            name,
            type,
            version: {
                version,
                timestamp: Date.now(),
                author: 'system',
                description: `Schema for ${name}`,
                breaking: false
            },
            fields: processedFields,
            actions: this.getDefaultActions(type),
            permissions: [],
            metadata: {}
        };
    }

    /**
     * Get default actions for a resource type
     */
    static getDefaultActions(type: SembleResourceType): SembleActionType[] {
        // All resource types support CRUD operations by default
        return ['create', 'get', 'getMany', 'update', 'delete'];
    }

    /**
     * Register common Semble schemas
     */
    static registerCommonSchemas(registry: SchemaRegistry): void {
        // Patient schema
        const patientSchema = SchemaRegistryUtils.createSchema(
            'Patient',
            'patient',
            [
                { name: 'id', type: 'string', description: 'Patient ID' },
                { name: 'firstName', type: 'string', required: true, description: 'First name' },
                { name: 'lastName', type: 'string', required: true, description: 'Last name' },
                { name: 'email', type: 'string', description: 'Email address' },
                { name: 'phone', type: 'string', description: 'Phone number' },
                { name: 'dateOfBirth', type: 'date', description: 'Date of birth' }
            ]
        );

        // Booking schema
        const bookingSchema = SchemaRegistryUtils.createSchema(
            'Booking',
            'booking',
            [
                { name: 'id', type: 'string', description: 'Booking ID' },
                { name: 'patientId', type: 'string', required: true, description: 'Patient ID' },
                { name: 'doctorId', type: 'string', required: true, description: 'Doctor ID' },
                { name: 'startTime', type: 'date', required: true, description: 'Start time' },
                { name: 'endTime', type: 'date', required: true, description: 'End time' },
                { name: 'status', type: 'enum', description: 'Booking status' }
            ]
        );

        registry.registerSchema(patientSchema);
        registry.registerSchema(bookingSchema);

        console.log('Common Semble schemas registered');
    }
}
