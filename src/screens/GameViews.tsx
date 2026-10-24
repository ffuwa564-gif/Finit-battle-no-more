import { useState } from 'react';
import { ArrowRight, Backpack, BookOpen, ChevronRight, CircleHelp, Compass, Crown, Heart, Hexagon, Moon, Plus, Shield, Sparkles, Swords, Users, Volume2, VolumeX, WandSparkles, FlaskConical, Check, DoorOpen, FastForward, Play, Package, Settings, Feather } from 'lucide-react';
import { Button, Panel, CharacterPortrait, MaterialIcon, HPBar, Modal, MenuEmblem, EnemyCarousel, SceneEffects, TownNavigation, CommandEmblem, StrategyDial, PortraitArt, CurrencyEmblem } from '../ui';
import { content, assetPath, characterById, materialName, roleName } from '../content';
import { characterStats, dungeonDifficulty, leaderBonus, recruitCost } from '../domain/engine';
import type { Battle, CharacterDef, GameCommand, GameSave, Rarity, Unit } from '../domain/types';

export type Page = 'home' | 'dungeons' | 'party' | 'bag' | 'recruit' | 'codex' | 'gacha' | 'settings' | 'preview';
export interface ViewProps { save: GameSave; busy: boolean; command: (c: GameCommand) => Promise<boolean>; navigate: (page: Page) => void; inspect: (character: CharacterDef) => void }
const rarities: Rarity[] = ['common', 'rare', 'epic'];
const statNames = { hp: '最大HP', attack: '攻撃力', defense: '防御力' };
const menu = [
  { page: 'party', title: 'パーティ', emblem: 'party' },
  { page: 'recruit', title: '仲間を迎える', emblem: 'monster' },
  { page: 'bag', title: 'カバン・道具', emblem: 'bag' },
  { page: 'gacha', title: '星の祈願', emblem: 'wish' },
  { page: 'codex', title: '記憶の図鑑', emblem: 'codex' },
  { page: 'settings', title: '設定', emblem: 'settings' },
] as const;

function PageTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return <div className="page-header"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{text && <p>{text}</p>}</div>;
}

export function HomeView(p: ViewProps) {
  const leader = characterById(p.save.leaderId);
  return <section className="home-hub game-frame" aria-labelledby="home-title">
    <h1 id="home-title" className="sr-only">旅の支度</h1>
    <div className="hub-illustration">
      <img src={assetPath('menu-hero')} alt="月下の廃聖堂に佇む銀髪の巡礼者と白い狼" />
      <SceneEffects mode="menu" reducedMotion={p.save.settings.reducedMotion} />
      <div className="hub-profile">
        <div className="hub-profile-person">
          <span className="hub-profile-avatar"><PortraitArt character={leader} face /></span>
          <div className="hub-profile-copy"><strong>{leader.name}</strong><span><Crown size={10} /> パーティリーダー</span></div>
        </div>
        <div className="hub-currencies"><span><CurrencyEmblem kind="stone" size={13} /><span className="sr-only">祈願石 </span><strong>{p.save.stones.toLocaleString()}</strong></span><span><CurrencyEmblem kind="gold" size={13} /><span className="sr-only">ゴールド </span><strong>{p.save.gold.toLocaleString()}</strong></span></div>
      </div>
    </div>
    <div className="home-hub-menu">{menu.map(item => <Button variant="secondary" className="hub-menu-tile" key={item.page} onClick={() => p.navigate(item.page)}><MenuEmblem kind={item.emblem} /><strong>{item.title}</strong></Button>)}</div>
    <Button variant="secondary" className="hub-dungeon-entry" onClick={() => p.navigate('dungeons')}><img src={assetPath('cathedral')} alt="" /><span><strong>ダンジョンへ</strong></span><ChevronRight size={24} /></Button>
    <TownNavigation active="home" onNavigate={p.navigate} embedded />
  </section>;
}

