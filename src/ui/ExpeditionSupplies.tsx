import {useState} from 'react';
import type {Content,DungeonDef,GameCommand,GameSave} from '../domain/types';
import {DEFAULT_RECYCLING,SUPPLY_IDS,recyclingPlan,type ExpeditionLoadout} from '../domain/expedition-supplies';
import {industryCatalog,industryItem,industryRecipe,dungeonIndustryProfile,industryChapter,installedIndustry,industryEnergyCost} from '../domain/industry';
import {materialName} from '../content';
import {tr,useLanguage} from '../locales/i18n';
import {Button,InventorySection,InventorySprite} from './index';
import {runUIInteraction} from './interaction';
import './expedition-supplies.css';
const descriptions:Record<typeof SUPPLY_IDS[number],string>={
 'polishing-cloth':'原石1個をすぐ研磨。中身は手で磨いた場合と同じです。',
 'polishing-kit':'原石1個につき1個消費。選んだ原石をまとめて研磨します。',
 'recovery-lantern':'次の連続討伐で、指定した回収物のタップが一段階多く進みます。',
 'exploration-incense':'次の連続討伐で、指定した資源か原石が出やすくなります。',
};
export function ExpeditionSupplies({save,content,busy,command}:{save:GameSave;content:Content;busy:boolean;command:(c:GameCommand)=>Promise<boolean>}){
 const lang=useLanguage(),settings=save.recycling??DEFAULT_RECYCLING,[keep,setKeep]=useState(settings.keep),[wanted,setWanted]=useState(100),[converted,setConverted]=useState(false);
 const plan=recyclingPlan(save,content,wanted),stock=save.industry?.stock??{},chapter=industryChapter(save,content);
 return <section className="expedition-supplies" aria-label={tr('遠征用品')}>
  <h3>{tr('余剰素材を、次の旅の道具に')}</h3><p>{tr('必要な素材を残し、余った分だけ研磨粉に変えます。')}</p><p>{tr('イベント・物語の専用素材は変換しません。')}</p>
  <div className="supplies-balance"><InventorySprite id="polishing-powder"/>{tr('研磨粉')} <strong>{stock['polishing-powder']??0}</strong><small>{tr('研磨布なら約{0}個分').replace('{0}',String(Math.floor((stock['polishing-powder']??0)/3)))}</small></div>
  <label className="supplies-number">{tr('素材ごとに残す数')}<input type="number" min={0} max={9999999} value={keep} onChange={e=>setKeep(Math.max(0,Math.min(9999999,Number(e.target.value))))}/></label>
  <Button variant="secondary" disabled={busy||!Number.isSafeInteger(keep)} onClick={()=>command({type:'recyclingSettings',settings:{...settings,keep}})}>{tr('残す数を保存')}</Button>
  <label className="supplies-check"><input type="checkbox" checked={settings.protectNeeds} disabled={busy} onChange={e=>void command({type:'recyclingSettings',settings:{...settings,protectNeeds:e.target.checked}})}/>{tr('仲間化・覚醒に必要な分も保護')}</label>
  <label className="supplies-check"><input type="checkbox" checked={settings.automatic} disabled={busy} onChange={e=>void command({type:'recyclingSettings',settings:{...settings,automatic:e.target.checked}})}/>{tr('帰還・加工時に研磨粉を約200まで補充')}</label>
  <div className="toolbar">{[30,100,300].map(n=><Button key={n} size="sm" variant="secondary" selected={wanted===n} onClick={()=>setWanted(n)}>+{n}</Button>)}</div>
  <InventorySection id="recycle-preview" title={tr('変換する素材')} count={Object.keys(plan.materials).length}>{Object.entries(plan.materials).map(([id,n])=><div className="supplies-material" key={id}><span>{materialName(id)}</span><strong>−{n}</strong><small>{tr('保護')} {plan.reserve[id]}</small></div>)}</InventorySection>
  <Button disabled={busy||!plan.powder} onClick={async()=>{if(await command({type:'recycleMaterials',powder:wanted}))setConverted(true);}}>{tr('余剰素材を変換')} · {tr('研磨粉')} +{plan.powder}</Button>{converted&&<p role="status">{tr('余剰素材を研磨粉に変換しました。')}</p>}
  <InventorySection id="expedition-supply-recipes" title={tr('遠征用品の製作')} count={industryCatalog.recipes.filter(r=>SUPPLY_IDS.includes(Object.keys(r.outputs)[0] as typeof SUPPLY_IDS[number])).length}><div className="supplies-recipes">{industryCatalog.recipes.filter(r=>SUPPLY_IDS.includes(Object.keys(r.outputs)[0] as typeof SUPPLY_IDS[number])).map(r=>{
   const id=r.id,output=Object.keys(r.outputs)[0],missing=Object.entries(r.inputs).some(([key,n])=>(stock[key]??0)<n),locked=r.chapter>chapter,station=!!r.station&&!installedIndustry(save.industry??{version:1,stock:{},machines:{},updatedAt:0},r.station);
   return <article key={id}><header><InventorySprite id={output}/><strong>{r.name[lang]}</strong><small>T{r.tier} · {stock[output]??0}</small></header><p>{tr(descriptions[output as keyof typeof descriptions])}</p><small>{Object.entries(r.inputs).map(([key,n])=>`${industryItem(key).name[lang]} ${stock[key]??0}/${n}`).join(' / ')} → ×{r.outputs[output]}</small>
    <small>{r.station?industryItem(r.station).name[lang]:tr('手作業')} · {r.seconds}{tr('秒')} · {industryEnergyCost(r,1)} L</small>
    <Button variant="secondary" disabled={busy||missing||locked||station||!!save.industry?.job||industryEnergyCost(r,1)>(save.industry?.power?.stored??0)} onClick={()=>command({type:'industryCraft',recipeId:id,count:1})}>{tr(locked?'章を進めて解放':station?'必要な設備が未設置':missing?'材料不足':save.industry?.job?'加工中':industryEnergyCost(r,1)>(save.industry?.power?.stored??0)?'灯力不足':'製作')}</Button>
   </article>;
  })}</div></InventorySection>
 </section>;
}
export function ExpeditionLoadoutPicker({save,dungeon,content,value,onChange}:{save:GameSave;dungeon:DungeonDef;content:Content;value:ExpeditionLoadout;onChange:(x:ExpeditionLoadout)=>void}){
 const lang=useLanguage(),stock=save.industry?.stock??{};
 return <div className="expedition-loadout" aria-label={tr('持ち込む遠征用品')}>
  <label>{tr('回収用の灯')} · {stock['recovery-lantern']??0}<select value={value.collection??''} disabled={!stock['recovery-lantern']} onChange={e=>runUIInteraction(()=>onChange({...value,collection:e.target.value?e.target.value as 'material'|'gem':undefined}),'select')}><option value="">{tr('使わない')}</option><option value="material">{tr('素材の回収を補助')}</option><option value="gem">{tr('原石の回収を補助')}</option></select></label>
  <label>{tr('探索の香')} · {stock['exploration-incense']??0}<select value={value.incense??''} disabled={!stock['exploration-incense']} onChange={e=>runUIInteraction(()=>onChange({...value,incense:e.target.value||undefined}),'select')}><option value="">{tr('使わない')}</option><option value="gem">{tr('原石を狙う')}</option>{Object.keys(dungeonIndustryProfile(dungeon,content).drops).map(id=><option key={id} value={id}>{industryItem(id).name[lang]}</option>)}</select></label>
  <small>{tr('出発時に各1個消費。準備を閉じても消費しません。')}</small>
 </div>;
}
