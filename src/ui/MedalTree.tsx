import {useEffect,useRef,useState} from 'react';
import {Award,BookOpen,Check,Clock,Compass,Crown,Flame,Hammer,Heart,LockKeyhole,Moon,Shield,Sparkles,Swords} from 'lucide-react';
import type {Content,GameCommand,GameSave} from '../domain/types';
import {medalCatalog,medalById,medalAvailable,medalRevealed,medalProgress,nextMedal,type MedalDef,type MedalAction} from '../domain/medals';
import {tr,useLanguage} from '../locales/i18n';
import {Button,Modal,Panel} from './index';
import './medals.css';
const icons:Record<string,typeof Award>={hammer:Hammer,flame:Flame,sparkles:Sparkles,compass:Compass,tower:Crown,moon:Moon,shield:Shield,swords:Swords,heart:Heart,clock:Clock,wolf:Moon};
export function MedalTree({save,content,busy,command,onAction}:{save:GameSave;content:Content;busy:boolean;command:(c:GameCommand)=>Promise<boolean>;onAction:(action:MedalAction)=>void}) {
 const language=useLanguage(),[branch,setBranch]=useState('craft'),[selected,setSelected]=useState<string|null>(null),synced=useRef(false);
 useEffect(()=>{if(!busy&&!synced.current&&!save.novels?.active&&!save.worldStory?.active){synced.current=true;void command({type:'medalSync'});}},[busy,command,save.novels?.active,save.worldStory?.active]);
 const earned=save.medals?.earned??[],goal=nextMedal(save),title=save.medals?.titleId?medalById(save.medals.titleId):undefined;
 const nodes=medalCatalog.medals.filter(m=>m.branch===branch&&(medalRevealed(m,save)||m.parents.some(id=>medalRevealed(medalById(id)!,save))));
 const height=(Math.max(0,...nodes.map(m=>m.rank))+1)*148+16;
 const detail=selected?medalById(selected):undefined;
 const point=(m:MedalDef)=>({x:m.column===0?250:m.column===2?750:500,y:m.rank*148+16});
 const status=(m:MedalDef)=>earned.includes(m.id)?tr('獲得済み'):medalAvailable(m,save)?tr('挑戦できる'):tr('未解放');
 const badge=(m:MedalDef)=>{const Icon=icons[m.icon]??Award;return <span className="medal-badge">{medalRevealed(m,save)?<Icon size={25} strokeWidth={1.4}/>:<LockKeyhole size={22}/>}</span>;};
 const progress=detail?medalProgress(detail,save,content):undefined;
 return <section className="medals" aria-label={tr('勲章ツリー')}>
  <header className="medals__heading"><Award size={25}/><div><h2>{tr('勲章ツリー')}</h2><p>{earned.length} / {medalCatalog.medals.length}{title&&<> · {title.name[language]}</>}</p></div></header>
  {goal&&<Button variant="secondary" className="medals__next" onClick={()=>{setBranch(goal.branch);setSelected(goal.id);}}><span><small>{tr('次の挑戦')}</small><strong>{goal.name[language]}</strong></span><Compass size={20}/></Button>}
  <div className="medals__tabs" role="group" aria-label={tr('勲章の系統')}>{medalCatalog.branches.map(b=><Button key={b.id} variant="secondary" selected={branch===b.id} onClick={()=>setBranch(b.id)}>{b.name[language]}</Button>)}</div>
  <div className="medals__tree" style={{height}}>
   <svg className="medals__links" viewBox={`0 0 1000 ${height}`} preserveAspectRatio="none" aria-hidden="true">{nodes.flatMap(m=>m.parents.flatMap(id=>{const parent=nodes.find(n=>n.id===id);if(!parent)return [];const a=point(parent),b=point(m);return <path key={id+':'+m.id} className={earned.includes(m.id)?'is-earned':''} d={`M ${a.x} ${a.y+112} V ${b.y-18} H ${b.x} V ${b.y}`}/>;}))}</svg>
   {nodes.map(m=>{const p=point(m),revealed=medalRevealed(m,save),done=earned.includes(m.id),available=medalAvailable(m,save);return <Button key={m.id} variant="secondary" className={`medal-node${done?' is-earned':available?' is-available':' is-locked'}`} style={{left:`${p.x/10}%`,top:p.y}} aria-label={`${revealed?m.name[language]:tr('未解放の勲章')} · ${status(m)}`} onClick={()=>setSelected(m.id)}>{badge(m)}<strong>{revealed?m.name[language]:'???'}</strong><small>{done?<><Check size={12}/>{tr('獲得済み')}</>:status(m)}</small></Button>;})}
  </div>
  <Modal open={Boolean(detail)} onClose={()=>setSelected(null)} title={detail&&medalRevealed(detail,save)?detail.name[language]:tr('未解放の勲章')}>
   {detail&&(medalRevealed(detail,save)?<div className="medal-detail">
    <div className={`medal-detail__badge${earned.includes(detail.id)?' is-earned':''}`}>{badge(detail)}</div>
    <Panel><h3>{tr('獲得条件')}</h3><p>{detail.description[language]}</p><progress aria-label={tr('達成度')} value={earned.includes(detail.id)?progress!.target:progress!.value} max={progress!.target}/><small>{earned.includes(detail.id)?progress!.target:progress!.value} / {progress!.target} · {status(detail)}</small></Panel>
    {detail.parents.some(id=>!earned.includes(id))&&<div className="medal-detail__parents"><small>{tr('先に獲得する勲章')}</small>{detail.parents.filter(id=>!earned.includes(id)).map(id=><Button key={id} variant="secondary" onClick={()=>setSelected(id)}>{medalById(id)!.name[language]}</Button>)}</div>}
    <p className="medal-detail__flavor">{detail.flavor[language]}</p><p className="subtle">{tr('勲章名を称号にできます。戦闘能力は変化しません。')}</p>
    {earned.includes(detail.id)?<Button disabled={busy} onClick={()=>command({type:'medalTitle',medalId:save.medals?.titleId===detail.id?null:detail.id})}>{save.medals?.titleId===detail.id?tr('称号を外す'):tr('称号にする')}</Button>:<Button variant="secondary" disabled={busy} onClick={()=>command({type:'medalTrack',medalId:save.medals?.trackedId===detail.id?null:detail.id})}>{save.medals?.trackedId===detail.id?tr('目標を外す'):tr('この勲章を目指す')}</Button>}
    <Button variant="secondary" onClick={()=>{setSelected(null);onAction(detail.action);}}><BookOpen size={16}/>{tr(detail.action.kind==='workshop'?'工房を開く':detail.action.kind==='character'?'キャラクターを見る':detail.action.kind==='party'?'編成を見直す':detail.action.kind==='recruit'?'仲間を迎える':'世界地図へ')}</Button>
   </div>:<p>{tr('手前の勲章を獲得すると、条件が分かります。')}</p>)}
  </Modal>
 </section>;
}
