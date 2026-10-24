import { tr, localize } from '../locales/i18n';
import type { CharacterDef, Content, GameCommand, GameSave } from '../domain/types';
import { dungeonDifficulty } from '../domain/engine';
import { dungeonLock, eventExchangeLock } from '../domain/events';
import { Button, CharacterArtwork, MaterialIcon } from './index';
import { LockKeyhole, ChevronRight, Check, Hexagon } from 'lucide-react';
import './event-dungeons.css';

export function EventDungeons({ content, save, busy, suspended, onSelect, onInspect, command }: {
  content: Content; save: GameSave; busy: boolean; suspended: boolean;
  onSelect: (id: string) => void; onInspect: (character: CharacterDef) => void; command: (command: GameCommand) => Promise<boolean>;
}) {
  return <div className="event-list">{localize(content.events?.filter(event => event.published).map(event => <section className="event-sanctuary" key={event.id} aria-label={tr(event.name)}>
    <header className="event-heading"><span>{tr("ETERNAL EVENT · 九尾の契り")}</span><h2>{localize(event.name)}</h2><p>{localize(event.subtitle)}</p></header>
    <div className="event-forms">{localize((['normal', 'awakened'] as const).map(form => {
      const character = content.characters.find(char => char.id === (form === 'normal' ? event.normalId : event.awakenedId))!;
      const cost = form === 'normal' ? event.normalCost : event.awakenedCost;
      const material = form === 'normal' ? event.fragment : event.core;
      const lock = eventExchangeLock(event, form, save);
      const owned = save.ownedIds.includes(character.id);
      return <article className={`event-form event-form--${form}`} key={form}>
        <div className="event-form__scene"><CharacterArtwork character={character} reducedMotion={save.settings.reducedMotion} suspended={suspended} />
          <Button className="event-form__inspect" variant="secondary" aria-label={tr(`${character.name}の姿を見る`)} onClick={() => onInspect(character)}><span>{localize(form === 'normal' ? '妖狐の姫' : '最高難度限定 · 覚醒')}<strong>{localize(character.name)}</strong><small>{localize(owned ? '迎え入れ済み' : '未所持')} · {localize((character.strength / 10).toFixed(1))}</small></span></Button>
        </div>
        <div className="event-form__exchange"><span><MaterialIcon rarity={form === 'normal' ? 'rare' : 'epic'} size="sm" />{localize(material.name)}<strong>{localize(save.materials[cost.materialId] ?? 0)} / {localize(cost.count)}</strong></span>
          <Button variant={form === 'awakened' ? 'primary' : 'secondary'} disabled={busy || Boolean(lock)} onClick={() => command({ type: 'eventRecruit', eventId: event.id, form })}>{localize(owned ? <Check size={14} /> : null)}{localize(owned ? '迎え入れ済み' : form === 'normal' ? '葛葉を迎える' : '九尾の契りを結ぶ')}</Button>
          {localize(lock && !owned && <small>{localize(lock)}</small>)}
        </div>
      </article>;
    }))}</div>
    <div className="event-stages">{localize(event.dungeonIds.map(id => {
      const stage = content.dungeons.find(dungeon => dungeon.id === id)!;
      const lock = dungeonLock(stage, save, content);
      const top = stage.requiresOwnedId !== undefined;
      const cleared = save.completedDungeonIds.includes(id);
      return <div key={id} className={`event-stage${top ? ' event-stage--awakened' : ''}`}>
        <div><span className="event-stage__name">{localize(cleared ? <Check size={14} /> : lock ? <LockKeyhole size={14} /> : null)}<strong>{localize(stage.tierName)}</strong>{localize(top && <small>AWAKENING</small>)}</span><span className="event-stage__meta"><Hexagon size={12} /> {localize(dungeonDifficulty(stage, content).toFixed(1))} <span>· {localize(stage.waves.length)} WAVES</span></span></div>
        <div className="event-stage__reward"><MaterialIcon rarity={top ? 'epic' : 'rare'} size="sm" /><span>{localize(top ? event.core.name : event.fragment.name)}<strong> ×{localize(stage.eventReward?.count)}</strong></span></div>
        <Button variant="secondary" size="sm" disabled={busy || Boolean(lock)} title={tr(lock ?? '')} aria-label={tr(`${stage.tierName}の探索準備`)} onClick={() => onSelect(id)}>{localize(lock ? <LockKeyhole size={16} /> : <ChevronRight size={19} />)}</Button>
        {localize(lock && <small className="event-stage__lock">{localize(lock)}</small>)}
      </div>;
    }))}</div>
  </section>))}</div>;
}