export function DungeonsView(p: ViewProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [carry, setCarry] = useState(Math.min(5, p.save.potions));
  const dungeon = content.dungeons.find(d => d.id === selected);
  return <><PageTitle eyebrow="THE FORGOTTEN DEPTHS" title="ダンジョン" /><div className="dungeon-list">{content.dungeons.filter(d => d.published).map((d, index) => <Panel className="dungeon-card" key={d.id}><div className="dungeon-image"><img src={assetPath(d.artId)} alt="" /><span className="dungeon-index">{String(index + 1).padStart(2, '0')}</span>{p.save.completedDungeonIds.includes(d.id) && <span className="clear-label"><Check size={12} /> 踏破済</span>}</div><div className="dungeon-info"><span className="eyebrow">{d.waves.length} WAVES · BOSS</span><h2>{d.name}</h2><p>{d.subtitle}</p><div className="dungeon-meta"><span><Hexagon size={14} /> 難易度 {dungeonDifficulty(d, content).toFixed(1)}</span><span><CurrencyEmblem kind="stone" size={14} /> 初踏破 +1</span></div><Button variant="secondary" onClick={() => setSelected(d.id)}>探索の準備 <ArrowRight size={15} /></Button></div></Panel>)}</div>
    <Modal open={!!dungeon} onClose={() => setSelected(null)} title={dungeon?.name ?? '探索の準備'}>{dungeon && <><p>{dungeon.description}</p><div className="notice"><Shield size={18} /><span>全回復で出発。<br />全滅・撤退で今回の素材をすべて失います。</span></div><p>持ち込む回復薬 <strong>{carry} 個</strong> / 所持 {p.save.potions} 個</p><div className="toolbar"><Button variant="secondary" disabled={carry <= 0} onClick={() => setCarry(n => n - 1)}>−</Button><Button variant="secondary" disabled={carry >= Math.min(5, p.save.potions)} onClick={() => setCarry(n => n + 1)}>＋</Button></div><div className="home-party">{p.save.partyIds.map(id => <CharacterPortrait key={id} character={characterById(id)} leader={id === p.save.leaderId} />)}</div><Button size="lg" disabled={p.busy} onClick={async () => { if (await p.command({ type: 'depart', dungeonId: dungeon.id, potions: carry })) setSelected(null); }}><Compass size={18} /> 探索を始める</Button></>}</Modal>
  </>;
}

export function PartyView(p: ViewProps) {
  const leader = characterById(p.save.leaderId), bonus = leaderBonus(leader);
  async function toggle(id: string) {
    const ids = p.save.partyIds.includes(id) ? p.save.partyIds.filter(x => x !== id) : [...p.save.partyIds, id];
    await p.command({ type: 'party', partyIds: ids, leaderId: ids.includes(p.save.leaderId) ? p.save.leaderId : ids[0] });
  }
  return <><PageTitle eyebrow="COMPANIONS" title="パーティ" text={`編成 ${p.save.partyIds.length} / 4`} /><Panel className="leader-panel"><Crown size={22} /><div><span className="eyebrow">LEADER · {leader.name}</span><h3>パーティ全員の{statNames[bonus.stat]} +{bonus.percent}%</h3></div></Panel><div className="character-grid">{p.save.ownedIds.map(id => { const ch = characterById(id), active = p.save.partyIds.includes(id); return <Panel className="character-card" key={id}><CharacterPortrait character={ch} selected={active} leader={p.save.leaderId === id} onClick={() => p.inspect(ch)} /><h3>{ch.name}</h3><p>{roleName(ch.role)} · 定数 {(ch.strength / 10).toFixed(1)}</p><div className="toolbar"><Button variant={active ? 'primary' : 'secondary'} disabled={p.busy || (!active && p.save.partyIds.length >= 4) || (active && p.save.partyIds.length === 1)} onClick={() => toggle(id)}>{active ? <Check size={14} /> : <Plus size={14} />}{active ? '編成中' : '編成する'}</Button><Button variant="icon" title="リーダーにする" disabled={!active || p.busy || id === p.save.leaderId} onClick={() => p.command({ type: 'party', partyIds: p.save.partyIds, leaderId: id })}><Crown size={17} /></Button></div></Panel>; })}</div></>;
}

