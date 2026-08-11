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

// Whole-journey tests. Deliberately few — see docs/work/README.md § Testing.
//
// The dev server here is pointed at GreatLibraryTesting, not the live project.
// It used to inherit .env and therefore production, which was survivable only
// while every journey was read-only; the moment one of them signs in and
// creates rows, that arrangement writes to the live site.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Its own port, never reused: a `npm run dev` already running on 5173 is
  // pointed at production, and silently borrowing it is exactly the accident
  // this port number exists to prevent.
  webServer: {
    command: 'npm run dev -- --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    },
  },
})
