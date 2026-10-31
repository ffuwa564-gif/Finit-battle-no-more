import { renderRabbitLoopCharges, renderRabbitLoopCharge } from '../src/platform/rabbit-loop-charge';
import { rabbitLoopCues } from '../src/platform/ultimate-choreography';
import {RABBIT_SEQUENCE} from '../src/platform/ultimate-timing';
import {renderUltimateCharge} from '../src/platform/ultimate-charge-audio';
import { renderRabbitUltimate, enhanceRabbitCharge, RABBIT_CHARGE_CUES } from '../src/platform/rabbit-ultimate-audio';
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
      expect(pcm.length/rate).toBeLessThan(kind==='ultimate-rabbits'?8.9:1.8);
    }
  });
  it('leaves a breath before the rabbit finisher and returns two discrete echoes', () => {
    const rate=44100,pcm=renderRabbitVolley(rate);
    expect(rms(pcm,rate,RABBIT_VOLLEY.finale+.005,RABBIT_VOLLEY.finale+.08)).toBeGreaterThan(rms(pcm,rate,RABBIT_VOLLEY.finale-.7,RABBIT_VOLLEY.finale-.5)*5);
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
  it('reuses the pre-ultimate charge exactly, without adding buff-skill notes',()=>{
    const source=renderUltimateCharge(48000),charge=enhanceRabbitCharge(source),voice=renderRabbitUltimate(48000);
    expect(charge.length).toBe(source.length);expect(RABBIT_CHARGE_CUES[0]).toBe(.52);expect(RABBIT_CHARGE_CUES[1]).toBeCloseTo(6.34);
    for(let i=0;i<source.length;i+=101)expect(charge[i]).toBeCloseTo(source[i]*1.65,6);
    expect(rms(charge,48000,0,.68)).toBeGreaterThan(rms(source,48000,0,.68)*1.6);
    expect(voice.length/48000).toBe(8.8);expect(renderRabbitUltimate(48000,1.25).length/48000).toBeCloseTo(7.04,4);
  });
  it('keeps aiming silent and lets crossfire breathe before the last charge',()=>{
    const rate=48000,pcm=renderRabbitUltimate(rate);
    expect(rms(pcm,rate,RABBIT_SEQUENCE.aim/1000,RABBIT_SEQUENCE.fire/1000)).toBe(0);
    expect(rms(pcm,rate,6.2,6.3)).toBe(0);
    expect(rms(pcm,rate,6.7,7.0)).toBeGreaterThan(.02);
  });
  it('reuses the actual ブオーン after each completed pass and raises its whole waveform',()=>{
    const rate=48000,source=renderUltimateCharge(rate),cues=rabbitLoopCues(),pcm=renderRabbitLoopCharges(rate);
    expect(cues).toHaveLength(2);
    cues.forEach((cue,index)=>{
      expect(cue.at).toBeCloseTo(index+.285);
      const voice=renderRabbitLoopCharge(rate,index);
      expect(voice.length/rate).toBeCloseTo(.68/cue.ratio,4);
      expect(renderRabbitLoopCharge(rate,index,.8).length/rate).toBeCloseTo(.68*.8/cue.ratio,4);
      expect(rms(pcm,rate,cue.at+.03,cue.at+cue.duration*.8)).toBeGreaterThan(.03);
      if(index){expect(cue.ratio).toBeGreaterThan(cues[index-1].ratio);expect(cue.zoom).toBeGreaterThan(cues[index-1].zoom);}
      for(let i=0;i<voice.length-1;i+=997){
        const at=i*cue.ratio,lo=Math.floor(at),mix=at-lo;
        expect(voice[i]).toBeCloseTo(((source[lo]??0)*(1-mix)+(source[lo+1]??0)*mix)*1.65*(.95+index*.39),6);
      }
    });
    expect(rms(pcm,rate,0,cues[0].at)).toBe(0);expect(pcm.at(-1)).toBeCloseTo(0,8);
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
