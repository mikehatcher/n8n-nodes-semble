/**
 * @fileoverview Semble Field Discovery Service
 * @description Provides GraphQL introspection for dynamic field schema discovery with caching
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Services.FieldDiscovery
 */

import { SembleQueryService } from './SembleQueryService';
import { CacheService } from './CacheService';
import { SEMBLE_CONSTANTS } from '../core/Constants';
import { mapError } from '../core/ErrorMapper';
import { 
	SembleAPIError, 
	SembleValidationError,
	SembleConfigError 
} from '../core/SembleError';
import { 
	GraphQLSchema,
	GraphQLField,
	GraphQLType,
	SembleCredentials,
	CacheOptions
} from '../types/SembleTypes';
import { BaseServiceConfig } from '../types/ConfigTypes';

// =============================================================================
// INTERFACES AND TYPES
// =============================================================================

/**
 * Field discovery configuration
 */
export interface FieldDiscoveryConfig extends BaseServiceConfig {
	queryService: SembleQueryService;
	cacheService?: CacheService;
	introspectionCacheTtl?: number;
	includeDeprecated?: boolean;
	maxDepth?: number;
	enableSchemaValidation?: boolean;
}

/**
 * GraphQL introspection result
 */
export interface IntrospectionResult {
	schema: GraphQLSchema;
	types: Record<string, GraphQLType>;
	queries: Record<string, GraphQLField>;
	mutations: Record<string, GraphQLField>;
	subscriptions: Record<string, GraphQLField>;
	discoveredAt: Date;
	schemaVersion?: string;
}

/**
 * Field discovery options
 */
export interface DiscoveryOptions {
	includeDeprecated?: boolean;
	typeFilter?: string[];
	fieldFilter?: string[];
	maxDepth?: number;
	useCache?: boolean;
	refreshCache?: boolean;
}

/**
 * Field metadata with permissions and validation info
 */
export interface FieldMetadata {
	name: string;
	type: string;
	description?: string;
	isRequired: boolean;
	isDeprecated: boolean;
	deprecationReason?: string;
	defaultValue?: any;
	permissions?: string[];
	validationRules?: Record<string, any>;
	examples?: any[];
}

// =============================================================================
// FIELD DISCOVERY SERVICE
// =============================================================================

/**
 * Service for discovering available fields through GraphQL introspection
 * Provides schema discovery, field metadata, and permission mapping
 */
export class FieldDiscoveryService {
	private config: Required<FieldDiscoveryConfig>;
	private queryService: SembleQueryService;
	private cacheService?: CacheService;
	private cachedSchema?: IntrospectionResult;

	constructor(config: FieldDiscoveryConfig) {
		// Validate required dependencies
		if (!config.queryService) {
			throw new SembleConfigError(
				'SembleQueryService is required for field discovery',
				'queryService',
				'SembleQueryService',
				config.queryService
			);
		}

		this.config = {
			...config,
			introspectionCacheTtl: config.introspectionCacheTtl || SEMBLE_CONSTANTS.CACHE.INTROSPECTION_CACHE_TTL,
			includeDeprecated: config.includeDeprecated !== undefined ? config.includeDeprecated : false,
			maxDepth: config.maxDepth || 5,
			enableSchemaValidation: config.enableSchemaValidation !== undefined ? config.enableSchemaValidation : true,
			cacheService: config.cacheService
		} as Required<FieldDiscoveryConfig>;

		this.queryService = config.queryService;
		this.cacheService = config.cacheService;
	}

	// =============================================================================
	// SCHEMA DISCOVERY
	// =============================================================================

	/**
	 * Discover the complete GraphQL schema through introspection
	 */
	async discoverSchema(options: DiscoveryOptions = {}): Promise<IntrospectionResult> {
		try {
			const cacheKey = this.buildCacheKey('schema', options);

			// Check cache first
			if (options.useCache !== false && !options.refreshCache && this.cacheService) {
				const cached = await this.cacheService.get<IntrospectionResult>(cacheKey);
				if (cached) {
					this.cachedSchema = cached;
					return cached;
				}
			}

			// Execute introspection query
			const introspectionQuery = this.buildIntrospectionQuery(options);
			const result = await this.queryService.executeQuery(introspectionQuery);

			if (!result.data || !result.data.__schema) {
				throw new SembleAPIError(
					'Invalid introspection response',
					'INTROSPECTION_FAILED'
				);
			}

			// Process introspection result
			const schema = this.processIntrospectionResult(result.data.__schema, options);

			// Cache the result
			if (this.cacheService && options.useCache !== false) {
				await this.cacheService.set(cacheKey, schema, this.config.introspectionCacheTtl);
			}

			this.cachedSchema = schema;
			return schema;

		} catch (error) {
			throw mapError(error, {
				operation: 'schema_discovery',
				resource: 'graphql_schema'
			});
		}
	}

