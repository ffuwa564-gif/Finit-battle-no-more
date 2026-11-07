import type {Route} from '@playwright/test';
/** WebKit seeks using byte ranges, including rate changes and resumed streams. */
export async function fulfillAudioFixture(route:Route,body:Buffer):Promise<void>{
 const range=/^bytes=(\d*)-(\d*)$/.exec(route.request().headers().range??'');
 if(!range){await route.fulfill({contentType:'audio/wav',headers:{'Accept-Ranges':'bytes'},body});return;}
 const start=range[1]?Number(range[1]):Math.max(0,body.length-Number(range[2]));
 const end=range[1]&&range[2]?Math.min(body.length-1,Number(range[2])):body.length-1;
 if(start>end||start>=body.length){await route.fulfill({status:416,headers:{'Content-Range':`bytes */${body.length}`},body:''});return;}
 await route.fulfill({status:206,contentType:'audio/wav',headers:{'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${body.length}`},body:body.subarray(start,end+1)});
}

/** Follow the real looped fixture through its envelope and master gain to measure
 * decoded BGM independently from the separately synthesized combat effects. */
export function installDecodedMusicMeter(duration:number){
 const w=window as any,edges=new WeakMap<AudioNode,AudioNode[]>(),connect=AudioNode.prototype.connect;
 AudioNode.prototype.connect=function(destination:any,...args:any[]){
  const result=(connect as any).call(this,destination,...args);
  if(destination instanceof AudioNode)edges.set(this,[...(edges.get(this)??[]),destination]);
  if(this instanceof AudioBufferSourceNode&&this.loop&&this.buffer&&(duration<0?this.buffer.duration>80:Math.abs(this.buffer.duration-duration)<.03)){
   let tail:AudioNode=destination;for(let n=0;n<8;n++){const next=edges.get(tail)?.find(x=>x instanceof GainNode);if(!next||edges.get(next)?.some(x=>x instanceof WaveShaperNode))break;tail=next;}
   const meter=this.context.createAnalyser();meter.fftSize=4096;(connect as any).call(tail,meter);w.musicMeter=meter;w.musicContext=this.context;
  }
  return result;
 } as typeof AudioNode.prototype.connect;
}
