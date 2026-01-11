# Codebase Context Research: P1.M1.T2.S1

## Project Structure

```
/home/dustin/projects/groundswell/
├── src/
│   ├── core/
│   │   └── workflow.ts          # Main Workflow class (349 lines)
│   ├── types/
│   │   ├── workflow.ts          # Workflow type definitions
│   │   ├── events.ts            # Event type definitions
│   │   └── observer.ts          # Observer interface
│   └── __tests__/
│       ├── adversarial/
│       │   └── parent-validation.test.ts  # Reference test pattern
│       ├── unit/
│       │   └── workflow.test.ts
│       └── integration/
├── plan/
│   └── bugfix/
│       ├── P1M1T1S1/            # Completed parent validation
│       │   ├── research/        # Research docs from S1
│       │   └── PRP.md
│       └── P1M1T2S1/            # Current work item
│           └── research/
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Test Framework

- **Framework**: Vitest
- **Config**: `vitest.config.ts`
- **Test command**: `npm test` (runs `vitest run`)
- **Watch mode**: `npm run test:watch`
- **Current status**: 242 tests passing

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

## Build/Test Commands

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Type check
npm run lint  # Runs tsc --noEmit

# Build
npm run build
```

## Task Status (from bug_fix_tasks.json)

**P1.M1.T1 - Parent Validation - COMPLETED**
- Parent validation implemented in attachChild()
- Tests passing

**P1.M1.T2 - Circular Reference Detection - IN PROGRESS**
- S1: Write failing test (CURRENT TASK)
- S2: Implement isDescendantOf() helper method
- S3: Integrate circular reference check into attachChild()
- S4: Verify no regressions

## Related Documentation

- **Implementation Patterns**: `/plan/docs/bugfix-architecture/implementation_patterns.md`
- **Bug Analysis**: `/plan/docs/bugfix-architecture/bug_analysis.md`
- **Cycle Detection Research**: `/plan/docs/research/CYCLE_DETECTION_PATTERNS.md`

## Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.71.1",
    "lru-cache": "^10.4.3",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "tsx": "^4.21.0",
    "vitest": "^1.0.0"
  }
}
```

## Import Patterns

```typescript
// For tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Workflow } from '../../index.js';

// For implementation
import { Workflow } from './workflow.js';
import type { WorkflowEvent, WorkflowNode } from '../types/index.js';
```
