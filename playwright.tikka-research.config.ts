import{defineConfig}from'@playwright/test';
const port=4199;
export default defineConfig({workers:1,testDir:'./itch-e2e',testMatch:['tikka-research.spec.ts'],timeout:90000,outputDir:'/tmp/stillveil-03-v2/ui-results',use:{baseURL:`http://127.0.0.1:${port}`,headless:true,locale:'ja-JP'},projects:[{name:'tikka-chromium',use:{browserName:'chromium'}},{name:'tikka-webkit',use:{browserName:'webkit'}}],webServer:{command:'node scripts/this-girl-03-v2/verify/preview.mjs',url:`http://127.0.0.1:${port}`,reuseExistingServer:false},reporter:'list'});
