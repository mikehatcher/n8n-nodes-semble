/**
 * @fileoverview MiddlewarePipeline.ts
 * @description Request/response processing pipeline with middleware chain execution for validation, permission checking, and error transformation
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Core.MiddlewarePipeline
 * @since 2.0.0
 */

import { IExecuteFunctions } from 'n8n-workflow';
import { SembleError } from './SembleError';
import { EventSystem, BaseEvent } from './EventSystem';

/**
 * Middleware pipeline event interfaces
 */
export interface MiddlewareRegisteredEvent extends BaseEvent {
	name: string;
	priority: number;
	enabled: boolean;
}

export interface MiddlewareUnregisteredEvent extends BaseEvent {
	name: string;
}

export interface MiddlewareToggledEvent extends BaseEvent {
	name: string;
	enabled: boolean;
}

export interface MiddlewareClearedEvent extends BaseEvent {
	count: number;
}

export interface PipelineStartedEvent extends BaseEvent {
	middlewareCount: number;
	resource: string;
	action: string;
}

export interface PipelineCompletedEvent extends BaseEvent {
	executionTime: number;
	middlewareCount: number;
	successfulMiddleware: number;
	resource: string;
	action: string;
}

export interface PipelineFailedEvent extends BaseEvent {
	error: string;
	executionTime: number;
	resource: string;
	action: string;
}

export interface PipelineMiddlewareErrorEvent extends BaseEvent {
	middlewareName: string;
	error: string;
	continuing: boolean;
}

/**
 * Pipeline context that flows through middleware chain
 */
export interface PipelineContext {
	/** Execution context from n8n */
	executeFunctions: IExecuteFunctions;
	/** Current request data */
	request: {
		/** GraphQL query string */
		query: string;
		/** Query variables */
		variables: Record<string, any>;
		/** Request metadata */
		metadata: {
			resource: string;
			action: string;
			itemIndex?: number;
			[key: string]: any;
		};
	};
	/** Response data (populated during pipeline execution) */
	response?: {
		/** Raw API response */
		data: any;
		/** Processed response data */
		processedData?: any;
		/** Response metadata */
		metadata?: Record<string, any>;
	};
	/** Shared context between middleware */
	shared: Record<string, any>;
	/** Error information if pipeline fails */
	error?: SembleError;
}

/**
 * Middleware function signature
 */
export type MiddlewareFunction = (
	context: PipelineContext,
	next: () => Promise<void>
) => Promise<void>;

/**
 * Middleware registration information
 */
export interface MiddlewareRegistration {
	/** Unique middleware name */
	name: string;
	/** Middleware function */
	middleware: MiddlewareFunction;
	/** Execution priority (lower = earlier) */
	priority: number;
	/** Whether middleware is enabled */
	enabled: boolean;
}

/**
 * Pipeline execution options
 */
export interface PipelineOptions {
	/** Whether to continue on middleware errors */
	continueOnError?: boolean;
	/** Maximum execution time in milliseconds */
	timeout?: number;
	/** Whether to emit pipeline events */
	emitEvents?: boolean;
}

/**
 * Pipeline execution result
 */
export interface PipelineResult {
	/** Whether pipeline completed successfully */
	success: boolean;
	/** Final pipeline context */
	context: PipelineContext;
	/** Execution time in milliseconds */
	executionTime: number;
	/** Middleware execution trace */
	trace: Array<{
		name: string;
		startTime: number;
		endTime: number;
		success: boolean;
		error?: string;
	}>;
}

/**
 * Request/response processing pipeline with middleware chain
 * Provides extensible processing for API requests and responses
 */
export class MiddlewarePipeline {
	private middlewares: MiddlewareRegistration[] = [];
	private eventSystem?: EventSystem;

	constructor(eventSystem?: EventSystem) {
		this.eventSystem = eventSystem;
	}

	/**
	 * Register a middleware function
	 */
	public register(
		name: string,
		middleware: MiddlewareFunction,
		priority: number = 100,
		enabled: boolean = true
	): void {
		// Check for duplicate names
		if (this.middlewares.some(m => m.name === name)) {
			throw new SembleError(
				`Middleware '${name}' is already registered`,
				'MIDDLEWARE_DUPLICATE'
			);
		}

		this.middlewares.push({
			name,
			middleware,
			priority,
			enabled
		});

		// Sort by priority (lower = earlier)
		this.middlewares.sort((a, b) => a.priority - b.priority);

		this.eventSystem?.emit<MiddlewareRegisteredEvent>({
			type: 'middleware:registered',
			source: 'MiddlewarePipeline',
			id: `middleware:registered:${name}:${Date.now()}`,
			timestamp: Date.now(),
			name,
			priority,
			enabled
		});
	}

