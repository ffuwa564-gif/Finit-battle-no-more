import type { Battle, CommandOrder, Content } from './types';
import { gemSkill } from './memory-gems';
/** A visible, deterministic reservation rule; never inspects private AI intents or future RNG. */
export function commandYieldsToResources(battle:Battle,content:Content,order:CommandOrder):boolean {
 if(!content.commandRules?.respectReadyResources)return false;
 const followers=order.followerIds.flatMap(id=>battle.units.filter(u=>u.uid===id&&u.side==='party'&&u.hp>0));
 return followers.length>0&&followers.every(u=>{
  if(u.ultimateQueued&&(u.ultimateCharge??0)>=100)return true;
  const gem=battle.memoryGems?.[u.characterId];if(!gem)return false;
  return (u.cooldowns['memory:slot']??0)<=battle.round&&(u.cooldowns[gemSkill(gem).id]??0)<=battle.round;
 });
}
export const commandResourceDescription='資源を守る号令：予約した生存中の受領者全員が、石の再使用待ち終了または準備済み必殺を予約中なら、発令を見送り本人は通常判断へ戻る。発令しないので号令のゲージ25や追加攻撃は得ず、本人の通常1行動と追加リーダー効果を保つ。通常判断で石を必ず使うという予測ではない。1人でも条件外なら従来どおり発令・消費し、発令後の対象死亡や適用なしでは返却しない。';
