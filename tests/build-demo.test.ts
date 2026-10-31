import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { createBuildDemo } from '../src/domain/build-demo';
import { BUILD_DEFINITIONS, type BuildStage } from '../src/domain/builds';
import { gemDefinitionForSkill, gemFromSkill, gemFurnaceCharge } from '../src/domain/memory-gems';

const stages:BuildStage[]=['starter','complete','perfect'];
describe('real-engine build demonstrations',()=>{
  it('shows each advertised mechanic in every stage, including the visible excerpt rather than just hidden simulation',()=>{
    for(const definition of BUILD_DEFINITIONS) for(const stage of stages){
      const demo=createBuildDemo(content,definition.id,stage);
      expect(demo.demonstrated,`${definition.id}/${stage}`).toBe(true);
      expect(demo.frames.length).toBeLessThanOrEqual(16);
      const highlights=demo.frames.map(frame=>frame.highlight);
      const expected=definition.id==='echo-chain'?['chain','echo']:definition.id==='shield-cannon'?['barrier','shield']:['battery','ultimate'];
      for(const value of expected) expect(highlights,`${definition.id}/${stage} visible ${value}`).toContain(value);
      for(const frame of demo.frames) expect(frame.units).toEqual(frame.event.unitsAfter);
      expect(demo.initialUnits.every(unit=>!unit.ultimateCharge)).toBe(true);
      const featured=definition.id==='rabbit-battery'?definition.stages[stage].slots[1]:definition.stages[stage].slots[0];
      const cast=demo.events.find(frame=>frame.event.skillId&&gemDefinitionForSkill(frame.event.skillId)?.id===featured.gem.defId)!;
      const actualGem=gemFromSkill(cast.event.skillId!)!;
      expect(actualGem.roll?.power).toBe(featured.gem.power);
      expect(actualGem.roll?.value).toBe(featured.gem.value??0);
      expect(actualGem.roll?.trait).toBe(featured.gem.trait??'none');
    }
  });
  it('chains to a different enemy than the primary single-target hit and waits until the next round for echo',()=>{
    const demo=createBuildDemo(content,'echo-chain','starter');
    const chainIndex=demo.events.findIndex(frame=>frame.highlight==='chain');
    const chain=demo.events[chainIndex], primary=demo.events[chainIndex-1];
    expect(primary.event.actionSelection).toBe(true);
    expect(gemDefinitionForSkill(primary.event.skillId!)?.id).toBe('echo-shard');
    expect(chain.event.actorId).toBe(primary.event.actorId);
    expect(primary.event.targetIds).not.toContain(chain.event.targetIds![0]);
    const echo=demo.events.find(frame=>frame.highlight==='echo')!;
    expect(echo.wave).toBe(chain.wave);
    expect(echo.round).toBeGreaterThan(chain.round);
    expect(echo.event.amount).toBeGreaterThan(0);
  });
  it('shows creation and actual consumption of the same allied shield',()=>{
    for(const stage of stages){
      const demo=createBuildDemo(content,'shield-cannon',stage);
      const shot=demo.frames.find(frame=>frame.highlight==='shield')!;
      expect(gemDefinitionForSkill(shot.event.skillId!)?.id).toBe('shield-break');
      const donor=shot.before.find(unit=>unit.side==='party'&&(unit.barrier??0)>(shot.units.find(next=>next.uid===unit.uid)?.barrier??0))!;
      expect(donor.barrier).toBeGreaterThan(0);
      expect(shot.units.find(unit=>unit.uid===donor.uid)?.barrier??0).toBe(0);
      expect(demo.frames.some(frame=>(frame.units.find(unit=>unit.uid===donor.uid)?.barrier??0)>(frame.before.find(unit=>unit.uid===donor.uid)?.barrier??0))).toBe(true);
      expect(demo.proof.consumedBarrier).toBeGreaterThan(0);
    }
  });
  it('actually charges Lunette and uses her ultimate only with a naturally full gauge',()=>{
    for(const stage of stages){
      const demo=createBuildDemo(content,'rabbit-battery',stage);
      const charge=demo.frames.find(frame=>frame.highlight==='battery')!;
      const rabbit=charge.units.find(unit=>unit.characterId.startsWith('lunette'))!;
      expect(charge.event.targetIds).toContain(rabbit.uid);
      const before=charge.before.find(unit=>unit.uid===rabbit.uid)!;
      expect((rabbit.ultimateCharge??0)-(before.ultimateCharge??0)).toBeGreaterThan(0);
      const furnace=gemFromSkill(charge.event.skillId!)!;
      expect((rabbit.ultimateCharge??0)-(before.ultimateCharge??0)).toBeLessThanOrEqual(gemFurnaceCharge(furnace));
      expect(furnace.roll?.power).toBe(BUILD_DEFINITIONS.find(build=>build.id==='rabbit-battery')!.stages[stage].slots[1].gem.power);
      const ultimate=demo.frames.find(frame=>frame.highlight==='ultimate')!;
      expect(ultimate.before.find(unit=>unit.uid===ultimate.event.actorId)?.ultimateCharge).toBe(100);
      expect(demo.frames.indexOf(ultimate)).toBeGreaterThan(demo.frames.indexOf(charge));
    }
  });
  it('is deterministic and does not mutate definitions or player-facing content',()=>{
    const snapshot=structuredClone(content);
    const first=createBuildDemo(content,'rabbit-battery','complete');
    expect(createBuildDemo(content,'rabbit-battery','complete')).toEqual(first);
    expect(content).toEqual(snapshot);
    expect(()=>createBuildDemo(content,'missing','starter')).toThrow();
  });
});
