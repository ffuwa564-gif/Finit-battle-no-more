import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: '**/v110*.spec.ts', timeout: 90000,
  workers: 1, use: { baseURL: 'http://127.0.0.1:4194', headless: true, locale: 'ja-JP' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4194', url: 'http://127.0.0.1:4194', reuseExistingServer: true }, reporter: 'list',
});