export function BagView(p: ViewProps) {
  const entries = Object.entries(p.save.materials).filter(([, n]) => n > 0);
  return <><PageTitle eyebrow="COLLECTED MEMORIES" title="カバン・道具" /><Panel className="shop-panel"><div className="shop-item"><FlaskConical size={32} /><div><h2>回復薬</h2><p>味方1人のHPを30%回復。持込は最大5個。</p><span className="subtle">所持 {p.save.potions} 個</span></div></div><Button disabled={p.busy || p.save.gold < 10} onClick={() => p.command({ type: 'buyPotion', count: 1 })}><CurrencyEmblem kind="gold" size={16} /> 10 G で購入</Button></Panel><h2>所持素材</h2>{entries.length ? <div className="resource-list">{entries.map(([id, n]) => <Panel className="resource-item" key={id}><MaterialIcon rarity={id.split(':')[1] as Rarity} /><div><strong>{materialName(id)}</strong><p className="subtle">× {n}</p></div></Panel>)}</div> : <Panel><p className="subtle">素材はまだありません。</p></Panel>}<h2>素材の合成・分解</h2><p className="subtle">同種族の素材：合成 5 → 1 ／ 分解 1 → 3</p><div className="resource-list">{content.species.filter(s => rarities.some(r => (p.save.materials[`${s.id}:${r}`] ?? 0) > 0)).map(s => <Panel key={s.id}><h3>{s.name}</h3>{rarities.map(r => <div className="exchange-row" key={r}><span>{materialName(`${s.id}:${r}`)} ×{p.save.materials[`${s.id}:${r}`] ?? 0}</span><div className="toolbar">{r !== 'epic' && <Button size="sm" variant="secondary" disabled={p.busy || (p.save.materials[`${s.id}:${r}`] ?? 0) < 5} onClick={() => p.command({ type: 'exchange', speciesId: s.id, rarity: r, direction: 'up' })}>5個を合成</Button>}{r !== 'common' && <Button size="sm" variant="secondary" disabled={p.busy || !(p.save.materials[`${s.id}:${r}`] > 0)} onClick={() => p.command({ type: 'exchange', speciesId: s.id, rarity: r, direction: 'down' })}>1個を分解</Button>}</div></div>)}</Panel>)}</div></>;
}

export function RecruitView(p: ViewProps) {
  const chars = content.characters.filter(c => c.published && c.origin.includes('recruit') && p.save.discoveredIds.includes(c.id));
  return <><PageTitle eyebrow="A NEW BOND" title="仲間を迎える" />{!chars.length && <Panel><p>仲間候補はまだいません。</p><Button onClick={() => p.navigate('dungeons')}>出会いを探す <ArrowRight size={15} /></Button></Panel>}<div className="character-grid">{chars.map(ch => { const owned = p.save.ownedIds.includes(ch.id), costs = recruitCost(ch); return <Panel key={ch.id} className="character-card"><CharacterPortrait character={ch} onClick={() => p.inspect(ch)} /><h3>{ch.name}</h3><p>{roleName(ch.role)} · 定数 {(ch.strength / 10).toFixed(1)}</p><div className="cost-list">{costs.map(cost => <div key={cost.materialId}><MaterialIcon rarity={cost.materialId.split(':')[1] as Rarity} /><span>{materialName(cost.materialId)}</span><strong>{p.save.materials[cost.materialId] ?? 0}/{cost.count}</strong></div>)}</div><Button disabled={owned || p.busy || costs.some(cost => (p.save.materials[cost.materialId] ?? 0) < cost.count)} onClick={() => p.command({ type: 'recruit', characterId: ch.id })}>{owned ? <Check size={16} /> : <Heart size={16} />}{owned ? '仲間になっています' : '仲間に迎える'}</Button></Panel>; })}</div></>;
}

export function CodexView(p: ViewProps) { return <><PageTitle eyebrow="THE ARCHIVE" title="記憶の図鑑" /><div className="character-grid">{content.characters.filter(ch => ch.published || p.save.ownedIds.includes(ch.id)).map(ch => <Panel className="character-card" key={ch.id}><CharacterPortrait character={ch} onClick={() => p.inspect(ch)} /><span className="eyebrow">{ch.epithet}</span><h3>{ch.name}</h3><p>{roleName(ch.role)} · {ch.origin.includes('gacha') ? '祈願限定' : p.save.discoveredIds.includes(ch.id) ? '出会った記憶' : 'まだ見ぬ縁'}</p><Button variant="secondary" onClick={() => p.inspect(ch)}>物語を読む <BookOpen size={14} /></Button></Panel>)}</div></>; }

