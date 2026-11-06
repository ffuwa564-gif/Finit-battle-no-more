import {useEffect,useRef,useState} from 'react';
import {Award,BookOpen,Check,Clock,Compass,Crown,Flame,Hammer,Heart,LockKeyhole,Moon,Shield,Sparkles,Swords,Target} from 'lucide-react';
import type {Content,GameCommand,GameSave} from '../domain/types';
import {medalCatalog,medalById,medalAvailable,medalRevealed,createMedalProgress,nextMedal,canRecallMedalStory,type MedalDef,type MedalAction} from '../domain/medals';
import {tr,useLanguage} from '../locales/i18n';
import {Button,Modal,Panel} from './index';
import './medals.css';
const icons:Record<string,typeof Award>={hammer:Hammer,flame:Flame,sparkles:Sparkles,compass:Compass,tower:Crown,moon:Moon,shield:Shield,swords:Swords,heart:Heart,clock:Clock,wolf:Moon};
const grade=(m:MedalDef)=>m.rank>=6?'crown':m.rank>=4?'gold':m.rank>=2?'silver':'bronze';
const gradeName=(m:MedalDef)=>tr(m.rank>=6?'冠章':m.rank>=4?'金章':m.rank>=2?'銀章':'銅章');
export function MedalTree({save,content,busy,command,onAction}:{save:GameSave;content:Content;busy:boolean;command:(c:GameCommand)=>Promise<boolean>;onAction:(action:MedalAction)=>void}) {
 const language=useLanguage(),[branch,setBranch]=useState('craft'),[selected,setSelected]=useState<string|null>(null),synced=useRef(false);
 useEffect(()=>{if(!busy&&!synced.current&&!save.novels?.active&&!save.worldStory?.active){synced.current=true;void command({type:'medalSync'});}},[busy,command,save.novels?.active,save.worldStory?.active]);
 const earned=save.medals?.earned??[],goal=nextMedal(save),title=save.medals?.titleId?medalById(save.medals.titleId):undefined;
 const nodes=medalCatalog.medals.filter(m=>m.branch===branch);
 const height=(Math.max(0,...nodes.map(m=>m.rank))+1)*164+16;
 const detail=selected?medalById(selected):undefined;
 const open=(m:MedalDef)=>{setBranch(m.branch);setSelected(m.id);};
 // Derive centers from the entire row, including hidden nodes, so reveals do not move it.
 const point=(m:MedalDef)=>{const row=nodes.filter(n=>n.rank===m.rank).sort((a,b)=>a.column-b.column);return{x:(row.findIndex(n=>n.id===m.id)+.5)*1000/row.length,y:m.rank*164+16,width:row.length===3?'30%':'44%'};};
 const linkPath=(parent:MedalDef,child:MedalDef)=>{const a=point(parent),b=point(child),channel=a.x<500?12:a.x>500?988:b.x<=500?12:988;return child.rank-parent.rank>1?`M ${a.x} ${a.y+132} V ${a.y+148} H ${channel} V ${b.y-16} H ${b.x} V ${b.y}`:`M ${a.x} ${a.y+132} V ${b.y-16} H ${b.x} V ${b.y}`;};
 const status=(m:MedalDef)=>earned.includes(m.id)?tr('獲得済み'):medalRevealed(m,save)&&medalAvailable(m,save)?tr('挑戦できる'):tr('未解放');
 const badge=(m:MedalDef)=>{const Icon=icons[m.icon]??Award;return <span className={`medal-badge medal-badge--${grade(m)}`}>{medalRevealed(m,save)?<Icon size={25} strokeWidth={1.4}/>:<LockKeyhole size={22}/>}</span>;};
 const progressFor=createMedalProgress(save,content);
 const progress=detail?progressFor(detail):undefined;
 const branchEarned=nodes.filter(m=>earned.includes(m.id)).length;
 const available=medalCatalog.medals.filter(m=>!earned.includes(m.id)&&medalAvailable(m,save)&&medalRevealed(m,save)).length;
 const branchInfo=medalCatalog.branches.find(b=>b.id===branch)!;
 const recent=earned.slice(-3).reverse().map(medalById).filter((m):m is MedalDef=>Boolean(m));
 const requirements=detail?.parents.filter(id=>!earned.includes(id)).map(medalById).filter((m):m is MedalDef=>Boolean(m))??[];
 const recall=detail&&canRecallMedalStory(detail,save,content)?<Button variant="secondary" disabled={busy} onClick={async()=>{if(detail.condition.kind==='story'&&await command({type:'worldTalk',nodeId:detail.condition.nodeId}))setSelected(null);}}><BookOpen size={16}/>{tr('引き継いだ章を読み返す')}</Button>:null;
 const prerequisites=<div className="medal-detail__parents">{requirements.length>0&&<small>{tr('先に獲得する勲章')}</small>}{requirements.map(m=><Button key={m.id} variant="secondary" onClick={()=>open(m)}>{medalRevealed(m,save)?m.name[language]:tr('未解放の勲章')}</Button>)}</div>;
 return <section className="medals" aria-label={tr('勲章ツリー')}>
  <header className="medals__heading"><Award size={29}/><div><h1>{tr('勲章ツリー')}</h1><p>{earned.length} / {medalCatalog.medals.length}{title&&<> · {title.name[language]}</>}</p></div></header>
  <div className="medals__summary"><progress aria-label={tr('勲章の収集率')} value={earned.length} max={medalCatalog.medals.length}/><span>{tr('挑戦できる')} <strong>{available}</strong></span></div>
  {goal?<Button variant="secondary" className="medals__next" onClick={()=>open(goal)}><Target size={19}/><span><small>{tr(save.medals?.trackedId===goal.id?'追跡中の目標':'次の挑戦')}</small><strong>{medalRevealed(goal,save)?goal.name[language]:tr('未解放の勲章')}</strong></span><Compass size={20}/></Button>:earned.length===medalCatalog.medals.length?<p className="medals__complete"><Crown size={18}/>{tr('すべての勲章を獲得しました。')}</p>:<p className="subtle">{tr('物語を進めると、記録が明らかになります。')}</p>}
  {recent.length>0&&<details className="medals__recent"><summary>{tr('最近の勲章')}<span>{recent.length}</span></summary><div>{recent.map(m=><Button key={m.id} variant="secondary" onClick={()=>open(m)}><Award size={14}/>{m.name[language]}</Button>)}</div></details>}
  <div className="medals__tabs" role="group" aria-label={tr('勲章の系統')}>{medalCatalog.branches.map(b=>{const list=medalCatalog.medals.filter(m=>m.branch===b.id),count=list.filter(m=>earned.includes(m.id)).length,Icon=icons[b.icon]??Award;return <Button key={b.id} variant="secondary" selected={branch===b.id} aria-label={b.name[language]} onClick={()=>setBranch(b.id)}><Icon size={15}/><span>{b.name[language]}<small aria-hidden="true">{count} / {list.length}</small></span>{count===list.length&&<Check size={12}/>}</Button>;})}</div>
  <div className="medals__branch-heading"><h3>{branchInfo.name[language]}</h3><span>{branchEarned} / {nodes.length}</span><progress aria-label={tr('系統の達成度')} value={branchEarned} max={nodes.length}/></div>
  <div className="medals__legend"><span><Check size={12}/>{tr('獲得済み')}</span><span><Compass size={12}/>{tr('挑戦できる')}</span><span><LockKeyhole size={12}/>{tr('未解放')}</span></div>
  <div className="medals__tree" style={{height}}>
   <svg className="medals__links" viewBox={`0 0 1000 ${height}`} preserveAspectRatio="none" aria-hidden="true">{nodes.flatMap(m=>m.parents.flatMap(id=>{const parent=nodes.find(n=>n.id===id);if(!parent)return [];return <path data-parent={id} data-child={m.id} key={id+':'+m.id} className={earned.includes(m.id)?'is-earned':earned.includes(id)?'is-open':''} d={linkPath(parent,m)}/>;}))}</svg>
   {nodes.map(m=>{const p=point(m),revealed=medalRevealed(m,save),done=earned.includes(m.id),available=medalAvailable(m,save)&&revealed,tracked=save.medals?.trackedId===m.id&&!done,pr=progressFor(m);return <Button key={m.id} variant="secondary" data-medal-id={m.id} className={`medal-node medal-node--${grade(m)}${done?' is-earned':available?' is-available':' is-locked'}${tracked?' is-tracked':''}`} style={{left:`${p.x/10}%`,top:p.y,width:p.width}} aria-label={`${revealed?m.name[language]:tr('未解放の勲章')} · ${status(m)}`} aria-current={tracked?'true':undefined} onClick={()=>setSelected(m.id)}>{tracked&&<Target className="medal-node__target" size={14}/>}<span className="medal-node__grade">{gradeName(m)}</span>{badge(m)}<strong>{revealed?m.name[language]:'???'}</strong><small>{done?<Check size={12}/>:available?<Compass size={12}/>:<LockKeyhole size={11}/>}<span>{status(m)}</span></small>{revealed&&<progress aria-label={`${m.name[language]} · ${tr('達成度')}`} value={done?pr.target:pr.value} max={pr.target}/>}</Button>;})}
  </div>
  <Modal open={Boolean(detail)} onClose={()=>setSelected(null)} title={detail&&medalRevealed(detail,save)?detail.name[language]:tr('未解放の勲章')}>
   {detail&&(medalRevealed(detail,save)?<div className="medal-detail">
    <div className={`medal-detail__badge${earned.includes(detail.id)?' is-earned':''}`}>{badge(detail)}<span>{gradeName(detail)}</span></div>
    <Panel><h3>{tr('獲得条件')}</h3><p>{detail.description[language]}</p><progress aria-label={tr('達成度')} value={earned.includes(detail.id)?progress!.target:progress!.value} max={progress!.target}/><small>{earned.includes(detail.id)?progress!.target:progress!.value} / {progress!.target} · {status(detail)}</small>{!earned.includes(detail.id)&&progress!.value===progress!.target&&!medalAvailable(detail,save)&&<p>{tr('条件は達成済みです。前提勲章の獲得後に授与されます。')}</p>}</Panel>
    {prerequisites}{recall}
    {detail.condition.kind==='featCount'&&<ul className="medal-detail__feats">{medalCatalog.medals.filter(m=>m.condition.kind==='feat').map(m=><li key={m.id} data-complete={m.condition.kind==='feat'&&save.medals?.feats.includes(m.condition.feat)}>{m.condition.kind==='feat'&&save.medals?.feats.includes(m.condition.feat)?<Check size={14}/>:<LockKeyhole size={14}/>}<span>{m.name[language]}<small>{m.description[language]}</small></span></li>)}</ul>}
    <p className="medal-detail__flavor">{detail.flavor[language]}</p><p className="subtle">{tr('勲章名を称号にできます。戦闘能力は変化しません。')}</p>
    {earned.includes(detail.id)?<Button disabled={busy} onClick={()=>command({type:'medalTitle',medalId:save.medals?.titleId===detail.id?null:detail.id})}>{save.medals?.titleId===detail.id?tr('称号を外す'):tr('称号にする')}</Button>:<Button variant="secondary" disabled={busy} onClick={()=>command({type:'medalTrack',medalId:save.medals?.trackedId===detail.id?null:detail.id})}>{save.medals?.trackedId===detail.id?tr('目標を外す'):tr('この勲章を目指す')}</Button>}
    <Button variant="secondary" onClick={()=>{setSelected(null);onAction(detail.action);}}><BookOpen size={16}/>{tr(detail.action.kind==='workshop'?'工房を開く':detail.action.kind==='gems'?'記憶石を開く':detail.action.kind==='character'?'キャラクターを見る':detail.action.kind==='party'?'編成を見直す':detail.action.kind==='recruit'?'仲間を迎える':'世界地図へ')}</Button>
   </div>:<div className="medal-detail"><p>{tr(detail.secret?'物語を進めると、記録が明らかになります。':'手前の勲章を獲得すると、条件が分かります。')}</p>{prerequisites}{recall}</div>)}
  </Modal>
 </section>;
}
