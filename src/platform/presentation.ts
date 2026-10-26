import { gsap } from 'gsap';
import type { BattleEvent } from '../domain/types';

export function animateEvent(event: BattleEvent, reducedMotion: boolean): () => void {
  if (reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  if (event.ultimate) {
    // Dedicated cinematics own the light effects. React only the enemy artwork,
    // keeping names, HP bars, party slots and command buttons steady.
    const context = gsap.context(() => {
      if (['attack','area','debuff'].includes(event.kind)) {
        const art = document.querySelector('.enemy-page > .enemy-page-art, .enemy-page > .animated-illustration');
        if (art) gsap.timeline().to(art,{x:5,scale:1.018,duration:.06,ease:'power2.out'})
          .to(art,{x:-3,duration:.055}).to(art,{x:0,scale:1,duration:.22,ease:'power2.out',clearProps:'transform'});
      }
    });
    return () => context.revert();
  }
  // One visual boundary for every character: cues never enter combat or save state.
  if (event.kind !== 'dialogue') {
    const scene = document.querySelector('.battle-scene');
    const bounds = scene?.getBoundingClientRect();
    if (bounds) {
      const ids = event.kind === 'drop' ? [event.actorId] : event.targetIds?.length ? event.targetIds : [event.actorId];
      const points = ids?.slice(0, 4).map(id => id ? document.querySelector(`[data-unit="${id}"]`)?.getBoundingClientRect() : undefined) ?? [];
      // Wave-wide magic uses the stage center; missing/party targets stay at the lower edge.
      const centers = event.kind === 'area' || event.kind === 'wave' || !points.length ? [undefined] : points;
      for (const point of centers) {
        window.dispatchEvent(new CustomEvent('game:fx', { detail: {
          kind: event.kind, rarity: event.rarity,
          x: point ? point.left + point.width / 2 : bounds.left + bounds.width / 2,
          y: point ? point.top + point.height * 0.58 : bounds.top + bounds.height * 0.65,
        } }));
      }
    }
  }
  const context = gsap.context(() => {
    const actor = event.actorId ? document.querySelector(`[data-unit="${event.actorId}"]`) : null;
    if (actor && !actor.hasAttribute('data-encounter-scene') && ['attack', 'area', 'heal', 'guard', 'buff', 'debuff'].includes(event.kind)) {
      gsap.fromTo(actor, { y: 0 }, { y: -10, duration: 0.16, yoyo: true, repeat: 1, clearProps: 'transform' });
    }
    for (const id of event.targetIds ?? []) {
      const target = document.querySelector(`[data-unit="${id}"]`);
      if (target && !target.hasAttribute('data-encounter-scene')) gsap.fromTo(target, { opacity: 0.45 }, { opacity: 1, duration: 0.3, clearProps: 'opacity' });
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