	/**
	 * Unregister a middleware
	 */
	public unregister(name: string): boolean {
		const index = this.middlewares.findIndex(m => m.name === name);
		if (index === -1) {
			return false;
		}

		this.middlewares.splice(index, 1);

		this.eventSystem?.emit<MiddlewareUnregisteredEvent>({
			type: 'middleware:unregistered',
			source: 'MiddlewarePipeline',
			id: `middleware:unregistered:${name}:${Date.now()}`,
			timestamp: Date.now(),
			name
		});

		return true;
	}

	/**
	 * Enable or disable a middleware
	 */
	public setEnabled(name: string, enabled: boolean): boolean {
		const middleware = this.middlewares.find(m => m.name === name);
		if (!middleware) {
			return false;
		}

		middleware.enabled = enabled;

		this.eventSystem?.emit<MiddlewareToggledEvent>({
			type: 'middleware:toggled',
			source: 'MiddlewarePipeline',
			id: `middleware:toggled:${name}:${Date.now()}`,
			timestamp: Date.now(),
			name,
			enabled
		});

		return true;
	}

	/**
	 * Get all registered middleware
	 */
	public getMiddlewares(): MiddlewareRegistration[] {
		return [...this.middlewares];
	}

	/**
	 * Get enabled middleware in execution order
	 */
	public getEnabledMiddlewares(): MiddlewareRegistration[] {
		return this.middlewares.filter(m => m.enabled);
	}

	/**
	 * Clear all registered middleware
	 */
	public clear(): void {
		const count = this.middlewares.length;
		this.middlewares = [];

		this.eventSystem?.emit<MiddlewareClearedEvent>({
			type: 'middleware:cleared',
			source: 'MiddlewarePipeline',
			id: `middleware:cleared:${Date.now()}`,
			timestamp: Date.now(),
			count
		});
	}

