import{defineConfig}from'@playwright/test';
const port=4201;
export default defineConfig({workers:1,testDir:'./itch-e2e',testMatch:['lisette-research.spec.ts'],timeout:90000,outputDir:'/tmp/stillveil-05/ui-results',use:{baseURL:`http://127.0.0.1:${port}`,headless:true,locale:'ja-JP'},projects:[{name:'lisette-chromium',use:{browserName:'chromium'}},{name:'lisette-webkit',use:{browserName:'webkit'}}],webServer:{command:'node scripts/this-girl-05/verify/preview.mjs',url:`http://127.0.0.1:${port}`,reuseExistingServer:false},reporter:'list'});
