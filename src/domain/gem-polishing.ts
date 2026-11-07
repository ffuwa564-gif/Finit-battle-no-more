import { gemTier, type MemoryGem, type GemInventory, type RoughMemoryGem, type GemPolishSession } from './memory-gems';
export const ROUGH_NAMES = { ordinary: '普通の原石', glimmering: '輝く原石', radiant: '強く輝く原石' } as const;
export const POLISH_RULES = { ordinary: { seconds: 35, width: 90, period: 2400, gain: 12 }, glimmering: { seconds: 40, width: 60, period: 2200, gain: 10 }, radiant: { seconds: 45, width: 36, period: 2000, gain: 8 } } as const;
const hash = (seed: number) => (Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0) / 4294967296;
/** Promise is a noisy appraisal, never a tier guarantee. The sealed result is immutable across retries. */
export function roughMemoryGem(gem: MemoryGem, seed: number): RoughMemoryGem {
  const tier = gemTier(gem), chance = hash(seed), bounds = [[.80,.98],[.55,.95],[.25,.80],[.10,.60],[.05,.35],[.02,.20],[.01,.12]][tier-1]!;
  return { id: gem.id, promise: chance < bounds[0] ? 'ordinary' : chance < bounds[1] ? 'glimmering' : 'radiant', result: structuredClone(gem) };
}
export function polishWindow(session: GemPolishSession, rough: RoughMemoryGem, now: number) {
  const rule = POLISH_RULES[rough.promise];
  return { angle: ((Math.max(0,now-session.startedAt) % rule.period)/rule.period)*360, center: hash(session.nonce + session.attempt * 7919) * 360, width: rule.width };
}
function clock(now: number) { if (!Number.isFinite(now) || now < 0) throw new Error('研磨の時刻が正しくありません。'); }
export function startGemPolish(inventory: GemInventory, rawId: string, now: number, nonce: number): void {
  clock(now); const raw = inventory.rough?.find(r => r.id === rawId);
  if (!raw) throw new Error('研磨する原石がありません。');
  if (inventory.polish && now < inventory.polish.expiresAt) throw new Error('研磨中の原石を先に仕上げてください。');
  inventory.polish = { rawId, startedAt: now, expiresAt: now + POLISH_RULES[raw.promise].seconds*1000, progress: 0, lastTapAt: now-500, attempt: 0, nonce: nonce >>> 0, lastResult: 'ready' };
}
export function tapGemPolish(inventory: GemInventory, rawId: string, now: number): 'good' | 'miss' | 'wait' | 'timeout' | 'complete' {
  clock(now); const session=inventory.polish, raw=inventory.rough?.find(r=>r.id===rawId);
  if (!session || session.rawId!==rawId || !raw) throw new Error('研磨中の原石がありません。');
  if (now < session.startedAt || now < session.lastTapAt) throw new Error('研磨の時刻が正しくありません。');
  if (now >= session.expiresAt) { delete inventory.polish; return 'timeout'; }
  if (now-session.lastTapAt<280) return 'wait';
  const {angle,center,width}=polishWindow(session,raw,now);
  const good=Math.abs(((angle-center+540)%360)-180)<=width/2;
  session.progress=Math.max(0,Math.min(100,session.progress+(good?POLISH_RULES[raw.promise].gain:-3)));
  session.lastTapAt=now; session.attempt++; session.lastResult=good?'good':'miss';
  if(session.progress<100)return good?'good':'miss';
  if(inventory.items.some(g=>g.id===raw.id))throw new Error('この原石は研磨済みです。');
  inventory.items.push(structuredClone(raw.result));
  if(!inventory.seen.includes(raw.result.defId))inventory.seen.push(raw.result.defId);
  inventory.rough=inventory.rough!.filter(r=>r.id!==rawId);delete inventory.polish;return 'complete';
}