	/**
	 * Discover fields for a specific type/resource
	 */
	async discoverFields(typeName: string, options: DiscoveryOptions = {}): Promise<Record<string, FieldMetadata>> {
		try {
			const schema = await this.discoverSchema(options);
			const type = schema.types[typeName];

			if (!type) {
				throw new SembleValidationError(
					`Type '${typeName}' not found in schema`,
					'typeName',
					typeName,
					['Type must exist in the GraphQL schema']
				);
			}

			return this.extractFieldMetadata(type, options);

		} catch (error) {
			throw mapError(error, {
				operation: 'field_discovery',
				resource: typeName
			});
		}
	}

	/**
	 * Discover available query operations
	 */
	async discoverQueries(options: DiscoveryOptions = {}): Promise<Record<string, FieldMetadata>> {
		try {
			const schema = await this.discoverSchema(options);
			// Extract field information from the query type
		if (schema.schema.queryType) {
			return this.extractFieldMetadata(schema.schema.queryType, options);
		} else {
			return {};
		}

		} catch (error) {
			throw mapError(error, {
				operation: 'query_discovery'
			});
		}
	}

	/**
	 * Discover available mutation operations
	 */
	async discoverMutations(options: DiscoveryOptions = {}): Promise<Record<string, FieldMetadata>> {
		try {
			const schema = await this.discoverSchema(options);
			
			if (!schema.schema.mutationType) {
				return {};
			}

			return this.extractFieldMetadata(schema.schema.mutationType, options);

		} catch (error) {
			throw mapError(error, {
				operation: 'mutation_discovery'
			});
		}
	}

	// =============================================================================
	// QUERY BUILDING
	// =============================================================================

	/**
	 * Build GraphQL introspection query
	 */
	private buildIntrospectionQuery(options: DiscoveryOptions): string {
		const includeDeprecated = options.includeDeprecated || this.config.includeDeprecated;
		const deprecatedArg = includeDeprecated ? 'true' : 'false';

		return `
			query IntrospectionQuery {
				__schema {
					queryType { name }
					mutationType { name }
					subscriptionType { name }
					types {
						...FullType
					}
					directives {
						name
						description
						locations
						args {
							...InputValue
						}
					}
				}
			}

			fragment FullType on __Type {
				kind
				name
				description
				fields(includeDeprecated: ${deprecatedArg}) {
					name
					description
					args {
						...InputValue
					}
					type {
						...TypeRef
					}
					isDeprecated
					deprecationReason
				}
				inputFields {
					...InputValue
				}
				interfaces {
					...TypeRef
				}
				enumValues(includeDeprecated: ${deprecatedArg}) {
					name
					description
					isDeprecated
					deprecationReason
				}
				possibleTypes {
					...TypeRef
				}
			}

			fragment InputValue on __InputValue {
				name
				description
				type { ...TypeRef }
				defaultValue
			}

			fragment TypeRef on __Type {
				kind
				name
				ofType {
					kind
					name
					ofType {
						kind
						name
						ofType {
							kind
							name
							ofType {
								kind
								name
								ofType {
									kind
									name
									ofType {
										kind
										name
										ofType {
											kind
											name
										}
									}
								}
							}
						}
					}
				}
			}
		`;
	}

	// =============================================================================
	// SCHEMA PROCESSING
	// =============================================================================

	/**
	 * Process raw introspection result into structured schema
	 */
	private processIntrospectionResult(rawSchema: any, options: DiscoveryOptions): IntrospectionResult {
		const types: Record<string, GraphQLType> = {};
		const queries: Record<string, GraphQLField> = {};
		const mutations: Record<string, GraphQLField> = {};
		const subscriptions: Record<string, GraphQLField> = {};

		// Process types
		for (const type of rawSchema.types) {
			if (this.shouldIncludeType(type, options)) {
				types[type.name] = this.processType(type, options);
			}
		}

		// Process root operations
		if (rawSchema.queryType) {
			const queryType = types[rawSchema.queryType.name];
			if (queryType?.fields) {
				Object.assign(queries, queryType.fields);
			}
		}

		if (rawSchema.mutationType) {
			const mutationType = types[rawSchema.mutationType.name];
			if (mutationType?.fields) {
				Object.assign(mutations, mutationType.fields);
			}
		}

		if (rawSchema.subscriptionType) {
			const subscriptionType = types[rawSchema.subscriptionType.name];
			if (subscriptionType?.fields) {
				Object.assign(subscriptions, subscriptionType.fields);
			}
		}

		return {
			schema: {
				queryType: rawSchema.queryType,
				mutationType: rawSchema.mutationType,
				subscriptionType: rawSchema.subscriptionType,
				types: Object.values(types),
				directives: rawSchema.directives || []
			},
			types,
			queries,
			mutations,
			subscriptions,
			discoveredAt: new Date(),
			schemaVersion: this.extractSchemaVersion(rawSchema)
		};
	}

	/**
	 * Process individual GraphQL type
	 */
	private processType(rawType: any, options: DiscoveryOptions): GraphQLType {
		const type: GraphQLType = {
			kind: rawType.kind,
			name: rawType.name,
			description: rawType.description,
			fields: {},
			inputFields: [],
			interfaces: rawType.interfaces || [],
			enumValues: rawType.enumValues || [],
			possibleTypes: rawType.possibleTypes || []
		};

		// Process fields
		if (rawType.fields) {
			for (const field of rawType.fields) {
				if (this.shouldIncludeField(field, options)) {
					type.fields[field.name] = this.processField(field, options);
				}
			}
		}

		// Process input fields
		if (rawType.inputFields) {
			type.inputFields = rawType.inputFields
				.filter((field: any) => this.shouldIncludeField(field, options))
				.map((field: any) => this.processField(field, options));
		}

		return type;
	}

