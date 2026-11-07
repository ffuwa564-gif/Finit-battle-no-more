import{defineConfig}from'@playwright/test';
const port=4198;
export default defineConfig({workers:1,testDir:'./itch-e2e',testMatch:['miette-research.spec.ts'],timeout:90000,outputDir:'/tmp/stillveil-02-v2/ui-results',use:{baseURL:`http://127.0.0.1:${port}`,headless:true,locale:'ja-JP'},projects:[{name:'miette-chromium',use:{browserName:'chromium'}},{name:'miette-webkit',use:{browserName:'webkit'}}],webServer:{command:'node scripts/this-girl-02-v2/verify/preview.mjs',url:`http://127.0.0.1:${port}`,reuseExistingServer:false},reporter:'list'});
