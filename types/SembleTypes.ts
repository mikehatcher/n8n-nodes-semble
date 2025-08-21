/**
 * @fileoverview TypeScript type definitions for Semble API objects and responses
 * @description Comprehensive type definitions for all Semble API interfaces, GraphQL responses, and utility types
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Types.Semble
 * @since 2.0.0
 */

// =============================================================================
// CORE SEMBLE API OBJECT INTERFACES
// =============================================================================

/**
 * Place of Birth interface - represents birth location information
 */
export interface SemblePlaceOfBirth {
	name?: string;
	code?: string;
}

/**
 * Phone interface - represents a phone number with type information
 */
export interface SemblePhone {
	phoneId: string;
	phoneType?: string;
	phoneNumber?: string;
}

/**
 * SharingToken interface - represents patient sharing token information
 */
export interface SembleSharingToken {
	token?: string;
}

/**
 * PatientNumber interface - represents patient number/ID assignments
 */
export interface SemblePatientNumber {
	id: string;
	name?: string;
	value?: string;
}

/**
 * CustomAttribute interface - represents custom patient attributes/fields
 */
export interface SembleCustomAttribute {
	id: string;
	title?: string;
	text?: string;
	response?: string;
	required?: boolean;
}

/**
 * PrivacyPolicy interface - represents privacy policy response
 */
export interface SemblePrivacyPolicy {
	response?: string;
}

/**
 * CommunicationPreferences interface - represents patient communication preferences
 */
export interface SembleCommunicationPreferences {
	receiveEmail?: boolean;
	receiveSMS?: boolean;
	promotionalMarketing?: boolean;
	paymentReminders?: boolean;
	privacyPolicy?: SemblePrivacyPolicy;
}

/**
 * PatientRelationshipType enum - represents types of patient relationships
 */
export type SemblePatientRelationshipType = 
	| 'FAMILY' 
	| 'EMERGENCY_CONTACT' 
	| 'NEXT_OF_KIN' 
	| 'INSURER' 
	| 'PRACTITIONER' 
	| 'PAYER' 
	| 'REFERRING_CLINICIAN' 
	| 'OTHER' 
	| 'GP' 
	| 'PARENT_GUARDIAN' 
	| 'SOCIAL_WORKER' 
	| 'SPOUSE_PARTNER' 
	| 'PHARMACY' 
	| 'ANAESTHETIST';

/**
 * PatientRelationshipContact interface - represents contact details for related accounts
 */
export interface SemblePatientRelationshipContact {
	relatedAccountId?: string;
	source?: string;
	sourceId?: string;
	firstName?: string;
	lastName?: string;
	title?: string;
	companyName?: string;
	phones?: SemblePhone[]; // Reusing existing Phone interface
	email?: string;
	address?: string;
	city?: string;
	postcode?: string;
	country?: string;
	notes?: string;
	name?: string;
	contactInfo?: string;
	policyNumber?: string;
	authorizationCode?: string;
}

/**
 * PatientRelationship interface - represents patient related accounts/relationships
 */
export interface SemblePatientRelationship {
	relationshipId: string;
	relationshipType?: SemblePatientRelationshipType;
	relationshipLabel?: string;
	deleted?: boolean;
	contactDetails?: SemblePatientRelationshipContact;
}

/**
 * PatientLabel interface - represents patient labels/tags
 */
export interface SemblePatientLabel {
	id: string;
	referenceId?: string;
	color?: string;
	text?: string;
}

/**
 * PatientAccessGroup interface - represents patient access groups
 */
export interface SemblePatientAccessGroup {
	id: string;
	name?: string;
	label?: string;
}

/**
 * Patient interface - represents a patient/customer in Semble
 */
export interface SemblePatient {
	id: string;
	title?: string;
	status?: string;
	firstName: string;
	lastName: string;
	fullName?: string;
	birthSurname?: string;
	birthName?: string;
	birthNames?: string;
	dob?: string;
	placeOfBirth?: SemblePlaceOfBirth;
	phones?: SemblePhone[];
	sharingToken?: SembleSharingToken;
	numbers?: SemblePatientNumber[];
	socialSecurityNumber?: string;
	gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
	sex?: 'male' | 'female' | 'intersex';
	email?: string;
	googleClientId?: string;
	paymentReference?: string;
	occupation?: string;
	membershipName?: string;
	membershipStartDate?: string;
	membershipStartDateFormatted?: string;
	createdAt: string;
	updatedAt: string;
	comments?: string;
	onHold?: boolean;
	// Legacy fields for backward compatibility
	phone?: string;
	dateOfBirth?: string;
	address?: SembleAddress;
	emergencyContact?: SembleEmergencyContact;
	notes?: string;
	tags?: string[];
	customAttributes?: SembleCustomAttribute[];
	communicationPreferences?: SembleCommunicationPreferences;
	relatedAccounts?: SemblePatientRelationship[];
	labels?: SemblePatientLabel[];
	marketingPreferences?: SembleMarketingPreferences;
	accessGroups?: SemblePatientAccessGroup[];
}

/**
 * Booking interface - represents an appointment/booking in Semble
 */
