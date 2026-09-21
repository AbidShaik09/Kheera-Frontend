import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4300',
    trace: 'retain-on-failure',
    channel: process.env['PLAYWRIGHT_CHANNEL'] === 'msedge' ? 'msedge' : undefined,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'node scripts/serve-smoke.mjs',
    url: 'http://127.0.0.1:4300',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
