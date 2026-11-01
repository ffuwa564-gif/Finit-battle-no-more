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
      const expected=({'echo-chain':['chain','echo'],'shield-cannon':['barrier','shield'],'rabbit-battery':['battery','ultimate'],'status-weave':['sleep'],'enduring-tides':['drain','regen'],'skill-rewind':['rewind']} as Record<string,string[]>)[definition.id];
      expect(expected).toBeDefined();
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
  it('shows actual new enemy sleep rather than a resisted or text-only attempt',()=>{
    for(const stage of stages){
      const demo=createBuildDemo(content,'status-weave',stage),frame=demo.frames.find(f=>f.highlight==='sleep')!;
      expect(frame.event.ailment).toBe('sleep');expect(frame.event.statusAction).not.toBe('resist');
      const target=frame.units.find(u=>u.side==='enemy'&&frame.event.targetIds?.includes(u.uid)&&u.ailments?.sleep)!;
      expect(target).toBeDefined();expect(frame.before.find(u=>u.uid===target.uid)?.ailments?.sleep).toBeUndefined();
      expect(target.ailments!.sleep!.turns).toBeGreaterThan(0);
    }
  });
  it('shows damage-derived self-healing and a real allied regeneration tick as different frames',()=>{
    for(const stage of stages){
      const demo=createBuildDemo(content,'enduring-tides',stage),drain=demo.frames.find(f=>f.highlight==='drain')!,regen=demo.frames.find(f=>f.highlight==='regen')!;
      expect(gemDefinitionForSkill(drain.event.skillId!)?.id).toBe('night-dew');
      const actor=drain.units.find(u=>u.uid===drain.event.actorId)!,old=drain.before.find(u=>u.uid===actor.uid)!;
      expect(actor.hp).toBeGreaterThan(old.hp);expect(drain.units.some(u=>u.side==='enemy'&&u.hp<drain.before.find(b=>b.uid===u.uid)!.hp)).toBe(true);
      expect(regen.event.kind).toBe('heal');expect(regen.event.text).toContain('月の雫の再生');
      const recovered=regen.units.find(u=>u.uid===regen.event.actorId)!,before=regen.before.find(u=>u.uid===recovered.uid)!;
      expect(recovered.side).toBe('party');expect(before.regenUntil).toBeGreaterThanOrEqual(regen.round);expect(recovered.hp).toBeGreaterThan(before.hp);
      expect(demo.proof.drainHealing).toBeGreaterThan(0);expect(demo.proof.regenerationHealing).toBeGreaterThan(0);
    }
  });
  it('shows the other ally normal-skill cooldown changing, without inventing a gem cooldown or charge reduction',()=>{
    for(const stage of stages){
      const demo=createBuildDemo(content,'skill-rewind',stage),frame=demo.frames.find(f=>f.highlight==='rewind')!;
      expect(gemDefinitionForSkill(frame.event.skillId!)?.id).toBe('rewind-thread');
      const target=frame.units.find(u=>frame.event.targetIds?.includes(u.uid))!,old=frame.before.find(u=>u.uid===target.uid)!;
      expect(target.uid).not.toBe(frame.event.actorId);
      const normal=content.characters.find(ch=>ch.id===target.characterId)!.skillIds;
      expect(normal.some(id=>(target.cooldowns[id]??0)<(old.cooldowns[id]??0))).toBe(true);
      for(const [id,until]of Object.entries(old.cooldowns).filter(([id])=>id.startsWith('memory:')))expect(target.cooldowns[id]).toBe(until);
      expect(target.ultimateCharge).toBe(old.ultimateCharge);
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
