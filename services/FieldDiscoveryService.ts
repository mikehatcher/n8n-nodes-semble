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
 * Configuration interface for field discovery service
 * 
 * Defines all configuration options needed to initialize a FieldDiscoveryService
 * instance with proper caching, validation, and introspection settings.
 * 
 * @example
 * ```typescript
 * const config: FieldDiscoveryConfig = {
 *   queryService: new SembleQueryService(queryConfig),
 *   cacheService: new CacheService(cacheConfig),
 *   introspectionCacheTtl: 3600, // 1 hour
 *   includeDeprecated: false,
 *   maxDepth: 5,
 *   enableSchemaValidation: true
 * };
 * 
 * const discoveryService = new FieldDiscoveryService(config);
 * ```
 * 
 * @interface FieldDiscoveryConfig
 * @extends {BaseServiceConfig}
 * @since 2.0.0
 */
export interface FieldDiscoveryConfig extends BaseServiceConfig {
	/** Required query service for executing GraphQL introspection queries */
	queryService: SembleQueryService;
	/** Optional cache service for storing introspection results */
	cacheService?: CacheService;
	/** Cache TTL for introspection results in seconds (default: 1 hour) */
	introspectionCacheTtl?: number;
	/** Whether to include deprecated fields in discovery results */
	includeDeprecated?: boolean;
	/** Maximum depth for nested type discovery */
	maxDepth?: number;
	/** Whether to enable schema validation after introspection */
	enableSchemaValidation?: boolean;
}

/**
 * Result interface for GraphQL schema introspection operations
 * 
 * Contains the complete results of a GraphQL introspection query,
 * including parsed schema, types, available queries, and mutations.
 * This is the primary data structure returned by schema discovery operations.
 * 
 * @example
 * ```typescript
 * const result: IntrospectionResult = await discoveryService.discoverSchema();
 * 
 * // Access available types
 * console.log('Patient type fields:', result.types.Patient?.fields);
 * 
 * // Access available queries
 * console.log('Available queries:', Object.keys(result.queries));
 * 
 * // Access mutations
 * console.log('Available mutations:', Object.keys(result.mutations));
 * ```
 * 
 * @interface IntrospectionResult
 * @since 2.0.0
 */
export interface IntrospectionResult {
	/** Complete GraphQL schema object with full type information */
	schema: GraphQLSchema;
	/** Dictionary of all available types mapped by type name */
	types: Record<string, GraphQLType>;
	/** Dictionary of all available queries mapped by query name */
	queries: Record<string, GraphQLField>;
	/** Dictionary of all available mutations mapped by mutation name */
	mutations: Record<string, GraphQLField>;
	subscriptions: Record<string, GraphQLField>;
	discoveredAt: Date;
	schemaVersion?: string;
}

/**
 * Options interface for controlling field discovery behavior
 * 
 * Provides fine-grained control over schema introspection and field discovery
 * operations, including filtering, caching, and deprecation handling.
 * 
 * @example
 * ```typescript
 * // Basic discovery with caching
 * const basicOptions: DiscoveryOptions = {
 *   useCache: true,
 *   includeDeprecated: false
 * };
 * 
 * // Filtered discovery for specific types
 * const filteredOptions: DiscoveryOptions = {
 *   typeFilter: ['Patient', 'Booking'],
 *   fieldFilter: ['id', 'firstName', 'lastName'],
 *   maxDepth: 3
 * };
 * 
 * // Force refresh discovery
 * const refreshOptions: DiscoveryOptions = {
 *   refreshCache: true,
 *   includeDeprecated: true
 * };
 * ```
 * 
 * @interface DiscoveryOptions
 * @since 2.0.0
 */
export interface DiscoveryOptions {
	/** Whether to include deprecated fields and types in results */
	includeDeprecated?: boolean;
	/** Array of type names to include (filters out others) */
	typeFilter?: string[];
	/** Array of field names to include (filters out others) */
	fieldFilter?: string[];
	/** Maximum depth for nested type traversal */
	maxDepth?: number;
	/** Whether to use cached results if available */
	useCache?: boolean;
	/** Whether to force refresh of cached results */
	refreshCache?: boolean;
}

