import { tr, localize } from '../locales/i18n';
import { BookOpen, Check, LockKeyhole, Sparkles } from 'lucide-react';
import type { CharacterDef, Content, GameCommand, GameSave } from '../domain/types';
import { awakeningLock, awakeningRequirements } from '../domain/awakening';
import { Button, CharacterArtwork, MaterialIcon, Panel } from './index';
import './story-awakening.css';

export function StoryAwakening({ content, save, busy, suspended, inspect, command }: {
  content: Content; save: GameSave; busy: boolean; suspended: boolean;
  inspect: (character: CharacterDef) => void; command: (command: GameCommand) => Promise<boolean>;
}) {
  return <div className="story-journeys">{localize(content.storylines?.map(story => {
    const final = content.awakenings!.find(def => def.baseId === story.protagonistId)!;
    const protagonist = content.characters.find(char => char.id === final.awakenedId)!;
    const progress = final.requiredOwnedIds.filter(id => save.ownedIds.includes(id)).length;
    const owned = save.ownedIds.includes(final.awakenedId);
    const lock = awakeningLock(final, save, content);
    return <section key={story.id} className="story-journey" aria-label={tr(story.title)}>
      <header className="story-heading"><span className="eyebrow">MEMORIES OF DAWN</span><h2>{localize(story.title)}</h2><p>{localize(story.subtitle)}</p></header>
      <div className="story-hero"><CharacterArtwork character={protagonist} reducedMotion={save.settings.reducedMotion} suspended={suspended || !owned} />
        <div className="story-hero-caption"><span>{localize(owned ? 'AWAKENED' : '覚醒の先に待つ姿')}</span><h3>{localize(protagonist.epithet)}{tr("・")}{localize(protagonist.name)}</h3><small>{tr("定数 ")}{localize((protagonist.strength / 10).toFixed(1))}{tr(" · 覚醒でアニメーション解放")}</small></div>
      </div>
      <Panel className="story-final"><div className="story-progress"><Sparkles size={18} /><strong>{tr("取り戻した記憶")}</strong><span>{localize(progress)} / {localize(final.requiredOwnedIds.length)}</span></div>
        <ul className="story-requirements">{localize(awakeningRequirements(final, save, content).map(item => <li className={item.met ? 'is-met' : ''} key={item.label}>{localize(item.met ? <Check size={14} /> : <LockKeyhole size={14} />)}<span>{localize(item.label)}</span></li>))}</ul>
        <div className="toolbar"><Button variant="secondary" onClick={() => inspect(content.characters.find(char => char.id === story.protagonistId)!)}><BookOpen size={15} />{localize(protagonist.name)}{tr("の記憶")}</Button><Button disabled={busy || Boolean(lock)} onClick={() => command({ type: 'awaken', awakeningId: final.id })}>{localize(owned ? <Check size={15} /> : <Sparkles size={15} />)}{localize(owned ? '覚醒済み' : `${protagonist.name}を覚醒`)}</Button></div>
      </Panel>
      <div className="story-companions">{localize(story.relatedIds.map(id => {
        const def = content.awakenings!.find(item => item.baseId === id)!;
        const awakened = save.ownedIds.includes(def.awakenedId);
        const char = content.characters.find(item => item.id === (awakened ? def.awakenedId : id))!;
        const lock = awakeningLock(def, save, content);
        return <Panel key={id} className="story-companion"><div className="story-companion-art"><CharacterArtwork character={char} reducedMotion={save.settings.reducedMotion} suspended={suspended} /></div>
          <div className="story-companion-copy"><span className="eyebrow">{localize(awakened ? 'AWAKENED' : 'MEMORY')}</span><h3>{localize(char.name)}</h3><small>{localize(char.epithet)}</small><p className="story-cost"><MaterialIcon rarity="rare" size="sm" />{localize(content.materials?.find(item => item.id === def.cost.materialId)?.name)}<strong>{localize(save.materials[def.cost.materialId] ?? 0)} / {localize(def.cost.count)}</strong></p>
          <div className="toolbar"><Button variant="secondary" size="sm" aria-label={tr(`${char.name}の記憶`)} onClick={() => inspect(char)}><BookOpen size={14} />{tr("物語")}</Button><Button size="sm" disabled={busy || Boolean(lock)} aria-label={tr(`${char.name}を覚醒`)} onClick={() => command({ type: 'awaken', awakeningId: def.id })}>{localize(awakened ? '覚醒済み' : '覚醒')}</Button></div>
          {localize(lock && !awakened && <small className="subtle">{localize(lock)}</small>)}</div>
        </Panel>;
      }))}</div>
    </section>;
  }))}</div>;
}
