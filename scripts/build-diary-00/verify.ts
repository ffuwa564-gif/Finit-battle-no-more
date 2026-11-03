import{chromium,webkit}from'@playwright/test';import{readFile,writeFile}from'node:fs/promises';import{resolve}from'node:path';import{pathToFileURL}from'node:url';
const base=resolve('artifacts/build-diary-00'),timeline=JSON.parse(await readFile(base+'/timeline.json','utf8'));const out=[];
const times=[10,...['skills','command','future'].map(id=>timeline.chapters.find((c:any)=>c.id===id).atFrame/30+3),timeline.appendixStart+18,timeline.chapters.find((c:any)=>c.id==='catalogue-gems').atFrame/30+18,timeline.duration-12];
for(const[name,engine]of[['Chromium',chromium],['WebKit',webkit]]as const)for(const label of['1080p','720p']){
 const b=await engine.launch();try{const p=await b.newPage({viewport:{width:1280,height:720}});await p.goto(pathToFileURL(base+'/Script.md').href);await p.setContent(`<style>body{margin:0;background:#000}video{width:1280px;height:720px}</style><video muted playsinline src="${pathToFileURL(base+`/STILLVEIL-BuildResearchDiary-00-${label}.mp4`).href}"></video>`);
 await p.waitForFunction(()=>{const v=document.querySelector('video')!;return v.readyState>=2||v.error;},null,{timeout:60000});const info=await p.locator('video').evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight,error:v.error?.message}));if(info.error||Math.abs(info.duration-timeline.duration)>.1)throw Error(JSON.stringify(info));
 await p.bringToFront();await p.locator('video').evaluate(v=>v.play());await p.waitForFunction(()=>document.querySelector('video')!.currentTime>.5,null,{timeout:15000});await p.locator('video').evaluate(v=>v.pause());
 for(const t of times){await p.locator('video').evaluate(async(v,t)=>{await new Promise<void>((r,j)=>{v.onseeked=()=>r();v.onerror=()=>j(Error(v.error?.message));v.currentTime=t;});},t);await p.waitForTimeout(100);if(name==='Chromium'&&label==='1080p')await p.screenshot({path:base+`/final-${Math.round(t)}.png`});}
 out.push({browser:name,label,...info,seeks:times,transport:'downloaded-local-file',passed:true});console.log(name,label,'PASS');}finally{await b.close();}
}
await writeFile(base+'/Validation.json',JSON.stringify(out,null,2));
