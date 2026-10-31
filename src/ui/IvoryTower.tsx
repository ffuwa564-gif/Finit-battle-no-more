import { dungeonGemFamily, GEM_FAMILIES } from '../domain/memory-gems';
import { ArrowUp, ChevronRight, Crown, Gem, LockKeyhole, ShieldCheck } from 'lucide-react';
import type { Content, GameSave } from '../domain/types';
import { highestTowerFloor, TOWER_ROUND_LIMIT, IVORY_TOWER_FLOORS, ivoryTowerId, towerLock, towerDustReward } from '../domain/ivory-tower';
import { Button, InventorySection } from './index';
import { tr } from '../locales/i18n';
import './ivory-tower.css';

export interface IvoryTowerProps {
  content: Content;
  save: GameSave;
  busy: boolean;
  onSelect: (id: string) => void;
  onEquipment: () => void;
}

export function IvoryTower({ content, save, busy, onSelect, onEquipment }: IvoryTowerProps) {
  const highest = highestTowerFloor(save);
  const next = content.dungeons.find(dungeon => dungeon.id === ivoryTowerId(Math.min(100, highest + 1)))!;
  const lock = towerLock(next, save);
  const guardianId = next.waves.at(-1)!.find(enemy => enemy.boss)?.characterId;
  const guardian = content.characters.find(character => character.id === guardianId);
  return <section className="ivory-tower" aria-label={tr('白亜の塔')}>
    <header className="ivory-tower__hero"><span className="ivory-tower__eyebrow">THE IVORY SPIRE</span><h2>{tr('白亜の塔')}</h2><p>{tr('磨いた記憶で、まだ届かない高みへ。')}</p><div className="ivory-tower__progress"><span>{tr('踏破した階層')}</span><strong>{highest}<small> / {IVORY_TOWER_FLOORS}</small></strong></div><progress value={highest} max={IVORY_TOWER_FLOORS} aria-label={tr('白亜の塔の踏破状況')} /></header>
    <article className="ivory-tower__frontier"><span className="ivory-tower__eyebrow">{tr(highest === 100 ? '全100層踏破' : '次の挑戦')}</span><h3>{tr(`第${next.towerFloor}層`)}<small>{tr(next.subtitle)}</small></h3><p>{tr('守護者')}：{tr(guardian?.name ?? '')}{next.waves.at(-1)!.length > 1 && <span> · {tr('護衛あり')}</span>}</p><div className="ivory-tower__reward"><Gem size={16} /><span>{tr(GEM_FAMILIES[dungeonGemFamily(next)].name)} · {tr('記憶石と調律用の欠片')} +{towerDustReward(next)}</span></div>{lock && <p className="ivory-tower__lock"><LockKeyhole size={15} />{tr(lock)}</p>}<Button disabled={busy || Boolean(lock)} aria-label={tr(highest === 100 ? '最上層に再挑戦' : '次の階層に挑む')} onClick={() => onSelect(next.id)}><ArrowUp size={17} />{tr(highest === 100 ? '最上層に再挑戦' : '次の階層に挑む')}</Button></article>
    <Button className="ivory-tower__equipment" variant="secondary" onClick={onEquipment}><Gem size={16} />{tr('記憶石を整える')}<ChevronRight size={16} /></Button>
    <p className="ivory-tower__limit">{tr('各ウェーブ{0}ラウンド以内に踏破').replace('{0}', String(TOWER_ROUND_LIMIT))}</p>
    <p className="ivory-tower__hint">{tr('踏破を確定すると次の層が開きます。突破が難しいときは探索で石を集め、技と特性を調律して再挑戦。')}</p>
    <div className="ivory-tower__bands">{Array.from({ length: 10 }, (_, band) => {
      const first = band * 10 + 1, last = first + 9;
      const cleared = Math.max(0, Math.min(10, highest - first + 1));
      return <InventorySection key={first} id={`tower-${first}-${last}`} title={`第${first}〜${last}層`} count={cleared} tone="night"><div className="ivory-tower__floors">{Array.from({ length: 10 }, (_, index) => {
        const floor = first + index, stage = content.dungeons.find(dungeon => dungeon.id === ivoryTowerId(floor))!;
        const reason = towerLock(stage, save);
        return <Button key={floor} data-testid={`tower-floor-${floor}`} aria-label={tr(`第${floor}層を選ぶ`)} variant={floor === highest + 1 ? 'primary' : 'secondary'} disabled={busy || Boolean(reason)} title={tr(reason ?? stage.subtitle)} onClick={() => onSelect(stage.id)}><span>{floor % 10 === 0 ? <Crown size={14} /> : floor <= highest ? <ShieldCheck size={14} /> : reason ? <LockKeyhole size={14} /> : <ArrowUp size={14} />}<strong>{floor}F</strong></span><small>{tr(floor <= highest ? '踏破済' : reason ? '未解放' : '挑戦可能')}</small></Button>;
      })}</div></InventorySection>;
    })}</div>
  </section>;
}
