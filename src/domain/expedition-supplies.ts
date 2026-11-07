import type { Content, GameSave } from './types';
import { emptyIndustry, dungeonIndustryProfile } from './industry';
import { recruitCost } from './engine';
import { isolatedMaterialSpecies } from './awakening';

export interface RecyclingSettings { keep: number; protectNeeds: boolean; automatic: boolean }
export interface ExpeditionLoadout { collection?: 'material'|'gem'; incense?: string }
export const DEFAULT_RECYCLING: RecyclingSettings={keep:30,protectNeeds:true,automatic:false};
export const SUPPLY_IDS=['polishing-cloth','polishing-kit','recovery-lantern','exploration-incense'] as const;
export const POWDER_VALUE={common:1,rare:5,epic:25} as const;
export function materialReserves(s:GameSave,c:Content):Record<string,number>{
 const settings=s.recycling??DEFAULT_RECYCLING,reserve:Record<string,number>={};
 if(settings.protectNeeds){
  const add=(id:string,n:number)=>{reserve[id]=(reserve[id]??0)+n;};
  for(const char of c.characters.filter(x=>x.published&&x.origin.includes('recruit')&&!s.ownedIds.includes(x.id)))for(const cost of recruitCost(char))add(cost.materialId,cost.count);
  for(const a of c.awakenings??[])if(!s.ownedIds.includes(a.awakenedId))add(a.cost.materialId,a.cost.count);
  for(const e of c.events??[]){if(!s.ownedIds.includes(e.normalId))add(e.normalCost.materialId,e.normalCost.count);if(!s.ownedIds.includes(e.awakenedId))add(e.awakenedCost.materialId,e.awakenedCost.count);}
 }
 for(const id of Object.keys(s.materials))reserve[id]=Math.max(reserve[id]??0,settings.keep);
 return reserve;
}
export function recyclingPlan(s:GameSave,c:Content,wanted:number){
 const reserve=materialReserves(s,c),materials:Record<string,number>={};let powder=0;
 const ids=Object.keys(s.materials).filter(id=>{const[species,rarity]=id.split(':');return rarity in POWDER_VALUE&&c.species.some(x=>x.id===species)&&!isolatedMaterialSpecies(c,species);}).sort((a,b)=>POWDER_VALUE[a.split(':')[1] as keyof typeof POWDER_VALUE]-POWDER_VALUE[b.split(':')[1] as keyof typeof POWDER_VALUE]||a.localeCompare(b));
 for(const id of ids){const value=POWDER_VALUE[id.split(':')[1] as keyof typeof POWDER_VALUE],available=Math.max(0,s.materials[id]-(reserve[id]??0));const n=Math.min(available,Math.max(0,Math.ceil((wanted-powder)/value)));if(n){materials[id]=n;powder+=n*value;}}
 return {materials,powder,reserve};
}
export function recycleMaterials(s:GameSave,c:Content,wanted:number,now:number,automatic=false):number{
 if(!Number.isSafeInteger(wanted)||wanted<1||wanted>10000)throw Error('変換する研磨粉の数が正しくありません。');
 const plan=recyclingPlan(s,c,wanted);if(!plan.powder){if(automatic)return 0;throw Error('保護した分を除く余剰素材がありません。');}
 const industry=s.industry??=emptyIndustry(now),next=(industry.stock['polishing-powder']??0)+plan.powder;if(next>9999999)throw Error('工房の所持数が上限に達しました。');
 for(const[id,n]of Object.entries(plan.materials))s.materials[id]-=n;
 industry.stock['polishing-powder']=next;return plan.powder;
}
export function replenishPowder(s:GameSave,c:Content,now:number):number{
 if(!s.recycling?.automatic)return 0;const needed=200-(s.industry?.stock['polishing-powder']??0);return needed>0?recycleMaterials(s,c,needed,now,true):0;
}
export function quickPolish(s:GameSave,ids:string[],tool:'polishing-cloth'|'polishing-kit',now:number):void{
 const inv=s.memoryGems;
 if(!Array.isArray(ids)||ids.length<1||ids.length>100||new Set(ids).size!==ids.length||!SUPPLY_IDS.includes(tool)||!['polishing-cloth','polishing-kit'].includes(tool))throw Error('研磨する原石と道具を選んでください。');
 if(tool==='polishing-cloth'&&ids.length!==1)throw Error('まとめて研磨には連続研磨キットを使ってください。');
 if(inv?.polish&&now<inv.polish.expiresAt)throw Error('手で研磨中の原石を先に仕上げてください。');
 const raws=ids.map(id=>inv?.rough?.find(r=>r.id===id));if(raws.some(x=>!x)||ids.some(id=>inv!.items.some(g=>g.id===id)))throw Error('研磨する原石がありません。');
 if((s.industry?.stock[tool]??0)<ids.length)throw Error('研磨道具が足りません。');
 s.industry!.stock[tool]-=ids.length;
 for(const raw of raws){inv!.items.push(structuredClone(raw!.result));if(!inv!.seen.includes(raw!.result.defId))inv!.seen.push(raw!.result.defId);}
 inv!.rough=inv!.rough!.filter(r=>!ids.includes(r.id));delete inv!.polish;
}
export function consumeExpeditionLoadout(s:GameSave,c:Content,dungeonId:string,loadout:ExpeditionLoadout|undefined):ExpeditionLoadout|undefined{
 if(!loadout)return;if(!validLoadout(loadout))throw Error('この探索で使える遠征用品を選んでください。');const d=c.dungeons.find(d=>d.id===dungeonId)!;
 if(loadout.collection!==undefined&&!['material','gem'].includes(loadout.collection)||loadout.incense!==undefined&&loadout.incense!=='gem'&&!Object.hasOwn(dungeonIndustryProfile(d,c).drops,loadout.incense))throw Error('この探索で使える遠征用品を選んでください。');
 const items=[...(loadout.collection?['recovery-lantern']:[]),...(loadout.incense?['exploration-incense']:[])];
 if(items.some(id=>(s.industry?.stock[id]??0)<1))throw Error('遠征用品が足りません。');
 for(const id of items)s.industry!.stock[id]--;return structuredClone(loadout);
}
export function validRecycling(x:unknown):x is RecyclingSettings{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!['keep','protectNeeds','automatic'].includes(k)))return false;const s=x as RecyclingSettings;return Number.isSafeInteger(s.keep)&&s.keep>=0&&s.keep<=9999999&&typeof s.protectNeeds==='boolean'&&typeof s.automatic==='boolean';}
export function validLoadout(x:unknown):x is ExpeditionLoadout{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!['collection','incense'].includes(k)))return false;const s=x as ExpeditionLoadout;return (s.collection===undefined||['material','gem'].includes(s.collection))&&(s.incense===undefined||typeof s.incense==='string'&&/^[a-z-]{1,40}$/.test(s.incense));}
