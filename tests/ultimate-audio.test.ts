import { renderRabbitUltimate, renderRabbitBuff, RABBIT_BUFF_CUES } from '../src/platform/rabbit-ultimate-audio';
import { RABBIT_VOLLEY } from '../src/platform/ultimate-choreography';
import { describe, expect, it } from 'vitest';
import { renderRabbitVolley } from '../src/platform/rabbit-volley-audio';
import { renderUltimateSound, ultimateSounds } from '../src/platform/ultimate-audio';

const rms = (pcm: Float32Array, rate: number, start: number, end: number) => {
  let sum=0,n=0;for(let i=Math.round(start*rate);i<Math.min(pcm.length,end*rate);i++,n++)sum+=pcm[i]**2;
  return Math.sqrt(sum/Math.max(1,n));
};
describe('authored ultimate sound materials', () => {
  it.each([22050,44100,48000])('renders bounded, finite, click-free voices at %i Hz', rate => {
    for(const kind of ultimateSounds){
      const pcm=renderUltimateSound(kind,rate);let peak=0,finite=true;
      for(const value of pcm){peak=Math.max(peak,Math.abs(value));finite&&=Number.isFinite(value);}
      expect(finite).toBe(true);expect(peak).toBeLessThanOrEqual(.831);
      expect(rms(pcm,rate,0,pcm.length/rate)).toBeGreaterThan(.02);
      expect(Math.abs(pcm[0])).toBe(0);expect(Math.abs(pcm[pcm.length-1])).toBe(0);
      expect(pcm.length/rate).toBeLessThan(kind==='ultimate-rabbits'?5.1:1.8);
    }
  });
  it('leaves a breath before the rabbit finisher and returns two discrete echoes', () => {
    const rate=44100,pcm=renderRabbitVolley(rate);
    expect(rms(pcm,rate,RABBIT_VOLLEY.finale+.005,RABBIT_VOLLEY.finale+.08)).toBeGreaterThan(rms(pcm,rate,1.2,1.4)*5);
    expect(rms(pcm,rate,RABBIT_VOLLEY.finale+.19,RABBIT_VOLLEY.finale+.24)).toBeGreaterThan(.02);
    expect(rms(pcm,rate,RABBIT_VOLLEY.finale+.37,RABBIT_VOLLEY.finale+.42)).toBeGreaterThan(.01);
  });
  it('can retime the PV shot deadlines without stretching the individual shot attacks', () => {
    const rate=44100,normal=renderRabbitVolley(rate),slow=renderRabbitVolley(rate,1.8);
    expect(slow.length).toBeGreaterThan(normal.length*1.5);
    const attack=rms(normal,rate,.003,.025),retimed=rms(slow,rate,.003,.025);
    expect(retimed/attack).toBeGreaterThan(.7);expect(retimed/attack).toBeLessThan(1.4);
    expect(rms(slow,rate,1.8*RABBIT_VOLLEY.finale+.005,1.8*RABBIT_VOLLEY.finale+.06)).toBeGreaterThan(.05);
  });
  it('carries repeated bright buff phrases before and between the weapon bursts',()=>{
    const rate=44100,voice=renderRabbitUltimate(rate),buff=renderRabbitBuff(rate);
    expect(RABBIT_BUFF_CUES.length).toBeGreaterThanOrEqual(8);
    expect(voice.length/rate).toBe(5);expect(renderRabbitUltimate(rate,1.25).length/rate).toBe(4);
    expect(rms(voice,rate,.2,.4)).toBeGreaterThan(.04);
    expect(rms(voice,rate,1.15,1.45)).toBeGreaterThan(.04);
    expect(rms(buff,rate,.03,.2)).toBeGreaterThan(.05);
  });
  it('separates attack, thunder and healing waveforms rather than sharing a dominant bed', () => {
    const rate=44100;
    const clips=ultimateSounds.filter(kind=>kind!=='ultimate').map(kind=>renderUltimateSound(kind,rate));
    for(let a=0;a<clips.length;a++)for(let b=a+1;b<clips.length;b++){
      let dot=0,aa=0,bb=0;
      for(let i=0;i<Math.min(clips[a].length,clips[b].length);i++){const x=clips[a][i],y=clips[b][i];dot+=x*y;aa+=x*x;bb+=y*y;}
      expect(Math.abs(dot/Math.sqrt(aa*bb))).toBeLessThan(.5);
    }
    const heal=renderUltimateSound('ultimate-sanctuary',rate),strike=renderUltimateSound('ultimate-strike',rate);
    expect(rms(heal,rate,0,.025)).toBeLessThan(rms(heal,rate,.1,.2));
    expect(rms(strike,rate,0,.1)).toBeGreaterThan(rms(strike,rate,.6,.9)*5);
  });
});
