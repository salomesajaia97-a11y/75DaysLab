import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    // Default env is node; component tests opt into jsdom per-file via a
    // `// @vitest-environment jsdom` docblock, so the fast node suites are unchanged.
    environment: 'node',
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts', 'components/**/*.test.{ts,tsx}'],
    env: {
      // Prevent lib/ai.ts from throwing at module-load time in unit tests.
      // Real credentials are never used — network-dependent functions are not tested here.
      OPENROUTER_API_KEY: 'test-placeholder',
    },
  },
})
