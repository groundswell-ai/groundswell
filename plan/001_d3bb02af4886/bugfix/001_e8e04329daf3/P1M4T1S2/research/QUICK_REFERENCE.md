# Test Maintenance Quick Reference Guide

**For P1M4T1S2 - Bug Fix Test Validation**

## Immediate Debugging Actions

### Test Failing? Try This:

1. **Run test in isolation:**
   ```bash
   vitest run path/to/test.ts
   ```

2. **Run with verbose output:**
   ```bash
   vitest run --reporter=verbose path/to/test.ts
   ```

3. **Use debug mode:**
   ```bash
   vitest --inspect-brk --no-coverage path/to/test.ts
   # Then connect in VS Code or Chrome DevTools
   ```

4. **Interactive UI:**
   ```bash
   vitest --ui
   ```

## Common Error Patterns & Quick Fixes

### Error: "Expected X but received Y"
**Check:** Is the test expectation correct?
**Action:**
- If implementation is wrong → Fix code
- If test is outdated → Update test
- If floating point → Use `toBeCloseTo()`

### Error: "Timeout exceeded"
**Check:** Async handling
**Action:**
- Add `await` before async calls
- Return promises in tests
- Increase timeout if needed: `test('...', async () => {}, { timeout: 10000 })`

### Error: "Cannot read property of undefined"
**Check:** Null/undefined values
**Action:**
- Add optional chaining: `data?.property`
- Check mock return values
- Verify data initialization

### Error: "Mock not called"
**Check:** Mock setup
**Action:**
- Verify `vi.spyOn()` before test
- Check mock is configured: `.mockResolvedValue()`
- Ensure cleanup in `afterEach()`

## Decision Tree: Update Test vs Fix Implementation

```
Test fails
    ↓
Did requirements change?
    YES → Update test to match new requirements
    NO  ↓
Is test checking implementation details?
    YES → Refactor test to check behavior
    NO  ↓
Is implementation logic wrong?
    YES → Fix implementation, add regression test
    NO  → Update test expectation
```

## Test Update Checklist

Before modifying test:
- [ ] Reviewed requirements
- [ ] Checked git history for recent changes
- [ ] Verified test was passing before
- [ ] Identified root cause of failure

After modifying test:
- [ ] Added regression test
- [ ] Updated test documentation
- [ ] Ran full test suite
- [ ] Updated commit message

## Essential Vitest Commands

```bash
# Run all tests
vitest

# Run with coverage
vitest run --coverage

# Run specific file
vitest run path/to/test.ts

# Run matching pattern
vitest run -t "test name"

# Watch mode
vitest --watch

# UI mode
vitest --ui

# Debug mode
vitest --inspect-brk

# Update snapshots
vitest -u
```

## Best Practices to Remember

1. **Test behavior, not implementation**
   ```typescript
   // Good
   expect(result).toEqual(expected)

   // Bad
   expect(api.fetch).toHaveBeenCalledWith('/url')
   ```

2. **Clean up mocks**
   ```typescript
   beforeEach(() => vi.clearAllMocks())
   afterEach(() => vi.restoreAllMocks())
   ```

3. **Handle async properly**
   ```typescript
   test('async', async () => {
     const result = await fetchData()
     expect(result).toBe('data')
   })
   ```

4. **Add regression tests for bug fixes**
   ```typescript
   describe('Bug Fix #123', () => {
     it('should handle edge case X', () => {
       // Test the bug scenario
     })
   })
   ```

5. **Document test changes**
   ```typescript
   /**
    * Updated: 2026-01-12
    * Bug Fix: #123 - Added validation
    */
   ```

## Common Pitfalls to Avoid

1. ❌ Testing internal methods
2. ❌ Not cleaning up mocks
3. ❌ Missing async/await
4. ❌ Brittle assertions (too specific)
5. ❌ Only testing happy path
6. ❌ Not documenting changes

## Official Documentation

- **Vitest Docs:** https://vitest.dev
- **Debugging:** https://vitest.dev/guide/debugging.html
- **API Reference:** https://vitest.dev/api/
- **Common Errors:** https://vitest.dev/guide/common-errors.html

## When in Doubt

1. Isolate the test
2. Add console.log statements
3. Check the stack trace
4. Review requirements
5. Consult team

## File Locations

- Full Research: `test_maintenance_research.md`
- Key Findings: `KEY_FINDINGS.md`
- This Guide: `QUICK_REFERENCE.md`

---

**Last Updated:** 2026-01-12
**Context:** P1M4T1S2 - Test Maintenance Research
