import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.test', quiet: true })

const supabaseUrl = process.env.TEST_SUPABASE_URL
const publishableKey = process.env.TEST_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !publishableKey) {
  throw new Error(
    'Missing test credentials. The journeys need TEST_SUPABASE_URL and ' +
      'TEST_SUPABASE_PUBLISHABLE_KEY in .env.test.',
  )
}

// Whole-journey tests. Deliberately few.
//
// The dev server here is pointed at GreatLibraryTesting, not the live project.
// It used to inherit .env and therefore production, which was survivable only
// while every journey was read-only; the moment one of them signs in and
// creates rows, that arrangement writes to the live site.
// 5174 unless told otherwise — E2E_PORT lets the journeys run while something
// else is already sitting on that port.
const port = process.env.E2E_PORT ?? '5174'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Its own port, never reused: a `npm run dev` already running on 5173 is
  // pointed at production, and silently borrowing it is exactly the accident
  // this port number exists to prevent.
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    },
  },
})
