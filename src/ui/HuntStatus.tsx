import type { Battle } from '../domain/types';
import { HUNT_HANDS, HUNT_RANKS, huntRank } from '../domain/hunt';
import { tr } from '../locales/i18n';
export function HuntStatus({battle, result=false,bestKills=0}:{battle:Battle;result?:boolean;bestKills?:number}) {
  const h=battle.phase==='playing'?battle.events[battle.cursor]?.huntProgress??battle.hunt:battle.hunt;
  if(!h)return null;const rank=huntRank(h.kills),next=HUNT_RANKS.find(r=>r.kills>h.kills);
  return <div className={`hunt-status${result?' hunt-status--result':''}`} data-hunt-stage={h.stage} aria-label={tr('討伐ランク')}>
    <strong data-hunt-rank={rank.rank}>{rank.rank}</strong><span>{tr('討伐')} <b>{h.kills}</b>{next&&<small> / {next.kills}</small>}</span>
    <span>{h.stage==='boss'?tr('ボス戦'):<>{h.actions}<small> / {HUNT_HANDS} {tr('手')}</small></>}</span>
    {!result&&<progress aria-label={tr('討伐の進行')} max={HUNT_HANDS} value={h.actions}/>}
    {result&&<small>{tr('最近の最高討伐')} {bestKills}</small>}
    {result&&<small>{tr(battle.phase==='failed'?'今回の回収品は失われました。':'ランク到達後から希少部材・高期待値の原石が出やすくなります。')}</small>}
  </div>;
}
