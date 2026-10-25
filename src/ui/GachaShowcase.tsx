import { tr, localize } from '../locales/i18n';
import type { CharacterDef } from '../domain/types';
import type { GachaCollection } from '../content/gacha';
import { roleName } from '../content';
import { Button, CurrencyEmblem, CharacterArtwork } from './index';
import './gacha-showcase.css';

/** Collection artwork, live account state, and one shared draw action. */
export function GachaShowcase({ collection, featured, featuredBaseChance, stones, drawCount, ownedIds, pity, busy, onDraw, onDrawTen, onInspect, reducedMotion, suspended }: {
  reducedMotion: boolean; suspended: boolean; collection: GachaCollection; featured: CharacterDef[]; featuredBaseChance: string; stones: number; drawCount: number; ownedIds: string[]; pity: number; busy: boolean; onDraw: () => void; onDrawTen: () => void; onInspect: (character: CharacterDef) => void;
}) {
  const guaranteed = drawCount + 1 === collection.guaranteeDraw || pity + 1 >= collection.hardPity;
  return <section className="goddess-collection" aria-label={tr(collection.title)}>
    <header className="goddess-collection__heading"><span>{collection.label}</span><h2>{localize(collection.title)}</h2><p>{localize(collection.subtitle)}</p></header>
    <div className="goddess-collection__pair">
      {localize(featured.map(character => <article key={character.id} className={`goddess-feature goddess-feature--${character.id}`}>
        <CharacterArtwork character={character} reducedMotion={reducedMotion} suspended={suspended} />
        <Button variant="secondary" className="goddess-feature__inspect" onClick={() => onInspect(character)} aria-label={tr(`SSR ${character.name}の詳細`)}>
        <div className="goddess-feature__copy"><span className="goddess-feature__rarity">SSR · {featuredBaseChance}%</span><small>{localize(character.epithet)}</small><strong>{localize(character.name)}</strong><span>{localize(roleName(character.role))} · {localize((character.strength / 10).toFixed(1))}</span>{localize(ownedIds.includes(character.id) && <em>{tr("迎え入れ済み")}</em>)}</div>
        </Button>
      </article>))}
    </div>
    <div className="goddess-collection__summon">
      <div className="goddess-collection__account"><span><CurrencyEmblem kind="stone" size={16} /> {localize(stones)}</span><span>{localize(guaranteed ? '次の祈願はSSR確定' : drawCount < collection.guaranteeDraw ? `初回のみ${collection.guaranteeDraw}回目はSSR確定` : `SSR天井まであと${collection.hardPity - pity}回`)}</span></div>
      <div className="goddess-collection__draw-actions"><Button size="lg" variant="secondary" className="goddess-collection__draw" disabled={busy || stones < collection.stoneCost} onClick={onDraw}><CurrencyEmblem kind="stone" size={21} />{localize(`石${collection.stoneCost}個で祈願する`)}</Button><Button size="lg" className="goddess-collection__draw goddess-collection__draw-ten" disabled={busy || stones < collection.stoneCost * 10} onClick={onDrawTen}><CurrencyEmblem kind="stone" size={21} />{localize(`石${collection.stoneCost * 10}個で10連祈願`)}</Button></div>
      <div className="goddess-pity" aria-label={tr(`SSR天井 ${pity} / ${collection.hardPity}`)}><span>{tr("SSRまでの祈り")}</span><progress value={pity} max={collection.hardPity} /><small>{localize(pity)} / {localize(collection.hardPity)}</small></div>
      {localize(stones < collection.stoneCost && <p className="goddess-collection__availability">{tr("通常の初踏破は石3個・イベント踏破は毎回1個")}</p>)}
    </div>
  </section>;
}
