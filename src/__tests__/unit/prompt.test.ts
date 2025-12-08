import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Prompt } from '../../core/prompt.js';

describe('Prompt', () => {
  it('should create with unique id', () => {
    const p1 = new Prompt({
      user: 'Test',
      responseFormat: z.object({ message: z.string() }),
    });
    const p2 = new Prompt({
      user: 'Test',
      responseFormat: z.object({ message: z.string() }),
    });
    expect(p1.id).not.toBe(p2.id);
  });

  it('should store user message and data', () => {
    const prompt = new Prompt({
      user: 'Hello world',
      data: { key: 'value' },
      responseFormat: z.object({ result: z.string() }),
    });

    expect(prompt.user).toBe('Hello world');
    expect(prompt.data).toEqual({ key: 'value' });
  });

  it('should validate response successfully', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const prompt = new Prompt({
      user: 'Get person',
      responseFormat: schema,
    });

    const result = prompt.validateResponse({ name: 'John', age: 30 });
    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('should throw on invalid response', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const prompt = new Prompt({
      user: 'Get person',
      responseFormat: schema,
    });

    expect(() => prompt.validateResponse({ name: 'John' })).toThrow();
  });

  it('should safely validate response', () => {
    const schema = z.object({ value: z.number() });
    const prompt = new Prompt({
      user: 'Test',
      responseFormat: schema,
    });

    const success = prompt.safeValidateResponse({ value: 42 });
    expect(success.success).toBe(true);
    if (success.success) {
      expect(success.data).toEqual({ value: 42 });
    }

    const failure = prompt.safeValidateResponse({ value: 'not a number' });
    expect(failure.success).toBe(false);
  });

  it('should build user message without data', () => {
    const prompt = new Prompt({
      user: 'Simple message',
      responseFormat: z.string(),
    });

    expect(prompt.buildUserMessage()).toBe('Simple message');
  });

  it('should build user message with data', () => {
    const prompt = new Prompt({
      user: 'Message with data',
      data: { items: ['a', 'b', 'c'] },
      responseFormat: z.string(),
    });

    const message = prompt.buildUserMessage();
    expect(message).toContain('Message with data');
    expect(message).toContain('<items>');
    expect(message).toContain('</items>');
  });

  it('should create new prompt with updated data', () => {
    const original = new Prompt({
      user: 'Test',
      data: { a: 1 },
      responseFormat: z.string(),
    });

    const updated = original.withData({ b: 2 });

    expect(original.data).toEqual({ a: 1 });
    expect(updated.data).toEqual({ a: 1, b: 2 });
    expect(original.id).not.toBe(updated.id);
  });

  it('should store override fields', () => {
    const prompt = new Prompt({
      user: 'Test',
      responseFormat: z.string(),
      system: 'Custom system prompt',
      tools: [{ name: 'test', description: 'Test tool', input_schema: { type: 'object', properties: {} } }],
      enableReflection: true,
    });

    expect(prompt.systemOverride).toBe('Custom system prompt');
    expect(prompt.toolsOverride).toHaveLength(1);
    expect(prompt.enableReflection).toBe(true);
  });

  it('should be immutable', () => {
    const prompt = new Prompt({
      user: 'Test',
      data: { key: 'value' },
      responseFormat: z.string(),
    });

    expect(Object.isFrozen(prompt)).toBe(true);
    expect(Object.isFrozen(prompt.data)).toBe(true);
  });
});
