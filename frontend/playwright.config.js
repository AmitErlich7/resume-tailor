import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      VITE_E2E_BYPASS_AUTH: 'true',
      VITE_API_BASE_URL: 'http://127.0.0.1:8000',
    },
  },
})
