import {describe,expect,it} from 'vitest';
import {content} from '../src/content';
import {applyCommand,createInitialSave} from '../src/application/game';
import type {Content,GameCommand,GameSave} from '../src/domain/types';
import {decodeBackup,encodeBackup} from '../src/platform/save-backup';
import {assertSaveCompatibility} from '../src/platform/save';
import {migrateSaveTo110} from '../src/platform/save-migration';
import {summarizeExpeditions} from '../src/domain/expedition-ledger';
const stage={id:'records-lab',name:'記録検証',subtitle:'',description:'',artId:'cathedral',published:true,kind:'normal' as const,waves:[[{characterId:'pale-wolf'}],[{characterId:'pale-wolf'}]]};
const C:Content={...content,dungeons:[...content.dungeons,stage]};
const act=(s:GameSave,c:GameCommand,now?:number)=>applyCommand(s,c,C,{now});
function replay(s:GameSave,now=3000){let n=0;while(s.battle?.phase==='playing'){if(n++>1000)throw Error('replay not ending');s=act(s,{type:'replay'},now);}return s;}
function depart(now?:number){return replay(act(createInitialSave(C,58),{type:'depart',dungeonId:stage.id,potions:5},now),now);}
function finishWave(s:GameSave,now=3000){for(const u of s.battle!.units){if(u.side==='party'){u.hp=u.maxHp;u.attack=100000;u.speed=1000;}else{u.hp=1;u.attack=0;u.defense=0;u.speed=0;}}s.battle!.initialUnits=structuredClone(s.battle!.units);return replay(act(s,{type:'round'},now),now);}
function win(now?:number){let s=depart(now);for(let n=0;s.battle?.phase!=='reward'&&n<5;n++)s=finishWave(s,5000);expect(s.battle?.phase).toBe('reward');return s;}
describe('native expedition observations, terminal commit and backup',()=>{
 it('commits a two-wave victory once, separating secured loot from claim-only rewards and excluding claim waiting',()=>{
  const reward=win(1000),before=structuredClone(reward),battle=reward.battle!,pending={...battle.pendingMaterials},earnedGold=battle.goldEarned,gems=reward.memoryGems!.items.length;
  const review=structuredClone(battle.tracking!.review);expect(review.rounds).toBe(2);expect(review.enemyDamageTaken).toBe(2);
  const done=act(reward,{type:'claim'},100000);const row=done.expeditionHistory![0];
  expect(row.outcome).toBe('victory');expect(row.durationMs).toBe(4000);expect(row.potionsUsed).toBe(0);expect(row.review).toEqual(review);
  expect(row.earned.gold).toBe(earnedGold+20);expect(done.gold-reward.gold).toBe(20);expect(row.earned.materials).toEqual(pending);expect(row.earned.gemCount).toBe(gems);expect(row.earned.stones).toBe(3);
  expect(done.memoryGems!.items).toEqual(reward.memoryGems!.items);expect(reward).toEqual(before);
  expect(()=>act(done,{type:'claim'},200000)).toThrow();expect(done.expeditionHistory).toHaveLength(1);
  expect(decodeBackup(encodeBackup(done,C),C).save).toEqual(done);assertSaveCompatibility(done,C);
 });
 it('counts potion HP recovery once without reprocessing the previous replay batch',()=>{
  let s=depart(1000);const pilot=s.battle!.units.find(u=>u.side==='party')!;pilot.hp=Math.floor(pilot.maxHp/2);s.battle!.initialUnits=structuredClone(s.battle!.units);
  const old=structuredClone(s.battle!.tracking!.review),stock=s.potions;
  const p=act(s,{type:'potion',unitId:pilot.uid},2000);expect(p.potions).toBe(stock-1);expect(p.battle!.tracking!.review.potionsUsed).toBe(1);expect(p.battle!.tracking!.review.partyHealing).toBe(p.battle!.units.find(u=>u.uid===pilot.uid)!.hp-pilot.hp);
  expect(p.battle!.tracking!.review.rounds).toBe(old.rounds);expect(()=>act(p,{type:'potion',unitId:pilot.uid},2001)).toThrow();
 });
 it('keeps separate potion, fairy, bloom and round batches in the same round without replay duplication',()=>{
  let s=depart(1000),b=s.battle!;b.round=2;
  const pilot=b.units.find(u=>u.side==='party')!;pilot.hp=Math.floor(pilot.maxHp/2);b.initialUnits=structuredClone(b.units);
  b.fairies={seed:123,checked:'0:2',visitor:{id:`${b.id}:fairy:0:2`,side:'left',wave:0,round:2}};
  b.blooms={seed:123,checked:'0:2',growth:3,flower:{id:`${b.id}:flower:0:2`,kind:'heal',wave:0,round:2}};
  s=act(s,{type:'potion',unitId:pilot.uid},2000);const afterPotion=structuredClone(s.battle!.tracking!.review);
  s=act(s,{type:'battleFairy',fairyId:s.battle!.fairies!.visitor!.id},2100);s=replay(s,2200);expect(s.battle!.tracking!.review).toEqual(afterPotion);
  const hp=s.battle!.units.find(u=>u.uid===pilot.uid)!.hp;s=act(s,{type:'battleBloom',bloomId:s.battle!.blooms!.flower!.id},2300);
  const gained=s.battle!.units.find(u=>u.uid===pilot.uid)!.hp-hp,afterBloom=structuredClone(s.battle!.tracking!.review);
  expect(gained).toBeGreaterThan(0);expect(afterBloom.partyHealing).toBe(afterPotion.partyHealing+gained);expect(afterBloom.rounds).toBe(0);
  s=replay(s,2400);expect(s.battle!.tracking!.review).toEqual(afterBloom);
  s=act(s,{type:'round'},2500);expect(s.battle!.tracking!.review.rounds).toBe(1);const review=structuredClone(s.battle!.tracking!.review);
  s=replay(s,3000);expect(s.battle!.tracking!.review).toEqual(review);
 });
 it('keeps secured gold and gems after retreat, loses provisional materials and commits just one retreat on return',()=>{
  let s=finishWave(depart(1000));expect(s.battle?.phase).toBe('ready');expect(s.battle!.wave).toBe(1);
  const gold=s.gold,gems=s.memoryGems!.items.length;expect(gold).toBeGreaterThan(100);expect(gems).toBeGreaterThan(0);expect(Object.keys(s.battle!.pendingMaterials).length).toBeGreaterThan(0);
  const failed=act(s,{type:'retreat'},6000);expect(failed.battle!.pendingMaterials).toEqual({});
  const done=act(failed,{type:'leaveFailure'},90000),row=done.expeditionHistory![0];
  expect(row.outcome).toBe('retreat');expect(row.durationMs).toBe(5000);expect(row.earned.gold).toBe(gold-100);expect(row.earned.gemCount).toBe(gems);expect(row.earned.materials).toEqual({});expect(row.earned.stones).toBe(0);expect(row.earned.dust).toEqual({});
  expect(done.gold).toBe(gold);expect(done.memoryGems!.items).toHaveLength(gems);expect(()=>act(done,{type:'leaveFailure'},100000)).toThrow();expect(done.expeditionHistory).toHaveLength(1);
 });
 it('records a real total defeat, with the actual hit wave and round and without double counting replays',()=>{
  let s=depart(1000);for(const u of s.battle!.units){if(u.side==='party'){u.hp=1;u.attack=0;u.speed=0;}else{u.hp=u.maxHp=10000;u.attack=100000;u.speed=1000;}}
  s.battle!.initialUnits=structuredClone(s.battle!.units);
  for(let n=0;s.battle?.phase!=='failed'&&n<8;n++)s=replay(act(s,{type:'round'},7000),7000);
  expect(s.battle!.phase).toBe('failed');expect(s.battle!.tracking!.review.largestHit).toMatchObject({wave:0,round:1,amount:1});
  const review=structuredClone(s.battle!.tracking!.review),done=act(s,{type:'leaveFailure'},100000);
  expect(done.expeditionHistory![0].outcome).toBe('defeat');expect(done.expeditionHistory![0].review).toEqual(review);expect(done.expeditionHistory![0].durationMs).toBe(6000);
 });
 it('records a real round-limit timeout separately from defeat or retreat',()=>{
  let s=depart(1000);s.battle!.round=100;
  for(const u of s.battle!.units){u.hp=u.maxHp=10000;u.attack=0;u.defense=100000;u.cooldowns=Object.fromEntries(C.characters.find(c=>c.id===u.characterId)!.skillIds.map(id=>[id,999]));}
  s.battle!.initialUnits=structuredClone(s.battle!.units);s=replay(act(s,{type:'round'},8000),8000);
  expect(s.battle!.phase).toBe('failed');expect(s.battle!.failureKind).toBe('timeout');
  const done=act(s,{type:'leaveFailure'},90000);expect(done.expeditionHistory![0].outcome).toBe('timeout');expect(done.expeditionHistory![0].durationMs).toBe(7000);
 });
 it('does not classify the legacy update safety exit as an ordinary farm attempt',()=>{
  const old=finishWave(depart(1000));delete old.battle!.tracking;
  old.appVersion='0.1.0';old.contentVersion='initial-r1';old.rulesVersion='1';delete old.towerRecord;
  old.battle!.contentVersion='initial-r1';old.battle!.rulesVersion='1';
  const migrated=migrateSaveTo110(old,C);expect(migrated.battle).toBeNull();expect(migrated.expeditionHistory??[]).toEqual([]);expect(migrated.seed).toBe(old.seed);
 });
 it('does not backfill an already active untracked run from only its last wave',()=>{
  let s=finishWave(depart(1000));delete s.battle!.tracking;s=act(s,{type:'retreat'},5000);s=act(s,{type:'leaveFailure'},9000);expect(s.expeditionHistory??[]).toEqual([]);
 });
 it('records new runs with unknown or reversed clocks but excludes them from hourly estimates',()=>{
  for(const start of [undefined,9000]){const s=act(win(start),{type:'claim'},100000);expect(s.expeditionHistory![0].durationMs).toBeNull();expect(s.expeditionHistory![0].review).toBeDefined();expect(summarizeExpeditions(s.expeditionHistory!).perHour).toBeNull();}
 });
 it('rejects invalid imported observations without changing inventory or a valid saved record',()=>{
  const s=act(win(1000),{type:'claim'},9000),before=structuredClone(s);
  for(const patch of [{durationMs:-1},{durationMs:Infinity},{outcome:'unknown'},{earned:{...s.expeditionHistory![0].earned,gold:-1}}]){const bad=structuredClone(s);Object.assign(bad.expeditionHistory![0],patch);expect(()=>assertSaveCompatibility(bad,C)).toThrow();}
  expect(s).toEqual(before);
 });
 it('leaves RNG and existing resource outcomes unchanged when tracking metadata is absent',()=>{
  const tracked=depart(1000),plain=structuredClone(tracked);delete plain.battle!.tracking;
  const a=finishWave(tracked),b=finishWave(plain);
  for(const key of ['gold','stones','materials','seed','memoryGems']as const)expect(a[key]).toEqual(b[key]);expect(a.battle!.seed).toBe(b.battle!.seed);
 });
});