/**
 * Comprehensive metadata interface for GraphQL fields
 * 
 * Contains detailed information about individual GraphQL fields including
 * type information, validation rules, permission constraints, and usage context.
 * This is the primary data structure for field-level introspection results.
 * 
 * @example
 * ```typescript
 * const fieldMetadata: FieldMetadata = {
 *   name: 'firstName',
 *   type: 'String!',
 *   description: 'The patient\'s first name',
 *   required: true,
 *   deprecated: false,
 *   permissions: {
 *     read: true,
 *     write: true,
 *     restricted: false
 *   },
 *   validation: {
 *     minLength: 1,
 *     maxLength: 50,
 *     pattern: '^[A-Za-z]+$'
 *   }
 * };
 * ```
 * 
 * @interface FieldMetadata
 * @since 2.0.0
 */
export interface FieldMetadata {
	/** The field name as it appears in the GraphQL schema */
	name: string;
	/** The GraphQL type specification (e.g., 'String!', '[Patient]') */
	type: string;
	/** Human-readable description from schema documentation */
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
	 * 
	 * Performs a comprehensive GraphQL introspection to retrieve the complete
	 * API schema including types, fields, queries, mutations, and metadata.
	 * Results are cached for performance.
	 * 
	 * @example
	 * ```typescript
	 * const discoveryService = new FieldDiscoveryService(config);
	 * 
	 * const schema = await discoveryService.discoverSchema({
	 *   includeDeprecated: false,
	 *   useCache: true,
	 *   maxDepth: 3
	 * });
	 * 
	 * console.log('Available types:', Object.keys(schema.types));
	 * console.log('Available queries:', Object.keys(schema.queries));
	 * ```
	 * 
	 * @param options - Discovery options to control introspection behavior
	 * @returns Promise resolving to complete schema introspection result
	 * @throws {SembleError} When introspection fails or schema is invalid
	 * @since 2.0.0
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
	 * Discover available fields for a specific GraphQL type
	 * 
	 * Retrieves detailed metadata about all fields available for a given type,
	 * including field types, descriptions, deprecation status, and arguments.
	 * 
	 * @example
	 * ```typescript
	 * const discoveryService = new FieldDiscoveryService(config);
	 * 
	 * const patientFields = await discoveryService.discoverFields('Patient', {
	 *   includeDeprecated: false,
	 *   useCache: true
	 * });
	 * 
	 * Object.entries(patientFields).forEach(([name, metadata]) => {
	 *   console.log(`${name}: ${metadata.type} - ${metadata.description}`);
	 * });
	 * ```
	 * 
	 * @param typeName - The name of the GraphQL type to discover fields for
	 * @param options - Discovery options to control field introspection
	 * @returns Promise resolving to field metadata mapped by field name
	 * @throws {SembleValidationError} When type name is invalid or not found
	 * @throws {SembleError} When field discovery fails
	 * @since 2.0.0
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
	 * 
	 * Parses GraphQL field descriptions to identify permission requirements.
	 * Since GraphQL introspection may not preserve directive information,
	 * this method analyzes field descriptions for permission hints.
	 */
	private extractPermissions(field: GraphQLField): string[] {
		const permissions: string[] = [];
		
		if (!field.description) {
			return permissions;
		}

		const description = field.description.toLowerCase();
		
		// Look for permission indicators in field descriptions
		if (description.includes('@auth') || description.includes('authenticated')) {
			permissions.push('authenticated');
		}
		
		if (description.includes('@admin') || description.includes('admin only')) {
			permissions.push('admin');
		}
		
		if (description.includes('@owner') || description.includes('owner only')) {
			permissions.push('owner');
		}
		
		if (description.includes('@staff') || description.includes('staff only')) {
			permissions.push('staff');
		}
		
		if (description.includes('restricted') || description.includes('permission required')) {
			permissions.push('restricted');
		}

		return [...new Set(permissions)]; // Remove duplicates
	}

