import {gameAudioOutput} from './audio-context';
/** Decoded music uses the same device clock as SE. No media-element resampler,
 * EOF seek or JS loop timer participates in playback. Only the current track is retained. */
export class PcmMusic {
 private gain:GainNode;
 private source?:AudioBufferSourceNode;
 private envelope?:GainNode;
 private buffer?:AudioBuffer;
 private controller?:AbortController;
 private generation=0;
 private offset=0;
 private startedAt=0;
 private wanted=false;
 private disposed=false;
 private target:number;
 url='';
 constructor(private context:AudioContext,level:number,private failed:(url:string)=>void,restore?:{url:string;position:number}){
  this.gain=context.createGain();this.gain.gain.value=level;this.gain.connect(gameAudioOutput(context));this.target=level;
  if(restore){this.url=restore.url;this.offset=restore.position;}
 }
 get position(){return this.buffer?(this.offset+(this.source?Math.max(0,this.context.currentTime-this.startedAt):0))%this.buffer.duration:this.offset;}
 get playing(){return !!this.source&&this.context.state==='running';}
 snapshot(){return {url:this.url,position:this.position};}
 setVolume(level:number){
  if(this.disposed||this.target===level)return;
  const p=this.gain.gain,t=this.context.currentTime;
  if(typeof p.cancelAndHoldAtTime==='function')p.cancelAndHoldAtTime(t);else{p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);}
  p.setTargetAtTime(level,t,.012);this.target=level;
 }
 sync(url:string,level:number,play:boolean){
  if(this.disposed)return;this.setVolume(level);this.wanted=play;
  if(url!==this.url){this.pause();this.url=url;this.offset=0;this.buffer=undefined;this.controller?.abort();this.controller=undefined;this.generation++;}
  this.wanted=play;
  if(!play){this.pause();return;}
  if(this.buffer){this.start();return;}
  if(this.controller)return;
  const generation=this.generation,controller=new AbortController();this.controller=controller;
  void fetch(url,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Music download failed');return r.arrayBuffer();}).then(bytes=>this.context.decodeAudioData(bytes)).then(buffer=>{
   if(this.disposed||generation!==this.generation)return;
   if(!buffer.length||!Number.isFinite(buffer.duration)||buffer.duration<=0)throw Error('Music decode failed');
   this.buffer=buffer;this.controller=undefined;if(this.wanted)this.start();
  }).catch(()=>{if(this.disposed||generation!==this.generation)return;this.controller=undefined;this.failed(url);});
 }
 private start(){
  if(this.source||!this.buffer||!this.wanted||this.context.state!=='running'||this.disposed)return;
  const node=this.context.createBufferSource();node.buffer=this.buffer;node.loop=true;node.playbackRate.value=1;node.detune.value=0;
  const envelope=this.context.createGain();envelope.gain.value=0;envelope.gain.linearRampToValueAtTime(1,this.context.currentTime+.015);envelope.connect(this.gain);node.connect(envelope);this.envelope=envelope;
  this.offset%=this.buffer.duration;this.startedAt=this.context.currentTime;node.start(0,this.offset);this.source=node;
 }
 pause(){
  this.wanted=false;if(!this.source)return;this.offset=this.position;
  const source=this.source,envelope=this.envelope,t=this.context.currentTime;
  if(envelope){envelope.gain.cancelScheduledValues(t);envelope.gain.setValueAtTime(envelope.gain.value,t);envelope.gain.linearRampToValueAtTime(0,t+.012);}
  source.onended=()=>{source.disconnect();envelope?.disconnect();};source.stop(t+.016);this.source=undefined;this.envelope=undefined;
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.generation++;this.controller?.abort();this.controller=undefined;this.pause();this.buffer=undefined;this.gain.disconnect();}
}