export function GachaView(p: ViewProps) {
  const pool = content.characters.filter(c => c.published && c.origin.includes('gacha'));
  async function draw() { await p.command({ type: 'draw' }); }
  return <><PageTitle eyebrow="WISH UPON A FALLEN STAR" title="星の祈願" /><section className="wish-hero"><img src={assetPath('key-art')} alt="静かな月光の庭" /><div className="wish-content"><Sparkles size={40} strokeWidth={1} /><span className="eyebrow">CELESTIAL ENCOUNTER</span><h2>星が結ぶ、新しい縁。</h2><Button size="lg" disabled={p.busy || p.save.stones < 5 || pool.every(c => p.save.ownedIds.includes(c.id))} onClick={draw}><CurrencyEmblem kind="stone" size={18} /> 石5個で祈願する</Button><span>所持 {p.save.stones} 個 · 次は {p.save.drawCount === 1 ? 'SSR確定' : '通常抽選'}</span></div></section><Panel><h3>排出について</h3><p>通常：R 80% / SR 17% / SSR 3%。通算2回目はSSR確定。同じ仲間は重複しません。</p><p className="subtle">各レアリティ内の未所持キャラから均等抽選。全員所持した区分は残る未所持へ振替。石の供給は初踏破のみで、課金はありません。</p></Panel><h2>星からの訪問者</h2><div className="character-grid">{pool.map(ch => <Panel className="character-card" key={ch.id}><CharacterPortrait character={ch} onClick={() => p.inspect(ch)} /><span className="eyebrow">{ch.rarity}</span><h3>{ch.name}</h3><p>{ch.epithet}</p></Panel>)}</div></>;
}

export function SettingsView(p: ViewProps) {
  return <><PageTitle eyebrow="A MOMENT OF QUIET" title="設定" /><Panel><div className="setting-row"><div><h3>効果音</h3></div><div className="toolbar">{[0, 0.25, 0.5, 1].map(v => <Button variant={p.save.settings.seVolume === v ? 'primary' : 'secondary'} size="sm" key={v} disabled={p.busy} onClick={() => p.command({ type: 'settings', settings: { seVolume: v } })}>{v === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}{Math.round(v * 100)}%</Button>)}</div></div><div className="setting-row"><div><h3>演出速度</h3></div><div className="toolbar">{([1, 2] as const).map(speed => <Button variant={p.save.settings.speed === speed ? 'primary' : 'secondary'} key={speed} onClick={() => p.command({ type: 'settings', settings: { speed } })}>×{speed}</Button>)}</div></div><div className="setting-row"><div><h3>動きを控えめに</h3></div><Button variant="secondary" onClick={() => p.command({ type: 'settings', settings: { reducedMotion: !p.save.settings.reducedMotion } })}>{p.save.settings.reducedMotion ? 'オン' : 'オフ'}</Button></div></Panel><Panel><h3>BGM</h3><p>未設定</p><h3>セーブ</h3><p>このブラウザーに自動保存。データ削除で失われます。ほかの端末・ブラウザーとは共有されません。</p></Panel></>;
}

export function CharacterDetail({ character: ch, onClose }: { character: CharacterDef | null; onClose: () => void }) {
  if (!ch) return null;
  const stats = characterStats(ch), bonus = leaderBonus(ch);
  return <Modal open={true} title={ch.name} onClose={onClose}><div className="character-detail"><img className="detail-art" src={assetPath(ch.artId)} alt={ch.name} /><div><span className="eyebrow">{ch.epithet}</span><p>{roleName(ch.role)} · 難易度定数 {(ch.strength / 10).toFixed(1)}</p><div className="stat-grid"><span>HP <strong>{stats.hp}</strong></span><span>攻撃 <strong>{stats.attack}</strong></span><span>防御 <strong>{stats.defense}</strong></span><span>素早さ <strong>{stats.speed}</strong></span></div><h3><Crown size={16} /> リーダースキル</h3><p>パーティ全員の{statNames[bonus.stat]}を{bonus.percent}%上昇</p><h3>スキル</h3>{ch.skillIds.map(id => { const sk = content.skills.find(s => s.id === id)!; return <p key={id}><WandSparkles size={13} /> {sk.name} <span className="subtle">強さ {(sk.strength / 10).toFixed(1)}</span></p>; })}</div></div><div className="flavor-text"><Feather size={18} /><p>{ch.flavor}</p></div></Modal>;
}

