import { memoryGemStacks, memoryGemStackKey, preferredStackItem, type MemoryGemStack } from './memory-gem-stacks';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Gem, LockKeyhole, ShieldCheck, Sparkles, Trash2, UnlockKeyhole, X } from 'lucide-react';
import type { Content, GameCommand, GameSave } from '../domain/types';
import { GEM_CRAFT_COST, GEM_DEFINITIONS, GEM_FAMILIES, GEM_VARIANTS, dungeonGemFamily, gemCooldown, gemDefinition, gemDescription, gemName, gemRarity, gemSkill, gemRoll, gemRollDescription, gemPowerMultiplier, gemTraitInfo, gemPowerTier, gemTraitTier, gemTier, dungeonGemLootProfile, gemPowerRefinementIsFixed, refinementCost, type GemVariant, type MemoryGem } from '../domain/memory-gems';
import { assetPath } from '../content';
import { tr } from '../locales/i18n';
import { Button, InventorySection } from './index';
import { MemoryGemTier } from './MemoryGemTier';
import './memory-gems.css';

type Family = 'sanctuary' | 'clock' | 'grave';
type InventoryFilter = 'all' | 'free' | 'locked';
const families: Family[] = ['sanctuary', 'clock', 'grave'];

/** A faceted silhouette belongs to equipment; it intentionally differs from the role crystal. */
export function MemoryGemSigil({ family = 'sanctuary', rare = false, className = '' }: { family?: Family; rare?: boolean; className?: string }) {
  return <span className={`memory-gem-sigil memory-gem-sigil--${family}${rare ? ' is-rare' : ''} ${className}`} aria-hidden="true">
    <svg viewBox="0 0 64 76" fill="none"><path className="memory-gem-sigil__halo" d="M32 2 60 22v32L32 74 4 54V22Z" /><path className="memory-gem-sigil__body" d="M32 9 53 25v26L32 66 11 51V25Z" /><path className="memory-gem-sigil__facet" d="m32 9 10 23-10 34-11-34Z" /><path className="memory-gem-sigil__edge" d="m11 25 21 7 21-7M11 51l21-19 21 19M32 9v57" /><path className="memory-gem-sigil__spark" d="m32 24 2 8 7 3-7 2-2 8-2-8-7-2 7-3Z" /></svg>
  </span>;
}

export interface MemoryGemsProps { save: GameSave; content: Content; dispatch: (command: GameCommand) => void; onClose?: () => void; busy?: boolean }

