import { PreparationGuide } from './PreparationGuide';
import { useState } from 'react';
import { dungeonGemFamily, GEM_FAMILIES } from '../domain/memory-gems';
import { ArrowUp, ChevronRight, Crown, Gem, Hexagon, LockKeyhole, ShieldCheck } from 'lucide-react';
import type { Content, DungeonDef, GameSave, SkillTemplate } from '../domain/types';
import { highestTowerFloor, TOWER_ROUND_LIMIT, IVORY_TOWER_FLOORS, IVORY_TOWER_VERSION, ivoryTowerId, towerLock, towerDustReward } from '../domain/ivory-tower';
import { dungeonDifficulty } from '../domain/engine';
import { assetPath, roleName } from '../content';
import { GameImage } from './GameMedia';
import { Button, InventorySection } from './index';
import { tr } from '../locales/i18n';
import './ivory-tower.css';

export interface IvoryTowerProps {
  content: Content;
  save: GameSave;
  busy: boolean;
  onSelect: (id: string) => void;
  onEquipment: (defId?: string) => void;
}

export function towerEncounterFeatures(stage: DungeonDef, content: Content): string[] {
  const templates = new Set(stage.waves.flatMap(wave=>wave.flatMap(enemy=>content.characters.find(c=>c.id===enemy.characterId)?.skillIds??[])).flatMap(id=>content.skills.find(skill=>skill.id===id)?.template??[]));
  const has = (values: SkillTemplate[]) => values.some(value=>templates.has(value));
  return [
    ...(stage.waves.length>1?['連戦']:[]),
    ...(has(['heal','mend_pair','barrier_mend','regen'])?['回復']:[]),
    ...(has(['guard','barrier'])?['守護']:[]),
    ...(has(['sleep','charm','paralysis','confusion'])?['拘束']:[]),
    ...(has(['jam'])?['封印']:[]),
    ...(has(['dispel','shatter'])?['解除']:[]),
    ...(has(['overclock'])?['幻影送電']:[]),
    ...(stage.bossStrike?['予告大技']:[]),
    ...(stage.bossBits?['うさぎビット']:[]),
    ...(stage.bossClock?['終鐘']:[]),
  ];
}

export function TowerEncounterPreview({stage,content}:{stage:DungeonDef;content:Content}) {
  return <details className="ivory-tower__scout">
    <summary>{tr('敵の編成と対策を見る')}<small>{stage.waves.length} WAVES</small></summary>
    <p className="ivory-tower__phantom">{tr('塔が映す記憶の幻影です。仲間本人との戦いではありません。')}</p>
    <ol className="ivory-tower__waves">{stage.waves.map((wave,index)=><li key={index}>
      <h4>WAVE {index+1}</h4>
      <ul className="ivory-tower__enemies">{wave.map((enemy,i)=>{
        const character=content.characters.find(c=>c.id===enemy.characterId);
        if(!character)return null;
        const portrait=content.assets.find(asset=>asset.id===character.portraitId);
        return <li key={`${character.id}-${i}`} className={enemy.boss?'is-guardian':''}>
          <GameImage src={assetPath(character.portraitId)} alt="" loading="lazy" style={{objectPosition:portrait?.anchor??'50% 15%'}} />
          <div><strong>{enemy.boss&&<Crown size={12} aria-label={tr('主役の幻影')} />}{tr(character.name)}</strong><small>{tr(roleName(character.role))}</small><span>{character.skillIds.map(id=>content.skills.find(skill=>skill.id===id)?.name).filter(Boolean).map(name=>tr(name)).join(' / ')}</span></div>
        </li>;
      })}</ul>
    </li>)}</ol>
    {stage.towerBattle&&<p className="ivory-tower__rule">{tr('敵1人あたり・各ウェーブの通常技能')}<br />{tr('回復・再生は{0}回、障壁は{1}回まで。').replace('{0}',String(stage.towerBattle.healLimit)).replace('{1}',String(stage.towerBattle.barrierLimit))}</p>}
    {stage.bossStrike&&<p className="ivory-tower__rule"><strong>{tr(stage.bossStrike.name)}</strong><br />{tr('{0}ラウンドごとの予告大技。').replace('{0}',String(stage.bossStrike.every))}{stage.bossStrike.windup&&tr('溜めの間に敵のHPを削ると大技が弱まります。障壁を壊した量は含みません。')}</p>}
    {towerEncounterFeatures(stage,content).includes('幻影送電')&&<p className="ivory-tower__rule">{tr('塔の送電は、自分の最大HPの10%を使い、味方1人の攻撃を20%強化します。')}</p>}
    {stage.bossBits&&<p className="ivory-tower__rule">{tr('ビットの召喚と射撃は別の行動です。予告を見て、攻めるか守るか選びましょう。')}</p>}
    {stage.bossClock&&<p className="ivory-tower__rule">{tr('時計の障壁は毎ラウンド再生します。破砕や集中攻撃で開いた隙に攻めましょう。')}<br />{tr('終鐘まで{0}ラウンド。').replace('{0}',String(stage.bossClock.deadline))}</p>}
    <p className="ivory-tower__rule">{tr('定数だけでは敵の連携や期限を測れません。次の試行に向けて、倒す順と石を組み替えましょう。')}</p>
  </details>;
}

