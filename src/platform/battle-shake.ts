import { gsap } from 'gsap';
import type { Unit } from '../domain/types';
import type { HpChange } from './combat-feedback';

/** Called at the HP/number impact, including redirected and multi-target damage. */
export function shakeDamage(root: HTMLElement, changes: HpChange[], before: Unit[], ultimate: boolean, reducedMotion: boolean): () => void {
  if (reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const damage = changes.filter(change => change.amount < 0);
  if (!damage.length) return () => {};
  const partyHit = damage.some(change => change.side === 'party');
  const targets = partyHit
    ? Array.from(root.querySelectorAll<HTMLElement>('.battle-scene, .party-strip'))
    : damage.flatMap(change => {
      const page = root.querySelector(`[data-encounter-scene][data-unit="${CSS.escape(change.unitId)}"]`);
      const art = page?.querySelector<HTMLElement>(':scope > .enemy-page-art, :scope > .animated-illustration');
      return art ? [art] : [];
    });
  if (!targets.length) return () => {};
  const heavy = damage.some(change => {
    const unit = before.find(unit => unit.uid === change.unitId);
    return unit && -change.amount / Math.max(1, unit.maxHp) >= .2;
  });
  const strength = (partyHit ? 5 : 4) * (ultimate ? 1.7 : heavy ? 1.4 : 1);
  const pace = ultimate ? 1.2 : 1;
  // One bounded impulse per impact. Command buttons and enemy HUD never get a
  // transform; multi-target attacks do not multiply the camera displacement.
  const context = gsap.context(() => {
    gsap.timeline()
      .fromTo(targets, { x: 0, y: 0 }, { x: strength, y: -strength * .25, duration: .032 * pace, ease: 'power2.out' })
      .to(targets, { x: -strength * .68, y: strength * .2, duration: .045 * pace, ease: 'power1.inOut' })
      .to(targets, { x: strength * .35, y: -strength * .1, duration: .045 * pace })
      .to(targets, { x: -strength * .14, y: strength * .05, duration: .04 * pace })
      .to(targets, { x: 0, y: 0, duration: .06 * pace, ease: 'power2.out', clearProps: 'transform' });
  });
  return () => context.revert();
}
