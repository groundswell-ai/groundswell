/**
 * Cache Key Generation - Deterministic key generation for LLM response caching
 *
 * Uses SHA-256 hashing with deterministic JSON serialization to ensure
 * identical inputs always produce identical cache keys.
 */

import { createHash } from 'node:crypto';
import type { Tool, MCPServer, Skill } from '../types/index.js';
import type { z } from 'zod';

/**
 * Inputs used to generate a cache key
 */
export interface CacheKeyInputs {
  /** User message content */
  user: string;
  /** Data passed to the prompt */
  data?: Record<string, unknown>;
  /** System prompt */
  system?: string;
  /** Model identifier */
  model: string;
  /** Temperature setting */
  temperature?: number;
  /** Maximum tokens */
  maxTokens?: number;
  /** Tools available to the agent */
  tools?: Tool[];
  /** MCP servers */
  mcps?: MCPServer[];
  /** Skills */
  skills?: Skill[];
  /** Zod response format schema */
  responseFormat?: z.ZodType;
}

/**
 * Deterministically stringify a value with sorted object keys
 *
 * Unlike JSON.stringify, this function guarantees consistent output
 * regardless of key insertion order by sorting all object keys.
 *
 * @param value - Value to stringify
 * @returns Deterministic JSON string
 * @throws TypeError if circular reference detected
 */
export function deterministicStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  function stringify(val: unknown): string {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'string') return JSON.stringify(val);
    if (typeof val === 'number') {
      if (Number.isNaN(val)) return 'NaN';
      if (!Number.isFinite(val)) return val > 0 ? 'Infinity' : '-Infinity';
      return String(val);
    }
    if (typeof val === 'boolean') return String(val);
    if (typeof val === 'function') return 'function';
    if (typeof val === 'symbol') return 'symbol';
    if (typeof val === 'bigint') return `${val}n`;

    if (typeof val === 'object') {
      if (seen.has(val as object)) {
        throw new TypeError('Converting circular structure to JSON');
      }
      seen.add(val as object);

      let result: string;

      if (Array.isArray(val)) {
        result = '[' + val.map(stringify).join(',') + ']';
      } else if (val instanceof Date) {
        result = JSON.stringify(val.toISOString());
      } else if (val instanceof Map) {
        const entries = Array.from(val.entries())
          .sort(([a], [b]) => String(a).localeCompare(String(b)))
          .map(([k, v]) => `[${stringify(k)},${stringify(v)}]`);
        result = `Map{${entries.join(',')}}`;
      } else if (val instanceof Set) {
        const values = Array.from(val)
          .map(stringify)
          .sort();
        result = `Set{${values.join(',')}}`;
      } else {
        // Regular object - sort keys
        const keys = Object.keys(val as Record<string, unknown>).sort();
        const pairs = keys.map(
          (k) =>
            JSON.stringify(k) +
            ':' +
            stringify((val as Record<string, unknown>)[k])
        );
        result = '{' + pairs.join(',') + '}';
      }

      seen.delete(val as object);
      return result;
    }

    return String(val);
  }

  return stringify(value);
}

/**
 * Generate a hash from a Zod schema's internal definition
 *
 * Zod schemas are functions that cannot be directly serialized.
 * This extracts the schema's _def property which contains the
 * schema structure and hashes it.
 *
 * @param schema - Zod schema to hash
 * @returns SHA-256 hex digest of the schema definition
 */
export function getSchemaHash(schema: z.ZodType | undefined): string {
  if (!schema) {
    return 'no-schema';
  }

  try {
    // Access Zod's internal _def property
    const def = (schema as { _def?: unknown })._def;
    if (!def) {
      return 'unknown-schema';
    }

    // Create a simplified representation of the schema
    const schemaRep = extractSchemaStructure(def);
    const serialized = deterministicStringify(schemaRep);

    return createHash('sha256').update(serialized, 'utf8').digest('hex');
  } catch {
    // Fallback for schemas that can't be introspected
    return 'fallback-schema';
  }
}

/**
 * Extract a serializable structure from a Zod schema definition
 */
function extractSchemaStructure(def: unknown): unknown {
  if (def === null || def === undefined) {
    return def;
  }

  if (typeof def !== 'object') {
    return def;
  }

  const typedDef = def as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  // Extract key properties that define schema structure
  if ('typeName' in typedDef) {
    result.typeName = typedDef.typeName;
  }

  if ('shape' in typedDef && typeof typedDef.shape === 'function') {
    // Object schema - extract shape
    try {
      const shape = typedDef.shape() as Record<string, { _def?: unknown }>;
      result.shape = Object.fromEntries(
        Object.entries(shape).map(([key, value]) => [
          key,
          extractSchemaStructure(value?._def),
        ])
      );
    } catch {
      result.shape = 'complex-shape';
    }
  }

  if ('type' in typedDef && typedDef.type && typeof typedDef.type === 'object') {
    result.type = extractSchemaStructure((typedDef.type as { _def?: unknown })._def);
  }

  if ('values' in typedDef) {
    result.values = typedDef.values;
  }

  if ('checks' in typedDef && Array.isArray(typedDef.checks)) {
    result.checks = typedDef.checks.map((check: { kind?: string }) => check.kind);
  }

  return result;
}

/**
 * Generate a deterministic cache key from prompt execution inputs
 *
 * The key is a 64-character SHA-256 hex digest that uniquely identifies
 * a specific combination of prompt, data, configuration, and tools.
 *
 * @param inputs - Cache key inputs
 * @returns 64-character hex SHA-256 digest
 */
export function generateCacheKey(inputs: CacheKeyInputs): string {
  // Build normalized representation with sorted arrays
  const normalized: Record<string, unknown> = {
    user: inputs.user,
    model: inputs.model,
  };

  // Include optional fields only if defined
  if (inputs.data !== undefined) {
    normalized.data = inputs.data;
  }

  if (inputs.system !== undefined) {
    normalized.system = inputs.system;
  }

  if (inputs.temperature !== undefined) {
    normalized.temperature = inputs.temperature;
  }

  if (inputs.maxTokens !== undefined) {
    normalized.maxTokens = inputs.maxTokens;
  }

  // Sort tool/mcp/skill names for determinism
  if (inputs.tools && inputs.tools.length > 0) {
    normalized.tools = inputs.tools.map((t) => t.name).sort();
  }

  if (inputs.mcps && inputs.mcps.length > 0) {
    normalized.mcps = inputs.mcps.map((m) => m.name).sort();
  }

  if (inputs.skills && inputs.skills.length > 0) {
    normalized.skills = inputs.skills.map((s) => s.name).sort();
  }

  // Include schema hash
  normalized.schemaHash = getSchemaHash(inputs.responseFormat);

  // Generate SHA-256 hash
  const serialized = deterministicStringify(normalized);
  return createHash('sha256').update(serialized, 'utf8').digest('hex');
}
