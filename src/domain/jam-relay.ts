import { gainUltimate, ultimateCharge } from './ultimates';
import type { Battle, JamRelayContract, SkillDef, Unit } from './types';

/** One bounded grant after a genuinely extended ordinary cooldown. No action, RNG or auto-queue. */
export function validJamRelayContract(value: unknown): value is JamRelayContract {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v=value as Record<string,unknown>;
  return Object.keys(v).sort().join(',')==='charge,exposeStrength' && Number.isSafeInteger(v.charge) && Number(v.charge)>=0 && Number(v.charge)<=25 && Number.isSafeInteger(v.exposeStrength) && Number(v.exposeStrength)>=0 && Number(v.exposeStrength)<=30;
}
export function grantJamRelay(battle: Battle, actor: Unit, skill: SkillDef, extended: boolean): { recipientId: string; charge: number } | undefined {
  if (!extended || skill.template!=='jam' || !validJamRelayContract(skill.jamRelay) || !skill.jamRelay.charge || actor.side!=='party' || actor.hp<=0) return;
  const recipient=battle.units.filter(u=>u.side===actor.side && u.uid!==actor.uid && u.hp>0 && !u.ultimateQueued && ultimateCharge(u)<100)
    .sort((a,b)=>b.attack-a.attack || a.uid.localeCompare(b.uid))[0];
  if (!recipient) return;
  const before=ultimateCharge(recipient);gainUltimate(recipient,skill.jamRelay.charge);
  const charge=ultimateCharge(recipient)-before;
  return charge>0?{recipientId:recipient.uid,charge}:undefined;
}

/** Reuse the ordinary defense weakness. Never overwrite or prolong a stronger active weakness. */
export function applyJamExposure(target: Unit, round: number, skill: SkillDef, extended: boolean): boolean {
  if (!extended || skill.template!=='jam' || !validJamRelayContract(skill.jamRelay) || !skill.jamRelay.exposeStrength || target.hp<=0) return false;
  const active=(target.debuffUntil??-1)>=round;
  if(active && (target.debuffStrength??10)>=skill.jamRelay.exposeStrength)return false;
  target.debuffStrength=skill.jamRelay.exposeStrength;
  target.debuffUntil=Math.max(active?target.debuffUntil!:0,round+1);
  return true;
}
