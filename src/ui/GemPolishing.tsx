import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ChevronRight, Footprints, Hourglass, Sparkles, Timer } from 'lucide-react';
import type { Content, GameCommand, GameSave } from '../domain/types';
import { POLISH_RULES, ROUGH_NAMES, polishWindow } from '../domain/gem-polishing';
import { gemDescription, gemName, gemTier } from '../domain/memory-gems';
import { parseWorldTravel, worldLocations } from '../domain/world-map';
import { assetPath } from '../content';
import { tr } from '../locales/i18n';
import { Button, GameImage, MemoryGemTier, TownNavigation } from './index';
import type { TownDestination } from './TownNavigation';
import './gem-polishing.css';
export function GemPolishing({ save, content, busy, command, onClose, navigate }: { save: GameSave; content: Content; busy: boolean; command: (command: GameCommand) => Promise<boolean>; onClose: () => void; navigate: (page: TownDestination) => void }) {
  const raws=save.memoryGems?.rough ?? [], session=save.memoryGems?.polish;
  const [selectedId,setSelectedId]=useState(session?.rawId ?? raws[0]?.id);
  const [now,setNow]=useState(Date.now);
  const needle=useRef<HTMLDivElement>(null);
  const selected=raws.find(r=>r.id===(session && now<session.expiresAt ? session.rawId : selectedId));
  const result=save.memoryGems?.items.find(g=>g.id===selectedId);
  const active=selected && session?.rawId===selected.id ? session : undefined;
  const expired=Boolean(active && now>=active.expiresAt);
  const rule=selected ? POLISH_RULES[selected.promise] : POLISH_RULES.ordinary;
  const window=active && selected ? polishWindow(active,selected,now) : {angle:0,center:65,width:rule.width};
  const remaining=result ? 0 : active ? Math.max(0,Math.min(rule.seconds,Math.ceil((active.expiresAt-now)/1000))) : rule.seconds;
  const progress=active?.progress ?? (result?100:0);
  let journey=save.worldStory?.journey;
  try { if(!save.worldStory) journey=parseWorldTravel(JSON.parse(localStorage.getItem('stillveil-world-travel-v1') ?? 'null')).journey; } catch { /* Storage is optional for polishing. */ }
  const destination=journey && worldLocations(content,save.completedDungeonIds).find(p=>p.id===journey.destinationId);
  const travelLeft=journey ? Math.max(0,Math.ceil((journey.arrivesAt-now)/1000)) : 0;
  const stamp=(seconds:number)=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
  useEffect(()=>{if(!active || expired){const timer=setInterval(()=>setNow(Date.now()),500);return()=>clearInterval(timer);}let frame=0,last=0;const update=()=>{const time=Date.now();if(active&&selected&&needle.current)needle.current.style.transform=`rotate(${polishWindow(active,selected,time).angle}deg)`;if(time-last>=100){setNow(time);last=time;}frame=requestAnimationFrame(update);};frame=requestAnimationFrame(update);return()=>cancelAnimationFrame(frame);},[active?.rawId,active?.startedAt,active?.attempt,selected?.promise,expired]);
  useEffect(()=>{if(!selectedId&&raws[0])setSelectedId(raws[0].id);},[raws,selectedId]);
  return <div className="gem-polish-shell" data-game-surface="true"><section className="gem-polish" aria-label={tr('原石研磨')}>
    <GameImage className="gem-polish__backdrop" src={assetPath('gem-polishing-room')} alt=""/>
    <header className="gem-polish__header"><Button variant="icon" aria-label={tr('カバンへ戻る')} onClick={onClose}><ArrowLeft size={24}/></Button><h1>{tr('原石研磨')}</h1><span>STILLVEIL</span></header>
    <div className="gem-polish__travel"><Footprints size={16}/><span>{destination ? tr(destination.label) : tr('工房で研磨中')}</span><i>···········</i><span>{journey ? tr(travelLeft ? '移動中' : '到着済み') : tr('自由研磨')} <strong>{journey?stamp(travelLeft):''}</strong></span>{journey&&<Button variant="icon" aria-label={tr('世界地図へ')} onClick={()=>navigate('dungeons')}><ChevronRight size={15}/></Button>}</div>
    <div className="gem-polish__title"><h2><Sparkles size={17}/>{tr(selected?ROUGH_NAMES[selected.promise]:result?gemName(result):'原石を選んでください')}</h2><span>{tr(selected?.promise==='radiant'?'高期待・難しい':selected?.promise==='glimmering'?'期待の光・標準':result?'研磨完了':'穏やかな光・やさしい')}</span></div>
    <div className={`gem-polish__arena${result?' is-revealed':''}`}>
      <div className="gem-polish__ring" role="img" aria-label={tr('光が金色の範囲に入ったらタップ')} style={{'--arc-start':`${window.center-window.width/2}deg`,'--arc-width':`${window.width}deg`} as CSSProperties}><div className="gem-polish__arc"/>{active&&!expired&&<div ref={needle} className="gem-polish__needle"><i/></div>}</div>
      {result?<div className="gem-polish__reveal" role="status"><Sparkles size={30}/><MemoryGemTier tier={gemTier(result)}/><h3>{tr(gemName(result))}</h3><p>{tr(gemDescription(result))}</p><Button onClick={onClose}>{tr('記憶石を管理する')}</Button></div>:!selected?<div className="gem-polish__empty"><h3>{tr('原石はまだありません')}</h3><p>{tr('ダンジョンの宝箱から原石を持ち帰ろう')}</p><Button onClick={()=>navigate('dungeons')}>{tr('世界地図へ')}</Button></div>:<span className={`gem-polish__feedback${active?.lastResult==='good'?' is-good':''}`} aria-live="polite">{expired?tr('時間切れ・原石は残っています'):active?.lastResult==='good'?`GOOD +${rule.gain}%`:active?.lastResult==='miss'?'MISS −3%':''}</span>}
    </div>
    <div className="gem-polish__gauge"><label htmlFor="polish-progress">{tr('研磨ゲージ')} <strong>{progress}%</strong></label><progress id="polish-progress" max={100} value={progress}/><span><Hourglass size={16}/>{tr('残り')} <strong>{stamp(remaining)}</strong></span></div>
    <div className="gem-polish__action"><p>{tr(result?'記憶が姿を現しました':'光が金色の範囲に入ったらタップ')}</p><Button className="gem-polish__pad" disabled={busy||!selected||Boolean(save.battle)} onClick={async()=>{if(!selected)return;setSelectedId(selected.id);await command({type:active&&!expired?'tapGemPolish':'startGemPolish',rawId:selected.id});setNow(Date.now());}}><Sparkles size={24}/><span>{tr(active&&!expired?'磨く':expired?'もう一度磨く':'研磨を始める')}<small>POLISH</small></span></Button><small>{tr('制限時間内にゲージを満たそう')}</small></div>
    <div className="gem-polish__stones" aria-label={tr('原石の選択')}>{raws.slice(0,30).map(raw=><Button key={raw.id} variant="secondary" selected={raw.id===selected?.id} disabled={Boolean(session&&now<session.expiresAt&&raw.id!==session.rawId)} onClick={()=>setSelectedId(raw.id)}><GameImage src={assetPath('gem-polishing-room')} alt=""/><span>{tr(ROUGH_NAMES[raw.promise])}<small>{tr(raw.promise==='radiant'?'狭い判定':raw.promise==='glimmering'?'標準の判定':'広い判定')}</small></span></Button>)}</div>
    <p className="gem-polish__secret"><Timer size={13}/>{tr('Tierは研磨完了後に判明')}</p>
    <TownNavigation active="bag" embedded onNavigate={navigate}/>
  </section></div>;
}
