import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './e2e', timeout: 120000, use: { baseURL: 'http://127.0.0.1:4173', headless: true, locale: 'ja-JP' }, webServer: { command: 'npm run dev -- --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: true }, reporter: 'list' });
