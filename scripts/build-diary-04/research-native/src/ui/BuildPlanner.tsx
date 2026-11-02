import { GameImage } from './GameMedia';
import { useRef, useState } from 'react';
import { ArrowRight, Check, ChevronRight, Crown, Gem, Layers3, LockKeyhole, Shield, Target, Users, X, Zap } from 'lucide-react';
import { assetPath } from '../content';
import type { Content, GameCommand, GameSave } from '../domain/types';
import { BUILD_DEFINITIONS, findGemSources, getBuildPlan, targetNeedsNewTier, type BuildFarmSource, type BuildStage, type BuildSlotPlan } from '../domain/builds';
import { dungeonLock } from '../domain/events';
import { buildTactics } from '../domain/build-tactics';
import { GEM_DEFINITIONS, GEM_VARIANTS, gemName, gemDescription, gemPowerRefinementIsFixed, gemPowerMultiplier, gemRoll, gemTraitDescription, gemTraitInfo, gemPowerTier, gemTraitTier, type MemoryGem } from '../domain/memory-gems';
import { tr } from '../locales/i18n';
import { Button, InventorySection } from './index';
import { BuildDemo } from './BuildDemo';
import { MemoryGemTier } from './MemoryGemTier';
import './build-planner.css';

export interface BuildPlannerProps {
  save: GameSave;
  content: Content;
  dispatch: (command: GameCommand) => void;
  busy?: boolean;
  onClose: () => void;
  onDungeon: (id: string) => void;
  onGems: (defId?: string) => void;
  onRecruit?: (characterId: string) => void;
}
const stages: BuildStage[] = ['starter', 'complete', 'perfect'];
const stageNames: Record<BuildStage,string> = { starter:'入門', complete:'完成', perfect:'厳選' };
const icons = [Layers3, Shield, Zap];

