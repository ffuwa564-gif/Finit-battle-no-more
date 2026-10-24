import type { CharacterDef } from '../domain/types';
import type { GachaCollection } from '../content/gacha';
import { roleName } from '../content';
import { Button, CurrencyEmblem, CharacterArtwork } from './index';
import './gacha-showcase.css';

/** Collection artwork, live account state, and one shared draw action. */
export function GachaShowcase({ collection, featured, stones, drawCount, ownedIds, exhausted, busy, onDraw, onInspect, reducedMotion, suspended }: {
  reducedMotion: boolean; suspended: boolean; collection: GachaCollection; featured: CharacterDef[]; stones: number; drawCount: number; ownedIds: string[]; exhausted: boolean; busy: boolean; onDraw: () => void; onInspect: (character: CharacterDef) => void;
}) {
  const guaranteed = drawCount + 1 === collection.guaranteeDraw;
  const guaranteeUnavailable = guaranteed && featured.every(character => ownedIds.includes(character.id));
  return <section className="goddess-collection" aria-label={collection.title}>
    <header className="goddess-collection__heading"><span>GOTHIC GODDESSES · VOL.01</span><h2>{collection.title}</h2><p>{collection.subtitle}</p></header>
    <div className="goddess-collection__pair">
      {featured.map(character => <article key={character.id} className={`goddess-feature goddess-feature--${character.id}`}>
        <CharacterArtwork character={character} reducedMotion={reducedMotion} suspended={suspended} />
        <Button variant="secondary" className="goddess-feature__inspect" onClick={() => onInspect(character)} aria-label={`SSR ${character.name}の詳細`}>
        <div className="goddess-feature__copy"><span className="goddess-feature__rarity">SSR</span><small>{character.epithet}</small><strong>{character.name}</strong><span>{roleName(character.role)} · {(character.strength / 10).toFixed(1)}</span>{ownedIds.includes(character.id) && <em>迎え入れ済み</em>}</div>
        </Button>
      </article>)}
    </div>
    <div className="goddess-collection__summon">
      <div className="goddess-collection__account"><span><CurrencyEmblem kind="stone" size={16} /> {stones}</span><span>{guaranteed ? '次の祈願はSSR確定' : drawCount < collection.guaranteeDraw ? `通算${collection.guaranteeDraw}回目はSSR確定` : '未所持の女神のみ出現'}</span></div>
      <Button size="lg" className="goddess-collection__draw" disabled={busy || stones < collection.stoneCost || exhausted || guaranteeUnavailable} onClick={onDraw}><CurrencyEmblem kind="stone" size={21} /> 石{collection.stoneCost}個で祈願する</Button>
      {(exhausted || guaranteeUnavailable || stones < collection.stoneCost) && <p className="goddess-collection__availability">{exhausted ? 'すべての女神を迎え入れました' : guaranteeUnavailable ? 'SSR保証の対象となる未所持の女神がいません' : 'ダンジョン初踏破で祈願石を獲得'}</p>}
    </div>
  </section>;
}
