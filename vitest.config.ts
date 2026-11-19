import { defineConfig } from 'vitest/config'

// Database-rule tests only. These talk to a Supabase test project over the
// network, so they run in Node, not a browser, and never touch React.
export default defineConfig({
  test: {
    include: ['tests/db/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    environment: 'node',
    // Row-level security is global state; parallel writes to the same tables
    // make failures hard to read. Correctness beats speed here.
    fileParallelism: false,
    testTimeout: 15000,
  },
})