export function IvoryTower({ content, save, busy, onSelect, onEquipment }: IvoryTowerProps) {
  const highest = highestTowerFloor(save);
  const [selectedFloor,setSelectedFloor]=useState<number|null>(null);
  const frontier=Math.min(100,highest+1),viewing=selectedFloor??frontier;
  const next = content.dungeons.find(dungeon => dungeon.id === ivoryTowerId(viewing))!;
  const lock = towerLock(next, save);
  const guardianId = next.waves.at(-1)!.find(enemy => enemy.boss)?.characterId;
  const guardian = content.characters.find(character => character.id === guardianId);
  const features=towerEncounterFeatures(next,content);
  const legacy=save.towerRecord?.legacyHighest??0;
  const action=highest===100&&viewing===100?'最上層に再挑戦':viewing===frontier?'次の階層に挑む':'この階層に挑む';
  return <section className="ivory-tower" aria-label={tr('白亜の塔')}>
    <header className="ivory-tower__hero"><span className="ivory-tower__eyebrow">THE IVORY SPIRE / {IVORY_TOWER_VERSION}</span><h2>{tr('白亜の塔')}</h2><p>{tr('磨いた記憶で、まだ届かない高みへ。')}</p><div className="ivory-tower__progress"><span>{tr('踏破した階層')}</span><strong>{highest}<small> / {IVORY_TOWER_FLOORS}</small></strong></div><progress value={highest} max={IVORY_TOWER_FLOORS} aria-label={tr('白亜の塔の踏破状況')} />{legacy>0&&<p className="ivory-tower__legacy">{tr('旧塔の最高記録：第{0}層（1.00）').replace('{0}',String(legacy))}</p>}</header>
    <label className="ivory-tower__selector"><span>{tr('階層の編成を調べる')}</span><select aria-label={tr('階層の編成を調べる')} value={viewing} onChange={event=>setSelectedFloor(Number(event.target.value))}>{Array.from({length:100},(_,i)=><option key={i} value={i+1}>{tr('第{0}層').replace('{0}',String(i+1))}{i+1<=highest?` · ${tr('踏破済')}`:i+1>frontier?` · ${tr('未解放')}`:''}</option>)}</select></label>
    <article className="ivory-tower__frontier"><span className="ivory-tower__eyebrow">{tr(viewing===frontier?(highest===100?'全100層踏破':'次の挑戦'):'編成のプレビュー')}</span><h3>{tr(`第${next.towerFloor}層`)}<small>{tr(next.subtitle)}</small></h3><p>{tr('守護者')}：{tr(guardian?.name ?? '')}{next.waves.at(-1)!.length > 1 && <span> · {tr('護衛あり')}</span>}</p><div className="ivory-tower__difficulty"><Hexagon size={14} /><span>{tr('難易度定数')} {dungeonDifficulty(next,content).toFixed(1)}</span></div><ul className="ivory-tower__features" aria-label={tr('敵編成の特徴')}>{features.map(feature=><li key={feature}>{tr(feature)}</li>)}</ul><TowerEncounterPreview key={next.id} stage={next} content={content} /><div className="ivory-tower__reward"><Gem size={16} /><span>{tr(GEM_FAMILIES[dungeonGemFamily(next)].name)} · {tr('記憶石と調律用の欠片')} +{towerDustReward(next)}</span></div>{lock && <p className="ivory-tower__lock"><LockKeyhole size={15} />{tr(lock)}</p>}<Button disabled={busy || Boolean(lock)} aria-label={tr(action)} onClick={() => onSelect(next.id)}><ArrowUp size={17} />{tr(action)}</Button></article>
    <Button className="ivory-tower__equipment" variant="secondary" onClick={() => onEquipment()}><Gem size={16} />{tr('記憶石を整える')}<ChevronRight size={16} /></Button>
    <InventorySection id="tower-preparation" title="塔に向けた装備実験" tone="night"><PreparationGuide content={content} save={save} busy={busy} onGems={onEquipment} onDungeon={onSelect} /></InventorySection>
    <p className="ivory-tower__limit">{tr('各ウェーブ{0}ラウンド以内に踏破').replace('{0}', String(TOWER_ROUND_LIMIT))}</p>
    <p className="ivory-tower__hint">{tr('塔の幻影から仲間加入用の素材は得られません。記憶石・調律用の欠片・ゴールドを集める場所です。')}</p>
    <p className="ivory-tower__hint">{tr('踏破を確定すると次の層が開きます。突破が難しいときは探索で石を集め、技と特性を調律して再挑戦。')}</p>
    <div className="ivory-tower__bands">{Array.from({ length: 10 }, (_, band) => {
      const first = band * 10 + 1, last = first + 9;
      const cleared = Math.max(0, Math.min(10, highest - first + 1));
      return <InventorySection key={first} id={`tower-${first}-${last}`} title={`第${first}〜${last}層`} count={cleared} tone="night"><div className="ivory-tower__floors">{Array.from({ length: 10 }, (_, index) => {
        const floor = first + index, stage = content.dungeons.find(dungeon => dungeon.id === ivoryTowerId(floor))!;
        const reason = towerLock(stage, save);
        return <Button key={floor} data-testid={`tower-floor-${floor}`} aria-label={tr(`第${floor}層を選ぶ`)} variant={floor === viewing ? 'primary' : 'secondary'} disabled={busy || Boolean(reason)} selected={floor===viewing} title={tr(reason ?? stage.subtitle)} onClick={() => setSelectedFloor(floor)}><span>{floor % 10 === 0 ? <Crown size={14} /> : floor <= highest ? <ShieldCheck size={14} /> : reason ? <LockKeyhole size={14} /> : <ArrowUp size={14} />}<strong>{floor}F</strong></span><small>{tr(floor <= highest ? '踏破済' : reason ? '未解放' : '挑戦可能')}</small></Button>;
      })}</div></InventorySection>;
    })}</div>
  </section>;
}