	/**
	 * Extract validation rules from field directives
	 * 
	 * Parses GraphQL field descriptions and type information to identify validation constraints.
	 * Since GraphQL introspection may not preserve directive information,
	 * this method analyzes field descriptions and types for validation hints.
	 */
	private extractValidationRules(field: GraphQLField): Record<string, any> {
		const rules: Record<string, any> = {};
		
		if (!field.description) {
			return rules;
		}

		const description = field.description.toLowerCase();
		const type = field.type.toLowerCase();
		
		// Look for validation indicators in field descriptions
		if (description.includes('required') || description.includes('mandatory')) {
			rules.required = true;
		}
		
		// Extract length constraints from description
		const lengthMatch = description.match(/(?:min|minimum)\s*(?:length\s*)?:?\s*(\d+)/);
		if (lengthMatch) {
			rules.minLength = parseInt(lengthMatch[1], 10);
		}
		
		const maxLengthMatch = description.match(/(?:max|maximum)\s*(?:length\s*)?:?\s*(\d+)/);
		if (maxLengthMatch) {
			rules.maxLength = parseInt(maxLengthMatch[1], 10);
		}
		
		// Extract numeric ranges from description
		const minMatch = description.match(/(?:min|minimum)\s*(?:value\s*)?:?\s*(\d+(?:\.\d+)?)/);
		if (minMatch) {
			rules.min = parseFloat(minMatch[1]);
		}
		
		const maxMatch = description.match(/(?:max|maximum)\s*(?:value\s*)?:?\s*(\d+(?:\.\d+)?)/);
		if (maxMatch) {
			rules.max = parseFloat(maxMatch[1]);
		}
		
		// Detect format requirements from field type and description
		if (type.includes('email') || description.includes('email')) {
			rules.format = 'email';
		}
		
		if (type.includes('url') || description.includes('url')) {
			rules.format = 'url';
		}
		
		if (description.includes('phone')) {
			rules.format = 'phone';
		}
		
		// Look for pattern indicators
		if (description.includes('pattern') || description.includes('regex')) {
			const patternMatch = description.match(/pattern[:\s]+['""]([^'"]+)['"]/);
			if (patternMatch) {
				rules.pattern = patternMatch[1];
			}
		}

		return rules;
	}

