import { describe, it, expect } from "vitest";
import { jsonSchemaToTypebox } from "../../../harnesses/pi-schema-converter.js";
import { TypeGuard } from "@sinclair/typebox";

// ---------------------------------------------------------------------------
// Representative input_schema fixtures (from agent-tool-executor.test.ts L60-130
// plus additional shapes for full coverage).
// ---------------------------------------------------------------------------
const FIXTURES = {
  simpleString: {
    type: "object" as const,
    properties: {
      message: { type: "string" as const },
    },
    required: ["message"],
  },
  emptyProperties: {
    type: "object" as const,
    properties: {},
  },
  noProperties: {
    type: "object" as const,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function wrapProperty(prop: Record<string, unknown>) {
  return jsonSchemaToTypebox({
    type: "object",
    properties: { inner: prop },
    required: ["inner"],
  });
}

function getProp(out: unknown, key: string): unknown {
  return (out as any).properties[key];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("jsonSchemaToTypebox", () => {
  // --- Object: required + optional ---
  it("should convert object with required and optional properties", () => {
    const out = jsonSchemaToTypebox({
      type: "object",
      properties: { a: { type: "string" }, b: { type: "number" } },
      required: ["a"],
    }) as any;

    expect(TypeGuard.TObject(out)).toBe(true);
    expect(TypeGuard.TString(out.properties.a)).toBe(true);
    expect(TypeGuard.TNumber(out.properties.b)).toBe(true);
    expect(TypeGuard.TOptional(out.properties.b)).toBe(true);
  });

  // --- Nested object ---
  it("should handle nested objects recursively", () => {
    const out = jsonSchemaToTypebox({
      type: "object",
      properties: {
        inner: {
          type: "object",
          properties: { x: { type: "string" } },
          required: ["x"],
        },
      },
      required: ["inner"],
    }) as any;

    expect(TypeGuard.TObject(out)).toBe(true);
    expect(TypeGuard.TObject(out.properties.inner)).toBe(true);
    expect(TypeGuard.TString(out.properties.inner.properties.x)).toBe(true);
  });

  // --- String ---
  it("should convert string property", () => {
    const out = wrapProperty({ type: "string" }) as any;
    expect(TypeGuard.TString(getProp(out, "inner"))).toBe(true);
  });

  // --- Number ---
  it("should convert number property", () => {
    const out = wrapProperty({ type: "number" }) as any;
    expect(TypeGuard.TNumber(getProp(out, "inner"))).toBe(true);
  });

  // --- Integer (distinct from number — parity+) ---
  it("should convert integer property distinct from number", () => {
    const out = wrapProperty({ type: "integer" }) as any;
    const prop = getProp(out, "inner");
    expect(TypeGuard.TInteger(prop)).toBe(true);
    // TInteger is NOT TNumber in TypeBox
    expect(TypeGuard.TNumber(prop)).toBe(false);
  });

  // --- Boolean ---
  it("should convert boolean property", () => {
    const out = wrapProperty({ type: "boolean" }) as any;
    expect(TypeGuard.TBoolean(getProp(out, "inner"))).toBe(true);
  });

  // --- Array of strings ---
  it("should convert array with items", () => {
    const out = wrapProperty({ type: "array", items: { type: "string" } }) as any;
    const prop = getProp(out, "inner");
    expect(TypeGuard.TArray(prop)).toBe(true);
    expect(TypeGuard.TString(prop.items)).toBe(true);
  });

  // --- Array without items ---
  it("should convert array without items using Unknown", () => {
    const out = wrapProperty({ type: "array" }) as any;
    const prop = getProp(out, "inner");
    expect(TypeGuard.TArray(prop)).toBe(true);
    expect(TypeGuard.TUnknown(prop.items)).toBe(true);
  });

  // --- Enum (string values) ---
  it("should convert enum to Union of Literals", () => {
    const out = wrapProperty({ type: "string", enum: ["fast", "slow"] }) as any;
    const prop = getProp(out, "inner");
    expect(TypeGuard.TUnion(prop)).toBe(true);
    expect(prop.anyOf.length).toBe(2);
    expect(TypeGuard.TLiteral(prop.anyOf[0])).toBe(true);
    expect((prop.anyOf[0] as any).const).toBe("fast");
  });

  // --- Enum (3 values) ---
  it("should convert enum with 3 values", () => {
    const out = wrapProperty({ type: "string", enum: ["a", "b", "c"] }) as any;
    const prop = getProp(out, "inner");
    expect(TypeGuard.TUnion(prop)).toBe(true);
    expect(prop.anyOf.length).toBe(3);
  });

  // --- Enum (mixed string + number) ---
  it("should handle mixed-type enum values", () => {
    const out = wrapProperty({ enum: ["a", 1] }) as any;
    const prop = getProp(out, "inner");
    expect(TypeGuard.TUnion(prop)).toBe(true);
    expect(prop.anyOf.length).toBe(2);
    expect((prop.anyOf[0] as any).const).toBe("a");
    expect((prop.anyOf[1] as any).const).toBe(1);
  });

  // --- $ref → Type.Any ---
  it("should convert $ref to Type.Any without throwing", () => {
    const out = wrapProperty({ $ref: "#/definitions/Foo" }) as any;
    const prop = getProp(out, "inner");
    expect(TypeGuard.TAny(prop)).toBe(true);
  });

  // --- Unknown type → Type.Unknown ---
  it("should convert unknown type to Type.Unknown", () => {
    const out = wrapProperty({ type: "foobar" }) as any;
    const prop = getProp(out, "inner");
    expect(TypeGuard.TUnknown(prop)).toBe(true);
  });

  // --- Missing type → Type.Unknown ---
  it("should convert missing type to Type.Unknown", () => {
    const out = wrapProperty({}) as any;
    const prop = getProp(out, "inner");
    expect(TypeGuard.TUnknown(prop)).toBe(true);
  });

  // --- Property-less object → Type.Record ---
  it("should convert property-less object to open Record", () => {
    const out = jsonSchemaToTypebox(FIXTURES.noProperties);
    expect(TypeGuard.TRecord(out)).toBe(true);
  });

  // --- Empty properties object → Record ---
  it("should convert object with empty properties to open Record", () => {
    const out = jsonSchemaToTypebox(FIXTURES.emptyProperties);
    expect(TypeGuard.TRecord(out)).toBe(true);
  });

  // --- Parity smoke: agent-tool-executor fixtures ---
  it("parity smoke: converts representative input_schema fixtures without throwing", () => {
    const out = jsonSchemaToTypebox(FIXTURES.simpleString);
    expect(TypeGuard.TObject(out)).toBe(true);
    expect(TypeGuard.TString((out as any).properties.message)).toBe(true);
  });

  // --- Purity / determinism ---
  it("should be pure and deterministic", () => {
    const schema = {
      type: "object" as const,
      properties: {
        name: { type: "string" as const },
        count: { type: "integer" as const },
        tags: { type: "array" as const, items: { type: "string" as const } },
      },
      required: ["name"] as string[],
    };

    const out1 = jsonSchemaToTypebox(schema);
    const out2 = jsonSchemaToTypebox(schema);

    expect(JSON.stringify(out1)).toBe(JSON.stringify(out2));
  });

  // --- Non-object top-level → Type.Unknown ---
  it("should return Type.Unknown for non-object top-level schema", () => {
    const out = jsonSchemaToTypebox({ type: "string" } as any);
    expect(TypeGuard.TUnknown(out)).toBe(true);
  });

  // --- All required properties (no optional wrapping) ---
  it("should not wrap properties when all are required", () => {
    const out = jsonSchemaToTypebox({
      type: "object",
      properties: { a: { type: "string" }, b: { type: "boolean" } },
      required: ["a", "b"],
    }) as any;

    expect(TypeGuard.TObject(out)).toBe(true);
    expect(TypeGuard.TOptional(out.properties.a)).toBe(false);
    expect(TypeGuard.TOptional(out.properties.b)).toBe(false);
  });

  // --- All properties optional (empty required) ---
  it("should wrap all properties as optional when required is empty", () => {
    const out = jsonSchemaToTypebox({
      type: "object",
      properties: { a: { type: "string" }, b: { type: "number" } },
      required: [],
    }) as any;

    expect(TypeGuard.TOptional(out.properties.a)).toBe(true);
    expect(TypeGuard.TOptional(out.properties.b)).toBe(true);
  });

  // --- No required field at all ---
  it("should treat all properties as optional when required is absent", () => {
    const out = jsonSchemaToTypebox({
      type: "object",
      properties: { x: { type: "boolean" } },
    }) as any;

    expect(TypeGuard.TOptional(out.properties.x)).toBe(true);
  });
});
