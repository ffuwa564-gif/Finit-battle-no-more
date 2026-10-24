import { gsap } from 'gsap';
import type { BattleEvent } from '../domain/types';

export function animateEvent(event: BattleEvent, reducedMotion: boolean): () => void {
  if (reducedMotion) return () => {};
  const context = gsap.context(() => {
    const actor = event.actorId ? document.querySelector(`[data-unit="${event.actorId}"]`) : null;
    if (actor && ['attack', 'area', 'heal', 'guard', 'buff', 'debuff'].includes(event.kind)) {
      gsap.fromTo(actor, { y: 0 }, { y: -10, duration: 0.16, yoyo: true, repeat: 1, clearProps: 'transform' });
    }
    for (const id of event.targetIds ?? []) {
      const target = document.querySelector(`[data-unit="${id}"]`);
      if (target) gsap.fromTo(target, { opacity: 0.45 }, { opacity: 1, duration: 0.3, clearProps: 'opacity' });
    }
    const drop = document.querySelector('[data-drop]');
    const bag = document.querySelector('[data-bag]');
    if (drop && bag && event.kind === 'drop') {
      const a = drop.getBoundingClientRect(), b = bag.getBoundingClientRect();
      const origin = actor?.getBoundingClientRect();
      const startX = origin ? origin.left + origin.width / 2 - a.left : 0;
      const startY = origin ? origin.top + origin.height * 0.65 - a.top : 0;
      const tl = gsap.timeline();
      tl.fromTo(drop, { x: startX, y: startY - 32, scale: 0.35, opacity: 0 }, { x: startX, y: startY, scale: event.rarity === 'common' ? 1 : 1.4, opacity: 1, duration: 0.28 });
      tl.to(drop, { x: b.left - a.left + 10, y: b.top - a.top, scale: 0.2, opacity: 0, delay: 0.25, duration: 0.45, ease: 'power2.in' });
      tl.fromTo(bag, { scale: 1 }, { scale: 1.12, yoyo: true, repeat: 1, duration: 0.12 });
    }
  });
  return () => context.revert();
}
