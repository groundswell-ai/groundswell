import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx', 'examples/__tests__/**/*.test.tsx'],
    globals: true,
  },
  resolve: {
    alias: {
      // Handle .js extensions in imports for TypeScript files
    },
  },
  esbuild: {
    target: 'node18',
    jsx: 'automatic',
    jsxImportSource: 'ink',
  },
});
