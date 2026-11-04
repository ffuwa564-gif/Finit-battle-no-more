// Capture only: a continuous native graph tap. Does not alter the live output.
class StillveilPcm extends AudioWorkletProcessor{
 constructor(){super();this.buf=new Int16Array(8192*2);this.used=0;this.first=null;this.started=false;this.stopped=false;this.port.onmessage=e=>{if(e.data==='stop'){this.flush();this.stopped=true;this.port.postMessage({kind:'end',nextFrame:currentFrame,sampleRate});}};}
 flush(){if(!this.used)return;const data=this.buf.slice(0,this.used*2);this.port.postMessage({kind:'pcm',firstFrame:this.first,frames:this.used,sampleRate,data:data.buffer},[data.buffer]);this.used=0;this.first=null;}
 process(inputs,outputs){const input=inputs[0],output=outputs[0];for(let c=0;c<output.length;c++)output[c].fill(0);if(this.stopped)return true;
  const count=output[0]?.length??128;if(!this.started){this.started=true;this.port.postMessage({kind:'start',firstFrame:currentFrame,sampleRate});}
  if(this.first===null)this.first=currentFrame;
  for(let i=0;i<count;i++){for(let c=0;c<2;c++){const v=input[c]?.[i]??input[0]?.[i]??0;this.buf[this.used*2+c]=Math.round(Math.max(-1,Math.min(1,v))*32767);}this.used++;if(this.used===8192)this.flush();}
  return true;
 }
}
registerProcessor('stillveil-pcm',StillveilPcm);
