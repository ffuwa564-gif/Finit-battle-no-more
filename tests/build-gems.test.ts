import {describe,it,expect} from 'vitest';
import {content} from '../src/content';
import {advanceReplay,createBattle,resolveRound} from '../src/domain/engine';
import {gemSkill,gemPowerMultiplier,type MemoryGem} from '../src/domain/memory-gems';
import {afterBuildPrimary,buildGemUsable,releaseBossReserves,expireBuildGems,validConcordMark,validGemPreparation} from '../src/domain/build-gems';
import {consumeRoyalPower,observeRoyalRank,royalLethalProtection} from '../src/domain/royal-leaders';
import {assertSaveCompatibility} from '../src/platform/save';
import {createInitialSave} from '../src/application/game';
import type {Battle,BattleEvent,Content} from '../src/domain/types';
const stage={...content.dungeons[0],id:'gem-lab',kind:'trial' as const,waves:[[{characterId:'stone-drake'},{characterId:'stone-drake'}]]};
const lab:Content={...content,dungeons:[...content.dungeons,stage]};
function ready(b:Battle){while(b.phase==='playing'){b.cursor=b.events.length-1;b=advanceReplay(b,lab);}return b;}
function setup(defId:string,ids=['seris','noelle','elaine','liora']){
 const g:MemoryGem={id:'build-test',defId,variant:'pure',roll:{power:80,trait:'none',value:0}};
 const b=ready(createBattle(lab,ids,ids[0],stage.id,0,42,'build-test'));
 b.memoryGems={[ids[0]]:g};
 for(const u of b.units){u.speed=u.side==='enemy'?1:u.characterId===ids[0]?100:50;u.cooldowns=Object.fromEntries(content.characters.find(c=>c.id===u.characterId)!.skillIds.map(id=>[id,999]));if(u.side==='enemy'){u.hp=u.maxHp=10000;u.attack=1;} }
 b.partyOrder={kind:'skill',skillId:gemSkill(g).id};return{b,g};
}
const me=(b:Battle)=>b.units.find(u=>u.uid===`party:${b.partyIds[0]}`)!;
const foes=(b:Battle)=>b.units.filter(u=>u.side==='enemy');
const capture=(b:Battle)=>{const events:Omit<BattleEvent,'id'>[]=[];return {events,emit:(e:Omit<BattleEvent,'id'>)=>events.push(e),hit:(s:typeof b.units[number],t:typeof b.units[number],p:number)=>{const n=Math.min(t.hp,p);t.hp-=n;return{unit:t,amount:n,absorbed:0};}};};

