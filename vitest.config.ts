import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    env: {
      // Prevent lib/ai.ts from throwing at module-load time in unit tests.
      // Real credentials are never used — network-dependent functions are not tested here.
      OPENROUTER_API_KEY: 'test-placeholder',
    },
  },
})
