import type { Battle, Content } from '../domain/types';
import { tr } from '../locales/i18n';
import { InventorySection } from './InventorySection';
import './expedition-review.css';

export function ExpeditionReview({battle,content}:{battle:Battle;content:Content}) {
  const review=battle.tracking?.review;
  const characterName=(id?:string)=>id?tr(content.characters.find(character=>character.id===id)?.name??id):tr('不明');
  const result=battle.phase==='reward'?'踏破':battle.failureKind==='timeout'?'期限到達':battle.failureKind==='retreat'?'撤退':battle.failureKind==='defeat'?'全滅':'終了理由の記録なし';
  const hit=review?.largestHit;
  const skill=hit?.skillId?content.skills.find(item=>item.id===hit.skillId):undefined;
  return <InventorySection id="expedition-review" title="今回の振り返り" tone="night">
    <div className="expedition-review" data-testid="expedition-review">
      <p className="expedition-review__result">{tr('記録された結果')}：<strong>{tr(result)}</strong></p>
      {!review?<p>{tr('集計開始前の探索のため、全探索の内訳はありません。')}</p>:<>
        <dl className="expedition-review__stats">
          {([['集計ラウンド',review.rounds],['味方の実HP被害',review.partyDamageTaken],['敵の実HP被害',review.enemyDamageTaken],['味方の実HP回復',review.partyHealing],['障壁が吸収した被害',review.partyBarrierAbsorbed],['自傷・HP費用',review.partyHpSpent],['状態異常による行動不能',review.actionsLost],['使用した回復薬',review.potionsUsed]] as const).map(([label,value])=><div key={label}><dt>{tr(label)}</dt><dd>{value.toLocaleString()}</dd></div>)}
        </dl>
        <p className="expedition-review__note">{tr('HPは観測した増減、障壁は明示された吸収量です。未軽減の攻撃力や敗因の推定ではありません。')}</p>
        <section className="expedition-review__hit"><h4>{tr('最大の観測被害（味方）')}</h4>{hit?<>
          <strong>{hit.amount.toLocaleString()} HP</strong><p>{characterName(hit.actorCharacterId)} → {characterName(hit.targetCharacterId)}</p>
          <p>{tr('技')}：{skill?tr(skill.name):hit.skillId?tr('技名の登録なし'):tr('技IDの記録なし')}</p>
          <small>Wave {hit.wave+1} · Round {hit.round}</small>
        </>:<p>{tr('敵から味方へのHP被害は記録されていません。')}</p>}</section>
      </>}
    </div>
  </InventorySection>;
}
