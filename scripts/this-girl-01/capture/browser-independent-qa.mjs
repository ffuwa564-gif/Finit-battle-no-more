// Actual Chromium/WebKit decode+seek checks. This is not a synchronization claim.
import{chromium,webkit}from'@playwright/test';
import{createServer}from'node:http';
import{createReadStream,statSync,writeFileSync,mkdirSync,readFileSync}from'node:fs';
import{resolve}from'node:path';
import{createHash}from'node:crypto';
// Independent fresh-player checkpoint gate; sequential-player failures are retained separately.
const movie=resolve(process.argv[2]),reportPath=resolve(process.argv[3]);
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const initialSha=sha(movie),size=statSync(movie).size;
mkdirSync(resolve(reportPath,'..'),{recursive:true});
const server=createServer((request,response)=>{
 if(request.url==='/'){response.writeHead(200,{'Content-Type':'text/html'});response.end('<body style="margin:0;background:#000"><video id="v" src="/final.mp4" muted controls style="width:100vw;height:100vh;object-fit:contain"></video></body>');return;}
 if(request.url!=='/final.mp4'){response.writeHead(404);response.end();return;}
 const match=/^bytes=(\d+)-(\d*)$/.exec(request.headers.range??'');
 const start=match?Number(match[1]):0,end=match&&match[2]?Math.min(size-1,Number(match[2])):size-1;
 if(start>=size||end<start){response.writeHead(416);response.end();return;}
 response.writeHead(match?206:200,{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Length':end-start+1,...(match?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});
 createReadStream(movie,{start,end}).pipe(response);
});
await new Promise((done,reject)=>{server.once('error',reject);server.listen(4361,'127.0.0.1',done);});
const checks=[];let failure=null;
try{
 for(const[name,engine]of[['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true});
  try{
   for(const fraction of[.05,.5,.9]){
   const page=await browser.newPage({viewport:{width:1280,height:720}});
   await page.goto('http://127.0.0.1:4361/');
   await page.waitForFunction(()=>{const v=document.getElementById('v');return v.readyState>=2&&Number.isFinite(v.duration)&&v.duration>1;},{timeout:60000});
   const duration=await page.locator('video').evaluate(v=>v.duration);
    const point=duration*fraction;
    await page.locator('video').evaluate(async(v,time)=>{
     v.pause();await new Promise((done,reject)=>{const timer=setTimeout(()=>reject(Error('seek timeout')),30000);v.addEventListener('seeked',()=>{clearTimeout(timer);done();},{once:true});v.currentTime=time;});await Promise.race([v.play(),new Promise((_,reject)=>setTimeout(()=>reject(Error('play timeout')),20000))]);
    },point);
    await page.waitForTimeout(2000);
    const state=await page.locator('video').evaluate(v=>({time:v.currentTime,ended:v.ended,readyState:v.readyState,paused:v.paused,error:v.error?{code:v.error.code,message:v.error.message}:null,width:v.videoWidth,height:v.videoHeight}));
    const passed=!state.error&&!state.paused&&!state.ended&&state.readyState>=2&&state.time>=point+.7&&state.time<=point+5&&state.width===1920&&state.height===1080;
    checks.push({engine:name,fraction,requestedTime:point,duration,state,passed});
    await page.screenshot({path:resolve(reportPath,'..',`${name}-${Math.round(fraction*100)}.png`)});
    await page.close();
    if(!passed)throw Error('Browser playback/seek failed '+JSON.stringify(checks.at(-1)));
   }
  }finally{await browser.close();}
 }
}catch(error){failure=String(error);}
finally{await new Promise(done=>server.close(done));}
const unchanged=sha(movie)===initialSha;
const priorEvidence=['final-browser-qa-before-libav.json','final-browser-qa-libav-root.json','browser-decoder-provenance.json','final-webkit-fresh90-diagnostic.json'].map(name=>({path:'artifacts/this-girl-01/research/'+name,sha256:sha(resolve(reportPath,'..',name))}));
const report={priorEvidence,passed:failure===null&&unchanged&&checks.length===6,movieSha256:initialSha,checks,unchangedDuringQA:unchanged,error:failure,qaCodeSha256:sha(new URL(import.meta.url).pathname),scenario:'fresh-media-instance-per-checkpoint',knownLimitation:'Linux WPE sequential seeks in one media instance failed at the final checkpoint; retained in final-browser-qa-libav-root.json. Fresh-instance compatibility is a separate scope, not a pass for sequential seeking.',scope:'Each Chromium/WebKit checkpoint loads a new player, seeks from the beginning and demonstrates playback for 2s with at least 0.7s actual progress. Does not certify same-instance consecutive seeks. Source/final A/V alignment has a separate required gate.'};
writeFileSync(reportPath,JSON.stringify(report,null,2));
if(!report.passed)process.exitCode=1;
