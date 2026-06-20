import { Type, type TSchema } from "@sinclair/typebox";
import type { Tool } from "../types/sdk-primitives.js";

// Re-export so S2 imports converter + builders from ONE module.
export { Type } from "@sinclair/typebox";
export type { TSchema } from "@sinclair/typebox";

/**
 * Convert a Groundswell Tool JSON-Schema (`input_schema`) into a TypeBox `TSchema`
 * for Pi's `ToolDefinition.parameters` (PRD §7.10, §7.12, §7.14.1).
 *
 * **PURE function** — no I/O, no mocks, no definitions registry.
 * Parallel to `MCPHandler.jsonSchemaToZodRawShape()` (the Claude Code SDK path).
 *
 * Coverage (parity+ over the Zod converter on every arm):
 *   - object (required/optional via `Type.Optional`, nested, open → `Type.Record`)
 *   - string / number / integer (distinct) / boolean
 *   - array (items recursive; no items → `Type.Unknown`)
 *   - enum → `Type.Union(values.map(Type.Literal))`   [JSON-Schema array, NOT `Type.Enum`'s Record]
 *   - $ref  → `Type.Any()`   [permissive; no registry in S1; S2+ may extend]
 *   - unknown/missing type → `Type.Unknown()`
 *
 * @param schema - `Tool['input_schema']` (top-level always an object) or a nested JSON-Schema fragment.
 * @returns A TypeBox `TSchema` assignable to `ToolDefinition.parameters`.
 */
export function jsonSchemaToTypebox(
  schema: Tool["input_schema"] | Record<string, unknown>,
): TSchema {
  const s = schema as Record<string, unknown>;

  // Defensive: top-level must be an object.
  if (s.type !== "object") {
    return Type.Unknown();
  }

  const properties = (s.properties ?? {}) as Record<string, Record<string, unknown>>;
  const requiredSet = new Set((s.required ?? []) as string[]);

  // Property-less object → open record (parity with `z.record(z.unknown())`); NOT `Type.Object({})`.
  if (Object.keys(properties).length === 0) {
    return Type.Record(Type.String(), Type.Any());
  }

  // Build each property's schema, then apply optionality to non-required values.
  const props: Record<string, TSchema> = {};
  for (const [key, value] of Object.entries(properties)) {
    const converted = propertyToTypebox(value);
    props[key] = requiredSet.has(key) ? converted : Type.Optional(converted);
  }
  return Type.Object(props);
}

/**
 * Convert a single JSON-Schema property/fragment to a TypeBox `TSchema` (recursive).
 * Mirrors `MCPHandler.jsonSchemaPropertyToZod` (mcp-handler.ts L266-308), + enum + $ref arms.
 */
function propertyToTypebox(prop: Record<string, unknown>): TSchema {
  // $ref → permissive Any (S1 has no registry; parity with Zod default arm). Check FIRST.
  if (typeof prop.$ref === "string") {
    return Type.Any();
  }

  // enum (array) → Union of Literals (`Type.Enum` takes a Record, not an array). Check BEFORE type.
  // NOTE: JSON-Schema allows `null` in enum values but TypeBox `TLiteralValue` excludes null;
  // those entries are silently skipped (permissive — never rejects valid LLM args).
  if (Array.isArray(prop.enum) && prop.enum.length > 0) {
    const literals = (prop.enum as unknown[])
      .filter((v) => v !== null)
      .map((v) => Type.Literal(v as string | number | boolean));
    return literals.length === 1 ? literals[0] : Type.Union(literals);
  }

  switch (prop.type) {
    case "string":
      return Type.String();
    case "number":
      return Type.Number();
    case "integer":
      return Type.Integer(); // parity+ (Zod collapses int→number; TypeBox keeps distinct)
    case "boolean":
      return Type.Boolean();
    case "array":
      return Type.Array(
        prop.items
          ? propertyToTypebox(prop.items as Record<string, unknown>)
          : Type.Unknown(),
      );
    case "object":
      // Delegate back to the public entry (handles nested required/optional + open-record).
      return jsonSchemaToTypebox(prop);
    default:
      // unknown type, type arrays (e.g. ["string","null"]), missing type → permissive Unknown.
      return Type.Unknown();
  }
}
