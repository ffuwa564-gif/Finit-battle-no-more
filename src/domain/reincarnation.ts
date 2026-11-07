import type {Content,GameSave} from './types';
import {WORLD_START} from './world-map';
export interface ReincarnationState {version:1;count:number;previousChoices:Record<string,string>}
export interface ReincarnationDefinition {endingNodeId:string;introSceneId:string;dungeonIds:string[]}
export const REBIRTH_SHELL='palimpsest:common';
export const REBIRTH_CORE='palimpsest:rare';
export const ASCENDED_RECIPES={6:{dust:90,shell:3,core:0,gold:3000},7:{dust:270,shell:9,core:3,gold:10000}} as const;
export function reincarnationLock(save:GameSave,content:Content):string|null{
 const def=content.worldStory,state=save.worldStory,rebirth=content.reincarnation;
 if(!def||!state||!rebirth)return 'メインストーリーの結末を迎えると解放されます。';
 if(save.battle||state.active||save.novels?.active||save.memoryGems?.pending||save.memoryGems?.polish)return '探索・会話・石の作業を終えてから転生してください。';
 if(!def.chapters.every(c=>state.completed.includes(c.endingNodeId)||state.carriedChapters.includes(c.number))||!state.completed.includes(rebirth.endingNodeId))return '第7章と七管理者編の結末を読了すると転生できます。';
 if((save.reincarnation?.count??0)>=999999)return '転生回数の上限に達しています。';
 return null;
}
/** Only narrative progress is rewound. The first-clear ledger and every possession stay intact. */
export function reincarnate(save:GameSave,content:Content):void{
 const lock=reincarnationLock(save,content);if(lock)throw new Error(lock);
 const previous=save.worldStory!;
 save.reincarnation={version:1,count:(save.reincarnation?.count??0)+1,previousChoices:{...previous.choices}};
 save.worldStory={version:1,profile:{...previous.profile},carriedChapters:[],completed:[],choices:{},position:{...WORLD_START},dungeonProgress:[]};
 save.novels??={seen:[]};save.novels.active={sceneId:content.reincarnation!.introSceneId,page:0};
}
export function ascendedRecipe(tier:unknown){return tier===6||tier===7?ASCENDED_RECIPES[tier]:undefined;}
export function hasTier7(gem:{roll?:{power:number;value:number;trait:string}}):boolean{return Boolean(gem.roll&&(gem.roll.power>=280||gem.roll.trait!=='none'&&gem.roll.value>=280));}
export function reincarnationStageLock(dungeonId:string,save:Pick<GameSave,'completedDungeonIds'> & Partial<Pick<GameSave,'reincarnation'|'novels'>>,content:Content):string|null{
 const def=content.reincarnation;if(!def?.dungeonIds.includes(dungeonId))return null;
 if(!save.reincarnation?.count)return '転生後に解放される裏ルートです。';
 const index=def.dungeonIds.indexOf(dungeonId),scene=index===0?def.introSceneId:`${def.dungeonIds[index-1]}-after`;
 if(!save.novels?.seen.includes(scene))return '先に裏側の記録を読んでください。';
 return null;
}
export function validReincarnation(value:unknown):value is ReincarnationState{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;const s=value as ReincarnationState;
 return s.version===1&&Number.isSafeInteger(s.count)&&s.count>=1&&s.count<=999999&&Boolean(s.previousChoices)&&typeof s.previousChoices==='object'&&!Array.isArray(s.previousChoices)&&Object.entries(s.previousChoices).length<=1000&&Object.entries(s.previousChoices).every(([k,v])=>typeof k==='string'&&typeof v==='string');
}