export interface SembleBooking {
	id: string;
	patient: SemblePatient | string; // Can be populated object or just ID
	doctor: SembleDoctor | string;
	location: SembleLocation | string;
	bookingType: SembleBookingType | string;
	startTime: string; // ISO 8601 datetime
	endTime: string; // ISO 8601 datetime
	status: 'confirmed' | 'cancelled' | 'completed' | 'no-show' | 'pending';
	notes?: string;
	paymentReference?: string;
	customAttributes?: Record<string, any>;
	createdAt: string;
	updatedAt: string;
}

/**
 * Doctor/Practitioner interface
 */
export interface SembleDoctor {
	id: string;
	firstName: string;
	lastName: string;
	email?: string;
	phone?: string;
	specialties?: string[];
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

/**
 * Location interface - represents clinic locations
 */
export interface SembleLocation {
	id: string;
	name: string;
	address?: SembleAddress;
	phone?: string;
	email?: string;
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

/**
 * Booking Type interface - represents types of appointments
 */
export interface SembleBookingType {
	id: string;
	name: string;
	duration: number; // Duration in minutes
	color?: string;
	description?: string;
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

/**
 * Address interface - used in Patient and Location, updated to match actual API structure
 */
export interface SembleAddress {
	address?: string;
	city?: string;
	postcode?: string;
	country?: string;
}

/**
 * Emergency Contact interface - used in Patient
 */
export interface SembleEmergencyContact {
	name: string;
	relationship: string;
	phone: string;
	email?: string;
}

/**
 * Marketing Preferences interface
 */
export interface SembleMarketingPreferences {
	email: boolean;
	sms: boolean;
	phone: boolean;
	post: boolean;
}

/**
 * Product Tax interface - represents tax information for products
 */
export interface SembleProductTax {
	taxName?: string;
	taxRate?: number;
	taxCode?: string;
}

/**
 * Product Label interface - represents product labels/tags
 */
export interface SembleProductLabel {
	id: string;
	name?: string;
	color?: string;
}

/**
 * Product interface - represents a product/service in Semble
 */
export interface SembleProduct {
	id: string;
	status?: string;
	productType?: string;
	name: string;
	itemCode?: string;
	serialNumber?: string;
	price?: number;
	cost?: number;
	stockLevel?: number;
	supplierName?: string;
	supplierDisplayName?: string;
	isBookable?: boolean;
	duration?: number;
	color?: string;
	isVideoConsultation?: boolean;
	requiresPayment?: boolean;
	requiresConfirmation?: boolean;
	comments?: string;
	tax?: SembleProductTax;
	labels?: SembleProductLabel[];
	appointments?: SembleProduct[];
	createdAt: string;
	updatedAt: string;
}

// =============================================================================
// GRAPHQL RESPONSE TYPES
// =============================================================================

/**
 * Standard GraphQL response wrapper
 */
export interface SembleGraphQLResponse<T = any> {
	data?: T;
	errors?: SembleGraphQLError[];
	extensions?: Record<string, any>;
}

/**
 * GraphQL error structure
 */
export interface SembleGraphQLError {
	message: string;
	locations?: Array<{
		line: number;
		column: number;
	}>;
	path?: Array<string | number>;
	extensions?: {
		code?: string;
		permission?: string;
		field?: string;
		[key: string]: any;
	};
}

/**
 * Paginated response structure for list queries
 */
export interface SemblePaginatedResponse<T> {
	items: T[];
	totalCount: number;
	pageInfo: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		startCursor?: string;
		endCursor?: string;
	};
}

/**
 * Permission error object - replaces field values when access denied
 */
export interface SemblePermissionError {
	__MISSING_PERMISSION__: {
		message: string;
		requiredPermission: string;
		field: string;
		code: string;
	};
}

// =============================================================================
// API ERROR TYPES
// =============================================================================

/**
 * Base API error interface
 */
export interface SembleApiError {
	code: string;
	message: string;
	field?: string;
	context?: Record<string, any>;
}

/**
 * Permission-specific error
 */
export interface SemblePermissionApiError extends SembleApiError {
	code: 'PERMISSION_DENIED';
	requiredPermission: string;
	field: string;
}

/**
 * Validation error
 */
export interface SembleValidationError extends SembleApiError {
	code: 'VALIDATION_ERROR';
	field: string;
	value?: any;
	constraint?: string;
}

/**
 * Network/connectivity error
 */
export interface SembleNetworkError extends SembleApiError {
	code: 'NETWORK_ERROR' | 'TIMEOUT' | 'CONNECTION_FAILED';
	statusCode?: number;
	retryable: boolean;
}

// =============================================================================
// QUERY/MUTATION INPUT TYPES
// =============================================================================

/**
 * Patient creation/update input
 */
export interface SemblePatientInput {
	firstName: string;
	lastName: string;
	email?: string;
	phone?: string;
	dateOfBirth?: string;
	gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
	address?: SembleAddress;
	emergencyContact?: SembleEmergencyContact;
	notes?: string;
	tags?: string[];
	customAttributes?: Record<string, any>;
	marketingPreferences?: SembleMarketingPreferences;
}

/**
 * Booking creation/update input
 */
export interface SembleBookingInput {
	patientId: string;
	doctorId: string;
	locationId: string;
	bookingTypeId: string;
	startTime: string; // ISO 8601 datetime
	endTime: string; // ISO 8601 datetime
	notes?: string;
	customAttributes?: Record<string, any>;
}

/**
 * Product creation/update input
 */
export interface SembleProductInput {
	name: string;
	itemCode?: string;
	productType?: string;
	serialNumber?: string;
	price?: number;
	cost?: number;
	stockLevel?: number;
	supplierName?: string;
	supplierDisplayName?: string;
	isBookable?: boolean;
	duration?: number;
	color?: string;
	isVideoConsultation?: boolean;
	requiresPayment?: boolean;
	requiresConfirmation?: boolean;
	comments?: string;
	tax?: SembleProductTax;
	labels?: SembleProductLabel[];
}

/**
 * Query filters for getting multiple records
 */
export interface SembleQueryFilters {
	search?: string;
	tags?: string[];
	dateFrom?: string;
	dateTo?: string;
	status?: string[];
	limit?: number;
	offset?: number;
	orderBy?: string;
	orderDirection?: 'ASC' | 'DESC';
}

// =============================================================================
// RESOURCE TYPE DEFINITIONS
// =============================================================================

/**
 * Supported Semble resource types
 */
export type SembleResourceType = 
	| 'patient' 
	| 'booking' 
	| 'doctor' 
	| 'location' 
	| 'bookingType'
	| 'product';

/**
 * Map of resource types to their corresponding interfaces
 */
export interface SembleResourceTypeMap {
	patient: SemblePatient;
	booking: SembleBooking;
	doctor: SembleDoctor;
	location: SembleLocation;
	bookingType: SembleBookingType;
	product: SembleProduct;
}

/**
 * Map of resource types to their input interfaces
 */
export interface SembleResourceInputMap {
	patient: SemblePatientInput;
	booking: SembleBookingInput;
	doctor: Partial<SembleDoctor>;
	location: Partial<SembleLocation>;
	bookingType: Partial<SembleBookingType>;
	product: SembleProductInput;
}

// =============================================================================
// GRAPHQL AND API TYPES
// =============================================================================

/**
 * GraphQL query structure
 */
export interface GraphQLQuery {
	query: string;
	variables?: Record<string, any>;
	operationName?: string;
}

/**
 * GraphQL response structure
 */
export interface GraphQLResponse<T = any> {
	data?: T;
	errors?: GraphQLError[];
	extensions?: any;
}

/**
 * GraphQL error structure
 */
export interface GraphQLError {
	message: string;
	locations?: Array<{ line: number; column: number }>;
	path?: Array<string | number>;
	extensions?: {
		code?: string;
		exception?: any;
		[key: string]: any;
	};
}

/**
 * Credentials for Semble API authentication
 */
export interface SembleCredentials {
	token?: string;
	apiKey?: string;
	baseUrl: string;
	environment?: 'development' | 'staging' | 'production';
}

/**
 * Query options for API requests
 */
export interface QueryOptions {
	timeout?: number;
	retries?: number;
	cache?: boolean;
	priority?: 'low' | 'normal' | 'high';
}

/**
 * Rate limiting state
 */
export interface RateLimitState {
	requests: number[];
	remaining: number;
	resetTime: number;
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
	maxAttempts: number;
	initialDelay: number;
	maxDelay: number;
	backoffMultiplier: number;
	retryableErrors: string[];
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Make all fields optional except specified ones
 */
export type SemblePartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Extract ID type from Semble objects
 */
export type SembleId = string;

/**
 * Generic Semble object with common fields
 */
export interface SembleBaseObject {
	id: string;
	createdAt: string;
	updatedAt: string;
}

// =============================================================================
// GRAPHQL INTROSPECTION TYPES
// =============================================================================

/**
 * GraphQL introspection and schema types
 */
export interface GraphQLSchema {
	queryType?: GraphQLType;
	mutationType?: GraphQLType;
	subscriptionType?: GraphQLType;
	types: GraphQLType[];
	directives: GraphQLDirective[];
}

export interface GraphQLType {
	kind: string;
	name: string;
	description?: string;
	fields: Record<string, GraphQLField>;
	inputFields: GraphQLField[];
	interfaces: GraphQLType[];
	enumValues: GraphQLEnumValue[];
	possibleTypes: GraphQLType[];
}

export interface GraphQLField {
	name: string;
	description?: string;
	type: string;
	args: GraphQLField[];
	isDeprecated: boolean;
	deprecationReason?: string;
	defaultValue?: any;
}

export interface GraphQLEnumValue {
	name: string;
	description?: string;
	isDeprecated: boolean;
	deprecationReason?: string;
}

export interface GraphQLDirective {
	name: string;
	description?: string;
	locations: string[];
	args: GraphQLField[];
}

/**
 * Cache options for service operations
 */
export interface CacheOptions {
	ttl?: number;
	namespace?: string;
	compress?: boolean;
	serialize?: boolean;
}
