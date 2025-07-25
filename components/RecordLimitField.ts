/**
 * @fileoverview Record limit field component for n8n Semble integration
 * @description Integer field with special -1 = all logic and user-friendly display
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Components
 * @since 2.0.0
 */

import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

/**
 * Record limit field configuration
 */
export interface RecordLimitConfig {
	/** Field name */
	name?: string;
	/** Display name */
	displayName?: string;
	/** Field description */
	description?: string;
	/** Default value */
	default?: number;
	/** Minimum value (excluding -1) */
	min?: number;
	/** Maximum value */
	max?: number;
	/** Whether to show the "unlimited" option */
	showUnlimited?: boolean;
	/** Custom unlimited value (default: -1) */
	unlimitedValue?: number;
	/** Display options for conditional visibility */
	displayOptions?: any;
	/** Whether field is required */
	required?: boolean;
}

/**
 * Record limit validation result
 */
export interface RecordLimitValidation {
	isValid: boolean;
	value: number;
	isUnlimited: boolean;
	message?: string;
}

/**
 * Record limit field component class
 * @class RecordLimitField
 * @description Generates integer field with special unlimited (-1) logic
 */
export class RecordLimitField {
	private readonly config: Required<RecordLimitConfig>;

	/**
	 * Default configuration
	 */
	private static readonly DEFAULT_CONFIG: Required<RecordLimitConfig> = {
		name: 'limit',
		displayName: 'Record Limit',
		description: 'Maximum number of records to return. Use -1 for unlimited.',
		default: 50,
		min: 1,
		max: 10000,
		showUnlimited: true,
		unlimitedValue: -1,
		displayOptions: {},
		required: false,
	};

	/**
	 * Create new record limit field
	 */
	constructor(config: RecordLimitConfig = {}) {
		this.config = {
			...RecordLimitField.DEFAULT_CONFIG,
			...config,
		};
	}

	/**
	 * Generate n8n node property for record limit field
	 */
	public generateProperty(): INodeProperties {
		const property: INodeProperties = {
			displayName: this.config.displayName,
			name: this.config.name,
			type: 'number',
			default: this.config.default,
			description: this.generateDescription(),
			placeholder: this.generatePlaceholder(),
		};

		// Add validation rules
		property.typeOptions = {
			minValue: this.config.unlimitedValue, // Allow -1 for unlimited
			maxValue: this.config.max,
			numberStepSize: 1,
			numberPrecision: 0,
		};

		// Add display options if specified
		if (this.config.displayOptions && Object.keys(this.config.displayOptions).length > 0) {
			property.displayOptions = this.config.displayOptions;
		}

		// Add required flag if specified
		if (this.config.required) {
			property.required = true;
		}

		return property;
	}

	/**
	 * Generate companion field for unlimited toggle (alternative approach)
	 */
	public generateUnlimitedToggle(): INodeProperties {
		return {
			displayName: 'Return All Records',
			name: `${this.config.name}Unlimited`,
			type: 'boolean',
			default: false,
			description: 'When enabled, returns all records ignoring the limit',
			displayOptions: this.config.displayOptions,
		};
	}

	/**
	 * Generate options field for preset limits
	 */
	public generatePresetOptions(): INodeProperties {
		const options: INodePropertyOptions[] = [
			{ name: '10 records', value: 10 },
			{ name: '25 records', value: 25 },
			{ name: '50 records', value: 50 },
			{ name: '100 records', value: 100 },
			{ name: '250 records', value: 250 },
			{ name: '500 records', value: 500 },
		];

		if (this.config.showUnlimited) {
			options.push({ name: 'All records (unlimited)', value: this.config.unlimitedValue });
		}

		return {
			displayName: this.config.displayName,
			name: this.config.name,
			type: 'options',
			options,
			default: this.config.default,
			description: this.config.description,
			displayOptions: this.config.displayOptions,
		};
	}

	/**
	 * Validate record limit value
	 */
	public validateLimit(value: any): RecordLimitValidation {
		const result: RecordLimitValidation = {
			isValid: false,
			value: 0,
			isUnlimited: false,
		};

		// Convert to number
		const numValue = typeof value === 'number' ? value : parseInt(value, 10);

		// Check if it's a valid number
		if (isNaN(numValue)) {
			result.message = 'Limit must be a valid number';
			return result;
		}

		// Check for unlimited value
		if (numValue === this.config.unlimitedValue) {
			result.isValid = true;
			result.value = numValue;
			result.isUnlimited = true;
			return result;
		}

		// Check minimum value
		if (numValue < this.config.min) {
			result.message = `Limit must be at least ${this.config.min} or ${this.config.unlimitedValue} for unlimited`;
			return result;
		}

		// Check maximum value
		if (numValue > this.config.max) {
			result.message = `Limit cannot exceed ${this.config.max}`;
			return result;
		}

		result.isValid = true;
		result.value = numValue;
		result.isUnlimited = false;
		return result;
	}