export function BuildPlanner({ save, content, dispatch, busy = false, onClose, onDungeon, onGems, onRecruit }: BuildPlannerProps) {
  const [selectedId, setSelectedId] = useState(save.buildGoal?.buildId ?? BUILD_DEFINITIONS[0].id);
  const [stage, setStage] = useState<BuildStage>(save.buildGoal?.stage ?? 'starter');
  const [confirmApply, setConfirmApply] = useState(false);
  const detail = useRef<HTMLElement>(null);
  const applySection = useRef<HTMLDivElement>(null);
  const plan = getBuildPlan(content, save, selectedId, stage);
  const definition = plan.definition;
  const tactics = buildTactics(definition.id);
  const isTracked = save.buildGoal?.buildId === selectedId && save.buildGoal.stage === stage;
  const missingCharacter = plan.slots.find(slot => !slot.characterId);
  const nextGem = plan.slots.find(slot => slot.gemStatus === 'missing') ?? plan.slots.find(slot => slot.gemStatus === 'upgrade');
  const nextDef = nextGem && GEM_DEFINITIONS.find(gem => gem.id === nextGem.slot.gem.defId);
  const nextSources = nextDef ? findGemSources(content, save, nextDef.id, nextGem?.slot.gem) : [];
  const needsNewTier = Boolean(nextGem?.gem && targetNeedsNewTier(nextGem.gem,nextGem.slot.gem));
  const targetIsHighTier = Boolean(nextGem && (gemPowerTier(targetGem(nextGem)) >= 4 || gemTraitTier(targetGem(nextGem)) >= 4));
  const needsDrop = nextGem?.gemStatus === 'missing' || needsNewTier;
  const nextCraft = nextSources.find(source => source.kind === 'craft' && !source.locked);
  const needsCoreTrait = nextGem?.slot.gem.coreTrait && nextGem.gem && gemRoll(nextGem.gem).trait !== nextGem.slot.gem.coreTrait;
  const nextFarm = nextSources.find(source => source.kind === 'dungeon' && !source.locked && !source.towerFloor) ?? nextSources.find(source => source.kind === 'dungeon' && !source.locked);
  const nextLockedSource = nextSources.find(source => source.kind === 'dungeon' && source.locked && !source.towerFloor) ?? nextSources.find(source => source.kind === 'dungeon' && source.locked);
  const nextNormal = content.dungeons.find(dungeon => dungeon.published && !dungeon.eventId && !dungeon.towerFloor && (dungeon.kind ?? 'normal') === 'normal' && !save.completedDungeonIds.includes(dungeon.id) && !dungeonLock(dungeon,save,content)) ?? content.dungeons.find(dungeon => dungeon.published && !dungeon.eventId && !dungeon.towerFloor && (dungeon.kind ?? 'normal') === 'normal' && !dungeonLock(dungeon,save,content));
  const unlockDungeon = content.dungeons.find(dungeon => dungeon.id === nextLockedSource?.unlockDungeonId) ?? nextNormal;
  const requiredDefs = [...new Set(plan.slots.filter(slot => slot.gemStatus !== 'ready').map(slot => slot.slot.gem.defId))];
  const name = (id: string | null) => tr(content.characters.find(character => character.id === id)?.name ?? '未所持');
  const character = (id: string) => content.characters.find(character => character.id === id);
  function choose(id: string) {
    setSelectedId(id); setConfirmApply(false);
    requestAnimationFrame(() => detail.current?.scrollIntoView({ block:'start', behavior:'auto' }));
  }
  function changeStage(value: BuildStage) { setStage(value); setConfirmApply(false); }
  function previewApply() { setConfirmApply(true); requestAnimationFrame(() => applySection.current?.scrollIntoView({ block:'start', behavior:'auto' })); }
  function targetGem(slot: BuildSlotPlan): MemoryGem {
    const target=slot.slot.gem, trait=target.coreTrait ?? target.trait ?? 'none';
    return {id:'build-target',defId:target.defId,variant:target.variant,roll:{power:target.power,trait,value:target.value ?? 0}};
  }
  function TierPair({ gem, target=false }: {gem:MemoryGem;target?:boolean}) {
    const power=gemPowerTier(gem), trait=gemTraitTier(gem);
    return <div className={`build-planner__tiers${target ? '' : ' build-planner__tiers--owned'}`} aria-label={tr(target ? '目標のTier' : '手持ちのTier')}><small>{tr(target ? '目標のTier' : '手持ちのTier')}</small><span data-tier-kind={target ? 'target' : 'owned'} data-gem-stat="power" data-tier={power}>{tr('効力')}<MemoryGemTier tier={power}/></span>{trait > 0 && <span data-tier-kind={target ? 'target' : 'owned'} data-gem-stat="trait" data-tier={trait}>{tr('特性')}<MemoryGemTier tier={trait}/></span>}</div>;
  }
  function targetText(slot: BuildSlotPlan) {
    const target = slot.slot.gem;
    const trait = target.coreTrait ?? target.trait;
    return [tr(GEM_VARIANTS[target.variant].name), tr('技効力 ×{0}以上').replace('{0}', (1 + target.power * .015).toFixed(3).replace(/0$/, '')), trait ? tr(gemTraitInfo[trait].name) : tr('特性不問')].filter(Boolean).join(' · ');
  }
  function targetTraitDescription(slot: BuildSlotPlan) {
    const target=slot.slot.gem, trait=target.coreTrait ?? target.trait;
    return trait ? gemTraitDescription({id:'build-target',defId:target.defId,variant:target.variant,roll:{power:target.power,trait,value:target.value ?? 0}}) : null;
  }
  function SourceRow({ source }: { source: BuildFarmSource }) {
    const craft = source.kind === 'craft';
    return <div className={`build-planner__source${source.locked ? ' is-locked' : ''}`}>
      <div><strong>{tr(source.name)}</strong><p>{tr(source.description)}</p>{source.lockReason && <span className="build-planner__lock"><LockKeyhole size={12} />{tr(source.lockReason)}</span>}{craft && source.craftCost !== undefined && <p>{tr('必要な欠片：{0}個').replace('{0}',String(source.craftCost))}</p>}{!craft && source.maxTier >= 4 && <div className="build-planner__source-profile"><span>{tr('排出する上位Tier')}</span><div>{([4,5,6] as const).map(tier => { const chance=source.tierChances[`tier${tier}`]; return chance > 0 ? <span key={tier}><MemoryGemTier tier={tier} />{Number((chance * 100).toFixed(3))}%</span> : null; })}</div><small>{tr('踏破宝箱で石が出た後の、各項目の確率です。')}</small></div>}{!craft && source.featured && <p className="build-planner__source-note">{tr('対象の石が抽選で優先されます。確定ではありません。')}</p>}{source.bossOnly && !craft && <span className="build-planner__source-note">{tr('踏破宝箱で抽選')}</span>}</div>
      <Button size="sm" variant="secondary" disabled={busy || !craft && (source.locked || Boolean(save.battle))} data-dungeon-id={source.dungeonId} aria-label={craft ? tr('石の製作へ') : tr('{0}へ向かう').replace('{0}', tr(source.name))} onClick={() => craft ? onGems(source.id.replace(/^craft:/,'')) : source.dungeonId && onDungeon(source.dungeonId)}>{craft ? <Gem size={15} /> : <ArrowRight size={15} />}{tr(craft ? '製作へ' : '探索へ')}</Button>
    </div>;
  }

  return <section className="build-planner" aria-label={tr('ビルドの道標')} data-testid="build-planner">
    <header className="build-planner__header"><div><span className="build-planner__eyebrow">BUILD ATELIER</span><h2>{tr('ビルドの道標')}</h2><p>{tr('作りたい戦い方から、次の一周を選ぶ。')}</p></div><Button variant="icon" aria-label={tr('閉じる')} onClick={onClose}><X size={20} /></Button></header>
    <div className="build-planner__choices" aria-label={tr('おすすめビルド')}>
      {BUILD_DEFINITIONS.map((build,index) => { const Icon=icons[index % icons.length]; const members=build.stages.complete.slots.slice(0,3).map(slot => character(slot.characterIds[0])).filter(Boolean); return <Button key={build.id} variant="secondary" selected={selectedId === build.id} data-testid={`build-card-${build.id}`} data-build-id={build.id} className={`build-planner__choice build-planner__choice--${index}`} onClick={() => choose(build.id)}>
        <span className="build-planner__choice-art" aria-hidden="true">{members.map((member,i) => member && <GameImage key={`${member.id}-${i}`} src={assetPath(member.portraitId)} alt="" style={{objectPosition:content.assets.find(asset=>asset.id===member.portraitId)?.anchor ?? '50% 20%'}} />)}</span>
        <span className="build-planner__choice-copy"><span><Icon size={15} />{tr(build.name)}</span><small>{tr(build.tagline)}</small></span><ChevronRight size={18} />
      </Button>; })}
    </div>

    <article ref={detail} className="build-planner__detail" aria-label={tr('ビルドの詳細')}>
      <header className="build-planner__detail-heading"><span className="build-planner__eyebrow">{tr('目指す戦い方')}</span><h3>{tr(definition.name)}</h3><p>{tr(definition.description)}</p></header>
      <div className="build-planner__stages" role="group" aria-label={tr('ビルドの段階')}>{stages.map(value => <Button key={value} variant="secondary" selected={stage === value} aria-label={tr(stageNames[value])} data-testid={`build-stage-${value}`} onClick={() => changeStage(value)}>{tr(stageNames[value])}</Button>)}</div>
      <p className="build-planner__stage-description">{tr(plan.stageDefinition.description)}</p>
      <div className="build-planner__progress"><div><span>{tr('目標を満たす枠')}</span><strong>{plan.readyCount}<small> / {plan.totalCount}</small></strong></div><progress max={plan.totalCount} value={plan.readyCount} aria-label={tr('ビルドの達成状況')} /><p>{tr('所持している仲間と石で判定。未装備でも数えます。')}</p></div>
      <div className="build-planner__lineup" aria-label={tr('手持ちでの編成候補')}>{plan.slots.map((slot,index) => { const member=character(slot.characterId ?? slot.preferredCharacterId); return <div key={slot.slot.id} className={`build-planner__member${!slot.characterId ? ' is-missing' : ''}`}>
        <div className="build-planner__member-portrait">{member && <GameImage src={assetPath(member.portraitId)} alt="" style={{objectPosition:content.assets.find(asset=>asset.id===member.portraitId)?.anchor ?? '50% 20%'}} />}{index === plan.stageDefinition.leaderSlot && <Crown size={13} aria-label={tr('リーダー')} />}{slot.fulfilled ? <Check size={13} className="build-planner__member-status is-ready" /> : <Gem size={13} className="build-planner__member-status" />}</div>
        <strong>{name(slot.characterId ?? slot.preferredCharacterId)}</strong><small>{tr(!slot.characterId ? '未所持' : slot.substitute ? '代役候補' : slot.gemStatus === 'missing' ? '石が不足' : slot.gemStatus === 'upgrade' ? '性能を磨く' : '準備できました')}</small>
      </div>; })}</div>
      <Button className="build-planner__track" variant={isTracked ? 'secondary' : 'primary'} disabled={busy} onClick={() => dispatch(isTracked ? {type:'trackBuild',buildId:null} : {type:'trackBuild',buildId:selectedId,stage})}><Target size={16} />{tr(isTracked ? 'この目標を解除' : 'このビルドを目標にする')}{isTracked && <Check size={15} />}</Button>
      {isTracked && <p className="build-planner__tracked" role="status">{tr('目標を保存しました。石を集めたら、ここで進み具合を確認できます。')}</p>}

      <section className="build-planner__next" data-testid="build-next-action" aria-label={tr('次にすること')}>
        <span className="build-planner__eyebrow">NEXT STEP</span><h4>{tr(missingCharacter ? 'まずは仲間を揃える' : needsNewTier || needsDrop && targetIsHighTier ? '上位Tierの石を探す' : nextGem?.gemStatus === 'missing' ? nextCraft ? '足りない石を製作する' : nextFarm ? '足りない石を探しに' : '入手先の解放を目指す' : needsCoreTrait ? '特性を調律する' : nextGem ? '手持ちの石を磨く' : '戦い方を試す準備ができました')}</h4>
        <p>{missingCharacter ? tr('{0}の枠に入る仲間が不足しています。').replace('{0}', tr(missingCharacter.slot.label)) : nextDef ? tr(nextDef.name) : tr('手持ちの装備が、この段階の目標を満たしています。')}</p>
        {missingCharacter && <p className="build-planner__next-small">{missingCharacter.slot.characterIds.map(id => name(id)).join(' / ')}</p>}
        {nextGem && !missingCharacter && <><p className="build-planner__next-small">{targetText(nextGem)}</p><TierPair gem={targetGem(nextGem)} target />{(needsNewTier || targetIsHighTier && needsDrop) && <p className="build-planner__next-small">{tr('目標の上位Tierは調律では作れません。対象の探索で新しい石を探しましょう。')}</p>}</>}
        {plan.complete ? <Button disabled={busy || !plan.canApply} onClick={previewApply}><Users size={16} />{tr('編成の変更内容を確認')}<ChevronRight size={16} /></Button> : missingCharacter && onRecruit ? <Button disabled={busy || Boolean(save.battle)} onClick={() => onRecruit(missingCharacter.preferredCharacterId)}><Users size={16} />{tr('仲間を迎える')}<ChevronRight size={16} /></Button> : nextCraft && needsDrop && !needsNewTier && !missingCharacter ? <><p className="build-planner__next-small">{tr(nextCraft.description)}</p><Button disabled={busy || Boolean(save.battle)} onClick={() => onGems(nextDef!.id)}><Gem size={16} />{tr('石の製作へ')}<ChevronRight size={16} /></Button></> : nextFarm && needsDrop && !missingCharacter ? <><p className="build-planner__next-small">{tr('まずは挑戦できる入手先へ。目的の石は抽選です。')}</p><Button disabled={busy || Boolean(save.battle)} data-dungeon-id={nextFarm.dungeonId} onClick={() => onDungeon(nextFarm.dungeonId!)}><ArrowRight size={16} />{tr(nextFarm.name)}<ChevronRight size={16} /></Button></> : needsDrop && !missingCharacter ? <><p className="build-planner__lock"><LockKeyhole size={13} />{nextLockedSource ? `${tr(nextLockedSource.name)} — ${tr(nextLockedSource.lockReason ?? '入手先の解放が必要です。')}` : tr('入手先の解放が必要です。')}</p><p className="build-planner__next-small">{tr('まずは挑戦できる探索を進め、石の入手先を解放しましょう。')}</p>{unlockDungeon && <Button disabled={busy || Boolean(save.battle)} data-dungeon-id={unlockDungeon.id} onClick={() => onDungeon(unlockDungeon.id)}><ArrowRight size={16} />{tr(nextLockedSource?.unlockDungeonId ? '解放に向けて探索する' : '通常探索を進める')} · {tr(unlockDungeon.name)}</Button>}</> : <Button variant="secondary" disabled={busy} onClick={() => onGems()}><Gem size={16} />{tr('記憶石を整える')}<ChevronRight size={16} /></Button>}
      </section>

      <BuildDemo buildId={selectedId} stage={stage} content={content} reducedMotion={save.settings.reducedMotion} />

      <InventorySection id="build-recipe" title="目標の編成と装備" count={plan.totalCount} tone="night"><div className="build-planner__recipe">{plan.slots.map((slot,index) => { const def=GEM_DEFINITIONS.find(gem => gem.id === slot.slot.gem.defId)!; return <article key={slot.slot.id} data-testid="build-slot" data-slot-id={slot.slot.id} className="build-planner__slot">
        <div className="build-planner__slot-heading"><span>{String(index+1).padStart(2,'0')}</span><div><h4>{tr(slot.slot.label)}</h4><strong>{name(slot.characterId ?? slot.preferredCharacterId)}</strong></div>{slot.fulfilled && <Check size={18} />}</div>
        {slot.substitute && <p className="build-planner__muted">{tr('所持している代役です。実演の編成とは性能が異なります。')}</p>}
        {!slot.characterId && <p className="build-planner__lock"><Users size={13} />{tr('この枠の仲間を持っていません。')}</p>}
        <p className="build-planner__gem-name"><Gem size={15} />{tr(def.name)}</p><p className="build-planner__target">{targetText(slot)}</p><TierPair gem={targetGem(slot)} target />{gemPowerRefinementIsFixed(targetGem(slot)) && <p className="build-planner__target-effect">{tr('目標の技効果')}：{tr(gemDescription(targetGem(slot)))}</p>}{targetTraitDescription(slot) && <p className="build-planner__target-trait">{tr('目標の特性')}：{tr(targetTraitDescription(slot)!)}</p>}
        <p className={`build-planner__slot-state${slot.gemStatus === 'ready' ? ' is-ready' : ''}`}>{tr(slot.gemStatus === 'ready' ? '石の目標を達成' : slot.gemStatus === 'upgrade' ? '石は所持・性能は未達成' : 'この石は未所持')}</p>
        {slot.gem && <p className="build-planner__owned-gem">{tr('手持ち')}：{tr(gemName(slot.gem))} · {tr('技効力 ×{0}').replace('{0}',gemPowerMultiplier(slot.gem).toFixed(3).replace(/0$/, ''))} · {tr(gemTraitInfo[gemRoll(slot.gem).trait].name)}</p>}
        {slot.gem && <TierPair gem={slot.gem} />}{slot.gem && (gemPowerRefinementIsFixed(targetGem(slot)) || gemPowerRefinementIsFixed(slot.gem)) && <p className="build-planner__owned-gem">{tr('手持ちの技効果')}：{tr(gemDescription(slot.gem))}</p>}{slot.gem && gemRoll(slot.gem).trait !== 'none' && <p className="build-planner__owned-gem">{tr('手持ちの特性')}：{tr(gemTraitDescription(slot.gem))}</p>}
        {slot.needsTransfer && <p className="build-planner__transfer">{tr('{0}から装備を移します。').replace('{0}',name(slot.ownerId))}</p>}
        <p className="build-planner__alternatives">{tr('編成できる仲間')}：{slot.slot.characterIds.map(id => name(id)).join(' / ')}</p>
      </article>; })}</div></InventorySection>

      <InventorySection id="build-farm-sources" title="不足している石の入手先" count={requiredDefs.length} tone="night"><div className="build-planner__sources">
        <p className="build-planner__muted">{tr('石の系統が合う探索を表示します。狙った石や特性の入手は保証されません。')}</p>{plan.slots.some(slot => gemPowerTier(targetGem(slot)) >= 4 || gemTraitTier(targetGem(slot)) >= 4) && <p className="build-planner__muted">{tr('上位Tier率は、踏破宝箱で石を得たときの各項目の確率です。1周あたりの入手率ではありません。追加特性がある石だけ、特性も抽選します。')}</p>}
        {requiredDefs.length === 0 ? <p>{tr('この段階で不足している石はありません。さらに上の段階も目指せます。')}</p> : requiredDefs.map(id => { const def=GEM_DEFINITIONS.find(gem=>gem.id===id)!; const sources=findGemSources(content,save,id,plan.slots.find(slot => slot.slot.gem.defId === id && slot.gemStatus !== 'ready')?.slot.gem); const shown=sources.slice(0,6); return <section key={id} className="build-planner__source-group"><h4><Gem size={16} />{tr(def.name)}</h4>{shown.map(source => <SourceRow key={source.id} source={source} />)}{sources.length > shown.length && <p className="build-planner__muted">{tr('ほかにも同じ系統の探索で抽選されます。')}</p>}{sources.length === 0 && <p>{tr('現在表示できる入手先はありません。')}</p>}</section>; })}
      </div></InventorySection>

      {tactics && <InventorySection id="build-matchups" title="得意な相手と、持ち替えの注意" tone="night"><dl className="build-planner__tactics"><div><dt>{tr('得意な探索')}</dt><dd>{tr(tactics.goodAgainst)}</dd></div><div><dt>{tr('苦手な場面')}</dt><dd>{tr(tactics.beCareful)}</dd></div><div><dt>{tr('王冠を渡す代価')}</dt><dd>{tr(tactics.leaderCost)}</dd></div><div><dt>{tr('代替の仲間を選ぶ時')}</dt><dd>{tr(tactics.alternatives)}</dd></div></dl></InventorySection>}

      <InventorySection id="build-how-it-works" title="このビルドの使い方" tone="night"><div className="build-planner__mechanic"><p>{tr(definition.mechanic)}</p><ol>{definition.steps.map((step,index) => <li key={index}>{tr(step)}</li>)}</ol></div></InventorySection>

      <div ref={applySection} className="build-planner__apply"><h4><Users size={17} />{tr('所持品で編成する')}</h4><p>{tr('仲間と石が揃うと、まとめて編成できます。変更前に内容を確認します。')}</p>{!plan.complete && plan.canApply && <p className="build-planner__transfer">{tr('性能目標に届いていない石も含みます。')}</p>}{!plan.functional && !plan.missingCharacters && !plan.missingGems && <p className="build-planner__lock">{tr('この戦い方に必要な特性が不足しています。石を調律して準備しましょう。')}</p>}{save.battle && <p className="build-planner__lock">{tr('編成の変更は探索を終えてから行えます。')}</p>}{save.memoryGems?.pending && <p className="build-planner__lock">{tr('調律の結果を選んでから編成できます。')}</p>}<Button disabled={busy || !plan.canApply} onClick={() => setConfirmApply(!confirmApply)}>{tr(confirmApply ? '変更の確認を閉じる' : '編成の変更内容を確認')}<ChevronRight size={16} /></Button>
        {confirmApply && <div className="build-planner__confirmation" role="region" aria-label={tr('編成変更の確認')}><h5>{tr('現在のパーティと装備を変更します')}</h5><p>{tr('石や素材は消費しません。ほかの仲間が装備している石は移動します。')}</p><ul>{plan.slots.map((slot,index)=><li key={slot.slot.id}><strong>{name(slot.characterId)}{index === plan.stageDefinition.leaderSlot && <Crown size={12} />}</strong><span>{slot.gem ? tr(gemName(slot.gem)) : tr('未所持')}</span>{slot.needsTransfer && <small>{tr('{0}から移動').replace('{0}',name(slot.ownerId))}</small>}</li>)}</ul><div><Button disabled={busy || !plan.canApply} onClick={() => { dispatch({type:'applyBuild',buildId:selectedId,stage}); setConfirmApply(false); }}>{tr('この内容で編成する')}</Button><Button variant="secondary" disabled={busy} onClick={() => setConfirmApply(false)}>{tr('キャンセル')}</Button></div></div>}
      </div>
    </article>
  </section>;
}
