import catalog from '../content/medals.json';
import { industryCatalog } from './industry';
import type { Ailment, Battle, Content, GameSave } from './types';
export const medalFeats = ['full-party','linked-three','barrier-500','no-potion','three-ailments','clock-acceleration','wolf-finish','elaine-rescue','liora-guard','noelle-double','seris-pierce','low-band-tower'] as const;
export type MedalFeat = typeof medalFeats[number];
export interface MedalState { version: 1; earned: string[]; feats: MedalFeat[]; trackedId?: string; titleId?: string }
export interface MedalRun { version: 1; facts: MedalFeat[]; linkedActions: number; ailments: Ailment[]; finale: boolean }
interface Text { ja: string; en: string }
type Condition = { kind:'installed'|'craftedAny'; itemIds:string[]; amount:number } | { kind:'craftTier'|'clears'|'chapters'|'tower'|'owned'; amount:number } | {kind:'power';metric:'generated'|'consumed';amount:number} | {kind:'story';nodeId:string} | {kind:'feat';feat:MedalFeat};
export type MedalAction = {kind:'workshop';recipeId:string}|{kind:'dungeon';dungeonId:string}|{kind:'character';characterId:string}|{kind:'map'|'party'|'recruit'};
export interface MedalDef { id:string;branch:string;rank:number;column:number;parents:string[];name:Text;description:Text;flavor:Text;icon:string;condition:Condition;action:MedalAction }
export const medalCatalog = catalog as unknown as {version:1;branches:{id:string;name:Text;icon:string}[];medals:MedalDef[]};
export const medalById = (id:string) => medalCatalog.medals.find(m=>m.id===id);
export const createMedalRun = ():MedalRun=>({version:1,facts:[],linkedActions:0,ailments:[],finale:false});
const add = <T>(list:T[],value:T) => { if(!list.includes(value))list.push(value); };
const state = (save:GameSave) => save.medals ??= {version:1,earned:[],feats:[]};
export function medalProgress(m:MedalDef,save:GameSave,content:Content) {
  const c=m.condition,s=save.industry,machines=Object.values(s?.machines??{});
  const installed=(id:string)=>machines.filter(m=>m.kind===id).length;
  const made=(id:string)=>Math.max((s?.stock[id]??0)+installed(id),industryCatalog.recipes.reduce((n,r)=>n+(s?.crafted?.[r.id]??0)*(r.outputs[id]??0),0));
  let value=0;const target='amount'in c?c.amount:1;
  switch(c.kind){
    case 'installed':value=c.itemIds.reduce((n,id)=>n+installed(id),0);break;
    case 'craftedAny':value=c.itemIds.reduce((n,id)=>n+made(id),0);break;
    case 'craftTier':value=Math.max(0,...industryCatalog.recipes.filter(r=>(s?.crafted?.[r.id]??0)>0).map(r=>r.tier),...industryCatalog.items.filter(i=>i.kind!=='raw'&&made(i.id)>0).map(i=>i.tier));break;
    case 'power':value=s?.power?.[c.metric]??0;break;
    case 'clears':value=save.completedDungeonIds.length;break;
    case 'chapters':value=(content.chapters??[]).filter(ch=>ch.dungeonIds.every(id=>save.completedDungeonIds.includes(id))).length;break;
    case 'tower':value=Math.max(0,...(save.towerRecord?.completedFloors??[]),...content.dungeons.filter(d=>save.completedDungeonIds.includes(d.id)).map(d=>d.towerFloor??0));break;
    case 'story':value=save.worldStory?.completed.includes(c.nodeId)?1:0;break;
    case 'owned':value=save.ownedIds.length;break;
    case 'feat':value=save.medals?.feats.includes(c.feat)?1:0;break;
  }
  return {value:Math.min(value,target),target};
}
export const medalAvailable = (m:MedalDef,save:GameSave) => m.parents.every(id=>save.medals?.earned.includes(id));
export const medalRevealed = (m:MedalDef,save:GameSave) => Boolean(save.medals?.earned.includes(m.id)||!m.parents.length||m.parents.some(id=>save.medals?.earned.includes(id)));
/** Monotonic proofs survive consumed resources and currently locked parent nodes. */
export function synchronizeMedals(save:GameSave,content:Content) {
  const s=state(save);
  for(const m of [...medalCatalog.medals].sort((a,b)=>a.rank-b.rank)){
    if(s.earned.includes(m.id)||!medalAvailable(m,save))continue;
    const p=medalProgress(m,save,content);if(p.value>=p.target)s.earned.push(m.id);
  }
}
export function nextMedal(save:GameSave):MedalDef|undefined {
  const earned=save.medals?.earned??[];
  const ancestor=(m:MedalDef):MedalDef=>{const missing=m.parents.map(medalById).find(p=>p&&!earned.includes(p.id));return missing?ancestor(missing):m;};
  const tracked=save.medals?.trackedId?medalById(save.medals.trackedId):undefined;
  return tracked&&!earned.includes(tracked.id)?ancestor(tracked):medalCatalog.medals.find(m=>!earned.includes(m.id)&&medalAvailable(m,save));
}
/** Observe generated events once. This never resolves actions or consumes RNG. */
export function trackMedalBatch(battle:Battle,content:Content) {
  const run=battle.medalRun;if(!run)return;
  let before=battle.initialUnits;
  for(const event of battle.events){
    if(event.clockAction==='finale')run.finale=true;
    const after=event.unitsAfter;if(!after)continue;
    const actor=before.find(u=>u.uid===event.actorId),skill=content.skills.find(s=>s.id===event.skillId);
    if(actor?.side==='party'&&event.actionSelection){
      if(event.coordinationAction==='linked')run.linkedActions=Math.min(1000000,run.linkedActions+1);
      const killed=before.filter(u=>u.side==='enemy'&&u.hp>0&&after.some(v=>v.uid===u.uid&&v.hp===0));
      if(actor.characterId==='pale-wolf'&&killed.some(u=>u.boss&&(content.characters.find(c=>c.id===u.characterId)?.strength??0)>(content.characters.find(c=>c.id==='pale-wolf')?.strength??10)))add(run.facts,'wolf-finish');
      if(actor.characterId==='seris'&&skill?.template==='pierce'&&killed.some(u=>u.boss))add(run.facts,'seris-pierce');
      if(actor.characterId==='noelle'&&skill?.template==='area'&&killed.length>=2)add(run.facts,'noelle-double');
      if(actor.characterId==='elaine'&&skill&&['heal','cleanse','mend_pair'].includes(skill.template)&&before.some(u=>u.side==='party'&&u.hp>0&&u.hp<=u.maxHp/4&&after.some(v=>v.uid===u.uid&&v.hp>u.hp&&v.hp>=v.maxHp/2)))add(run.facts,'elaine-rescue');
      if(actor.characterId==='liora'&&skill?.template==='guard'&&before.some(u=>u.side==='party'&&u.hp>0&&u.hp<=u.maxHp/4&&event.targetIds?.includes(u.uid)))add(run.facts,'liora-guard');
      if(event.statusAction==='inflict'&&event.ailment&&event.targetIds?.some(id=>after.some(u=>u.uid===id&&u.side==='enemy')))add(run.ailments,event.ailment);
    }
    before=after;
  }
}
/** Called only after claim has validated victory and atomically confirmed its loot. */
export function commitMedalVictory(save:GameSave,battle:Battle,content:Content) {
  const s=state(save),run=battle.medalRun,party=battle.units.filter(u=>u.side==='party'),alive=(id:string)=>party.some(u=>u.characterId===id&&u.hp>0);
  const full=battle.partyIds.length===4&&party.filter(u=>u.hp>0).length===4;
  if(full)add(s.feats,'full-party');
  if(full&&battle.tracking?.review.potionsUsed===0)add(s.feats,'no-potion');
  if((battle.tracking?.review.partyBarrierAbsorbed??0)>=500)add(s.feats,'barrier-500');
  if(run){
    for(const feat of run.facts)if((feat!=='wolf-finish'||alive('pale-wolf'))&&(feat!=='liora-guard'||full))add(s.feats,feat);
    if(run.linkedActions>=3)add(s.feats,'linked-three');
    if(run.ailments.length>=3)add(s.feats,'three-ailments');
    const dungeon=content.dungeons.find(d=>d.id===battle.dungeonId);
    if(dungeon?.bossClock&&!run.finale&&content.characters.find(c=>c.id===battle.leaderId)?.leaderEffect==='acceleration')add(s.feats,'clock-acceleration');
  }
  if(content.dungeons.find(d=>d.id===battle.dungeonId)?.towerFloor&&battle.partyIds.length===4&&alive('pale-wolf')&&battle.partyIds.every(id=>(content.characters.find(c=>c.id===id)?.strength??Infinity)<=15))add(s.feats,'low-band-tower');
}
const object=(v:unknown):v is Record<string,unknown>=>Boolean(v&&typeof v==='object'&&!Array.isArray(v));
const known=(v:unknown,ids:readonly string[]):v is string[]=>Array.isArray(v)&&v.every(s=>typeof s==='string'&&ids.includes(s))&&new Set(v).size===v.length;
export function validMedals(v:unknown):v is MedalState {
  const ids=medalCatalog.medals.map(m=>m.id);
  return object(v)&&v.version===1&&known(v.earned,ids)&&known(v.feats,medalFeats)&&(v.trackedId===undefined||typeof v.trackedId==='string'&&ids.includes(v.trackedId))&&(v.titleId===undefined||typeof v.titleId==='string'&&v.earned.includes(v.titleId));
}
export function validMedalRun(v:unknown):v is MedalRun {
  return object(v)&&v.version===1&&known(v.facts,medalFeats)&&known(v.ailments,['confusion','sleep','paralysis','charm'])&&Number.isSafeInteger(v.linkedActions)&&Number(v.linkedActions)>=0&&Number(v.linkedActions)<=1000000&&typeof v.finale==='boolean';
}
export function validateMedals(content:Content):string[] {
  const errors:string[]=[],ids=new Set<string>(),branches=new Set(medalCatalog.branches.map(b=>b.id));
  for(const m of medalCatalog.medals){
    if(!m.id||ids.has(m.id)||!['hammer','flame','sparkles','compass','tower','moon','shield','swords','heart','clock','wolf'].includes(m.icon)||!branches.has(m.branch)||!Number.isInteger(m.rank)||m.rank<0||![0,1,2].includes(m.column)||![m.name,m.description,m.flavor].every(t=>t.ja.trim()&&t.en.trim()))errors.push('Invalid medal: '+m.id);
    ids.add(m.id);
    if(m.parents.some(id=>{const p=medalById(id);return !p||p.branch!==m.branch||p.rank>=m.rank;}))errors.push('Invalid medal parents: '+m.id);
    const c=m.condition,a=m.action;
    if(!['installed','craftedAny','craftTier','clears','chapters','tower','owned','power','story','feat'].includes(c.kind)||!['workshop','dungeon','character','map','party','recruit'].includes(a.kind))errors.push('Unknown medal contract: '+m.id);
    if(c.kind==='power'&&!['generated','consumed'].includes(c.metric)||c.kind==='craftTier'&&c.amount>5)errors.push('Invalid medal measure: '+m.id);
    if('amount'in c&&(!Number.isSafeInteger(c.amount)||c.amount<=0))errors.push('Invalid medal target: '+m.id);
    if('itemIds'in c&&c.itemIds.some(id=>!industryCatalog.items.some(i=>i.id===id)))errors.push('Invalid medal item: '+m.id);
    if(c.kind==='feat'&&!medalFeats.includes(c.feat))errors.push('Invalid medal feat: '+m.id);
    if(c.kind==='story'&&!content.worldStory?.nodes.some(n=>n.id===c.nodeId))errors.push('Invalid medal story: '+m.id);
    if(a.kind==='workshop'&&!industryCatalog.recipes.some(r=>r.id===a.recipeId)||a.kind==='dungeon'&&!content.dungeons.some(d=>d.published&&d.id===a.dungeonId)||a.kind==='character'&&!content.characters.some(ch=>ch.published&&ch.id===a.characterId))errors.push('Invalid medal action: '+m.id);
  }
  return errors;
}