describe('new stone actions use the real battle engine',()=>{
 it.each(['sweep-prism','overflow-ember','concord-mark','disrupt-sigil','camp-lantern','boss-reserve'])('%s takes a normal action with a shared cooldown',id=>{
  const {b,g}=setup(id);if(id==='disrupt-sigil')foes(b)[0].boss=true;if(id==='camp-lantern')me(b).hp=Math.floor(me(b).maxHp*.5);
  const result=resolveRound(b,lab).battle;
  const event=result.events.find(e=>e.actorId===me(b).uid&&e.actionSelection)!;
  expect(event.skillId).toBe(gemSkill(g).id);expect(me(result).cooldowns['memory:slot']).toBeGreaterThan(b.round);
  expect(result).toEqual(resolveRound(JSON.parse(JSON.stringify(b)),lab).battle);
  if(id==='sweep-prism')expect(event.targetIds).toHaveLength(2);
  if(id==='concord-mark')expect(event.unitsAfter!.some(u=>u.concordMark?.contributors.length===0)).toBe(true);
  if(id==='camp-lantern'||id==='boss-reserve')expect(me(result).gemPreparation?.kind).toBe(id==='camp-lantern'?'camp':'reserve');
 });
 it('boosts the first disruption hit in a charging round even before windup damage is recorded',()=>{
  const {b}=setup('disrupt-sigil');foes(b)[0].boss=true;
  const charging={...lab,dungeons:lab.dungeons.map(d=>d.id===stage.id?{...d,bossStrike:{every:2,power:200,name:'test',windup:{breakPercent:99,weakenedPower:50,recoveryPercent:20}}}:d)};
  const r=resolveRound(b,charging).battle,ordinary=resolveRound(b,lab).battle;
  const amount=(x:Battle)=>x.events.find(e=>e.actorId===me(b).uid&&e.actionSelection)!.amount!;
  expect(foes(b)[0].bossWindup).toBeUndefined();expect(amount(r)).toBeGreaterThan(amount(ordinary));
 });
 it('uses one hunt hand for preparation and does not fire it for free',()=>{
  const ids=['seris','noelle','elaine','liora'];let b=ready(createBattle(content,ids,'liora','veiled-cloister',0,42,'hunt-prep','hunt'));
  const g:MemoryGem={id:'prep',defId:'boss-reserve',variant:'pure'};b.memoryGems={seris:g};b.partyOrder={kind:'skill',skillId:gemSkill(g).id};
  const r=resolveRound(b,content).battle;expect(r.hunt!.actions-b.hunt!.actions).toBe(r.events.filter(e=>e.actorId?.startsWith('party:')&&e.actionSelection).length);expect(me(r).gemPreparation).toBeDefined();
 });
 it('rejects single-target sweep and nonboss disruption in both AI and manual eligibility',()=>{
  const {b,g}=setup('sweep-prism');foes(b)[1].hp=0;expect(buildGemUsable(me(b),b,gemSkill(g))).toBe(false);
  expect(buildGemUsable(me(b),b,gemSkill({...g,defId:'disrupt-sigil'}))).toBe(false);
 });
 it('spills only real primary killing overkill, never a capped nonkill',()=>{
  const {b,g}=setup('overflow-ember'),a=me(b),target=foes(b)[0],other=foes(b)[1],c=capture(b),before=structuredClone(b.units);
  afterBuildPrimary(b,a,before,gemSkill(g),'attack',[target.uid],900,lab,c.hit,c.emit);expect(c.events).toHaveLength(0);
  target.hp=0;afterBuildPrimary(b,a,before,gemSkill(g),'attack',[target.uid],900,lab,c.hit,c.emit);expect(c.events).toHaveLength(1);expect(other.hp).toBeLessThan(other.maxHp);
  expect(c.events[0].amount).toBeLessThanOrEqual(Math.floor(a.attack*gemPowerMultiplier(g,content.characters.find(c=>c.id===a.characterId),lab)*1.2));
 });
 it('needs two different primary HP hits for a mark, and zero HP damage never progresses it',()=>{
  const {b}=setup('concord-mark'),a=me(b),t=foes(b)[0],other=b.units.find(u=>u.uid==='party:noelle')!,c=capture(b);
  t.concordMark={sourceId:a.uid,power:100,until:4,contributors:[]};let before=structuredClone(b.units);
  afterBuildPrimary(b,a,before,undefined,'attack',[t.uid],0,lab,c.hit,c.emit);expect(t.concordMark.contributors).toEqual([]);
  t.hp--;afterBuildPrimary(b,a,before,undefined,'attack',[t.uid],0,lab,c.hit,c.emit);expect(t.concordMark.contributors).toEqual([a.uid]);
  before=structuredClone(b.units);t.hp--;afterBuildPrimary(b,a,before,undefined,'attack',[t.uid],0,lab,c.hit,c.emit);expect(c.events).toHaveLength(0);
  before=structuredClone(b.units);t.hp--;afterBuildPrimary(b,other,before,undefined,'attack',[t.uid],0,lab,c.hit,c.emit);expect(c.events).toHaveLength(1);expect(t.concordMark).toBeUndefined();
 });
 it('banks three team kills, heals once, and consumes a reserve only once at the boss',()=>{
  const {b}=setup('camp-lantern'),a=me(b),c=capture(b);a.hp=1;a.gemPreparation={kind:'camp',power:220,kills:2,until:4};
  const before=structuredClone(b.units);foes(b)[0].hp=0;afterBuildPrimary(b,a,before,undefined,'attack',[foes(b)[0].uid],0,lab,c.hit,c.emit);
  expect(a.hp).toBe(1+Math.floor(a.maxHp*.11));expect(a.gemPreparation).toBeUndefined();
  a.gemPreparation={kind:'reserve',power:220,kills:12,until:4};b.round=10;expireBuildGems(b);expect(a.gemPreparation).toBeDefined();
  foes(b)[1].boss=true;releaseBossReserves(b,c.emit);expect(a.gemPreparation).toBeUndefined();expect(a.ultimateCharge).toBe(26);
  const snapshot=structuredClone(b);releaseBossReserves(b,c.emit);expect(b).toEqual(snapshot);
 });
 it('round-trips pending states, rejects invalid references and impossible old-rule states',()=>{
  const {b,g}=setup('concord-mark');foes(b)[0].concordMark={sourceId:me(b).uid,power:100,until:4,contributors:[]};
  const save=createInitialSave(lab);save.battle=b;save.memoryGems!.items.push(g);save.memoryGems!.equipped.seris=g.id;
  expect(()=>assertSaveCompatibility(JSON.parse(JSON.stringify(save)),lab)).not.toThrow();
  const bad=structuredClone(save);foes(bad.battle!)[0].concordMark!.sourceId='missing';expect(()=>assertSaveCompatibility(bad,lab)).toThrow();
  const old=structuredClone(save);old.battle!.rulesVersion='3';old.battle!.contentVersion='v1.28-r1';expect(()=>assertSaveCompatibility(old,lab)).toThrow();
  expect(validConcordMark({sourceId:'x',power:1,until:1,contributors:['x','x']})).toBe(false);expect(validGemPreparation({kind:'reserve',power:1,kills:13,until:1})).toBe(false);
 });
});

