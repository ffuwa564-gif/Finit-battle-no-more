import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { assetPath } from '../content';
import { createBuildDemo, type BuildDemoHighlight } from '../domain/build-demo';
import type { BuildStage } from '../domain/builds';
import type { Content, Unit } from '../domain/types';
import { tr } from '../locales/i18n';
import { Button } from './index';
import './build-demo.css';

const highlights: Record<BuildDemoHighlight,string> = {barrier:'味方に障壁を展開',chain:'別の敵へ連鎖',echo:'次のラウンドに追撃',shield:'障壁を砲撃へ変換',battery:'ルネットへゲージ供給',ultimate:'うさぎの必殺技へ'};
export interface BuildDemoProps { buildId: string; stage: BuildStage; content: Content; reducedMotion?: boolean }

export function BuildDemo({buildId,stage,content,reducedMotion=false}:BuildDemoProps) {
  const result = useMemo(()=>createBuildDemo(content,buildId,stage),[buildId,stage,content]);
  const [index,setIndex] = useState(-1);
  const [playing,setPlaying] = useState(false);
  useEffect(()=>{setIndex(-1);setPlaying(false);},[result]);
  useEffect(()=>{
    if (!playing) return;
    if (index >= result.frames.length-1) {setPlaying(false);return;}
    const timeout = window.setTimeout(()=>setIndex(value=>value+1), index < 0 ? 160 : result.frames[index]?.highlight ? 1450 : 700);
    return ()=>window.clearTimeout(timeout);
  },[playing,index,result]);
  const frame = result.frames[index];
  const units = frame?.units ?? result.initialUnits;
  const highlight = frame?.highlight;
  const done = index >= result.frames.length-1;
  const displayName = (unit:Unit)=>tr(content.characters.find(character=>character.id===unit.characterId)?.name ?? unit.characterId);
  function lineup(side:Unit['side']) {
    return <div className={`build-demo__lineup build-demo__lineup--${side}`} aria-label={tr(side==='party'?'味方':'敵')}>{units.filter(unit=>unit.side===side).map(unit=>{
      const character=content.characters.find(ch=>ch.id===unit.characterId)!;
      const portrait=content.assets.find(asset=>asset.id===character.portraitId);
      const target=frame?.event.targetIds?.includes(unit.uid);
      const actor=frame?.event.actorId===unit.uid;
      const before=frame?.before.find(old=>old.uid===unit.uid);
      const hpDelta=before ? unit.hp-before.hp : 0;
      const shieldGain=before ? Math.max(0,(unit.barrier ?? 0)-(before.barrier ?? 0)) : 0;
      const chargeGain=before ? Math.max(0,(unit.ultimateCharge ?? 0)-(before.ultimateCharge ?? 0)) : 0;
      const number=Math.abs(hpDelta) || (frame?.event.kind==='guard' ? shieldGain : frame?.event.kind==='buff' ? chargeGain : 0);
      const support=hpDelta>0 || hpDelta===0 && (shieldGain>0 || chargeGain>0);
      return <div key={unit.uid} className={`build-demo__unit${target?' is-target':''}${actor?' is-actor':''}${unit.hp<=0?' is-fallen':''}`}>
        <div className="build-demo__portrait"><img src={assetPath(character.portraitId)} alt={displayName(unit)} style={{objectPosition:portrait?.anchor ?? '50% 22%'}} />{target && number>0 && <strong className={`build-demo__number${support?' is-support':''}`}>{support?'+':''}{number}</strong>}{unit.side==='party' && <span className="build-demo__charge">{unit.ultimateCharge ?? 0}%</span>}</div>
        <span className="build-demo__name">{displayName(unit)}</span><meter min={0} max={unit.maxHp} value={Math.max(0,unit.hp)} aria-label={tr('{0}のHP').replace('{0}',displayName(unit))} />
      </div>;
    })}</div>;
  }
  return <section className={`build-demo${reducedMotion?' is-reduced-motion':''}`} data-testid="build-demo" aria-label={tr('ビルドの実演')}>
    <div className="build-demo__heading"><span><Sparkles size={15}/>{tr('連携の実演')}</span><small>{tr('見本装備')}</small></div>
    <p className="build-demo__note">{tr('見本の仲間と装備による実演です。所持品は消費しません。')}<br />{tr('実演の舞台：{0}').replace('{0}',tr(content.dungeons.find(dungeon=>dungeon.id===result.dungeonId)?.name ?? result.dungeonId))}</p>
    <div className={`build-demo__stage${highlight?` build-demo__stage--${highlight}`:''}`} data-testid="build-demo-frame" data-frame-index={index} data-highlight={highlight ?? ''}>
      <div className="build-demo__position">{frame ? `WAVE ${frame.wave+1} · ROUND ${frame.round}` : tr('連携ダイジェスト')}</div>
      {lineup('enemy')}
      <div className="build-demo__spell" key={`${index}-${buildId}`}>{highlight ? <><span className="build-demo__flare" aria-hidden="true"/><strong>{tr(highlights[highlight])}</strong></> : <span aria-hidden="true">✦</span>}</div>
      {lineup('party')}
      <p className="build-demo__event">{frame ? tr(frame.event.text) : tr('再生して、石と仲間の連携を見る。')}</p>
    </div>
    {!result.demonstrated && <p className="build-demo__note">{tr('この見本では連携が成立しませんでした。')}</p>}
    <div className="build-demo__controls"><Button size="sm" data-testid="build-demo-play" disabled={!result.frames.length} onClick={()=>{if(done)setIndex(-1);setPlaying(!playing);}}>{playing?<Pause size={15}/>:done?<RotateCcw size={15}/>:<Play size={15}/>} {tr(playing?'実演を一時停止':done?'もう一度見る':'実演を再生')}</Button><Button size="sm" variant="secondary" disabled={playing||!result.frames.length} aria-label={tr('実演を次へ')} onClick={()=>setIndex(value=>value>=result.frames.length-1?0:value+1)}>{tr('次へ')}<ChevronRight size={15}/></Button><span>{Math.max(0,index+1)} / {result.frames.length}</span></div>
  </section>;
}
