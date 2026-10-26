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
      expect(stats.finite).toBe(true);expect(stats.peak).toBeLessThanOrEqual(.601);expect(stats.peak).toBeLessThan(ultimatePeak*.8);
      expect(stats.rms).toBeGreaterThan(.02);expect(pcm.length/rate).toBeGreaterThan(.25);expect(pcm.length/rate).toBeLessThan(.8);
      expect(Math.abs(pcm[0])).toBe(0);expect(Math.abs(pcm[pcm.length-1])).toBe(0);
    }
  });
  it('routes basic attacks and real skill templates without overriding an ultimate',()=>{
    expect(combatFamily('attack')).toBe('attack');
    expect(combatFamily('attack','pierce')).toBe('pierce');
    expect(combatFamily('heal','barrier_mend')).toBe('heal');
    expect(combatFamily('guard','barrier')).toBe('barrier');
    expect(combatFamily('ultimate-strike','attack')).toBeUndefined();
    expect(combatFamily('confirm')).toBeUndefined();
  });
  it('varies repeat strikes reproducibly without changing their volume class or duration',()=>{
    for(const family of combatFamilies){
      const a=renderCombatSound(family,44100,0),b=renderCombatSound(family,44100,1);
      expect(a).toEqual(renderCombatSound(family,44100,3));expect(a).not.toEqual(b);expect(a.length).toBe(b.length);
      expect(Math.abs(20*Math.log10(measure(a).rms/measure(b).rms))).toBeLessThan(3);
    }
  });
});
