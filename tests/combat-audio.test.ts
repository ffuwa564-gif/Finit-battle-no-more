import { describe, expect, it } from 'vitest';
import { combatFamilies, combatFamily, renderCombatSound } from '../src/platform/combat-audio';
import { renderUltimateSound } from '../src/platform/ultimate-audio';

const measure=(pcm:Float32Array)=>{
  let peak=0,energy=0,finite=true;
  for(const value of pcm){peak=Math.max(peak,Math.abs(value));energy+=value*value;finite&&=Number.isFinite(value);}
  return {peak,rms:Math.sqrt(energy/pcm.length),finite};
};
describe('ordinary combat materials',()=>{
  it.each([22050,44100,48000])('keeps every material and variation finite, short and below ultimate level at %i Hz',rate=>{
    const ultimatePeak=measure(renderUltimateSound('ultimate-strike',rate)).peak;
    for(const family of combatFamilies)for(let variant=0;variant<3;variant++){
      const pcm=renderCombatSound(family,rate,variant),stats=measure(pcm);
      expect(stats.finite).toBe(true);expect(stats.peak).toBeLessThanOrEqual(.741);expect(stats.peak).toBeLessThan(ultimatePeak*.9);
      expect(stats.rms).toBeGreaterThan(.02);expect(pcm.length/rate).toBeGreaterThan(.45);expect(pcm.length/rate).toBeLessThan(.9);
      expect(Math.abs(pcm[0])).toBe(0);expect(Math.abs(pcm[pcm.length-1])).toBe(0);
    }
  });
  it('makes heavy hits sustain a distinct low-mid body instead of only changing pitch',()=>{
    const rate=44100,cut=renderCombatSound('attack',rate,0),heavy=renderCombatSound('attack',rate,1);
    const bandShare=(pcm:Float32Array)=>{
      const a=1-Math.exp(-2*Math.PI*150/rate),b=1-Math.exp(-2*Math.PI*1100/rate);
      let low=0,high=0,band=0,total=0;
      for(const x of pcm){low+=a*(x-low);high+=b*(x-high);band+=(high-low)**2;total+=x*x;}
      return band/total;
    };
    const bodyRms=(pcm:Float32Array)=>{
      let energy=0,n=0;for(let i=Math.round(rate*.08);i<rate*.2;i++,n++)energy+=pcm[i]**2;
      return Math.sqrt(energy/n);
    };
    expect(bandShare(heavy)).toBeGreaterThan(bandShare(cut)*1.3);
    expect(bodyRms(heavy)).toBeGreaterThan(bodyRms(cut)*1.3);
  });
  it('routes basic attacks and real skill templates without overriding an ultimate',()=>{
    expect(combatFamily('attack')).toBe('attack');
    expect(combatFamily('attack','pierce')).toBe('pierce');
    expect(combatFamily('heal','barrier_mend')).toBeUndefined();
    expect(combatFamily('guard','barrier')).toBe('barrier');
    expect(combatFamily('ultimate-strike','attack')).toBeUndefined();
    expect(combatFamily('confirm')).toBeUndefined();
  });
  it('varies repeat strikes reproducibly within the ordinary volume class',()=>{
    for(const family of combatFamilies){
      const a=renderCombatSound(family,44100,0),b=renderCombatSound(family,44100,1);
      expect(a).toEqual(renderCombatSound(family,44100,3));expect(a).not.toEqual(b);
      expect(Math.abs(20*Math.log10(measure(a).rms/measure(b).rms))).toBeLessThan(8);
    }
  });
});
