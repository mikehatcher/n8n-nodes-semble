/**
 * TypeScript type definitions for Semble API objects and responses
 * Phase 1.1 - Foundation Layer Type Definitions
 */

// =============================================================================
// CORE SEMBLE API OBJECT INTERFACES
// =============================================================================

/**
 * Patient interface - represents a patient/customer in Semble
 */
export interface SemblePatient {
	id: string;
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
	accessGroups?: string[];
	status?: string;
	createdAt: string;
	updatedAt: string;
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
 * Address interface - used in Patient and Location
 */
export interface SembleAddress {
	line1?: string;
	line2?: string;
	city?: string;
	state?: string;
	postalCode?: string;
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
	| 'bookingType';

/**
 * Map of resource types to their corresponding interfaces
 */
export interface SembleResourceTypeMap {
	patient: SemblePatient;
	booking: SembleBooking;
	doctor: SembleDoctor;
	location: SembleLocation;
	bookingType: SembleBookingType;
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
