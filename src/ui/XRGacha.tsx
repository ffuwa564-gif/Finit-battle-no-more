import { Gem, LockKeyhole, Sparkles } from 'lucide-react';
import { content } from '../content';
import type { GameSave } from '../domain/types';
import { xrChapterCleared, xrGachaLock } from '../domain/xr-gacha';
import { tr } from '../locales/i18n';
import { Button, CharacterArtwork, Panel, RarityBadge } from './index';
import './xr-gacha.css';

export function XRGacha({ save, busy, onDraw }: { save: GameSave; busy: boolean; onDraw: (count: 1 | 10) => void }) {
  const banner = content.xrGacha;
  if (!banner) return null;
  const lock = xrGachaLock(save, content);
  const featured = content.characters.find(character => character.published && character.rarity === 'XR' && banner.characterIds.includes(character.id));
  const balance = save.astralStones ?? 0;
  return <Panel className="xr-gacha" role="region" aria-label={tr('星晶の祈願')}>
    <div className="xr-gacha__heading"><span className="xr-gacha__emblem">XR</span><div><span className="eyebrow">ASTRAL SUMMON</span><h2>{tr('星晶の祈願')}</h2><p>{tr('SSRを超える、まだ見ぬ存在。')}</p></div></div>
    <p>{tr('専用の星晶石で引く上位の祈願です。通常の祈願石では引けません。')}</p>
    {featured && <div className="xr-gacha__featured">
      <CharacterArtwork character={featured} reducedMotion={save.settings.reducedMotion} />
      <div><RarityBadge rarity={featured.rarity} /><h3>{tr(featured.name)}</h3><p>{tr(featured.epithet)}</p><p>{tr(featured.flavor)}</p><p className="subtle">{tr('登場予定のXRです。現在は入手できません。')}</p></div>
    </div>}
    <div className="xr-gacha__balance"><Gem size={18} /><span>{tr('星晶石')} {balance}</span></div>
    <p className="xr-gacha__status" role="status">{lock ? <LockKeyhole size={16} /> : <Sparkles size={16} />}{tr(lock ?? '星晶の祈願が解放されています。')}</p>
    {!banner.published && <p>{tr('現在は準備中です。星晶石の入手方法はまだありません。')}</p>}
    <p className="subtle">{tr('XRの基準排出率（仮設定）：{0}%。通常祈願の初回SSR保証・天井とは別の抽選です。').replace('{0}', String(banner.rates.XR))}</p>
    <p className="subtle">{tr(xrChapterCleared(save, content) ? '解放条件：第10章までの全ステージをクリア済み。' : '解放条件：第10章までの全ステージをクリア。')}</p>
    <div className="toolbar">
      <Button disabled={busy || Boolean(lock) || balance < banner.stoneCost} onClick={() => onDraw(1)}><Sparkles size={16} />{tr('星晶石{0}個で祈願する').replace('{0}', String(banner.stoneCost))}</Button>
      <Button variant="secondary" disabled={busy || Boolean(lock) || balance < banner.stoneCost * 10} onClick={() => onDraw(10)}>{tr('星晶石{0}個で10連祈願').replace('{0}', String(banner.stoneCost * 10))}</Button>
    </div>
  </Panel>;
}
