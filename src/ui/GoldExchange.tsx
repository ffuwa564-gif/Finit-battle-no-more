import { useState } from 'react';
import { tr, localize } from '../locales/i18n';
import type { CharacterDef, Content, GameCommand, GameSave } from '../domain/types';
import { roleName } from '../content';
import { skillDescription, leaderEffectDescription } from '../domain/skill-info';
import { Button, Panel, Modal, CurrencyEmblem, CharacterArtwork } from './index';
import './gold-exchange.css';

/** All offers share the same portrait, controls, confirmation, and command boundary. */
export function GoldExchange({ content, save, busy, command, onInspect }: {
  content: Content; save: GameSave; busy: boolean; command: (command: GameCommand) => Promise<boolean>; onInspect: (character: CharacterDef) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const offers = (content.goldExchanges ?? []).filter(offer => offer.published && content.characters.some(char => char.id === offer.characterId && char.published));
  const offer = offers.find(item => item.id === selected);
  const target = offer && content.characters.find(char => char.id === offer.characterId);
  if (!offers.length) return null;
  return <section className="gold-exchange-section" aria-label={tr('ゴールド交換')}>
    <h2>{tr('ゴールド交換')}</h2>
    {offers.map(offer => {
      const character = content.characters.find(char => char.id === offer.characterId)!;
      const owned = save.ownedIds.includes(character.id);
      return <Panel className="gold-exchange-card" key={offer.id}>
        <div className="gold-exchange-card__art"><CharacterArtwork character={character} reducedMotion={true} /></div>
        <div className="gold-exchange-card__copy"><span className="eyebrow">SSR · {tr('交換限定')}</span><p className="gold-exchange-card__epithet">{localize(character.epithet)}</p><h3>{localize(character.name)}</h3>
          <p>{localize(roleName(character.role))} · {localize((character.strength / 10).toFixed(1))}</p>
          <div className="gold-exchange-card__skills">{character.skillIds.map(id => { const skill = content.skills.find(item => item.id === id)!; return <p key={id}><strong>{localize(skill.name)}</strong><small>{localize(skillDescription(skill))}</small></p>; })}</div>
          <p className="gold-exchange-card__leader">{localize(leaderEffectDescription(character))}</p>
          <Button size="sm" variant="secondary" onClick={() => onInspect(character)}>{tr('物語と能力を見る')}</Button>
          <div className="gold-exchange-card__cost"><CurrencyEmblem kind="gold" size={20} /><strong>{localize(offer.goldCost.toLocaleString())} G</strong><span>{tr('常設・1回限り')}</span></div>
          {!owned && <div className="gold-exchange-card__progress"><progress max={offer.goldCost} value={Math.min(save.gold, offer.goldCost)} aria-label={tr('交換までのゴールド')} /><span>{tr('所持 {0} G').replace('{0}', save.gold.toLocaleString())}</span></div>}
          <Button disabled={busy || owned || save.gold < offer.goldCost} onClick={() => setSelected(offer.id)}>{tr(owned ? '交換済み' : 'ゴールドで迎える')}</Button>
        </div>
      </Panel>;
    })}
    <Modal open={!!target} title={tr('ゴールド交換の確認')} onClose={() => { if (!busy) setSelected(null); }}>
      {target && offer && <><p>{localize(target.name)} · SSR</p><p className="gold-exchange-confirm__price"><CurrencyEmblem kind="gold" size={23} /><strong>{localize(offer.goldCost.toLocaleString())} G</strong></p><p>{tr('ゴールドを消費して、この女神を仲間に迎えます。一度限りの交換です。')}</p>
        <div className="toolbar"><Button disabled={busy || save.gold < offer.goldCost || save.ownedIds.includes(target.id)} onClick={async () => { if (await command({ type: 'goldRecruit', exchangeId: offer.id })) setSelected(null); }}>{tr('交換を確定する')}</Button><Button variant="secondary" disabled={busy} onClick={() => setSelected(null)}>{tr('取消')}</Button></div></>}
    </Modal>
  </section>;
}
