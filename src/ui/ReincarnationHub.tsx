import {useState} from 'react';
import {Moon,BookOpen,Gem,RotateCcw,Lock} from 'lucide-react';
import {Button,Modal,InventorySection} from './index';
import {MemoryGemTier} from './MemoryGemTier';
import {reincarnationLock,ASCENDED_RECIPES,REBIRTH_SHELL,REBIRTH_CORE} from '../domain/reincarnation';
import {dungeonLock} from '../domain/events';
import {novelAvailable} from '../domain/novels';
import {GEM_DEFINITIONS,GEM_VARIANTS,gemTraitInfo,supportedGemTraits,type GemVariant,type GemTrait} from '../domain/memory-gems';
import type {Content,GameSave,GameCommand} from '../domain/types';
import {tr} from '../locales/i18n';
import './reincarnation.css';
export function ReincarnationHub({save,content,busy,command,onSelect}:{save:GameSave;content:Content;busy:boolean;command:(c:GameCommand)=>Promise<boolean>;onSelect:(id:string)=>void}){
 const[open,setOpen]=useState(false),[confirm,setConfirm]=useState(false),[tier,setTier]=useState<6|7>(6),[defId,setDefId]=useState('pale-ward'),[variant,setVariant]=useState<GemVariant>('pure'),[trait,setTrait]=useState<GemTrait>('none');
 if(!content.reincarnation)return null;
 const unlocked=Boolean(save.reincarnation?.count),lock=reincarnationLock(save,content),recipe=ASCENDED_RECIPES[tier];
 const known=GEM_DEFINITIONS.filter(d=>!d.fixedRoll&&save.memoryGems?.seen.includes(d.id));
 const def=known.find(d=>d.id===defId)??known[0],actualVariant=def?.variants.includes(variant)?variant:'pure',actualTrait=def&&supportedGemTraits(def).includes(trait)?trait:'none';
 const enough=def&&save.gold>=recipe.gold&&(save.memoryGems?.dust[def.family]??0)>=recipe.dust&&(save.materials[REBIRTH_SHELL]??0)>=recipe.shell&&(save.materials[REBIRTH_CORE]??0)>=recipe.core;
 return <><Button variant="secondary" className="reincarnation-entry" onClick={()=>setOpen(true)}><Moon size={17}/>{tr('転生・記録の裏側')}{unlocked&&<MemoryGemTier tier={7}/>}</Button>
 <Modal open={open} title={tr('転生・記録の裏側')} onClose={()=>{setOpen(false);setConfirm(false);}}><div className="reincarnation-hub">
 <p>{tr('救った少女たちの明日を残したまま、選ばなかった道を歩き直す。')}</p>
 <p>{tr('転生回数：{0}').replace('{0}',String(save.reincarnation?.count??0))}</p>
 <InventorySection id="reincarnation-rewind" title="ストーリーを巻き戻す" tone="night">
 <p>{tr('戻るもの：現在の章、会話・選択、今周のストーリーダンジョン攻略、旅の現在地。')}</p>
 <p>{tr('引き継ぐもの：仲間・覚醒・装備・記憶石・所持品・金貨・工房・勲章・初回報酬の記録。')}</p>
 <p>{tr('初回報酬は再取得できません。転生後はT7、T6/T7製作、超絶難度の裏ルートが解放されます。')}</p>
 {lock&&<p role="status">{tr(lock)}</p>}
 {!confirm?<Button disabled={busy||Boolean(lock)} onClick={()=>setConfirm(true)}><RotateCcw size={16}/>{tr('転生の内容を確認')}</Button>:<div className="reincarnation-confirm"><strong>{tr('ストーリー進行を巻き戻します。よろしいですか？')}</strong><Button disabled={busy||Boolean(lock)} onClick={async()=>{if(await command({type:'reincarnate'})){setConfirm(false);setOpen(false);}}}>{tr('引き継いで転生する')}</Button><Button variant="secondary" disabled={busy} onClick={()=>setConfirm(false)}>{tr('やめる')}</Button></div>}
 </InventorySection>
 {!unlocked&&<p className="reincarnation-lock"><Lock size={16}/>{tr('裏ルートと上位製作は転生後に解放されます。')}</p>}
 {unlocked&&<><section aria-label={tr('記録の裏側')}><h3><BookOpen size={17}/>{tr('記録の裏側')}</h3><p>{tr('既存の少女たちの記憶が敵として現れます。管理者本人を仲間の姿で描いたものではありません。')}</p>
 {content.reincarnation.dungeonIds.map((id,i)=>{const d=content.dungeons.find(d=>d.id===id)!,scene=content.novels?.find(n=>n.id===`${id}-after`),reason=dungeonLock(d,save,content),available=scene&&novelAvailable(scene,save);return <article className="reincarnation-stage" key={id}><small>{i+1} / {content.reincarnation!.dungeonIds.length} · {tr('超絶難度')}</small><h4>{tr(d.name)}</h4><p>{tr(d.description)}</p><p>{tr('踏破素材：輪廻の殻 {0}・深層核 {1}').replace('{0}',String(i+1)).replace('{1}',String(i===5?2:1))}</p><small>{tr('踏破宝箱の各項目：T7 {0}%').replace('{0}',String((d.gemLoot?.tier7Chance??0)*100))}</small>{reason&&<p>{tr(reason)}</p>}<div className="reincarnation-actions"><Button disabled={busy||Boolean(reason)} onClick={()=>{setOpen(false);onSelect(id);}}>{tr('挑戦する')}</Button>{scene&&<Button variant="secondary" disabled={busy||!available} onClick={async()=>{if(await command({type:'novelStart',sceneId:scene.id}))setOpen(false);}}><BookOpen size={15}/>{tr(save.novels?.seen.includes(scene.id)?'記録を再読':'裏側の記録を読む')}</Button>}</div></article>;})}
 </section><InventorySection id="reincarnation-forge" title="T6・T7の上位製作" count={known.length} tone="night"><p>{tr('一度入手した石の種類・変種・追加特性を指定できます。固定製作品は対象外。製作した石は保護されます。')}</p>
 <div className="reincarnation-forge"><label>{tr('製作Tier')}<select value={tier} onChange={e=>setTier(Number(e.target.value) as 6|7)}><option value={6}>T6 · 220–239</option><option value={7}>T7 · 280–299</option></select></label>
 <label>{tr('石の種類')}<select value={def?.id??''} onChange={e=>{setDefId(e.target.value);setVariant('pure');setTrait('none');}}>{known.map(d=><option key={d.id} value={d.id}>{tr(d.name)}</option>)}</select></label>
 <label>{tr('変種')}<select value={actualVariant} onChange={e=>setVariant(e.target.value as GemVariant)}>{def?.variants.map(v=><option key={v} value={v}>{tr(GEM_VARIANTS[v].name)}</option>)}</select></label>
 <label>{tr('追加特性')}<select value={actualTrait} onChange={e=>setTrait(e.target.value as GemTrait)}>{def&&supportedGemTraits(def).map(v=><option key={v} value={v}>{tr(gemTraitInfo[v].name)}</option>)}</select></label></div>
 <p>{tr('技効力と、指定した追加特性を選択Tierの範囲内で抽選します。')}</p>
 <p>{tr('必要素材：金貨 {0}・同系統の欠片 {1}・輪廻の殻 {2}・深層核 {3}').replace('{0}',String(recipe.gold)).replace('{1}',String(recipe.dust)).replace('{2}',String(recipe.shell)).replace('{3}',String(recipe.core))}</p>
 <p>{tr('所持：輪廻の殻 {0}・深層核 {1}').replace('{0}',String(save.materials[REBIRTH_SHELL]??0)).replace('{1}',String(save.materials[REBIRTH_CORE]??0))}</p>
 <Button disabled={busy||!enough||Boolean(save.memoryGems?.pending||save.memoryGems?.polish)} onClick={()=>def&&command({type:'craftAscendedGem',defId:def.id,tier,variant:actualVariant,trait:actualTrait})}><Gem size={17}/>{tr('T{0}を製作').replace('{0}',String(tier))}</Button>
 </InventorySection></>}
 </div></Modal></>;
}
