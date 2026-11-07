import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Crown,Pencil,Trash2} from 'lucide-react';
import {gemName} from '../domain/memory-gems';
import type {Content,GameCommand,GameSave} from '../domain/types';
import {PARTY_PRESET_LIMIT,presetProblem} from '../domain/party-presets';
import {tr} from '../locales/i18n';
import {Button,InventorySection} from './index';
import {PortraitArt} from './PortraitArt';
import './party-presets.css';
export function PartyPresets({save,content,busy,command}:{save:GameSave;content:Content;busy:boolean;command:(c:GameCommand)=>unknown}){
 const matches=(p:NonNullable<GameSave['partyPresets']>[number])=>p.leaderId===save.leaderId&&p.partyIds.join('|')===save.partyIds.join('|')&&p.partyIds.every(id=>(p.equipped[id]??null)===(save.memoryGems?.equipped[id]??null));
 const [slot,setSlot]=useState(()=>save.partyPresets?.find(matches)?.slot??0),[name,setName]=useState(''),[editing,setEditing]=useState(false),[confirm,setConfirm]=useState<'save'|'delete'|null>(null);
 const dots=useRef<HTMLElement>(null);
 useEffect(()=>{const row=dots.current,item=row?.querySelector<HTMLElement>('[aria-pressed="true"]');if(row&&item)row.scrollLeft=item.offsetLeft-row.offsetLeft-row.clientWidth/2+22;},[slot]);
 const gesture=useRef<{id:number;x:number;y:number}|undefined>(undefined);
 const preset=save.partyPresets?.find(p=>p.slot===slot),problem=preset?presetProblem(preset,save,content):null;
 const change=(n:number)=>{if(busy||n<0||n>=PARTY_PRESET_LIMIT||n===slot)return;setSlot(n);setName('');setEditing(false);setConfirm(null);const p=save.partyPresets?.find(p=>p.slot===n);if(p&&!save.battle&&!save.memoryGems?.pending&&!presetProblem(p,save,content))command({type:'loadPartyPreset',slot:n});};
 const store=()=>{command({type:'savePartyPreset',slot,name:name.trim()||preset?.name||`${tr('編成')} ${slot+1}`});setConfirm(null);setEditing(false);};
 return <InventorySection id="party-presets" title="保存した編成" count={save.partyPresets?.length??0}><section className="party-presets" aria-label={tr('編成の保存と呼び出し')}>
 <header className="party-presets__pager"><Button variant="icon" aria-label={tr('前の編成')} disabled={busy||slot===0} onClick={()=>change(slot-1)}><ChevronLeft/></Button><div><small>{slot+1} / {PARTY_PRESET_LIMIT}</small><strong>{preset?.name??tr('未保存')}{preset&&matches(preset)&&<span>{tr('使用中')}</span>}</strong></div><Button variant="icon" aria-label={tr('次の編成')} disabled={busy||slot===PARTY_PRESET_LIMIT-1} onClick={()=>change(slot+1)}><ChevronRight/></Button></header>
 <div className="party-presets__swipe" role="group" tabIndex={0} aria-label={tr('左右にスワイプして編成を切り替え')} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='ArrowRight'){e.preventDefault();change(slot+1);}if(e.key==='ArrowLeft'){e.preventDefault();change(slot-1);}}} onPointerDown={e=>{if(busy||!e.isPrimary)return;gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerCancel={()=>{gesture.current=undefined;}} onPointerUp={e=>{const g=gesture.current;gesture.current=undefined;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3)change(slot+(dx<0?1:-1));}}>
 <div key={slot} className="party-presets__roster">{(preset?.partyIds??save.partyIds).map(id=>{const ch=content.characters.find(c=>c.id===id),gem=save.memoryGems?.items.find(g=>g.id===preset?.equipped[id]);return <div key={id}>{ch&&<PortraitArt character={ch} face/>}<strong>{tr(ch?.name??id)}{id===(preset?.leaderId??save.leaderId)&&<Crown size={12}/>}</strong>{gem&&<small>{tr(gemName(gem))}</small>}</div>;})}</div>
 {!preset&&<p>{tr('現在の編成をこの枠に保存できます。')}</p>}
 </div>
 <nav ref={dots} className="party-presets__dots" aria-label={tr('保存枠')}>{Array.from({length:PARTY_PRESET_LIMIT},(_,i)=><Button key={i} variant="icon" size="sm" selected={i===slot} disabled={busy} aria-label={`${tr('編成')} ${i+1}`} onClick={()=>change(i)}><span data-saved={!!save.partyPresets?.some(p=>p.slot===i)}>{i+1}</span></Button>)}</nav>
 {problem&&<p role="status">{tr(problem)}</p>}
 {editing&&<label>{tr('編成名')}<input maxLength={32} value={name} placeholder={preset?.name??`${tr('編成')} ${slot+1}`} onChange={e=>setName(e.target.value)}/></label>}
 <div className="party-presets__tools"><Button disabled={busy||!!save.battle} onClick={()=>preset?setConfirm('save'):store()}>{tr('この枠に保存')}</Button><Button variant="icon" aria-label={tr('編成名を変更')} disabled={busy} selected={editing} onClick={()=>{setName(preset?.name??'');setEditing(!editing);}}><Pencil size={17}/></Button>{preset&&<Button variant="icon" aria-label={tr('保存した編成を削除')} disabled={busy||!!save.battle} onClick={()=>setConfirm('delete')}><Trash2 size={17}/></Button>}</div>
 {confirm&&<div className="party-presets__confirmation" role="group" aria-label={tr('保存内容の確認')}><p>{tr(confirm==='save'?'保存した編成を上書きしますか？':'保存した編成を削除しますか？')}</p><div><Button disabled={busy} onClick={()=>{if(confirm==='save')store();else{command({type:'deletePartyPreset',slot});setConfirm(null);}}}>{tr('確定')}</Button><Button variant="secondary" onClick={()=>setConfirm(null)}>{tr('キャンセル')}</Button></div></div>}
 </section></InventorySection>;
}