	/**
	 * Process limit value for API requests
	 */
	public processLimitForApi(value: any): number | null {
		const validation = this.validateLimit(value);

		if (!validation.isValid) {
			throw new Error(validation.message || 'Invalid limit value');
		}

		// Return null for unlimited to indicate no limit should be applied
		if (validation.isUnlimited) {
			return null;
		}

		return validation.value;
	}

	/**
	 * Get user-friendly display value
	 */
	public getDisplayValue(value: any): string {
		const validation = this.validateLimit(value);

		if (!validation.isValid) {
			return 'Invalid';
		}

		if (validation.isUnlimited) {
			return 'All records (unlimited)';
		}

		return `${validation.value} records`;
	}

	/**
	 * Generate collection field with both limit and unlimited options
	 */
	public generateLimitCollection(): INodeProperties {
		return {
			displayName: 'Result Limits',
			name: 'resultLimits',
			type: 'collection',
			placeholder: 'Add Limit Option',
			default: {},
			description: 'Configure how many records to retrieve',
			options: [
				{
					displayName: 'Maximum Records',
					name: 'limit',
					type: 'number',
					default: this.config.default,
					description: `Maximum number of records to return (1-${this.config.max})`,
					typeOptions: {
						minValue: this.config.min,
						maxValue: this.config.max,
						numberStepSize: 1,
					},
				},
				{
					displayName: 'Return All',
					name: 'returnAll',
					type: 'boolean',
					default: false,
					description: 'Override limit and return all available records',
				},
			],
		};
	}

	/**
	 * Extract limit from collection field
	 */
	public extractLimitFromCollection(collectionValue: any): number | null {
		if (!collectionValue || typeof collectionValue !== 'object') {
			return this.config.default;
		}

		// Check if return all is enabled
		if (collectionValue.returnAll === true) {
			return null; // Unlimited
		}

		// Use specified limit or default
		const limit = collectionValue.limit || this.config.default;
		const validation = this.validateLimit(limit);

		if (!validation.isValid) {
			return this.config.default;
		}

		return validation.isUnlimited ? null : validation.value;
	}

	/**
	 * Generate description text with examples
	 */
	private generateDescription(): string {
		let description = this.config.description;

		if (this.config.showUnlimited) {
			description += ` Examples: ${this.config.min} (minimum), ${this.config.default} (default), ${this.config.unlimitedValue} (unlimited).`;
		} else {
			description += ` Range: ${this.config.min}-${this.config.max}. Default: ${this.config.default}.`;
		}

		return description;
	}

	/**
	 * Generate placeholder text
	 */
	private generatePlaceholder(): string {
		if (this.config.showUnlimited) {
			return `${this.config.default} (or ${this.config.unlimitedValue} for all)`;
		}
		return `${this.config.default}`;
	}

	/**
	 * Static helper to create a standard record limit field
	 */
	public static createStandard(overrides: Partial<RecordLimitConfig> = {}): INodeProperties {
		const field = new RecordLimitField(overrides);
		return field.generateProperty();
	}

	/**
	 * Static helper to create preset options field
	 */
	public static createPresetOptions(overrides: Partial<RecordLimitConfig> = {}): INodeProperties {
		const field = new RecordLimitField(overrides);
		return field.generatePresetOptions();
	}

	/**
	 * Static helper to create collection-based limit field
	 */
	public static createCollection(overrides: Partial<RecordLimitConfig> = {}): INodeProperties {
		const field = new RecordLimitField(overrides);
		return field.generateLimitCollection();
	}
}

/**
 * Default record limit field instance
 */
export const defaultRecordLimit = new RecordLimitField();

/**
 * Convenience function to create standard limit field
 */
export function createLimitField(config: RecordLimitConfig = {}): INodeProperties {
	return RecordLimitField.createStandard(config);
}

/**
 * Convenience function to validate limit value
 */
export function validateRecordLimit(value: any, config: RecordLimitConfig = {}): RecordLimitValidation {
	const field = new RecordLimitField(config);
	return field.validateLimit(value);
}

/**
 * Convenience function to process limit for API
 */
export function processLimitForApi(value: any, config: RecordLimitConfig = {}): number | null {
	const field = new RecordLimitField(config);
	return field.processLimitForApi(value);
}