	/**
	 * Execute the middleware pipeline
	 */
	public async execute(
		context: PipelineContext,
		options: PipelineOptions = {}
	): Promise<PipelineResult> {
		const startTime = Date.now();
		const trace: PipelineResult['trace'] = [];
		const enabledMiddlewares = this.getEnabledMiddlewares();

		// Default options
		const {
			continueOnError = false,
			timeout = 30000,
			emitEvents = true
		} = options;

		if (emitEvents && this.eventSystem) {
			this.eventSystem.emit<PipelineStartedEvent>({
				type: 'pipeline:started',
				source: 'MiddlewarePipeline',
				id: `pipeline:started:${Date.now()}`,
				timestamp: Date.now(),
				middlewareCount: enabledMiddlewares.length,
				resource: context.request.metadata.resource,
				action: context.request.metadata.action
			});
		}

		// Create execution context with timeout
		let timeoutId: NodeJS.Timeout | undefined;
		let isTimedOut = false;

		if (timeout > 0) {
			timeoutId = setTimeout(() => {
				isTimedOut = true;
			}, timeout);
		}

		try {
			// Execute middleware chain
			let currentIndex = 0;

			const executeNext = async (): Promise<void> => {
				if (isTimedOut) {
					throw new SembleError(
						`Pipeline execution timed out after ${timeout}ms`,
						'PIPELINE_TIMEOUT'
					);
				}

				const middleware = enabledMiddlewares[currentIndex];
				if (!middleware) {
					return; // End of chain
				}

				const middlewareStartTime = Date.now();
				let middlewareError: string | undefined;

				try {
					// Execute middleware
					currentIndex++;
					await middleware.middleware(context, executeNext);

					trace.push({
						name: middleware.name,
						startTime: middlewareStartTime,
						endTime: Date.now(),
						success: true
					});
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					middlewareError = errorMessage;

					trace.push({
						name: middleware.name,
						startTime: middlewareStartTime,
						endTime: Date.now(),
						success: false,
						error: errorMessage
					});

					if (!continueOnError) {
						throw error;
					}

					// Store error in context but continue
					context.error = error instanceof SembleError 
						? error 
						: new SembleError(errorMessage, 'MIDDLEWARE_ERROR');

					if (emitEvents && this.eventSystem) {
						this.eventSystem.emit<PipelineMiddlewareErrorEvent>({
							type: 'pipeline:middleware_error',
							source: 'MiddlewarePipeline',
							id: `pipeline:middleware_error:${middleware.name}:${Date.now()}`,
							timestamp: Date.now(),
							middlewareName: middleware.name,
							error: errorMessage,
							continuing: true
						});
					}

					// Continue to next middleware instead of calling next()
					await executeNext();
				}
			};

			// Start the chain
			await executeNext();

			const executionTime = Date.now() - startTime;
			const success = !context.error;

			if (emitEvents && this.eventSystem) {
				this.eventSystem.emit<PipelineCompletedEvent>({
					type: success ? 'pipeline:completed' : 'pipeline:completed_with_errors',
					source: 'MiddlewarePipeline',
					id: `pipeline:${success ? 'completed' : 'completed_with_errors'}:${Date.now()}`,
					timestamp: Date.now(),
					executionTime,
					middlewareCount: enabledMiddlewares.length,
					successfulMiddleware: trace.filter(t => t.success).length,
					resource: context.request.metadata.resource,
					action: context.request.metadata.action
				});
			}

			return {
				success,
				context,
				executionTime,
				trace
			};

		} catch (error) {
			const executionTime = Date.now() - startTime;
			const errorMessage = error instanceof Error ? error.message : String(error);

			if (emitEvents && this.eventSystem) {
				this.eventSystem.emit<PipelineFailedEvent>({
					type: 'pipeline:failed',
					source: 'MiddlewarePipeline',
					id: `pipeline:failed:${Date.now()}`,
					timestamp: Date.now(),
					error: errorMessage,
					executionTime,
					resource: context.request.metadata.resource,
					action: context.request.metadata.action
				});
			}

			// Ensure error is stored in context
			context.error = error instanceof SembleError 
				? error 
				: new SembleError(errorMessage, 'PIPELINE_ERROR');

			return {
				success: false,
				context,
				executionTime,
				trace
			};

		} finally {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		}
	}

	/**
	 * Create a new pipeline with pre-configured middleware
	 */
	public static createWithDefaults(eventSystem?: EventSystem): MiddlewarePipeline {
		const pipeline = new MiddlewarePipeline(eventSystem);

		// Register default middleware in order of execution
		pipeline.register('request-validation', MiddlewarePipeline.requestValidationMiddleware, 10);
		pipeline.register('permission-check', MiddlewarePipeline.permissionCheckMiddleware, 20);
		pipeline.register('api-execution', MiddlewarePipeline.apiExecutionMiddleware, 50);
		pipeline.register('response-processing', MiddlewarePipeline.responseProcessingMiddleware, 80);
		pipeline.register('error-mapping', MiddlewarePipeline.errorMappingMiddleware, 90);

		return pipeline;
	}

	/**
	 * Built-in request validation middleware
	 */
	public static requestValidationMiddleware: MiddlewareFunction = async (context, next) => {
		const { request } = context;

		// Validate required fields
		if (!request.query || typeof request.query !== 'string') {
			throw new SembleError('Query is required and must be a string', 'VALIDATION_ERROR');
		}

		if (!request.metadata.resource) {
			throw new SembleError('Resource is required in metadata', 'VALIDATION_ERROR');
		}

		if (!request.metadata.action) {
			throw new SembleError('Action is required in metadata', 'VALIDATION_ERROR');
		}

		// Store validation result
		context.shared.requestValidated = true;
		context.shared.validationTime = Date.now();

		await next();
	};

	/**
	 * Built-in permission check middleware
	 */
	public static permissionCheckMiddleware: MiddlewareFunction = async (context, next) => {
		// This would integrate with PermissionCheckService
		// For now, we'll implement a basic check

		const { request, executeFunctions } = context;
		
		try {
			// Get credentials to verify they exist
			const credentials = await executeFunctions.getCredentials('sembleApi');
			if (!credentials || !credentials.token) {
				throw new SembleError('Invalid or missing credentials', 'PERMISSION_ERROR');
			}

			// Store permission check result
			context.shared.permissionChecked = true;
			context.shared.permissionCheckTime = Date.now();

			await next();
		} catch (error) {
			throw new SembleError(
				`Permission check failed: ${error instanceof Error ? error.message : String(error)}`,
				'PERMISSION_ERROR'
			);
		}
	};