	/**
	 * Process individual GraphQL field
	 */
	private processField(rawField: any, options: DiscoveryOptions): GraphQLField {
		return {
			name: rawField.name,
			description: rawField.description,
			type: this.processTypeRef(rawField.type),
			args: rawField.args ? rawField.args.map((arg: any) => this.processField(arg, options)) : [],
			isDeprecated: rawField.isDeprecated || false,
			deprecationReason: rawField.deprecationReason,
			defaultValue: rawField.defaultValue
		};
	}

	/**
	 * Process GraphQL type reference
	 */
	private processTypeRef(rawType: any): string {
		if (!rawType) return 'Unknown';

		if (rawType.kind === 'NON_NULL') {
			return `${this.processTypeRef(rawType.ofType)}!`;
		}

		if (rawType.kind === 'LIST') {
			return `[${this.processTypeRef(rawType.ofType)}]`;
		}

		return rawType.name || 'Unknown';
	}

	/**
	 * Extract field metadata from GraphQL type
	 */
	private extractFieldMetadata(type: GraphQLType, options: DiscoveryOptions): Record<string, FieldMetadata> {
		const metadata: Record<string, FieldMetadata> = {};

		for (const [fieldName, field] of Object.entries(type.fields || {})) {
			if (this.shouldIncludeField(field, options)) {
				metadata[fieldName] = {
					name: field.name,
					type: field.type,
					description: field.description,
					isRequired: field.type.endsWith('!'),
					isDeprecated: field.isDeprecated || false,
					deprecationReason: field.deprecationReason,
					defaultValue: field.defaultValue,
					permissions: this.extractPermissions(field),
					validationRules: this.extractValidationRules(field),
					examples: this.extractExamples(field)
				};
			}
		}

		return metadata;
	}

	// =============================================================================
	// FILTERING AND VALIDATION
	// =============================================================================

	/**
	 * Check if type should be included based on options
	 */
	private shouldIncludeType(type: any, options: DiscoveryOptions): boolean {
		// Skip introspection types unless explicitly requested
		if (type.name.startsWith('__') && !options.includeDeprecated) {
			return false;
		}

		// Apply type filter
		if (options.typeFilter && options.typeFilter.length > 0) {
			return options.typeFilter.includes(type.name);
		}

		return true;
	}

	/**
	 * Check if field should be included based on options
	 */
	private shouldIncludeField(field: any, options: DiscoveryOptions): boolean {
		// Check deprecated filter
		if (field.isDeprecated && !options.includeDeprecated && !this.config.includeDeprecated) {
			return false;
		}

		// Apply field filter
		if (options.fieldFilter && options.fieldFilter.length > 0) {
			return options.fieldFilter.includes(field.name);
		}

		return true;
	}

	// =============================================================================
	// METADATA EXTRACTION
	// =============================================================================

	/**
	 * Extract permission information from field directives
	 */
	private extractPermissions(field: GraphQLField): string[] {
		// TODO: Implement permission extraction from directives
		// This would parse @auth, @permission, or similar directives
		return [];
	}

	/**
	 * Extract validation rules from field directives
	 */
	private extractValidationRules(field: GraphQLField): Record<string, any> {
		// TODO: Implement validation rule extraction from directives
		// This would parse @constraint, @validate, or similar directives
		return {};
	}

	/**
	 * Extract examples from field documentation
	 */
	private extractExamples(field: GraphQLField): any[] {
		// TODO: Implement example extraction from field descriptions
		// This would parse structured examples from documentation
		return [];
	}

	/**
	 * Extract schema version from introspection result
	 */
	private extractSchemaVersion(schema: any): string | undefined {
		// TODO: Implement schema version extraction
		// This might come from custom directives or schema metadata
		return undefined;
	}

	// =============================================================================
	// UTILITY METHODS
	// =============================================================================

	/**
	 * Build cache key for introspection results
	 */
	private buildCacheKey(prefix: string, options: DiscoveryOptions): string {
		const optionsHash = JSON.stringify(options);
		return `${prefix}:${Buffer.from(optionsHash).toString('base64')}`;
	}

	/**
	 * Get cached schema if available
	 */
	getCachedSchema(): IntrospectionResult | undefined {
		return this.cachedSchema;
	}

	/**
	 * Clear schema cache
	 */
	async clearCache(): Promise<void> {
		this.cachedSchema = undefined;
		
		if (this.cacheService) {
			await this.cacheService.clear();
		}
	}

	/**
	 * Get service configuration
	 */
	getConfig(): Required<FieldDiscoveryConfig> {
		return { ...this.config };
	}

	/**
	 * Shutdown the service and cleanup resources
	 */
	async shutdown(): Promise<void> {
		this.cachedSchema = undefined;
	}
}
