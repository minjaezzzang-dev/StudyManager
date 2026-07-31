import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PLAYWRIGHT_PORT ?? '3000';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const matrix = process.env.PLAYWRIGHT_MATRIX ?? 'default';

const allProjects = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  { name: 'tablet-ipad', use: { ...devices['iPad Pro 11'] } },
] as const;

const defaultProjects = allProjects.filter((p) =>
  ['chromium', 'mobile-chrome'].includes(p.name)
);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: matrix === 'full' ? [...allProjects] : [...defaultProjects],
  webServer: {
    command: `SKIP_ENV_VALIDATION=true pnpm dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      SKIP_ENV_VALIDATION: 'true',
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      NEXT_PUBLIC_API_URL: 'http://localhost:10001',
      NEXT_PUBLIC_APP_URL: baseURL,
    },
  },
});
