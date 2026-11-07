import {gemName,gemPowerTier} from '../domain/memory-gems';
import {useState} from 'react';
import type {Content,GameCommand,GameSave} from '../domain/types';
import {PARTY_PRESET_LIMIT,presetProblem} from '../domain/party-presets';
import {tr} from '../locales/i18n';
import {Button,InventorySection} from './index';
import './party-presets.css';
export function PartyPresets({save,content,busy,command}:{save:GameSave;content:Content;busy:boolean;command:(c:GameCommand)=>unknown}){
 const [slot,setSlot]=useState(0),[name,setName]=useState(''),[confirm,setConfirm]=useState<'save'|'delete'|null>(null);
 const preset=save.partyPresets?.find(p=>p.slot===slot),problem=preset?presetProblem(preset,save,content):null;
 const change=(n:number)=>{setSlot(n);setName(save.partyPresets?.find(p=>p.slot===n)?.name??'');setConfirm(null);};
 const store=()=>{command({type:'savePartyPreset',slot,name:name.trim()||preset?.name||`${tr('編成')} ${slot+1}`});setConfirm(null);};
 return <InventorySection id="party-presets" title="保存した編成" count={save.partyPresets?.length??0}><section className="party-presets" aria-label={tr('編成の保存と呼び出し')}>
 <label>{tr('保存枠')}<select aria-label={tr('保存枠')} value={slot} onChange={e=>change(Number(e.target.value))}>{Array.from({length:PARTY_PRESET_LIMIT},(_,i)=><option key={i} value={i}>{i+1} · {save.partyPresets?.find(p=>p.slot===i)?.name??tr('未保存')}</option>)}</select></label>
 {preset&&<div className="party-presets__preview"><strong>{preset.name}</strong><ol>{preset.partyIds.map(id=><li key={id}>{tr(content.characters.find(c=>c.id===id)?.name??id)}{id===preset.leaderId&&<small> · {tr('リーダー')}</small>}{save.memoryGems?.items.find(g=>g.id===preset.equipped[id])&&<small>{tr(gemName(save.memoryGems.items.find(g=>g.id===preset.equipped[id])!))} · T{gemPowerTier(save.memoryGems.items.find(g=>g.id===preset.equipped[id])!)}</small>}</li>)}</ol><p>{tr('記憶石も保存時の装備に持ち替えます。')}</p>{problem&&<p role="status">{tr(problem)}</p>}<Button disabled={busy||!!save.battle||!!problem||!!save.memoryGems?.pending} onClick={()=>command({type:'loadPartyPreset',slot})}>{tr('この編成を使う')}</Button></div>}
 <label>{tr('編成名')}<input maxLength={32} value={name} placeholder={preset?.name??`${tr('編成')} ${slot+1}`} onChange={e=>{setName(e.target.value);setConfirm(null);}}/></label>
 <Button disabled={busy||!!save.battle} onClick={()=>preset?setConfirm('save'):store()}>{tr('現在の編成を保存')}</Button>
 {preset&&<Button variant="secondary" disabled={busy||!!save.battle} onClick={()=>setConfirm('delete')}>{tr('保存した編成を削除')}</Button>}
 {confirm&&<div className="party-presets__confirmation" role="group" aria-label={tr('保存内容の確認')}><p>{tr(confirm==='save'?'保存した編成を上書きしますか？':'保存した編成を削除しますか？')}</p><div><Button disabled={busy} onClick={()=>{if(confirm==='save')store();else{command({type:'deletePartyPreset',slot});setConfirm(null);}}}>{tr('確定')}</Button><Button variant="secondary" onClick={()=>setConfirm(null)}>{tr('キャンセル')}</Button></div></div>}
 </section></InventorySection>;
}
