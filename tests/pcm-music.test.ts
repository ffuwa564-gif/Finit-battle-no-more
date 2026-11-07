import {afterEach,describe,it,expect,vi} from 'vitest';
import {PcmMusic} from '../src/platform/pcm-music';
function device(){
 const nodes:any[]=[];const param=()=>({value:0,cancelAndHoldAtTime:vi.fn(),cancelScheduledValues:vi.fn(),setValueAtTime:vi.fn(),setTargetAtTime:vi.fn(),linearRampToValueAtTime:vi.fn()});
 const c={state:'running',currentTime:0,sampleRate:48000,destination:{},createGain:()=>({gain:param(),connect:vi.fn(),disconnect:vi.fn()}),decodeAudioData:vi.fn(async()=>({length:5760000,duration:120})),createBufferSource:()=>{const n={buffer:null,loop:false,playbackRate:param(),detune:param(),connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null};nodes.push(n);return n;}};
 return {c:c as unknown as AudioContext,nodes};
}
afterEach(()=>vi.unstubAllGlobals());
describe('decoded music on the shared device clock',()=>{
 it('decodes once, loops natively at original pitch, and resumes without restarting at zero',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})));const{c,nodes}=device();const p=new PcmMusic(c,.25,vi.fn());
  p.sync('music.mp3',.25,true);p.sync('music.mp3',.25,true);await vi.waitFor(()=>expect(nodes).toHaveLength(1));expect(fetch).toHaveBeenCalledTimes(1);expect(nodes[0].loop).toBe(true);expect(nodes[0].playbackRate.value).toBe(1);expect(nodes[0].detune.value).toBe(0);
  Object.assign(c,{currentTime:127});expect(p.position).toBe(7);p.pause();expect(p.playing).toBe(false);p.sync('music.mp3',.1,true);expect(nodes).toHaveLength(2);expect(nodes[1].start).toHaveBeenCalledWith(0,7);expect(fetch).toHaveBeenCalledTimes(1);p.dispose();
 });
 it('does not start a delayed decode while hidden and discards superseded track results',async()=>{
  const pending:{resolve:(v:any)=>void}[]=[];vi.stubGlobal('fetch',vi.fn(()=>new Promise(resolve=>pending.push({resolve}))));const{c,nodes}=device(),failed=vi.fn(),p=new PcmMusic(c,.25,failed);
  p.sync('old.mp3',.25,true);p.sync('new.mp3',.25,true);expect(pending).toHaveLength(2);p.pause();
  pending[0].resolve({ok:false});pending[1].resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});await vi.waitFor(()=>expect(c.decodeAudioData).toHaveBeenCalledTimes(1));expect(nodes).toHaveLength(0);expect(failed).not.toHaveBeenCalled();p.sync('new.mp3',.25,true);await vi.waitFor(()=>expect(nodes).toHaveLength(1));p.dispose();
 });
 it('retains position across a new context and cancels loading on disposal',async()=>{
  const{c,nodes}=device();const fail=vi.fn();vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})));const p=new PcmMusic(c,.2,fail,{url:'music.mp3',position:37.25});p.sync('music.mp3',.2,true);await vi.waitFor(()=>expect(nodes).toHaveLength(1));expect(nodes[0].start).toHaveBeenCalledWith(0,37.25);p.dispose();expect(p.playing).toBe(false);p.sync('music.mp3',.2,true);expect(nodes).toHaveLength(1);
 });
});
