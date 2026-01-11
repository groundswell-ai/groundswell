# Codebase Structure for P1.M2.T1.S4

## Relevant Source Files
```
/home/dustin/projects/groundswell/
├── src/
│   ├── core/
│   │   └── workflow.ts          # Contains getRootObservers() (lines 124-139)
│   ├── __tests__/
│   │   └── unit/
│   │       └── workflow.test.ts # Add test here (after line 223)
│   └── index.js                 # Main exports
└── plan/
    └── bugfix/
        └── P1M2T1S4/            # This subtask directory
            ├── research/        # Research findings (this file)
            └── PRP.md          # Target PRP location
```

## Key Files
- **Implementation**: `/home/dustin/projects/groundswell/src/core/workflow.ts`
- **Test File**: `/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts`
- **PRP Location**: `/home/dustin/projects/groundswell/plan/bugfix/P1M2T1S4/PRP.md`

## Existing Related Tests (workflow.test.ts)
- Line 209-223: `should detect circular parent relationship` (getRoot() test)
- P1.M2.T1.S2 test is the template to follow

## Test Location for New Test
Add after line 223 (within the same `describe('Workflow', ...)` block)