export function MemoryGems({ save, content, dispatch, onClose, busy = false }: MemoryGemsProps) {
  const inventory = save.memoryGems;
  const items = inventory?.items ?? [];
  const equipped = inventory?.equipped ?? {};
  const characters = content.characters.filter(character => save.ownedIds.includes(character.id));
  const [characterId, setCharacterId] = useState(save.partyIds[0] ?? characters[0]?.id ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(inventory?.pending?.gemId ?? null);
  const [family, setFamily] = useState<Family | 'all'>('all');
  const [filter, setFilter] = useState<InventoryFilter>('all');
  const [variant, setVariant] = useState('all');
  const [confirmSalvage, setConfirmSalvage] = useState(false);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [craftVariants, setCraftVariants] = useState<Record<string, GemVariant>>({});
  const detail = useRef<HTMLElement>(null);
  const offer = useRef<HTMLElement>(null);
  useEffect(() => { detail.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' }); }, [selectedId]);
  const selectedCharacter = characters.find(character => character.id === characterId) ?? characters[0];
  const activeCharacterId = selectedCharacter?.id ?? '';
  const current = items.find(item => item.id === equipped[activeCharacterId]);
  const selected = items.find(item => item.id === selectedId);
  const selectedDefinition = selected && gemDefinition(selected);
  const pending = inventory?.pending;
  const pendingOriginal = items.find(item => item.id === pending?.gemId);
  const pendingKey = pending ? `${pending.gemId}:${memoryGemStackKey(pending.candidate)}` : '';
  useEffect(() => { if (pendingKey) offer.current?.scrollIntoView({block:'start',behavior:'auto'}); }, [pendingKey]);
  const canRefine = !busy && !save.battle && !pending;
  const equipmentOwner = (id: string) => characters.find(character => equipped[character.id] === id);
  const canEquip = !busy && (!save.battle || (save.battle.phase === 'ready' && save.battle.round === 1 && !save.battle.potionUsed));
  const canCraft = !busy && !save.battle;
  const selectedOwner = selected && equipmentOwner(selected.id);
  const needsTransfer = Boolean(selectedOwner && selectedOwner.id !== activeCharacterId);
  const stacks = memoryGemStacks([...items].reverse(), equipped);
  const selectedStack = selected ? stacks.find(stack => stack.key === memoryGemStackKey(selected)) : undefined;
  const query = search.trim().toLocaleLowerCase();
  const filtered = stacks.filter(stack => {
    const item = stack.representative;
    const definition = gemDefinition(item);
    return (!query || tr(gemName(item) + ' ' + gemDescription(item) + ' ' + gemRollDescription(item)).toLocaleLowerCase().includes(query)) && (family === 'all' || definition.family === family) && (variant === 'all' || item.variant === variant)
      && (filter !== 'free' || stack.freeCount > 0) && (filter !== 'locked' || stack.lockedCount > 0);
  }).sort((a, b) => sort === 'tier' ? gemTier(b.representative) - gemTier(a.representative) || gemPowerMultiplier(b.representative) - gemPowerMultiplier(a.representative) : sort === 'power' ? gemPowerMultiplier(b.representative) - gemPowerMultiplier(a.representative) : sort === 'name' ? tr(gemName(a.representative)).localeCompare(tr(gemName(b.representative))) : sort === 'cooldown' ? (gemCooldown(gemSkill(a.representative).id) ?? 0) - (gemCooldown(gemSkill(b.representative).id) ?? 0) : 0);
  const sourceDungeons = content.dungeons.filter(dungeon => dungeon.published && dungeon.kind !== 'trial' && !dungeon.towerFloor);
  const firstTier6TowerFloor = content.dungeons.filter(dungeon => dungeon.published && dungeon.towerFloor !== undefined && (dungeonGemLootProfile(dungeon).tier6Chance ?? 0) > 0).map(dungeon => dungeon.towerFloor!).sort((a,b) => a-b)[0];
  function selectGem(item: MemoryGem) { setSelectedId(item.id); setConfirmSalvage(false); setConfirmTransfer(false); }
  function changeCharacter(id: string) {
    setCharacterId(id); setConfirmSalvage(false); setConfirmTransfer(false);
    if (selectedStack) setSelectedId(preferredStackItem(selectedStack, equipped, id).id);
  }
  function selectStack(stack: MemoryGemStack) { selectGem(filter === 'locked' ? stack.items.find(item => item.locked)! : preferredStackItem(stack, equipped, activeCharacterId)); }
  function rollLabel(item: MemoryGem) { return tr('技効力 ×{0}').replace('{0}', gemPowerMultiplier(item).toFixed(3).replace(/0$/, '')); }
  function cooldown(item: MemoryGem) { return gemCooldown(gemSkill(item).id) ?? gemDefinition(item).cooldown; }
  function tierStats(item: MemoryGem) {
    const traitTier = gemTraitTier(item);
    return <div className="memory-gems__tier-stats">
      <div data-gem-stat="power" data-tier={gemPowerTier(item)}><span>{tr('技効力')}</span><MemoryGemTier tier={gemPowerTier(item)} /><strong>×{gemPowerMultiplier(item).toFixed(3).replace(/0$/, '')}</strong></div>
      <div data-gem-stat="trait" data-tier={traitTier}><span>{tr('追加特性')}</span>{traitTier > 0 && <MemoryGemTier tier={traitTier} />}<strong>{tr(gemTraitInfo[gemRoll(item).trait].name)}</strong></div>
    </div>;
  }
  function percent(chance: number) { return String(Number((chance * 100).toFixed(3))); }
  function sourceTierLabel(dungeon: Content['dungeons'][number]) {
    const profile = dungeonGemLootProfile(dungeon);
    return (profile.tier6Chance ?? 0) > 0 ? 'T1–T6' : profile.tier5Chance > 0 ? 'T1–T5' : profile.tier4Chance > 0 ? 'T1–T4' : 'T1–T3';
  }

  return <section className="memory-gems" aria-label={tr('記憶石')} data-testid="memory-gems">
    <header className="memory-gems__header"><div><span className="memory-gems__eyebrow">MEMORY STONES</span><h2><Gem size={23} />{tr('記憶石')}</h2><p>{tr('ひとつの石が、旅の戦い方を変える。')}</p></div>{onClose && <Button variant="icon" aria-label={tr('閉じる')} onClick={onClose}><X size={20} /></Button>}</header>
    <p className="memory-gems__intro">{tr('仲間1人につき1個。能力値を上げず、新しいスキルを授けます。')}</p>
    <div className="memory-gems__collection"><span><Sparkles size={15} />{tr('発見した記憶')}</span><strong>{inventory?.seen.length ?? 0}<small> / {GEM_DEFINITIONS.length}</small></strong></div>

    {pending && pendingOriginal && <article ref={offer} className="memory-gems__refinement-offer" aria-label={tr('調律結果の確認')} data-testid="gem-refinement-offer">
      <div className="memory-gems__refinement-title"><Sparkles size={20} /><div><span>{tr('確認待ちの調律')}</span><h3>{tr(gemName(pendingOriginal))}</h3></div></div>
      <p>{tr('消費した欠片は支払済みです。元の性能と新しい性能から選んでください。')}</p>
      <div className="memory-gems__refinement-compare"><div><span>{tr('現在の性能')}</span>{tierStats(pendingOriginal)}<p>{tr(gemDescription(pendingOriginal))}</p><p>{tr(gemRollDescription(pendingOriginal))}</p></div><div><span>{tr('新しい性能')}</span>{tierStats(pending.candidate)}<p>{tr(gemDescription(pending.candidate))}</p><p>{tr(gemRollDescription(pending.candidate))}</p></div></div>
      {save.battle && <p>{tr('調律の確定は街で行えます。')}</p>}
      <div className="memory-gems__refinement-actions"><Button disabled={busy || Boolean(save.battle)} onClick={() => dispatch({type:'resolveGemRefinement',accept:true})}>{tr('新しい性能を採用')}</Button><Button variant="secondary" disabled={busy || Boolean(save.battle)} onClick={() => dispatch({type:'resolveGemRefinement',accept:false})}>{tr('元の性能を残す')}</Button></div>
    </article>}

    <div className="memory-gems__equipment">
      <label className="memory-gems__character-select"><span>{tr('石を託す仲間')}</span><select value={activeCharacterId} onChange={event => changeCharacter(event.target.value)} aria-label={tr('石を託す仲間')}>{characters.map(character => <option key={character.id} value={character.id}>{tr(character.name)}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label>
      <div className="memory-gems__party" aria-label={tr('パーティ')}>
        {save.partyIds.map(id => { const character = characters.find(item => item.id === id); if (!character) return null; const item = items.find(gem => gem.id === equipped[id]); const portrait = content.assets.find(asset => asset.id === character.portraitId); return <Button key={id} variant="secondary" selected={id === activeCharacterId} className="memory-gems__party-character" aria-label={tr(character.name)} onClick={() => changeCharacter(id)}><img src={assetPath(character.portraitId)} alt="" style={{ objectPosition: portrait?.anchor ?? '50% 22%' }} /><span>{tr(character.name)}</span>{item && <span className={`memory-gems__equipped-dot memory-gem-tone--${gemDefinition(item).family}`} />}</Button>; })}
      </div>
      <div className="memory-gems__slot">
        <MemoryGemSigil family={current ? gemDefinition(current).family : undefined} rare={current ? gemDefinition(current).rarity === 'epic' : false} />
        <div><span className="memory-gems__label">{tr('装備中')}</span><h3>{current ? tr(gemName(current)) : tr('まだ石を託していません')}</h3><p>{current ? tr(gemDescription(current)) : tr('見つけた記憶石を選んで装備できます。')}</p>{current && <p className="memory-gems__roll-line"><MemoryGemTier tier={gemTier(current)} /> {rollLabel(current)} · {tr(gemTraitInfo[gemRoll(current).trait].name)}</p>}</div>
        {current && <Button variant="secondary" size="sm" disabled={!canEquip} onClick={() => dispatch({ type: 'equipMemoryGem', characterId: activeCharacterId, gemId: null })}>{tr('外す')}</Button>}
      </div>
      {save.battle && <p className="memory-gems__restriction" role="status"><ShieldCheck size={15} />{tr(canEquip ? '次の戦闘から、この装備を使えます。' : '装備変更は街か、ウェーブ開始時の行動前にできます。')}</p>}
    </div>

    <InventorySection id="memory-stones" title="所持している記憶石" count={items.length} tone="night">
    <div className="memory-gems__inventory-heading"><h3>{tr('種類 {0} · 合計 {1}個').replace('{0}', String(stacks.length)).replace('{1}', String(items.length))}</h3><label><span className="memory-gems__sr-only">{tr('表示する記憶石')}</span><select value={filter} onChange={event => setFilter(event.target.value as InventoryFilter)} aria-label={tr('表示する記憶石')}><option value="all">{tr('すべて')}</option><option value="free">{tr('未装備')}</option><option value="locked">{tr('保護中')}</option></select></label></div>
    <div className="memory-gems__search"><input type="search" value={search} onChange={event => setSearch(event.target.value)} aria-label={tr("記憶石を検索")} placeholder={tr("名前・スキル効果で検索")} /><select value={sort} onChange={event => setSort(event.target.value)} aria-label={tr("記憶石の並び順")}><option value="recent">{tr("新しい順")}</option><option value="name">{tr("名前順")}</option><option value="cooldown">{tr("再使用が早い順")}</option><option value="power">{tr('技効力が高い順')}</option><option value="tier">{tr('Tierが高い順')}</option></select></div>
    <div className="memory-gems__filters"><div className="memory-gems__family-filters" role="group" aria-label={tr('記憶石の系統')}><Button size="sm" variant="secondary" selected={family === 'all'} onClick={() => setFamily('all')}>{tr('すべて')}</Button>{families.map(key => <Button size="sm" variant="secondary" key={key} selected={family === key} onClick={() => setFamily(key)}>{tr(GEM_FAMILIES[key].name)}</Button>)}</div><select value={variant} onChange={event => setVariant(event.target.value)} aria-label={tr('記憶石の変種')}><option value="all">{tr('すべての変種')}</option>{Object.entries(GEM_VARIANTS).map(([key, value]) => <option value={key} key={key}>{tr(value.name)}</option>)}</select></div>
    {items.length === 0 ? <div className="memory-gems__empty"><MemoryGemSigil /><h3>{tr('まだ見ぬ記憶を探しに。')}</h3><p>{tr('ダンジョンの宝箱から記憶石を獲得できます。見つけた石は、撤退しても失われません。')}</p></div> : filtered.length === 0 ? <p className="memory-gems__empty-filter">{tr('この条件の記憶石はありません。')}</p> : <div className="memory-gems__grid">{filtered.map(stack => { const item = stack.representative; const definition = gemDefinition(item); const owner = equipmentOwner(item.id); return <Button key={stack.key} data-testid="memory-gem-card" data-gem-id={item.id} data-gem-tier={gemTier(item)} data-gem-stack={`${item.defId}:${item.variant}`} data-gem-roll={stack.key} variant="secondary" selected={selectedStack?.key === stack.key} className={`memory-gems__item memory-gems__item--${gemRarity(item)}${gemRoll(item).power >= 85 ? ' is-pristine' : ''}`} onClick={() => selectStack(stack)} aria-label={`${tr(gemName(item))} · T${gemTier(item)} · ${tr(gemRollDescription(item))} · ×${stack.items.length}`}>
      <span className="memory-gems__item-tier"><MemoryGemTier tier={gemTier(item)} /></span><span className="memory-gems__stack-count">×{stack.items.length}</span><MemoryGemSigil family={definition.family} rare={definition.rarity === 'epic'} /><span className="memory-gems__item-name">{tr(gemName(item))}</span><span className="memory-gems__item-meta">{tr(GEM_FAMILIES[definition.family].name)} · {tr(GEM_VARIANTS[item.variant].name)}</span><span className="memory-gems__item-roll">{rollLabel(item)}<small>{tr(gemTraitInfo[gemRoll(item).trait].name)}</small></span><span className="memory-gems__item-status">{stack.lockedCount > 0 && <LockKeyhole size={12} />}{stack.items.length === 1 ? owner ? tr(owner.name) : tr('未装備') : tr('装備 {0} · 未装備 {1}').replace('{0}', String(stack.equippedCount)).replace('{1}', String(stack.freeCount))}</span>
    </Button>; })}</div>}

    {selected && selectedDefinition && <article ref={detail} className={`memory-gems__detail memory-gem-tone--${selectedDefinition.family}`} aria-label={tr('記憶石の詳細')}>
      <div className="memory-gems__detail-heading"><MemoryGemSigil family={selectedDefinition.family} rare={selectedDefinition.rarity === 'epic'} /><div><span className="memory-gems__detail-tier"><MemoryGemTier tier={gemTier(selected)} /></span><span className="memory-gems__label">{tr(selectedDefinition.bossOnly ? '踏破宝箱限定の記憶' : '授けるスキル')}</span><h3>{tr(gemName(selected))}</h3><span className="memory-gems__cooldown">{tr('再使用：{0}ラウンド').replace('{0}', String(cooldown(selected)))}</span></div><Button variant="icon" disabled={busy} aria-label={tr(selected.locked ? '記憶石の保護を解除' : '記憶石を保護')} title={tr(selected.locked ? '記憶石の保護を解除' : '記憶石を保護')} onClick={() => { setConfirmSalvage(false); setConfirmTransfer(false); dispatch({ type: 'lockMemoryGem', gemId: selected.id }); }}>{selected.locked ? <LockKeyhole size={19} /> : <UnlockKeyhole size={19} />}</Button></div>
      <p className="memory-gems__effect">{tr(gemDescription(selected))}</p>
      <div className="memory-gems__roll-detail">{tierStats(selected)}<p>{tr(gemRollDescription(selected))}</p></div>
      {selectedStack && selectedStack.items.length > 1 && <div className="memory-gems__stack-detail"><p>{tr('性能が完全に同じ石をまとめています。1個ずつ別の仲間に装備できます。')}</p><label>{tr('操作する1個')}<select aria-label={tr('操作する1個')} value={selected.id} onChange={event => { const item = selectedStack.items.find(item => item.id === event.target.value); if (item) selectGem(item); }}>{selectedStack.items.map((item, index) => <option key={item.id} value={item.id}>{tr('{0}個目：{1}').replace('{0}', String(index + 1)).replace('{1}', equipmentOwner(item.id) ? tr(equipmentOwner(item.id)!.name) : tr('未装備'))}{item.locked ? ` · ${tr('保護中')}` : ''}</option>)}</select></label></div>}

      {current && current.id !== selected.id && <div className="memory-gems__comparison"><span>{tr('現在の装備')}</span><strong>{tr(gemName(current))}</strong> <MemoryGemTier tier={gemTier(current)} /><p>{tr(gemDescription(current))}</p><p>{rollLabel(current)} · {tr(gemRollDescription(current))}</p></div>}
      {equipmentOwner(selected.id) && equipmentOwner(selected.id)?.id !== activeCharacterId && <p className="memory-gems__restriction">{tr('ほかの仲間の装備も、確認して直接移せます。')}</p>}
      <div className="memory-gems__detail-actions"><Button disabled={!canEquip || !activeCharacterId || equipped[activeCharacterId] === selected.id} onClick={() => needsTransfer ? setConfirmTransfer(true) : dispatch({ type: 'equipMemoryGem', characterId: activeCharacterId, gemId: selected.id })}><Gem size={16} />{tr(equipped[activeCharacterId] === selected.id ? '装備中' : needsTransfer ? 'この仲間へ移す' : 'この仲間に託す')}</Button>
        <Button variant="secondary" disabled={!canCraft || pending?.gemId === selected.id || Boolean(selected.locked) || Boolean(equipmentOwner(selected.id))} onClick={() => setConfirmSalvage(!confirmSalvage)}><Trash2 size={15} />{tr('分解')}</Button></div>
      {confirmTransfer && needsTransfer && <div className="memory-gems__transfer-confirm" role="group" aria-label={tr("記憶石の移動を確認")}><p>{tr("{0}から{1}へ記憶石を移します。").replace("{0}", tr(selectedOwner!.name)).replace("{1}", tr(selectedCharacter!.name))}</p>{current && <p>{tr("今の装備はカバンに戻ります。")}</p>}<Button disabled={!canEquip} onClick={() => { dispatch({ type: "equipMemoryGem", characterId: activeCharacterId, gemId: selected.id, transfer: true }); setConfirmTransfer(false); }}>{tr("移動を確定")}</Button><Button variant="secondary" onClick={() => setConfirmTransfer(false)}>{tr("やめる")}</Button></div>}
      {confirmSalvage && <div className="memory-gems__salvage-confirm" role="group" aria-label={tr('分解の確認')}><p>{tr('この石を分解して欠片にします。元には戻せません。')}</p><Button variant="danger" size="sm" disabled={!canCraft || pending?.gemId === selected.id || Boolean(selected.locked) || Boolean(equipmentOwner(selected.id))} onClick={() => { dispatch({ type: 'salvageMemoryGem', gemId: selected.id }); setConfirmSalvage(false); setConfirmTransfer(false); setSelectedId(null); }}>{tr('分解を確定')}</Button><Button variant="secondary" size="sm" onClick={() => setConfirmSalvage(false)}>{tr('やめる')}</Button></div>}
    </article>}

    </InventorySection>
    <InventorySection id="memory-refinement" title="記憶石の調律" tone="night"><div className="memory-gems__refinement">
      <p>{tr('重複した石を分解して得た欠片で、愛用の石を調律できます。基礎能力値は変わりません。')}</p><p className="memory-gems__tier-rule">{tr('通常の調律はT3まで。拾ったT4〜T6の項目は、そのTierを保って仕上げられます。')}</p>
      {selected && selectedDefinition ? <><h3>{tr(gemName(selected))}</h3>{tierStats(selected)}<p className="memory-gems__roll-line">{tr(gemRollDescription(selected))}</p><div className="memory-gems__refinement-modes">{(['power','trait'] as const).map(mode => { const cost=refinementCost(selected,mode); const enough=(inventory?.dust[selectedDefinition.family] ?? 0)>=cost; const fixed=mode==='power' && gemPowerRefinementIsFixed(selected); return <div key={mode}><div><strong>{tr(mode==='power'?'技効力を調律':'追加特性を調律')}</strong><p>{tr(fixed?'このTier内では技の効果が変わらないため、技効力は調律できません。追加特性は調律できます。':mode==='power'?'追加特性を固定して、技効力だけを再抽選します。':'技効力を固定して、追加特性とその性能を再抽選します。')}</p><small>{tr(GEM_FAMILIES[selectedDefinition.family].name)} · {tr('欠片')} {cost} / {inventory?.dust[selectedDefinition.family] ?? 0}</small></div><Button variant="secondary" disabled={!canRefine || !enough || fixed} onClick={() => dispatch({type:'startGemRefinement',gemId:selected.id,mode})}>{tr('調律する')}</Button></div>; })}</div></> : <p>{tr('所持している記憶石から、調律したい石を選んでください。')}</p>}
      {save.battle && <p>{tr('調律は街で行えます。')}</p>}{pending && <p>{tr('確認待ちの調律結果を、先に選んでください。')}</p>}
    </div></InventorySection>
    <InventorySection id="memory-crafting" title="欠片から記憶石を紡ぐ" tone="night"><div className="memory-gems__craft"><p>{tr('踏破や不要な石の分解で得た欠片から、種類と変種を指定して記憶石を作れます。')}</p><p>{tr('製作した石も、調律でT3まで育てられます。T4〜T6は探索で見つける上位の性能です。')}</p>
      <div className="memory-gems__dust">{families.map(key => <div key={key} className={`memory-gem-tone--${key}`}><MemoryGemSigil family={key} /><span>{tr(GEM_FAMILIES[key].name)}<strong>{inventory?.dust[key] ?? 0}<small> / {GEM_CRAFT_COST}</small></strong></span></div>)}</div>
      {save.battle && <p className="memory-gems__restriction">{tr('製作と分解は街で行えます。')}</p>}
      <div className="memory-gems__recipes">{GEM_DEFINITIONS.filter(definition => !definition.bossOnly && (family === 'all' || definition.family === family)).map(definition => { const craftVariant=craftVariants[definition.id] ?? 'pure'; const cost=GEM_CRAFT_COST+(craftVariant==='pure'?0:3); return <div className="memory-gems__recipe" key={definition.id}><MemoryGemSigil family={definition.family} /><div><h4>{tr(definition.name)}</h4><p>{tr(definition.description)}</p>{definition.variants.length>1 && <select aria-label={tr('{0}の製作する変種').replace('{0}',tr(definition.name))} value={craftVariant} onChange={event=>setCraftVariants({...craftVariants,[definition.id]:event.target.value as GemVariant})}>{definition.variants.map(value=><option key={value} value={value}>{tr(GEM_VARIANTS[value].name)}</option>)}</select>}<span>{tr(GEM_FAMILIES[definition.family].name)} · {tr('欠片')} {cost}</span></div><Button variant="secondary" size="sm" disabled={!canCraft || (inventory?.dust[definition.family] ?? 0) < cost} onClick={() => dispatch({ type: 'craftMemoryGem', defId: definition.id,variant:craftVariant })}>{tr('紡ぐ')}</Button></div>; })}</div>
    </div></InventorySection>
    <InventorySection id="memory-sources" title="記憶石を探せる場所" tone="night"><div className="memory-gems__sources"><p>{tr('ダンジョンごとに宝石の系統が異なります。踏破宝箱からだけ見つかる特別な石もあります。')}</p><p>{tr('白亜の塔は高い層ほど、技効力の高い石を狙いやすくなります。')}</p>{firstTier6TowerFloor !== undefined && <p data-testid="tier6-tower-source">{tr('白亜の塔のT6は第{0}層から狙えます。').replace('{0}',String(firstTier6TowerFloor))}</p>}<p>{tr('T4〜T6は対応するダンジョンの踏破宝箱から。道中の宝箱はT3までです。')}</p><p>{tr('Tierは性能の段階です。石全体の表示は、技効力と追加特性のうち高い方です。')}</p><p className="memory-gems__tier-rule">{tr('上位Tier率は、踏破宝箱で石を得たときの各項目の確率です。1周あたりの入手率ではありません。追加特性がある石だけ、特性も抽選します。')}</p>{families.map(key => <div className="memory-gems__source" key={key}><h4>{tr(GEM_FAMILIES[key].name)}</h4><p>{tr(GEM_FAMILIES[key].description)}</p><ul>{sourceDungeons.filter(dungeon => dungeonGemFamily(dungeon) === key).map(dungeon => { const profile = dungeonGemLootProfile(dungeon); const featured = GEM_DEFINITIONS.find(def => def.id === profile.featuredDefId); return <li key={dungeon.id} data-gem-source={dungeon.id}><span>{tr(dungeon.name)}</span><small className="memory-gems__source-loot">{tr('踏破宝箱：{0}').replace('{0}', sourceTierLabel(dungeon))}{profile.tier4Chance + profile.tier5Chance + (profile.tier6Chance ?? 0) > 0 && <span className="memory-gems__source-rates">T4 {percent(profile.tier4Chance)}% / T5 {percent(profile.tier5Chance)}%{(profile.tier6Chance ?? 0) > 0 && <> / T6 {percent(profile.tier6Chance!)}%</>}</span>}{featured && <> · {tr('狙える記憶：{0}').replace('{0}', tr(featured.name))}</>}</small></li>; })}</ul></div>)}</div></InventorySection>
  </section>;
}
