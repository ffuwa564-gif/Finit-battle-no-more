// Transparent capture-only native-buffer observation; never synthesizes/replays audio.
(()=>{
 const originalStart=AudioBufferSourceNode.prototype.start,originalStop=AudioBufferSourceNode.prototype.stop;
 const bufferIds=new WeakMap(),entries=new WeakMap();let serial=0,nodeSerial=0;
 AudioBufferSourceNode.prototype.start=function(...args){
  const ctx=this.context,contextTime=ctx.currentTime,wallTime=(performance.timeOrigin+performance.now())/1000;
  const result=originalStart.apply(this,args);
  if(window.__recordNative&&this.buffer&&ctx===window.__tap?.ctx){
   let bufferId=bufferIds.get(this.buffer),fresh=!bufferId;if(!bufferId){bufferId=++serial;bufferIds.set(this.buffer,bufferId);}
   const requested=args[0]??contextTime;
   const entry={sourceNodeId:++nodeSerial,bufferId,requestedStartContextTime:requested,scheduledContextTime:requested,effectiveStartContextTime:Math.max(contextTime,requested),offset:args[1]??0,duration:args[2]??null,contextTime,wallTime,sampleRate:this.buffer.sampleRate,frames:this.buffer.length,playbackRate:this.playbackRate.value,loop:this.loop,stopObservations:[]};
   entries.set(this,entry);window.__nativeBufferStarts.push(entry);
   this.addEventListener('ended',()=>{entry.endedObservedContextTime=ctx.currentTime;entry.endedObservedWallTime=(performance.timeOrigin+performance.now())/1000;},{once:true});
   if(fresh){const data=this.buffer.getChannelData(0).slice();setTimeout(()=>{const bytes=new Uint8Array(data.buffer);let string='';for(let i=0;i<bytes.length;i+=16384)string+=String.fromCharCode(...bytes.subarray(i,i+16384));window.__pcmChain=window.__pcmChain.then(()=>window.__storeNativeBuffer(entry,btoa(string)));},0);}
  }return result;
 };
 AudioBufferSourceNode.prototype.stop=function(...args){
  const ctx=this.context,calledContextTime=ctx.currentTime,wallTime=(performance.timeOrigin+performance.now())/1000;
  const result=originalStop.apply(this,args),entry=entries.get(this);
  if(entry){const requestedContextTime=args[0]??calledContextTime,effectiveContextTime=Math.max(calledContextTime,requestedContextTime);entry.stopObservations.push({requestedContextTime,calledContextTime,effectiveContextTime,wallTime});entry.effectiveStopContextTime=effectiveContextTime;entry.cancelledBeforeStart=calledContextTime<entry.effectiveStartContextTime&&effectiveContextTime<=entry.effectiveStartContextTime;entry.activeDurationAtScheduledStop=Math.max(0,effectiveContextTime-entry.effectiveStartContextTime);}
  return result;
 };
})();
