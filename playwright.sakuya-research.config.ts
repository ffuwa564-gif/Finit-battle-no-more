import { defineConfig } from '@playwright/test';
// Isolated research build and origin; never serves or writes the public game.
const port=Number(process.env.SAKUYA_UI_PORT || 4197);
export default defineConfig({
  workers: 1,
  testDir: './itch-e2e',
  testMatch: ['native-interaction.spec.ts', 'sakuya-research.spec.ts'],
  timeout: 90000,
  outputDir: '/tmp/sakuya-research-webkit-results',
  use: {baseURL:`http://127.0.0.1:${port}`,headless:true,locale:'ja-JP'},
  projects:[{name:'research-webkit',use:{browserName:'webkit'}}],
  webServer:{command:'node scripts/this-girl-01/verify/preview.mjs',env:{SAKUYA_UI_PORT:String(port)},url:`http://127.0.0.1:${port}`,reuseExistingServer:false},
  reporter:'list',
});
