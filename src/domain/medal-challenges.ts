import type {Battle,BattleEvent,Content,Unit} from './types';
import type {MedalRun,MedalState} from './medals';
import {gemDefinition,gemTier} from './memory-gems';

export const characterMedalChallenges=[
 {id:'sakuya-ward',actorIds:['mireille'],effect:'barrier',template:'barrier'},
 {id:'flora-cleanse',actorIds:['flora'],effect:'cleanse',template:'cleanse'},
 {id:'hebe-pair',actorIds:['hebe'],effect:'pair',template:'mend_pair'},
 {id:'persephone-sleep',actorIds:['persephone'],effect:'sleep',template:'sleep'},
 {id:'artemis-finish',actorIds:['artemis'],effect:'pierce',template:'pierce'},
 {id:'nike-shatter',actorIds:['nike'],effect:'shatter',template:'shatter'},
 {id:'lunette-three',actorIds:['lunette','lunette-awakened'],effect:'area',template:'area'},
 {id:'kuzuha-debuff',actorIds:['kuzuha','kuzuha-awakened'],effect:'debuff',template:'debuff'},
 {id:'selene-ultimate',actorIds:['selene'],effect:'heal-ultimate',template:null},
 {id:'nox-ultimate',actorIds:['nox'],effect:'kill-ultimate',template:null},
] as const;
export const formationMedalChallenges=['four-roles','only-r-sr','only-r','no-stones','mixed-r-high','one-family','three-families','no-healer','budget-tower','without-athena'] as const;
export const medalChallengeIds=[...formationMedalChallenges,...characterMedalChallenges.map(c=>c.id)] as const;
export type MedalChallengeId=typeof medalChallengeIds[number];
export type CharacterMedalChallengeId=typeof characterMedalChallenges[number]['id'];
const add=<T>(list:T[],id:T)=>{if(!list.includes(id))list.push(id);};

/** Called inside the existing event observer, never from a visual replay. */
export function observeMedalChallenge(run:MedalRun,battle:Battle,content:Content,before:Unit[],event:BattleEvent,after:Unit[]) {
 // An older expedition has no complete record of these skills. Do not start a partial proof.
 if(!run.challenges||!event.actionSelection||event.statusAction==='friendly_fire')return;
 const actor=before.find(u=>u.uid===event.actorId&&u.side==='party');if(!actor||actor.hp<=0)return;
 const contracts=characterMedalChallenges.filter(c=>(c.actorIds as readonly string[]).includes(actor.characterId));if(!contracts.length)return;
 const definition=content.characters.find(c=>c.id===actor.characterId);
 const skill=definition?.skillIds.includes(event.skillId??'')?content.skills.find(s=>s.id===event.skillId):undefined;
 const targets=before.filter(u=>event.targetIds?.includes(u.uid));
 const next=(u:Unit)=>after.find(v=>v.uid===u.uid);
 const friends=targets.filter(u=>u.side==='party'&&u.hp>0),enemies=targets.filter(u=>u.side==='enemy'&&u.hp>0);
 const healed=friends.filter(u=>(next(u)?.hp??u.hp)>u.hp);
 const hurt=enemies.filter(u=>(next(u)?.hp??u.hp)<u.hp);
 const bossKilled=enemies.some(u=>u.boss&&next(u)?.hp===0);
 const barrier=(u:Unit)=>((u.barrierUntil??-1)>=battle.round?u.barrier??0:0);
 for(const c of contracts){
  if(c.template!==null&&skill?.template!==c.template)continue;
  let proved=false;
  switch(c.effect){
   case 'barrier':proved=friends.some(u=>{const n=next(u);return n&&barrier(n)>barrier(u);});break;
   case 'cleanse':proved=friends.some(u=>{const n=next(u);return n&&(Object.entries(u.ailments??{}).some(([id,a])=>a.turns>0&&!(n.ailments?.[id as keyof NonNullable<Unit['ailments']>]?.turns))||((u.debuffUntil??-1)>=battle.round&&(u.debuffStrength??0)>0&&(n.debuffUntil??-1)<battle.round));});break;
   case 'pair':proved=healed.length>=2;break;
   case 'sleep':proved=event.statusAction==='inflict'&&event.ailment==='sleep'&&enemies.some(u=>!(u.ailments?.sleep?.turns)&&Boolean(next(u)?.ailments?.sleep?.turns));break;
   case 'pierce':proved=bossKilled;break;
   case 'shatter':proved=enemies.some(u=>{const n=next(u);return n&&barrier(u)>0&&barrier(n)<barrier(u);});break;
   case 'area':proved=hurt.length>=3;break;
   case 'debuff':proved=enemies.some(u=>{const n=next(u);return n&&(n.debuffUntil??-1)>=battle.round&&(n.debuffStrength??0)>0&&((u.debuffUntil??-1)<battle.round||(n.debuffUntil??-1)>(u.debuffUntil??-1)||(n.debuffStrength??0)>(u.debuffStrength??0));});break;
   case 'heal-ultimate':proved=Boolean(event.ultimate)&&healed.length>=2;break;
   case 'kill-ultimate':proved=Boolean(event.ultimate)&&bossKilled;break;
  }
  if(proved)add(run.challenges,c.id);
 }
}

/** Confirmed end-state facts; no stats, commands, seeds or combat snapshots are changed. */
export function commitMedalChallenges(record:MedalState,battle:Battle,content:Content) {
 if(battle.phase!=='reward'||battle.nextPhase!=='reward'||battle.cursor<battle.events.length||battle.units.some(u=>u.side==='enemy'&&u.hp>0))return;
 record.victories=Math.min(1_000_000,(record.victories??0)+1);
 const boss=battle.initialUnits.some(u=>u.side==='enemy'&&u.boss);if(!boss)return;
 const earned=record.challenges??=[];
 for(const id of battle.medalRun?.challenges??[]){
  const c=characterMedalChallenges.find(c=>c.id===id);
  if(c&&battle.units.some(u=>u.side==='party'&&u.hp>0&&(c.actorIds as readonly string[]).includes(u.characterId)))add(earned,id);
 }
 const party=battle.partyIds.map(id=>content.characters.find(c=>c.id===id));
 const full=party.length===4&&new Set(battle.partyIds).size===4&&party.every(c=>c&&battle.units.some(u=>u.side==='party'&&u.characterId===c.id&&u.hp>0));if(!full)return;
 if(new Set(party.map(c=>c!.role)).size>=4)add(earned,'four-roles');
 if(party.every(c=>c!.rarity==='R'||c!.rarity==='SR'))add(earned,'only-r-sr');
 if(party.every(c=>c!.rarity==='R'))add(earned,'only-r');
 if(party.filter(c=>c!.rarity==='R').length>=2&&party.some(c=>c!.rarity==='SSR'||c!.rarity==='XR'))add(earned,'mixed-r-high');
 if(party.every(c=>c!.role!=='healer'))add(earned,'no-healer');
 const gems=battle.partyIds.map(id=>battle.memoryGems?.[id]);
 if(gems.every(g=>!g))add(earned,'no-stones');
 if(gems.every(g=>g)){
  const families=new Set(gems.map(g=>gemDefinition(g!).family));
  if(families.size===1)add(earned,'one-family');
  if(families.size===3)add(earned,'three-families');
 }
 const floor=content.dungeons.find(d=>d.id===battle.dungeonId)?.towerFloor??0;
 if(floor>=10){
  if(party.every(c=>(c!.familyId??c!.id)!=='athena'))add(earned,'without-athena');
  if(gems.every(g=>g&&gemTier(g)<=3))add(earned,'budget-tower');
 }
}
