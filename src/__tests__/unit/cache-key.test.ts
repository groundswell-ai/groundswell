/**
 * Unit tests for cache key generation
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  deterministicStringify,
  generateCacheKey,
  getSchemaHash,
} from '../../cache/cache-key.js';

describe('deterministicStringify', () => {
  it('should produce same output for same object regardless of key order', () => {
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };

    expect(deterministicStringify(obj1)).toBe(deterministicStringify(obj2));
  });

  it('should handle primitives correctly', () => {
    expect(deterministicStringify(null)).toBe('null');
    expect(deterministicStringify(undefined)).toBe('undefined');
    expect(deterministicStringify(true)).toBe('true');
    expect(deterministicStringify(false)).toBe('false');
    expect(deterministicStringify(42)).toBe('42');
    expect(deterministicStringify('hello')).toBe('"hello"');
  });

  it('should handle arrays correctly', () => {
    expect(deterministicStringify([1, 2, 3])).toBe('[1,2,3]');
    expect(deterministicStringify(['a', 'b'])).toBe('["a","b"]');
  });

  it('should handle nested objects with sorted keys', () => {
    const obj = { z: { b: 2, a: 1 }, y: [3, 2, 1] };
    const result = deterministicStringify(obj);

    // Keys should be sorted: y before z, a before b
    expect(result).toBe('{"y":[3,2,1],"z":{"a":1,"b":2}}');
  });

  it('should throw on circular references', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;

    expect(() => deterministicStringify(obj)).toThrow(
      'Converting circular structure to JSON'
    );
  });

  it('should handle Date objects', () => {
    const date = new Date('2024-01-15T10:30:00.000Z');
    const result = deterministicStringify(date);

    expect(result).toBe('"2024-01-15T10:30:00.000Z"');
  });

  it('should handle Map objects', () => {
    const map = new Map([
      ['z', 1],
      ['a', 2],
    ]);
    const result = deterministicStringify(map);

    // Keys should be sorted in the output
    expect(result).toContain('Map{');
    expect(result).toContain('"a"');
    expect(result).toContain('"z"');
  });

  it('should handle Set objects', () => {
    const set = new Set([3, 1, 2]);
    const result = deterministicStringify(set);

    expect(result).toContain('Set{');
  });
});

describe('getSchemaHash', () => {
  it('should produce consistent hash for same schema', () => {
    const schema1 = z.object({ name: z.string() });
    const schema2 = z.object({ name: z.string() });

    expect(getSchemaHash(schema1)).toBe(getSchemaHash(schema2));
  });

  it('should produce different hashes for different schemas', () => {
    const schema1 = z.object({ name: z.string() });
    const schema2 = z.object({ age: z.number() });

    expect(getSchemaHash(schema1)).not.toBe(getSchemaHash(schema2));
  });

  it('should handle undefined schema', () => {
    expect(getSchemaHash(undefined)).toBe('no-schema');
  });

  it('should produce 64-character hex string', () => {
    const schema = z.object({ value: z.number() });
    const hash = getSchemaHash(schema);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('generateCacheKey', () => {
  it('should produce same key for identical inputs', () => {
    const inputs1 = {
      user: 'Hello',
      model: 'claude-sonnet-4-20250514',
      data: { value: 42 },
    };
    const inputs2 = {
      user: 'Hello',
      model: 'claude-sonnet-4-20250514',
      data: { value: 42 },
    };

    expect(generateCacheKey(inputs1)).toBe(generateCacheKey(inputs2));
  });

  it('should produce different keys for different inputs', () => {
    const inputs1 = {
      user: 'Hello',
      model: 'claude-sonnet-4-20250514',
    };
    const inputs2 = {
      user: 'Goodbye',
      model: 'claude-sonnet-4-20250514',
    };

    expect(generateCacheKey(inputs1)).not.toBe(generateCacheKey(inputs2));
  });

  it('should produce 64-character hex string', () => {
    const key = generateCacheKey({
      user: 'Test',
      model: 'claude-sonnet-4-20250514',
    });

    expect(key).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should include tools in key generation (sorted)', () => {
    const toolSchema = { type: 'object' as const, properties: {}, required: [] };
    const inputs1 = {
      user: 'Hello',
      model: 'claude-sonnet-4-20250514',
      tools: [
        { name: 'tool_b', description: 'B', input_schema: toolSchema },
        { name: 'tool_a', description: 'A', input_schema: toolSchema },
      ],
    };
    const inputs2 = {
      user: 'Hello',
      model: 'claude-sonnet-4-20250514',
      tools: [
        { name: 'tool_a', description: 'A', input_schema: toolSchema },
        { name: 'tool_b', description: 'B', input_schema: toolSchema },
      ],
    };

    // Same tools in different order should produce same key
    expect(generateCacheKey(inputs1)).toBe(generateCacheKey(inputs2));
  });

  it('should include schema hash in key', () => {
    const schema = z.object({ result: z.string() });
    const inputs1 = {
      user: 'Hello',
      model: 'claude-sonnet-4-20250514',
      responseFormat: schema,
    };
    const inputs2 = {
      user: 'Hello',
      model: 'claude-sonnet-4-20250514',
    };

    expect(generateCacheKey(inputs1)).not.toBe(generateCacheKey(inputs2));
  });
});

describe('cache key isolation — harness + provider (PRD §7.14.5)', () => {
  const base = { user: 'Hello', model: 'claude-sonnet-4-20250514' };

  it('produces different keys for different harnesses (same model)', () => {
    const pi = generateCacheKey({ ...base, harness: 'pi' });
    const cc = generateCacheKey({ ...base, harness: 'claude-code' });
    expect(pi).not.toBe(cc);
    expect(pi).toMatch(/^[a-f0-9]{64}$/);
    expect(cc).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces different keys for different providers (same harness + model)', () => {
    const anthropic = generateCacheKey({ ...base, harness: 'pi', provider: 'anthropic' });
    const openai    = generateCacheKey({ ...base, harness: 'pi', provider: 'openai' });
    expect(anthropic).not.toBe(openai);
  });

  it('produces distinct keys per (harness, provider, model) tuple', () => {
    const keys = new Set<string>([
      generateCacheKey({ ...base, harness: 'pi',          provider: 'anthropic' }),
      generateCacheKey({ ...base, harness: 'pi',          provider: 'openai' }),
      generateCacheKey({ ...base, harness: 'claude-code', provider: 'anthropic' }),
      generateCacheKey({ ...base, harness: 'claude-code', provider: 'openai' }),
      generateCacheKey({ ...base, model: 'gpt-4o', harness: 'pi', provider: 'openai' }),
    ]);
    expect(keys.size).toBe(5);   // all 5 tuples distinct
  });

  it('produces the same key when harness + provider are identical', () => {
    const a = generateCacheKey({ ...base, harness: 'pi', provider: 'anthropic' });
    const b = generateCacheKey({ ...base, harness: 'pi', provider: 'anthropic' });
    expect(a).toBe(b);
  });

  it('participates: omitting harness yields a different key than providing it', () => {
    const without = generateCacheKey({ ...base });
    const withPi  = generateCacheKey({ ...base, harness: 'pi' });
    expect(without).not.toBe(withPi);   // proves harness actually feeds the digest
  });

  it('participates: omitting provider yields a different key than providing it', () => {
    const without = generateCacheKey({ ...base, harness: 'pi' });
    const withP   = generateCacheKey({ ...base, harness: 'pi', provider: 'anthropic' });
    expect(without).not.toBe(withP);
  });

  it('accepts open-set provider strings (e.g. zai, google, custom)', () => {
    const zai     = generateCacheKey({ ...base, harness: 'pi', provider: 'zai' });
    const google  = generateCacheKey({ ...base, harness: 'pi', provider: 'google' });
    const custom  = generateCacheKey({ ...base, harness: 'pi', provider: 'my-self-hosted' });
    const set = new Set([zai, google, custom]);
    expect(set.size).toBe(3);   // open-set ModelProviderId — all distinct
  });

  it('is unaffected by other-field ordering (deterministic via key sort)', () => {
    // harness/provider declared in opposite order + data interleaved — must stay equal
    const a = generateCacheKey({ user: 'Hi', model: 'm', harness: 'pi', provider: 'anthropic', data: { x: 1 } });
    const b = generateCacheKey({ data: { x: 1 }, provider: 'anthropic', model: 'm', harness: 'pi', user: 'Hi' });
    expect(a).toBe(b);
  });

  it('backward-compat: omitting both harness + provider preserves the pre-task key shape', () => {
    // Same call shape as the existing 'identical inputs' test — must still be a valid 64-hex key
    // and equal to another identical omission (zero behavioral regression for agent.ts today).
    const a = generateCacheKey({ user: 'Hello', model: 'claude-sonnet-4-20250514' });
    const b = generateCacheKey({ user: 'Hello', model: 'claude-sonnet-4-20250514' });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