export function visibleUnits(battle: Battle): Unit[] {
  let units = battle.initialUnits;
  for (const event of battle.events.slice(0, battle.cursor)) if (event.unitsAfter) units = event.unitsAfter;
  return battle.phase === 'playing' ? units : battle.units;
}

export function BattleView(p: ViewProps) {
  const battle = p.save.battle!;
  const [usingPotion, setUsingPotion] = useState(false);
  const [retreat, setRetreat] = useState(false);
  const dungeon = content.dungeons.find(d => d.id === battle.dungeonId)!;
  const units = visibleUnits(battle), event = battle.phase === 'playing' ? battle.events[battle.cursor] : undefined;
  const party = units.filter(u => u.side === 'party'), enemies = units.filter(u => u.side === 'enemy');
  const items = Object.entries(battle.pendingMaterials).filter(([, n]) => n > 0);
  const total = items.reduce((n, [, amount]) => n + amount, 0) - (battle.phase === 'playing' ? battle.events.slice(battle.cursor).filter(e => e.kind === 'drop').length : 0);
  const displayRound = battle.phase === 'playing' && battle.events.some(e => ['attack', 'area', 'heal', 'guard', 'buff', 'debuff'].includes(e.kind)) ? Math.max(1, battle.round - 1) : battle.round;
  const reward = battle.phase === 'reward', failed = battle.phase === 'failed';
  if (reward || failed) return <><PageTitle eyebrow={reward ? 'EXPLORATION COMPLETE' : 'THE JOURNEY CONTINUES'} title={reward ? '探索の記録' : '探索終了'} text={dungeon.name} /><Panel className="result-panel">{reward ? <Sparkles size={38} /> : <Moon size={38} />}<h2>{reward ? '獲得素材' : '今回の素材は失われました。'}</h2>{reward ? <><div className="resource-list">{items.map(([id, n]) => <div className="resource-item" key={id}><MaterialIcon rarity={id.split(':')[1] as Rarity} /><span>{materialName(id)}</span><strong>×{n}</strong></div>)}</div><div className="reward-summary"><span><CurrencyEmblem kind="gold" size={17} /> 撃破 {battle.goldEarned} G（取得済み）</span><span>クリア +20 G</span>{!p.save.completedDungeonIds.includes(dungeon.id) && <span><CurrencyEmblem kind="stone" size={17} /> 初踏破 +1</span>}</div><p className="subtle">確定するまで素材は仮取得です。</p><Button size="lg" disabled={p.busy} onClick={() => p.command({ type: 'claim' })}><Check size={18} /> 獲得を確定</Button></> : <><p>{battle.failureReason ?? 'パーティは廃都から帰還しました。'}</p><p className="subtle">ゴールド・敵の記録は保持。次回は全回復で出発します。</p><Button size="lg" disabled={p.busy} onClick={() => p.command({ type: 'leaveFailure' })}>街へ戻る <ArrowRight size={16} /></Button></>}</Panel></>;
  return <div className="battle-layout game-frame">
    <section className={`battle-scene${enemies.some(unit => unit.boss) ? ' battle-scene--boss' : ''}`} aria-label="敵の戦場">
      <EnemyCarousel key={`${battle.id}:${battle.wave}`} units={enemies} event={event} reducedMotion={p.save.settings.reducedMotion} wave={battle.wave + 1} waveCount={dungeon.waves.length} round={displayRound} materials={total} />
      <SceneEffects mode="battle" reducedMotion={p.save.settings.reducedMotion} />
      {event && <div className={`battle-toast ${event.kind === 'dialogue' ? 'dialogue-toast' : ''}`} role="status" key={`toast-${event.id}`}>{event.kind === 'dialogue' && <Feather size={15} />}{event.text}</div>}
      {event?.kind === 'drop' && <div data-drop className={`material-flight rarity-${event.rarity}`} key={`drop-${event.id}`}><MaterialIcon rarity={event.rarity ?? 'common'} /></div>}
    </section>
    <div className={`party-strip${usingPotion ? ' party-strip--selecting' : ''}`} aria-label="パーティメンバー">
      {party.map(unit => <div data-unit={unit.uid} className={`party-unit ${unit.hp <= 0 ? 'is-defeated' : ''}`} key={unit.uid}>
        <CharacterPortrait variant="face" compact showRole={false} showName={false} character={characterById(unit.characterId)} leader={unit.characterId === battle.leaderId} hp={unit.hp} maxHp={unit.maxHp} onClick={usingPotion && unit.hp > 0 ? async () => { if (await p.command({ type: 'potion', unitId: unit.uid })) setUsingPotion(false); } : undefined} />
        <span className="party-hp">{unit.hp} / {unit.maxHp}</span>
      </div>)}
    </div>
    <Panel className="command-pad">
      <div className="command-heading">{usingPotion && <span className="sr-only">回復する仲間を選択</span>}<div className="toolbar">{usingPotion && <Button size="sm" variant="secondary" onClick={() => setUsingPotion(false)}>取消</Button>}<Button variant="icon" title={p.save.settings.seVolume === 0 ? '効果音を有効にする' : '効果音をミュート'} disabled={p.busy} onClick={() => p.command({ type: 'settings', settings: { seVolume: p.save.settings.seVolume === 0 ? 0.5 : 0 } })}>{p.save.settings.seVolume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}</Button><Button size="sm" variant="secondary" disabled={p.busy} title="演出速度" onClick={() => p.command({ type: 'settings', settings: { speed: p.save.settings.speed === 1 ? 2 : 1 } })}><FastForward size={14} /> ×{p.save.settings.speed}</Button></div></div>
      <StrategyDial value={battle.strategy} disabled={p.busy || battle.phase !== 'ready'} onChange={strategy => { void p.command({ type: 'strategy', strategy }); }} />
      <div className="command-actions">
        <Button variant="secondary" className="battle-item-control" disabled={p.busy || battle.phase !== 'ready' || battle.potionUsed || !battle.potionsRemaining} onClick={() => setUsingPotion(!usingPotion)}><CommandEmblem kind="potion" /><span>回復薬 <small>{battle.potionsRemaining}</small></span></Button>
        {battle.phase === 'playing' ? <Button size="lg" className="battle-advance-control" disabled={p.busy} onClick={() => p.command({ type: 'replay' })} aria-label="次の演出へ"><CommandEmblem kind="replay" /><span>次へ</span></Button> : <Button size="lg" className="battle-advance-control" disabled={p.busy || usingPotion} onClick={() => p.command({ type: 'round' })} aria-label="ラウンドを進める"><CommandEmblem kind="advance" /><span>進める</span></Button>}
        <Button variant="icon" className="battle-retreat-control" title="撤退" disabled={p.busy || battle.phase !== 'ready'} onClick={() => setRetreat(true)}><DoorOpen size={20} strokeWidth={1.3} /></Button>
      </div>
    </Panel>
    <Modal open={retreat} onClose={() => setRetreat(false)} title="探索から撤退しますか？"><p>今回の素材をすべて失います。ゴールド・敵の記録は残ります。</p><Button variant="danger" disabled={p.busy} onClick={async () => { if (await p.command({ type: 'retreat' })) setRetreat(false); }}>撤退する</Button></Modal>
  </div>;
}

export function PreviewView(p: ViewProps) { return <><PageTitle eyebrow="SHARED DESIGN SYSTEM" title="共通プレビュー" /><Panel><div className="toolbar"><Button>主操作</Button><Button variant="secondary">補助操作</Button><Button variant="danger">危険な操作</Button><Button disabled>無効</Button></div><div className="toolbar">{rarities.map(r => <MaterialIcon key={r} rarity={r} />)}</div><HPBar hp={65} maxHp={100} /></Panel><div className="character-grid">{content.characters.map(ch => <Panel className="character-card" key={ch.id}><CharacterPortrait character={ch} onClick={() => p.inspect(ch)} /><h3>{ch.name}</h3><p>{ch.flavor}</p></Panel>)}</div></>; }