	/**
	 * Extract examples from field documentation
	 * 
	 * Parses GraphQL field descriptions to identify and extract example values.
	 * Supports various documentation formats for examples.
	 */
	private extractExamples(field: GraphQLField): any[] {
		const examples: any[] = [];
		
		if (!field.description) {
			return examples;
		}

		const description = field.description;
		
		// Look for examples in various formats
		// Format 1: @example value
		const exampleMatches = description.match(/@example\s+([^\s\n\r]+)/gi);
		if (exampleMatches) {
			exampleMatches.forEach(match => {
				const value = match.replace(/@example\s+/i, '').trim();
				examples.push(this.parseExampleValue(value));
			});
		}
		
		// Format 2: Example: value
		const exampleColonMatches = description.match(/example:\s*([^\s\n\r]+)/gi);
		if (exampleColonMatches) {
			exampleColonMatches.forEach(match => {
				const value = match.replace(/example:\s*/i, '').trim();
				examples.push(this.parseExampleValue(value));
			});
		}
		
		// Format 3: e.g., value (extract just the first word/ID after e.g.,)
		const egMatches = description.match(/e\.g\.[:,]\s*([^\s\n\r,]+)/gi);
		if (egMatches) {
			egMatches.forEach(match => {
				const value = match.replace(/e\.g\.[:,]\s*/i, '').trim();
				examples.push(this.parseExampleValue(value));
			});
		}
		
		// Format 4: Examples enclosed in quotes or backticks
		const quotedMatches = description.match(/["`']([^"`']+)["`']/g);
		if (quotedMatches) {
			quotedMatches.forEach(match => {
				const value = match.slice(1, -1); // Remove quotes
				// Only include if it looks like an example (not just text)
				if (this.isLikelyExample(value)) {
					examples.push(this.parseExampleValue(value));
				}
			});
		}

		return examples;
	}

	/**
	 * Parse example value to appropriate type
	 */
	private parseExampleValue(value: string): any {
		const trimmed = value.trim();
		
		// Try parsing as JSON first
		try {
			return JSON.parse(trimmed);
		} catch {
			// Not JSON, continue with other parsing
		}
		
		// Check for boolean values
		if (trimmed.toLowerCase() === 'true') return true;
		if (trimmed.toLowerCase() === 'false') return false;
		
		// Check for numbers
		if (/^\d+$/.test(trimmed)) {
			return parseInt(trimmed, 10);
		}
		if (/^\d*\.\d+$/.test(trimmed)) {
			return parseFloat(trimmed);
		}
		
		// Return as string
		return trimmed;
	}

	/**
	 * Check if a value looks like an example rather than descriptive text
	 */
	private isLikelyExample(value: string): boolean {
		// Skip if too long (likely descriptive text)
		if (value.length > 50) return false;
		
		// Skip if contains common descriptive words
		const descriptiveWords = ['the', 'this', 'that', 'which', 'where', 'when', 'how', 'field', 'value', 'represents', 'contains'];
		const lowerValue = value.toLowerCase();
		if (descriptiveWords.some(word => lowerValue.includes(word))) return false;
		
		// Include if looks like ID, email, URL, etc.
		if (/^[a-f0-9]{24}$/.test(value)) return true; // MongoDB ObjectId
		if (/^\d{10,}$/.test(value)) return true; // Long number ID
		if (/@/.test(value)) return true; // Email-like
		if (/^https?:\/\//.test(value)) return true; // URL
		
		// Include short alphanumeric values
		if (/^[a-zA-Z0-9._-]+$/.test(value) && value.length <= 30) return true;
		
		return false;
	}

	/**
	 * Extract schema version from introspection result
	 * 
	 * Attempts to determine the GraphQL schema version from various sources:
	 * schema metadata, type descriptions, or query type information.
	 */
	private extractSchemaVersion(schema: any): string | undefined {
		if (!schema) {
			return undefined;
		}

		// Method 1: Check for version in schema description
		if (schema.description) {
			const versionMatch = schema.description.match(/version\s*[:=]?\s*([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i);
			if (versionMatch) {
				return versionMatch[1];
			}
		}

		// Method 2: Look for version in query type description
		if (schema.queryType && schema.queryType.description) {
			const versionMatch = schema.queryType.description.match(/version\s*[:=]?\s*([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i);
			if (versionMatch) {
				return versionMatch[1];
			}
		}

		// Method 3: Check for version field in Query type
		if (schema.types) {
			const queryType = Object.values(schema.types).find((type: any) => type.name === 'Query');
			if (queryType && (queryType as any).fields) {
				const versionField = (queryType as any).fields.version || (queryType as any).fields.schemaVersion;
				if (versionField && versionField.description) {
					const versionMatch = versionField.description.match(/([0-9]+\.[0-9]+(?:\.[0-9]+)?)/);
					if (versionMatch) {
						return versionMatch[1];
					}
				}
			}
		}

		// Method 4: Look for version indicators in type names or descriptions
		if (schema.types) {
			for (const type of Object.values(schema.types) as any[]) {
				if (type.description) {
					const versionMatch = type.description.match(/(?:schema|api)\s*version\s*[:=]?\s*([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i);
					if (versionMatch) {
						return versionMatch[1];
					}
				}
			}
		}

		// Method 5: Default version detection based on common patterns
		if (schema.types) {
			const typeNames = Object.keys(schema.types);
			
			// Check for modern GraphQL features that indicate newer versions
			if (typeNames.includes('Subscription')) {
				return '1.1.0'; // Subscriptions introduced in newer versions
			}
			
			if (typeNames.some(name => name.includes('Connection') && name.includes('Edge'))) {
				return '1.0.0'; // Relay-style pagination indicates mature schema
			}
		}

		// Unable to determine version
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
