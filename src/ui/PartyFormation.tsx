import { useState } from 'react';
import { Compass, Crown, Plus } from 'lucide-react';
import type { CharacterDef, GameSave } from '../domain/types';
import { characterById } from '../content';
import { leaderEffectDescription } from '../domain/skill-info';
import { leaderBonus } from '../domain/engine';
import { tr } from '../locales/i18n';
import { Button, Panel } from './index';
import { PortraitArt } from './PortraitArt';
import './party-formation.css';

export interface PartyFormationProps {
  save: Pick<GameSave, 'partyIds' | 'leaderId'>;
  busy: boolean;
  onPartyChange: (partyIds: string[], leaderId: string) => unknown;
  onInspect: (character: CharacterDef) => void;
}

const statNames = { hp: '最大HP', attack: '攻撃力', defense: '防御力' };

/** Formation order and the leader bonus are separate, explicit saved actions. */
export function PartyFormation({ save, busy, onPartyChange, onInspect }: PartyFormationProps) {
  const [selectedId, select] = useState(save.partyIds[0]);
  const selected = characterById(save.partyIds.includes(selectedId) ? selectedId : save.partyIds[0]);
  const leader = characterById(save.leaderId), bonus = leaderBonus(leader);
  const first = save.partyIds[0] === selected.id, leads = save.leaderId === selected.id;
  return <Panel className="party-formation" role="region" aria-label={tr('現在の編成')}>
    <header className="party-formation__header"><h2>{tr('現在の編成')}</h2><span>{save.partyIds.length} / 4</span></header>
    <p className="party-formation__hint">{tr('先頭は戦闘中の操作役、リーダーは全体効果を担当します。')}</p>
    <div className="party-formation__slots" role="group" aria-label={tr('編成枠')}>
      {save.partyIds.map((id, index) => {
        const character = characterById(id);
        return <Button key={id} className="party-formation__slot" variant="secondary" selected={id === selected.id} aria-label={tr(character.name)} aria-pressed={id === selected.id} data-member-id={id} data-position={index + 1} onClick={() => select(id)}>
          <span className="party-formation__portrait"><PortraitArt character={character} face /><span className="party-formation__number">{index + 1}</span></span>
          <span className="party-formation__member"><strong>{tr(character.name)}</strong><span className="party-formation__badges">{index === 0 && <span><Compass size={11} />{tr('先頭・操作役')}</span>}{id === save.leaderId && <span><Crown size={11} />{tr('リーダー')}</span>}</span></span>
        </Button>;
      })}
      {Array.from({ length: 4 - save.partyIds.length }, (_, index) => <Button key={`empty-${index}`} className="party-formation__empty" variant="secondary" onClick={() => document.querySelector('[data-guide="party-members"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Plus size={17} /><span>{tr('仲間を選ぶ')}</span></Button>)}
    </div>
    <div className="party-formation__selection"><strong>{tr('選択中')} · {tr(selected.name)}</strong><Button size="sm" variant="secondary" onClick={() => onInspect(selected)}>{tr('詳細を見る')}</Button></div>
    <div className="party-formation__actions">
      <Button variant={first ? 'secondary' : 'primary'} disabled={busy || first} aria-pressed={first} onClick={() => onPartyChange([selected.id, ...save.partyIds.filter(id => id !== selected.id)], save.leaderId)}><Compass size={16} />{tr(first ? '先頭に設定済み' : 'この仲間を先頭に')}</Button>
      <Button variant={leads ? 'secondary' : 'primary'} disabled={busy || leads} aria-pressed={leads} onClick={() => onPartyChange([...save.partyIds], selected.id)}><Crown size={16} />{tr(leads ? 'リーダーに設定済み' : 'この仲間をリーダーに')}</Button>
    </div>
    <div className="leader-panel party-formation__leader" data-guide="party-leader"><Crown size={20} /><div><span className="eyebrow">{tr('リーダー')} · {tr(leader.name)}</span><h3>{tr('パーティ全員の')}{tr(statNames[bonus.stat])} +{bonus.percent}%</h3><p>{tr(leaderEffectDescription(leader))}</p></div></div>
  </Panel>;
}
