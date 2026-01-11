# Test Patterns for Workflow Methods

## Test Framework

**Framework**: Vitest (configured in `vitest.config.ts`)
- Test files: `src/__tests__/**/*`
- Global test functions enabled
- ES modules import syntax

## Test Commands

```bash
npm run test           # Run all tests once
npm run test:watch     # Run tests in watch mode
```

## Error Testing Patterns

### 1. Synchronous Error Testing (for attachChild)
```typescript
it('should throw error when duplicate attachment attempted', () => {
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  expect(() => parent.attachChild(child)).toThrow(
    'Child already attached to this workflow'
  );
});
```

### 2. Circular Reference Error Pattern
```typescript
it('should detect circular parent relationship', () => {
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  // Manually create circular reference
  parent.parent = child;

  // Test protected method by casting to any
  expect(() => (parent as any).getRoot()).toThrow(
    'Circular parent-child relationship detected'
  );
});
```

### 3. Context Validation Error Pattern
```typescript
it('should throw when requiring context outside of context', () => {
  expect(() => requireExecutionContext('test operation')).toThrow(
    'test operation called outside of workflow context'
  );
});
```

## Parent/Child Relationship Test Patterns

### Basic Attachment Test
```typescript
it('should attach child to parent', () => {
  const parent = new SimpleWorkflow('Parent');
  const child = new SimpleWorkflow('Child', parent);

  expect(child.parent).toBe(parent);
  expect(parent.children).toContain(child);
  expect(parent.getNode().children).toContain(child.getNode());
});
```

### Event Testing for Attachments
```typescript
it('should emit childAttached event', () => {
  const parent = new SimpleWorkflow('Parent');
  const events: WorkflowEvent[] = [];

  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (event) => events.push(event),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  parent.addObserver(observer);
  const child = new SimpleWorkflow('Child', parent);

  const attachEvent = events.find((e) => e.type === 'childAttached');
  expect(attachEvent).toBeDefined();
  expect(attachEvent?.type === 'childAttached' && attachEvent.parentId).toBe(parent.id);
});
```

## Test Fixture Pattern

### SimpleWorkflow Class
```typescript
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.logger.info('Running simple workflow');
    this.setStatus('completed');
    return 'done';
  }
}
```

## Observer Pattern for Event Testing
```typescript
const observer: WorkflowObserver = {
  onLog: (entry) => logs.push(entry),
  onEvent: (event) => events.push(event),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};
```

## Test File Location

The test should be added to:
`/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts`

Look for existing tests related to:
- Parent/child relationships
- Error conditions
- Event emission (childAttached)
