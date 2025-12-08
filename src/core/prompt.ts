/**
 * Prompt<T> - Immutable type-safe prompt definition
 *
 * Prompts define what to send to an agent and how to validate the response.
 * They are value objects - immutable and reusable across agents and workflows.
 */

import type { z } from 'zod';
import type {
  PromptConfig,
  Tool,
  MCPServer,
  Skill,
  AgentHooks,
} from '../types/index.js';
import { generateId } from '../utils/id.js';

/**
 * Prompt class - immutable definition of a single agent call
 * @template T The expected response type (validated via Zod schema)
 */
export class Prompt<T> {
  /** Unique identifier for this prompt instance */
  public readonly id: string;

  /** User message content */
  public readonly user: string;

  /** Structured data to inject into the prompt */
  public readonly data: Record<string, unknown>;

  /** Zod schema defining the expected response format */
  public readonly responseFormat: z.ZodType<T>;

  /** System prompt override (takes precedence over agent config) */
  public readonly systemOverride?: string;

  /** Tools override */
  public readonly toolsOverride?: Tool[];

  /** MCPs override */
  public readonly mcpsOverride?: MCPServer[];

  /** Skills override */
  public readonly skillsOverride?: Skill[];

  /** Hooks override */
  public readonly hooksOverride?: AgentHooks;

  /** Enable reflection for this specific prompt */
  public readonly enableReflection?: boolean;

  /**
   * Create a new Prompt instance
   * @param config Prompt configuration
   */
  constructor(config: PromptConfig<T>) {
    this.id = generateId();
    this.user = config.user;
    this.data = config.data ?? {};
    this.responseFormat = config.responseFormat;
    this.systemOverride = config.system;
    this.toolsOverride = config.tools;
    this.mcpsOverride = config.mcps;
    this.skillsOverride = config.skills;
    this.hooksOverride = config.hooks;
    this.enableReflection = config.enableReflection;

    // Freeze to ensure immutability
    Object.freeze(this);
    Object.freeze(this.data);
  }

  /**
   * Validate a response against the response format schema
   * @param data Unknown data to validate
   * @returns Typed validated data
   * @throws ZodError if validation fails
   */
  public validateResponse(data: unknown): T {
    return this.responseFormat.parse(data);
  }

  /**
   * Safely validate response without throwing
   * @param data Unknown data to validate
   * @returns Result object with success flag and data or error
   */
  public safeValidateResponse(
    data: unknown
  ): { success: true; data: T } | { success: false; error: z.ZodError } {
    const result = this.responseFormat.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
  }

  /**
   * Build the full user message including any injected data
   * @returns Formatted user message
   */
  public buildUserMessage(): string {
    if (Object.keys(this.data).length === 0) {
      return this.user;
    }

    // Format data as a structured section
    const dataSection = Object.entries(this.data)
      .map(([key, value]) => `<${key}>\n${JSON.stringify(value, null, 2)}\n</${key}>`)
      .join('\n\n');

    return `${this.user}\n\n${dataSection}`;
  }

  /**
   * Create a new Prompt with updated data (immutable pattern)
   * @param newData Data to merge or replace
   * @returns New Prompt instance
   */
  public withData(newData: Record<string, unknown>): Prompt<T> {
    return new Prompt({
      user: this.user,
      data: { ...this.data, ...newData },
      responseFormat: this.responseFormat,
      system: this.systemOverride,
      tools: this.toolsOverride,
      mcps: this.mcpsOverride,
      skills: this.skillsOverride,
      hooks: this.hooksOverride,
      enableReflection: this.enableReflection,
    });
  }

  /**
   * Get the prompt data (used for cache key generation)
   * @returns The prompt data object
   */
  public getData(): Record<string, unknown> {
    return this.data;
  }

  /**
   * Get the response format schema (used for cache key generation)
   * @returns The Zod response format schema
   */
  public getResponseFormat(): z.ZodType<T> {
    return this.responseFormat;
  }
}
