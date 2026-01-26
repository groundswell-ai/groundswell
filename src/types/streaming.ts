/**
 * Streaming types for LLM streaming responses
 *
 * Provides types and utilities for streaming responses from LLM providers.
 * Uses TypeScript's built-in AsyncGenerator for efficient streaming.
 */

import type { AgentResponse } from './agent.js';

/**
 * Stream event types for LLM streaming responses
 *
 * Discriminated union for type-safe event handling during streaming.
 * Each event type has a unique `type` field for TypeScript narrowing.
 *
 * @example
 * ```ts
 * for await (const event of streamResult.stream) {
 *   switch (event.type) {
 *     case 'text_delta':
 *       console.log(event.delta); // Type-safe access to delta
 *       break;
 *     case 'tool_call_start':
 *       console.log(event.name); // Type-safe access to name
 *       break;
 *   }
 * }
 * ```
 */
export type StreamEvent =
  // Text content events
  | { type: 'text_delta'; delta: string; index: number }
  | { type: 'text_done'; text: string; index: number }

  // Tool/function call events
  | { type: 'tool_call_start'; id: string; name: string; index: number }
  | { type: 'tool_call_delta'; id: string; input: Record<string, unknown> }
  | { type: 'tool_call_done'; id: string; result: unknown }

  // Metadata events
  | { type: 'metadata'; metadata: { requestId?: string; model?: string; provider: string } }

  // Usage events
  | { type: 'usage'; inputTokens: number; outputTokens: number; cacheTokens?: number }

  // Completion events
  | { type: 'done'; finishReason: 'stop' | 'length' | 'tool_calls' | 'error' }

  // Error events
  | { type: 'error'; error: Error; code?: string; retryable?: boolean };

/**
 * AsyncStream interface for streaming responses
 *
 * Wraps AsyncGenerator with additional metadata and cancellation support.
 * Designed for for-await...of consumption.
 *
 * @template T - The type of the final response data (from AsyncGenerator return)
 *
 * @example
 * ```ts
 * const streamResult = agent.stream(prompt);
 *
 * for await (const event of streamResult.stream) {
 *   if (event.type === 'text_delta') {
 *     process.stdout.write(event.delta);
 *   }
 * }
 *
 * // Cancel stream if needed
 * streamResult.controller?.abort();
 * ```
 */
export interface AsyncStream<T> {
  /**
   * Async generator yielding stream events
   *
   * Consume with for await...of loop. The generator yields StreamEvent
   * objects and returns the final AgentResponse<T> when complete.
   *
   * @example
   * ```ts
   * for await (const event of streamResult.stream) {
   *   switch (event.type) {
   *     case 'text_delta':
   *       console.log(event.delta);
   *       break;
   *     case 'done':
   *       console.log('Complete!');
   *       break;
   *   }
   * }
   * ```
   */
  stream: AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;

  /**
   * Optional abort controller for cancellation
   *
   * Use to cancel an in-progress stream. The stream generator should
   * check controller.signal.aborted and yield an error event or break.
   *
   * @example
   * ```ts
   * let eventCount = 0;
   * for await (const event of streamResult.stream) {
   *   eventCount++;
   *   if (eventCount >= 10) {
   *     streamResult.controller?.abort();
   *     break;
   *   }
   * }
   * ```
   */
  controller?: AbortController;
}

/**
 * Type guard for text delta events
 *
 * Narrows StreamEvent to text_delta type for type-safe access.
 *
 * @param event - The stream event to check
 * @returns True if the event is a text_delta event
 *
 * @example
 * ```ts
 * if (isTextDeltaEvent(event)) {
 *   console.log(event.delta); // TypeScript knows delta exists
 *   console.log(event.index); // TypeScript knows index exists
 * }
 * ```
 */
export function isTextDeltaEvent(event: StreamEvent): event is Extract<StreamEvent, { type: 'text_delta' }> {
  return event.type === 'text_delta';
}

/**
 * Type guard for tool call events
 *
 * Narrows StreamEvent to any tool call event type for type-safe access.
 *
 * @param event - The stream event to check
 * @returns True if the event is a tool_call_start, tool_call_delta, or tool_call_done event
 *
 * @example
 * ```ts
 * if (isToolCallEvent(event)) {
 *   if (event.type === 'tool_call_start') {
 *     console.log(event.name); // TypeScript knows name exists
 *   }
 * }
 * ```
 */
export function isToolCallEvent(event: StreamEvent): event is Extract<StreamEvent, { type: 'tool_call_start' | 'tool_call_delta' | 'tool_call_done' }> {
  return event.type === 'tool_call_start' || event.type === 'tool_call_delta' || event.type === 'tool_call_done';
}

/**
 * Type guard for error events
 *
 * Narrows StreamEvent to error type for type-safe access.
 *
 * @param event - The stream event to check
 * @returns True if the event is an error event
 *
 * @example
 * ```ts
 * if (isErrorEvent(event)) {
 *   console.error(event.error.message); // TypeScript knows error exists
 *   if (event.retryable) {
 *     // Retry logic
 *   }
 * }
 * ```
 */
export function isErrorEvent(event: StreamEvent): event is Extract<StreamEvent, { type: 'error' }> {
  return event.type === 'error';
}
