import { defineConfig, devices } from '@playwright/test'

const externalURL = process.env.PLAYWRIGHT_BASE_URL
if (externalURL) {
  const url = new URL(externalURL)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('PLAYWRIGHT_BASE_URL must be an HTTP(S) origin without credentials, query, fragment, or subpath.')
  }
}
const target = process.env.ATLAS_TEST_TARGET ?? 'node'
if (!['node', 'vercel'].includes(target)) throw new Error('ATLAS_TEST_TARGET must be node or vercel.')

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['line'], ['html', { open: 'never' }]],
  use: { baseURL: externalURL ?? 'http://127.0.0.1:3218', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
  webServer: externalURL ? undefined : {
    command: target === 'vercel' ? 'node scripts/serve-vercel.mjs' : 'node .output/server/index.mjs',
    url: 'http://127.0.0.1:3218/api/health',
    env: { NODE_ENV: 'production', NITRO_HOST: '127.0.0.1', NITRO_PORT: '3218' },
    reuseExistingServer: false,
  },
})