describe('high rarity powers require leadership and carry opportunity costs',()=>{
 it('Selene spends her own full ultimate gauge and cannot rescue as a member or after death',()=>{
  const {b}=setup('pale-ward',['selene','seris']);const s=me(b),t=b.units.find(u=>u.uid==='party:seris')!;s.ultimateCharge=100;
  expect(royalLethalProtection(b,t,t.hp,lab)).toBe(t.hp-1);expect(s.ultimateCharge).toBe(0);expect(royalLethalProtection(b,t,t.hp,lab)).toBe(t.hp);
  s.ultimateCharge=100;b.leaderId='seris';expect(royalLethalProtection(b,t,t.hp,lab)).toBe(t.hp);b.leaderId='selene';s.hp=0;expect(royalLethalProtection(b,t,t.hp,lab)).toBe(t.hp);
 });
 it('Astraea consumes the next primary boost once, within its own round',()=>{
  const {b}=setup('pale-ward',['astraea','seris']);b.royalLeader={verdictRound:b.round};expect(consumeRoyalPower(b,me(b),lab,false)).toBe(1);
  expect(consumeRoyalPower(b,me(b),lab,true)).toBe(1.35);expect(consumeRoyalPower(b,me(b),lab,true)).toBe(1);
  b.round++;expect(consumeRoyalPower(b,me(b),lab,true)).toBe(1);
 });
 it('Fortuna rewards actual rank crossings once, without changing kills or loot',()=>{
  const {b}=setup('pale-ward',['fortuna','seris']);b.hunt={stage:'hunting',actions:20,kills:12,serial:20};const c=capture(b),before=structuredClone(b.pendingMaterials);
  observeRoyalRank(b,lab,c.emit);expect(me(b).ultimateCharge).toBe(15);observeRoyalRank(b,lab,c.emit);expect(me(b).ultimateCharge).toBe(15);expect(b.hunt.kills).toBe(12);expect(b.pendingMaterials).toEqual(before);
 });
});
