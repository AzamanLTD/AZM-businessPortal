// playwright.config.js
// Wave C rendered-acceptance browser suite. Runs the real Studio V2 through
// the Vite dev server in headless Chromium; deterministic (no network assets,
// no timing dependence — geometry and scroll positions only).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    viewport: { width: 1280, height: 800 },
    headless: true,
  },
  webServer: {
    command: 'npm run dev -- --port 5188 --strictPort',
    url: 'http://localhost:5188/e2e/studio-harness.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