	/**
	 * Built-in API execution middleware
	 */
	public static apiExecutionMiddleware: MiddlewareFunction = async (context, next) => {
		// This would integrate with SembleQueryService
		// For now, we'll simulate API execution

		const { request } = context;

		try {
			// Simulate API call
			context.response = {
				data: {
					// Mock response based on action
					[request.metadata.action]: {
						success: true,
						timestamp: new Date().toISOString(),
						resource: request.metadata.resource
					}
				},
				metadata: {
					executionTime: Date.now() - (context.shared.validationTime || Date.now()),
					query: request.query.substring(0, 100) + '...'
				}
			};

			context.shared.apiExecuted = true;
			context.shared.apiExecutionTime = Date.now();

			await next();
		} catch (error) {
			throw new SembleError(
				`API execution failed: ${error instanceof Error ? error.message : String(error)}`,
				'API_ERROR'
			);
		}
	};

	/**
	 * Built-in response processing middleware
	 */
	public static responseProcessingMiddleware: MiddlewareFunction = async (context, next) => {
		if (!context.response) {
			throw new SembleError('No response data to process', 'PROCESSING_ERROR');
		}

		try {
			// Process the response data
			const processedData = {
				...context.response.data,
				processed: true,
				processingTime: Date.now()
			};

			context.response.processedData = processedData;
			context.shared.responseProcessed = true;
			context.shared.responseProcessingTime = Date.now();

			await next();
		} catch (error) {
			throw new SembleError(
				`Response processing failed: ${error instanceof Error ? error.message : String(error)}`,
				'PROCESSING_ERROR'
			);
		}
	};

	/**
	 * Built-in error mapping middleware
	 */
	public static errorMappingMiddleware: MiddlewareFunction = async (context, next) => {
		try {
			await next();
		} catch (error) {
			// Map errors to user-friendly messages
			let mappedError: SembleError;

			if (error instanceof SembleError) {
				mappedError = error;
			} else {
				const errorMessage = error instanceof Error ? error.message : String(error);
				
				// Map common error patterns
				if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
					mappedError = new SembleError(
						'You do not have permission to perform this action',
						'PERMISSION_ERROR'
					);
				} else if (errorMessage.includes('timeout')) {
					mappedError = new SembleError(
						'The request timed out. Please try again.',
						'TIMEOUT_ERROR'
					);
				} else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
					mappedError = new SembleError(
						'Network error occurred. Please check your connection.',
						'NETWORK_ERROR'
					);
				} else {
					mappedError = new SembleError(
						`An error occurred: ${errorMessage}`,
						'UNKNOWN_ERROR'
					);
				}
			}

			context.shared.errorMapped = true;
			context.shared.errorMappingTime = Date.now();
			
			throw mappedError;
		}
	};
}

/**
 * Utility functions for pipeline management
 */
export class MiddlewarePipelineUtils {
	/**
	 * Create a basic pipeline context
	 */
	public static createContext(
		executeFunctions: IExecuteFunctions,
		query: string,
		variables: Record<string, any>,
		resource: string,
		action: string,
		itemIndex?: number
	): PipelineContext {
		return {
			executeFunctions,
			request: {
				query,
				variables,
				metadata: {
					resource,
					action,
					itemIndex
				}
			},
			shared: {}
		};
	}

	/**
	 * Create a pipeline with common Semble middleware
	 */
	public static createSemblePipeline(eventSystem?: EventSystem): MiddlewarePipeline {
		return MiddlewarePipeline.createWithDefaults(eventSystem);
	}

	/**
	 * Execute a simple request through the pipeline
	 */
	public static async executeRequest(
		pipeline: MiddlewarePipeline,
		executeFunctions: IExecuteFunctions,
		query: string,
		variables: Record<string, any>,
		resource: string,
		action: string,
		options?: PipelineOptions
	): Promise<PipelineResult> {
		const context = this.createContext(
			executeFunctions,
			query,
			variables,
			resource,
			action
		);

		return pipeline.execute(context, options);
	}
}
