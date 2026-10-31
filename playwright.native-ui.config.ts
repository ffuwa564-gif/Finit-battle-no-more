import { defineConfig } from '@playwright/test';
export default defineConfig({
  workers: 1,
  testDir: './itch-e2e', testMatch: 'native-interaction.spec.ts', timeout: 90000,
  use: { baseURL: 'http://127.0.0.1:4182', headless: true },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'webkit', retries: process.env.CI ? 1 : 0, use: { browserName: 'webkit' } }],
  webServer: { command: 'node scripts/preview-itch.mjs', url: 'http://127.0.0.1:4182', reuseExistingServer: true },
  reporter: 'list',
});
