/**
 * @fileoverview MiddlewarePipeline.test.ts
 * @description Comprehensive test suite for Request/Response Pipeline with middleware chain execution, validation, permission checks, and error handling
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Core.MiddlewarePipeline
 * @since 2.0.0
 */

import { IExecuteFunctions } from 'n8n-workflow';
import { 
	MiddlewarePipeline, 
	MiddlewarePipelineUtils,
	PipelineContext,
	MiddlewareFunction,
	PipelineResult
} from '../../core/MiddlewarePipeline';
import { EventSystem } from '../../core/EventSystem';
import { SembleError } from '../../core/SembleError';

describe('Request/Response Pipeline', () => {
	let pipeline: MiddlewarePipeline;
	let eventSystem: EventSystem;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		eventSystem = new EventSystem();
		pipeline = new MiddlewarePipeline(eventSystem);

		// Mock IExecuteFunctions
		mockExecuteFunctions = {
			getCredentials: jest.fn().mockResolvedValue({
				token: 'test-token',
				url: 'https://test.api.com'
			}),
			getNodeParameter: jest.fn(),
			helpers: {
				request: jest.fn()
			}
		} as any;
	});

	afterEach(() => {
		pipeline.clear();
		// EventSystem.removeAllListeners() doesn't exist, so we'll create a new instance
		eventSystem = new EventSystem();
	});

	describe('MiddlewarePipeline', () => {
		describe('Middleware Registration', () => {
			test('should register middleware successfully', () => {
				const middleware: MiddlewareFunction = async (context, next) => {
					await next();
				};

				pipeline.register('test-middleware', middleware, 50);

				const middlewares = pipeline.getMiddlewares();
				expect(middlewares).toHaveLength(1);
				expect(middlewares[0].name).toBe('test-middleware');
				expect(middlewares[0].priority).toBe(50);
				expect(middlewares[0].enabled).toBe(true);
			});

			test('should prevent duplicate middleware registration', () => {
				const middleware: MiddlewareFunction = async (context, next) => {
					await next();
				};

				pipeline.register('duplicate', middleware);

				expect(() => {
					pipeline.register('duplicate', middleware);
				}).toThrow(SembleError);
				expect(() => {
					pipeline.register('duplicate', middleware);
				}).toThrow('Middleware \'duplicate\' is already registered');
			});

			test('should sort middleware by priority', () => {
				const middleware1: MiddlewareFunction = async (context, next) => await next();
				const middleware2: MiddlewareFunction = async (context, next) => await next();
				const middleware3: MiddlewareFunction = async (context, next) => await next();

				pipeline.register('high-priority', middleware1, 10);
				pipeline.register('low-priority', middleware2, 100);
				pipeline.register('medium-priority', middleware3, 50);

				const middlewares = pipeline.getMiddlewares();
				expect(middlewares[0].name).toBe('high-priority');
				expect(middlewares[1].name).toBe('medium-priority');
				expect(middlewares[2].name).toBe('low-priority');
			});

			test('should unregister middleware', () => {
				const middleware: MiddlewareFunction = async (context, next) => await next();
				pipeline.register('removable', middleware);

				expect(pipeline.getMiddlewares()).toHaveLength(1);

				const result = pipeline.unregister('removable');
				expect(result).toBe(true);
				expect(pipeline.getMiddlewares()).toHaveLength(0);

				const failResult = pipeline.unregister('non-existent');
				expect(failResult).toBe(false);
			});

			test('should enable/disable middleware', () => {
				const middleware: MiddlewareFunction = async (context, next) => await next();
				pipeline.register('toggleable', middleware);

				expect(pipeline.getEnabledMiddlewares()).toHaveLength(1);

				const result = pipeline.setEnabled('toggleable', false);
				expect(result).toBe(true);
				expect(pipeline.getEnabledMiddlewares()).toHaveLength(0);

				pipeline.setEnabled('toggleable', true);
				expect(pipeline.getEnabledMiddlewares()).toHaveLength(1);

				const failResult = pipeline.setEnabled('non-existent', false);
				expect(failResult).toBe(false);
			});

			test('should clear all middleware', () => {
				const middleware: MiddlewareFunction = async (context, next) => await next();
				pipeline.register('first', middleware);
				pipeline.register('second', middleware);

				expect(pipeline.getMiddlewares()).toHaveLength(2);

				pipeline.clear();
				expect(pipeline.getMiddlewares()).toHaveLength(0);
			});
		});

		describe('Pipeline Execution', () => {
			test('should execute middleware in order', async () => {
				const executionOrder: string[] = [];

				const middleware1: MiddlewareFunction = async (context, next) => {
					executionOrder.push('middleware1-start');
					await next();
					executionOrder.push('middleware1-end');
				};

				const middleware2: MiddlewareFunction = async (context, next) => {
					executionOrder.push('middleware2-start');
					await next();
					executionOrder.push('middleware2-end');
				};

				pipeline.register('first', middleware1, 10);
				pipeline.register('second', middleware2, 20);

				const context = MiddlewarePipelineUtils.createContext(
					mockExecuteFunctions,
					'query { test }',
					{},
					'patient',
					'get'
				);

				const result = await pipeline.execute(context);

				expect(result.success).toBe(true);
				expect(executionOrder).toEqual([
					'middleware1-start',
					'middleware2-start',
					'middleware2-end',
					'middleware1-end'
				]);
			});

			test('should handle middleware that modifies context', async () => {
				const middleware1: MiddlewareFunction = async (context, next) => {
					context.shared.step1 = 'completed';
					await next();
				};

				const middleware2: MiddlewareFunction = async (context, next) => {
					context.shared.step2 = context.shared.step1 + '-step2';
					await next();
				};

				pipeline.register('modifier1', middleware1, 10);
				pipeline.register('modifier2', middleware2, 20);

				const context = MiddlewarePipelineUtils.createContext(
					mockExecuteFunctions,
					'query { test }',
					{},
					'patient',
					'get'
				);

				const result = await pipeline.execute(context);

				expect(result.success).toBe(true);
				expect(result.context.shared.step1).toBe('completed');
				expect(result.context.shared.step2).toBe('completed-step2');
			});

			test('should handle middleware errors', async () => {
				const errorMiddleware: MiddlewareFunction = async (context, next) => {
					throw new SembleError('Middleware failed', 'MIDDLEWARE_ERROR');
				};

				pipeline.register('error-middleware', errorMiddleware);

				const context = MiddlewarePipelineUtils.createContext(
					mockExecuteFunctions,
					'query { test }',
					{},
					'patient',
					'get'
				);

				const result = await pipeline.execute(context);

				expect(result.success).toBe(false);
				expect(result.context.error).toBeInstanceOf(SembleError);
				expect(result.context.error?.message).toBe('Middleware failed');
			});

			test('should continue on error when configured', async () => {
				const errorMiddleware: MiddlewareFunction = async (context, next) => {
					throw new Error('Non-critical error');
				};

				const successMiddleware: MiddlewareFunction = async (context, next) => {
					context.shared.continued = true;
					await next();
				};

				pipeline.register('error', errorMiddleware, 10);
				pipeline.register('success', successMiddleware, 20);

				const context = MiddlewarePipelineUtils.createContext(
					mockExecuteFunctions,
					'query { test }',
					{},
					'patient',
					'get'
				);

				const result = await pipeline.execute(context, { continueOnError: true });

				expect(result.success).toBe(false); // Error occurred
				expect(result.context.shared.continued).toBe(true); // But execution continued
				expect(result.context.error).toBeInstanceOf(SembleError);
			});

			test('should handle timeout', async () => {
				const slowMiddleware: MiddlewareFunction = async (context, next) => {
					await new Promise(resolve => setTimeout(resolve, 100));
					await next();
				};

				pipeline.register('slow', slowMiddleware);

				const context = MiddlewarePipelineUtils.createContext(
					mockExecuteFunctions,
					'query { test }',
					{},
					'patient',
					'get'
				);

				const result = await pipeline.execute(context, { timeout: 50 });

				expect(result.success).toBe(false);
				expect(result.context.error?.message).toContain('timed out');
			});

			test('should provide execution trace', async () => {
				const middleware1: MiddlewareFunction = async (context, next) => {
					await new Promise(resolve => setTimeout(resolve, 10));
					await next();
				};

				const middleware2: MiddlewareFunction = async (context, next) => {
					throw new Error('Test error');
				};

				pipeline.register('first', middleware1, 10);
				pipeline.register('second', middleware2, 20);

				const context = MiddlewarePipelineUtils.createContext(
					mockExecuteFunctions,
					'query { test }',
					{},
					'patient',
					'get'
				);

				const result = await pipeline.execute(context);

				expect(result.trace).toHaveLength(2);
				// Both middlewares appear in trace, with the failing one recorded appropriately
				const traceNames = result.trace.map(t => t.name);
				expect(traceNames).toContain('first');
				expect(traceNames).toContain('second');
				
				// Find the second middleware trace (which should have failed)
				const secondTrace = result.trace.find(t => t.name === 'second');
				expect(secondTrace).toBeDefined();
				expect(secondTrace!.success).toBe(false);
				expect(secondTrace!.error).toBe('Test error');
			});

			test('should skip disabled middleware', async () => {
				const executionOrder: string[] = [];

				const middleware1: MiddlewareFunction = async (context, next) => {
					executionOrder.push('middleware1');
					await next();
				};

				const middleware2: MiddlewareFunction = async (context, next) => {
					executionOrder.push('middleware2');
					await next();
				};

				pipeline.register('enabled', middleware1, 10);
				pipeline.register('disabled', middleware2, 20, false);

				const context = MiddlewarePipelineUtils.createContext(
					mockExecuteFunctions,
					'query { test }',
					{},
					'patient',
					'get'
				);

				const result = await pipeline.execute(context);

				expect(result.success).toBe(true);
				expect(executionOrder).toEqual(['middleware1']);
				expect(result.trace).toHaveLength(1);
			});
		});

		describe('Event Emission', () => {
			test('should emit pipeline events', async () => {
				const events: any[] = [];
				
				eventSystem.on('pipeline:started', (event) => {
					events.push({ type: 'started', event });
				});

				eventSystem.on('pipeline:completed', (event) => {
					events.push({ type: 'completed', event });
				});

				const simpleMiddleware: MiddlewareFunction = async (context, next) => {
					await next();
				};

				pipeline.register('simple', simpleMiddleware);

				const context = MiddlewarePipelineUtils.createContext(
					mockExecuteFunctions,
					'query { test }',
					{},
					'patient',
					'get'
				);

				await pipeline.execute(context, { emitEvents: true });

				expect(events).toHaveLength(2);
				expect(events[0].type).toBe('started');
				expect(events[1].type).toBe('completed');
			});

			test('should emit middleware registration events', () => {
				const events: any[] = [];
				
				eventSystem.on('middleware:registered', (event) => {
					events.push(event);
				});

				const middleware: MiddlewareFunction = async (context, next) => await next();
				pipeline.register('test', middleware, 50);

				expect(events).toHaveLength(1);
				expect(events[0].name).toBe('test');
				expect(events[0].priority).toBe(50);
			});
		});

		describe('Built-in Middleware', () => {
			test('request validation middleware should validate required fields', async () => {
				const context = MiddlewarePipelineUtils.createContext(
					mockExecuteFunctions,
					'',
					{},
					'patient',
					'get'
				);

				try {
					await MiddlewarePipeline.requestValidationMiddleware(context, async () => {});
					fail('Should have thrown validation error');
				} catch (error) {
					expect(error).toBeInstanceOf(SembleError);
					expect((error as SembleError).message).toContain('Query is required');
				}
			});

			test('request validation middleware should pass with valid input', async () => {
				const context = MiddlewarePipelineUtils.createContext(
					mockExecuteFunctions,
					'query { test }',
					{},
					'patient',
					'get'
				);

				let nextCalled = false;
				await MiddlewarePipeline.requestValidationMiddleware(context, async () => {
					nextCalled = true;
				});

				expect(nextCalled).toBe(true);
				expect(context.shared.requestValidated).toBe(true);
			});

			test('permission check middleware should validate credentials', async () => {
				const context = MiddlewarePipelineUtils.createContext(
					mockExecuteFunctions,
					'query { test }',
					{},
					'patient',
					'get'
				);

				let nextCalled = false;
				await MiddlewarePipeline.permissionCheckMiddleware(context, async () => {
					nextCalled = true;
				});

				expect(nextCalled).toBe(true);
				expect(context.shared.permissionChecked).toBe(true);
			});

			test('permission check middleware should fail with invalid credentials', async () => {
				mockExecuteFunctions.getCredentials.mockRejectedValue(new Error('No credentials'));

				const context = MiddlewarePipelineUtils.createContext(
					mockExecuteFunctions,
					'query { test }',
					{},
					'patient',
					'get'
				);

				try {
					await MiddlewarePipeline.permissionCheckMiddleware(context, async () => {});
					fail('Should have thrown permission error');
				} catch (error) {
					expect(error).toBeInstanceOf(SembleError);
					expect((error as SembleError).message).toContain('Permission check failed');
				}
			});

			test('API execution middleware should simulate API call', async () => {
				const context = MiddlewarePipelineUtils.createContext(
					mockExecuteFunctions,
					'query { test }',
					{},
					'patient',
					'get'
				);

				let nextCalled = false;
				await MiddlewarePipeline.apiExecutionMiddleware(context, async () => {
					nextCalled = true;
				});

				expect(nextCalled).toBe(true);
				expect(context.response).toBeDefined();
				expect(context.response?.data).toBeDefined();
				expect(context.shared.apiExecuted).toBe(true);
			});

			test('response processing middleware should process response data', async () => {
				const context = MiddlewarePipelineUtils.createContext(
					mockExecuteFunctions,
					'query { test }',
					{},
					'patient',
					'get'
				);

				// Set up response data
				context.response = {
					data: { test: 'data' },
					metadata: {}
				};

				let nextCalled = false;
				await MiddlewarePipeline.responseProcessingMiddleware(context, async () => {
					nextCalled = true;
				});

				expect(nextCalled).toBe(true);
				expect(context.response.processedData).toBeDefined();
				expect(context.response.processedData.processed).toBe(true);
				expect(context.shared.responseProcessed).toBe(true);
			});

			test('error mapping middleware should map errors', async () => {
				const context = MiddlewarePipelineUtils.createContext(
					mockExecuteFunctions,
					'query { test }',
					{},
					'patient',
					'get'
				);

				try {
					await MiddlewarePipeline.errorMappingMiddleware(context, async () => {
						throw new Error('permission denied');
					});
					fail('Should have thrown mapped error');
				} catch (error) {
					expect(error).toBeInstanceOf(SembleError);
					expect((error as SembleError).message).toBe('You do not have permission to perform this action');
					expect(context.shared.errorMapped).toBe(true);
				}
			});
		});

		describe('Default Pipeline', () => {
			test('should create pipeline with default middleware', () => {
				const defaultPipeline = MiddlewarePipeline.createWithDefaults(eventSystem);
				const middlewares = defaultPipeline.getMiddlewares();

				expect(middlewares).toHaveLength(5);
				expect(middlewares.map(m => m.name)).toEqual([
					'request-validation',
					'permission-check',
					'api-execution',
					'response-processing',
					'error-mapping'
				]);
			});

			test('should execute complete default pipeline', async () => {
				const defaultPipeline = MiddlewarePipeline.createWithDefaults(eventSystem);

				const context = MiddlewarePipelineUtils.createContext(
					mockExecuteFunctions,
					'query { patients { id name } }',
					{ limit: 10 },
					'patient',
					'getMany'
				);

				const result = await defaultPipeline.execute(context);

				expect(result.success).toBe(true);
				expect(result.trace).toHaveLength(5);
				expect(result.context.shared.requestValidated).toBe(true);
				expect(result.context.shared.permissionChecked).toBe(true);
				expect(result.context.shared.apiExecuted).toBe(true);
				expect(result.context.shared.responseProcessed).toBe(true);
				expect(result.context.response?.processedData).toBeDefined();
			});
		});
	});

	describe('MiddlewarePipelineUtils', () => {
		test('should create basic context', () => {
			const context = MiddlewarePipelineUtils.createContext(
				mockExecuteFunctions,
				'query { test }',
				{ limit: 5 },
				'patient',
				'get',
				0
			);

			expect(context.executeFunctions).toBe(mockExecuteFunctions);
			expect(context.request.query).toBe('query { test }');
			expect(context.request.variables).toEqual({ limit: 5 });
			expect(context.request.metadata.resource).toBe('patient');
			expect(context.request.metadata.action).toBe('get');
			expect(context.request.metadata.itemIndex).toBe(0);
			expect(context.shared).toEqual({});
		});

		test('should create Semble pipeline', () => {
			const semblePipeline = MiddlewarePipelineUtils.createSemblePipeline(eventSystem);
			const middlewares = semblePipeline.getMiddlewares();

			expect(middlewares).toHaveLength(5);
			expect(middlewares[0].name).toBe('request-validation');
		});

		test('should execute simple request', async () => {
			const simplePipeline = new MiddlewarePipeline();
			const middleware: MiddlewareFunction = async (context, next) => {
				context.shared.executed = true;
				await next();
			};
			simplePipeline.register('simple', middleware);

			const result = await MiddlewarePipelineUtils.executeRequest(
				simplePipeline,
				mockExecuteFunctions,
				'query { test }',
				{},
				'patient',
				'get'
			);

			expect(result.success).toBe(true);
			expect(result.context.shared.executed).toBe(true);
		});
	});

	describe('Integration Scenarios', () => {
		test('should handle complex middleware chain with error recovery', async () => {
			const complexPipeline = new MiddlewarePipeline(eventSystem);

			// Add logging middleware
			complexPipeline.register('logger', async (context, next) => {
				context.shared.logs = context.shared.logs || [];
				context.shared.logs.push('request-started');
				await next();
				context.shared.logs.push('request-completed');
			}, 5);

			// Add authentication
			complexPipeline.register('auth', async (context, next) => {
				if (!context.executeFunctions) {
					throw new SembleError('No execution context', 'AUTH_ERROR');
				}
				context.shared.authenticated = true;
				await next();
			}, 10);

			// Add caching
			complexPipeline.register('cache', async (context, next) => {
				context.shared.fromCache = false;
				await next();
				context.shared.cached = true;
			}, 20);

			// Add API call simulation
			complexPipeline.register('api', async (context, next) => {
				context.response = {
					data: { result: 'success' },
					metadata: { cached: context.shared.fromCache }
				};
				await next();
			}, 30);

			const context = MiddlewarePipelineUtils.createContext(
				mockExecuteFunctions,
				'query { patients }',
				{},
				'patient',
				'getMany'
			);

			const result = await complexPipeline.execute(context);

			expect(result.success).toBe(true);
			expect(result.context.shared.logs).toEqual(['request-started', 'request-completed']);
			expect(result.context.shared.authenticated).toBe(true);
			expect(result.context.shared.cached).toBe(true);
			expect(result.context.response?.data.result).toBe('success');
		});

		test('should demonstrate pipeline performance monitoring', async () => {
			const monitoringPipeline = new MiddlewarePipeline(eventSystem);
			const performanceData: any[] = [];

			// Add performance monitoring
			eventSystem.on('pipeline:started', (event) => {
				performanceData.push({ type: 'started', timestamp: event.timestamp });
			});

			eventSystem.on('pipeline:completed', (event) => {
				performanceData.push({ 
					type: 'completed', 
					timestamp: event.timestamp,
					executionTime: (event as any).executionTime
				});
			});

			const simpleMiddleware: MiddlewareFunction = async (context, next) => {
				await new Promise(resolve => setTimeout(resolve, 50));
				await next();
			};

			monitoringPipeline.register('timed', simpleMiddleware);

			const context = MiddlewarePipelineUtils.createContext(
				mockExecuteFunctions,
				'query { test }',
				{},
				'patient',
				'get'
			);

			const result = await monitoringPipeline.execute(context, { emitEvents: true });

			expect(result.success).toBe(true);
			expect(performanceData).toHaveLength(2);
			expect(performanceData[0].type).toBe('started');
			expect(performanceData[1].type).toBe('completed');
			expect(performanceData[1].executionTime).toBeGreaterThan(40);
		});
	});
});
