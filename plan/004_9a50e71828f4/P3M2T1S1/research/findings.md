# Research Findings — P3.M2.T1.S1 (Add harness/harnessOptions to AgentConfig)

## CRITICAL FINDING — the bulk of this work item is ALREADY DONE

`src/types/agent.ts` was modified by the **preceding** work item **P3.M1.T1.S1** ("Agent constructor
harness resolution", status: **Complete**). That item's PRP contained an explicit **Decision 5 —
Conditionally ADD `harness`/`harnessOptions` to `AgentConfig` (P3.M2.T1.S1 is "Planned")**, which gated
the field additions behind a pre-flight grep. The pre-flight found the fields ABSENT, so P3.M1.T1.S1
**added them**.

### Verified current state of `src/types/agent.ts` `AgentConfig` (interface L15–149)

| Line | Field / import | Status | Notes |
|------|----------------|--------|-------|
| 9    | `import type { HarnessId, HarnessOptions } from './harnesses.js';` | ✅ PRESENT | canonical import already present (Provider* aliases still resolve via providers.ts shim) |
| 55   | `model?: string;` | ✅ PRESENT | PRD §7.9 `model?: string` satisfied |
| 98   | `harness?: HarnessId;` | ✅ PRESENT | JSDoc: "Harness to use (inherits from global; default 'pi'). PRD §7.9." |
| 101  | `harnessOptions?: HarnessOptions;` | ✅ PRESENT | JSDoc: "Harness-specific options. PRD §7.9." |
| 108  | `provider?: ProviderId;` | ⚠️ PARTIAL | has `@deprecated Use \`harness\` instead.` — but contract wants migration JSDoc "use harness/harnessOptions" (BEFORE/AFTER convention) |
| 148  | `providerOptions?: ProviderOptions;` | ❌ MISSING `@deprecated` | extensive JSDoc but NO `@deprecated` tag at all |

`grep -c "@deprecated" src/types/agent.ts` → **1** (only the `provider` field).

## REMAINING contract work for THIS task (P3.M2.T1.S1)

1. **Enhance `provider?` deprecation** → full migration JSDoc per the codebase convention
   (see `src/types/providers.ts` `ProviderOptions`/`GlobalProviderConfig` @deprecated blocks: `@deprecated
   Since vX. Use {@link ...}` + note + BEFORE/AFTER code block), referencing "use harness/harnessOptions".
2. **Add `@deprecated` + migration JSDoc to `providerOptions?`** → "use `harnessOptions`".
3. **Defensive VERIFY** (pre-flight grep) that harness/harnessOptions/model/import are present; if absent
   (should not happen), add per spec — mirroring P3.M1.T1.S1's conditional guard so the two items are
   idempotent / zero-conflict.
4. **ADD a type-validation test** `src/__tests__/unit/agent-config-types.test.ts` mirroring
   `src/__tests__/unit/harnesses-types.test.ts` (runtime value assertions + type-annotated literals),
   asserting the AgentConfig surface + backward compat (legacy provider/providerOptions still accepted).

## Out of scope (other work items own these)

- **`PromptOverrides`** (src/types/agent.ts L155–241) — has its OWN harness/harnessOptions (L193, 196) +
  provider/providerOptions (L215, 240). Owned by **P3.M2.T2.S1** ("PromptOverrides harness fields"). DO NOT TOUCH.
- **`src/core/agent.ts`** — Agent runtime; owned by P3.M1.* (P3.M1.T2.S3 modifies it in PARALLEL —
  cache-key build-site only; ZERO file overlap with this task since we only edit `src/types/agent.ts`).
- **`src/types/providers.ts`** alias shim — already fully @deprecated; no changes.
- **`src/types/index.ts`** — `AgentConfig` already re-exported (L56); no change needed.

## Validation conventions

- `tsconfig.json`: `"include": ["src/**/*"]`, `"exclude": ["src/__tests__"]`.
  → `npm run lint` (`tsc --noEmit`) and `npm run build` (`tsc`) cover `src/types/agent.ts` but
  **exclude** the test dir. `npm test` (`vitest run`) includes `src/__tests__` but uses **esbuild**
  (strips types, no type-check). Therefore the type-validation test mirrors the **runtime-value
  assertion** convention of `harnesses-types.test.ts`; type correctness of `agent.ts` itself is gated by
  `npm run lint` on the (included) source file.
- Existing test exercising the new field: `src/__tests__/unit/agent.test.ts` L115–118
  (`new Agent({ harness: 'claude-code' })`) — already passes; proves `AgentConfig.harness` is wired.

## Migration JSDoc convention (to replicate)

Established in `src/types/providers.ts`:
```
@deprecated Since v1.2. Use {@link <NewType>} from <location>.
<one-line note on shape differences / removal target>
```typescript
// BEFORE (v1.x)
...
// AFTER (v1.2)
...
```
```
