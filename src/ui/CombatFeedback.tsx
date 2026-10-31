import { flashDamage } from '../platform/damage-flash';
import { ultimateVisualFor } from '../platform/ultimate-choreography';
import { ultimateTimingFor, UltimateClock } from '../platform/ultimate-timing';
import { tr, localize } from '../locales/i18n';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { BattleEvent, Unit } from '../domain/types';
import { characterById } from '../content';
import { eventHpChanges, rabbitDamageSteps, type HpChange, type ImpactSnapshot } from '../platform/combat-feedback';
import { shakeDamage } from '../platform/battle-shake';
import './combat-feedback.css';

type FloatingNumber = HpChange & { id: string; x: number; y: number; named: boolean; ultimate?: boolean; hitIndex?: number };
export function CombatFeedback({ event, before, onImpact, reducedMotion, speed = 1 }: { event?: BattleEvent; before: Unit[]; onImpact: (snapshot: ImpactSnapshot) => void; reducedMotion: boolean; speed?: 1 | 2 }) {
  const clock = useRef(new UltimateClock());
  const root = useRef<HTMLDivElement>(null);
  const [numbers, setNumbers] = useState<FloatingNumber[]>([]);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const handled = useRef(new Set<string>());
  const latestBefore = useRef(before); latestBefore.current = before;
  const latestReduced = useRef(reducedMotion); latestReduced.current = reducedMotion;
  const progress = useRef({id: '', index: -1});
  const stopFlash = useRef<(() => void) | undefined>(undefined);
  const stopShake = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => { stopShake.current?.(); stopShake.current = undefined; stopFlash.current?.(); stopFlash.current = undefined; }, [event?.id, reducedMotion]);
  useEffect(() => {
    const show = (id: string, changes: HpChange[], ultimate = false, presentationRecoil = false, hitIndex?: number) => {
      const parent = root.current?.parentElement;
      if (!parent || handled.current.has(id) || !changes.length) return;
      stopShake.current?.();
      handled.current.add(id);
      if (handled.current.size > 64) handled.current.delete(handled.current.values().next().value!);
      const frame = parent.getBoundingClientRect();
      const stage = parent.querySelector('.battle-scene')!.getBoundingClientRect();
      const missing = changes.filter(change => !parent.querySelector(`[data-unit="${CSS.escape(change.unitId)}"]`));
      const entries = changes.map((change, index) => {
        const bounds = parent.querySelector(`[data-unit="${CSS.escape(change.unitId)}"]`)?.getBoundingClientRect();
        const slot = missing.indexOf(change);
        const x = bounds ? bounds.left + bounds.width / 2 - frame.left : frame.width * ((slot + 1) / (missing.length + 1));
        const y = bounds ? bounds.top + bounds.height * (change.side === 'party' ? .3 : .5) - frame.top : stage.height * .77 + (index % 2) * 22;
        return { ...change, ultimate, hitIndex, id: `${id}:${change.unitId}`, x: Math.max(42, Math.min(frame.width - 42, x+(hitIndex===undefined?0:(hitIndex%4-1.5)*13))), y, named: !bounds };
      });
      setNumbers(old => [...old, ...entries].slice(-16));
      // Restart rather than stack impulses during consecutive hits. This runs
      // with the floating numbers, after their untransformed bounds are read.
      stopFlash.current?.(); stopFlash.current=flashDamage(parent,changes,latestReduced.current);
      stopShake.current = presentationRecoil ? undefined : shakeDamage(parent, changes, latestBefore.current, ultimate, latestReduced.current);
      const timer = setTimeout(() => { setNumbers(old => old.filter(number => !entries.some(entry => entry.id === number.id))); timers.current.delete(timer); }, hitIndex!==undefined ? 650 : ultimate ? 1350 : 850);
      timers.current.add(timer);
    };
    const onHp = (message: Event) => { const detail = (message as CustomEvent<{ id: string; changes: HpChange[]; ultimate?: boolean; presentationRecoil?: boolean; hitIndex?: number }>).detail; show(detail.id, detail.changes, detail.ultimate, detail.presentationRecoil, detail.hitIndex); };
    window.addEventListener('game:hp', onHp);
    // Event-driven listener also handles out-of-round item healing.
    const onBattle = (message: Event) => { const detail = (message as CustomEvent<{ id: string; changes: HpChange[]; ultimate?: boolean; presentationRecoil?: boolean; hitIndex?: number }>).detail; show(detail.id, detail.changes, detail.ultimate, detail.presentationRecoil, detail.hitIndex); };
    window.addEventListener('game:combat-numbers', onBattle);
    return () => { window.removeEventListener('game:hp', onHp); window.removeEventListener('game:combat-numbers', onBattle); };
  }, []);
  useEffect(() => {
    if (!event) return;
    const changes = eventHpChanges(event, latestBefore.current);
    if (event.ultimate) clock.current.sync(event.id, speed, performance.now());
    const actor=latestBefore.current.find(unit=>unit.uid===event.actorId);
    const visual=event.ultimate&&actor?ultimateVisualFor(characterById(actor.characterId),event):undefined;
    const timing=ultimateTimingFor(visual);
    if(progress.current.id!==event.id)progress.current={id:event.id,index:-1};
    const publish=(id:string,changes:HpChange[],hitIndex?:number)=>{
      if(document.hidden)return;
      window.dispatchEvent(new CustomEvent('game:combat-numbers',{detail:{id,changes,ultimate:event.ultimate,
        presentationRecoil:visual==='rabbit-bits'&&!event.bossStrike,hitIndex}}));
    };
    if(visual==='rabbit-bits'){
      const steps=rabbitDamageSteps(event,latestBefore.current);
      const elapsed=clock.current.position(performance.now());
      // Resume at the current snapshot; never replay a burst of past hit numbers.
      const caughtUp=steps.filter(step=>step.at<=elapsed).at(-1);
      if(caughtUp&&caughtUp.index>progress.current.index){
        progress.current.index=caughtUp.index;onImpact({eventId:event.id,units:caughtUp.units,hitIndex:caughtUp.index});
      }
      const pending=steps.filter(step=>step.index>progress.current.index).map(step=>setTimeout(()=>{
        if(step.index<=progress.current.index)return;
        progress.current.index=step.index;
        onImpact({eventId:event.id,units:step.units,hitIndex:step.index});
        publish(`${event.id}:hit:${step.index}`,step.changes,step.final?undefined:step.index);
      },clock.current.delay(step.at,performance.now())));
      return()=>pending.forEach(clearTimeout);
    }
    const timer=setTimeout(()=>{
      onImpact({eventId:event.id});publish(event.id,changes);
    },event.ultimate?clock.current.delay(timing.damage,performance.now()):0);
    return()=>clearTimeout(timer);
  }, [event?.id, speed, onImpact]);
  useEffect(() => () => { for (const timer of timers.current) clearTimeout(timer); }, []);
  return <div ref={root} className={`combat-feedback${event?.ultimate ? ' combat-feedback--ultimate' : ''}${reducedMotion ? ' combat-feedback--reduced' : ''}`} aria-live="off">
    {localize(numbers.map(number => <div key={number.id} data-hp-unit={number.unitId} data-hp-delta={number.amount} className={`combat-number combat-number--${number.amount > 0 ? 'heal' : number.side === 'party' ? 'hurt' : 'damage'}${number.ultimate ? ' combat-number--ultimate' : ''}${number.hitIndex!==undefined?' combat-number--hit':''}`} style={{ left: number.x, top: number.y } as CSSProperties} aria-label={tr(`${characterById(number.characterId).name} ${number.amount > 0 ? '回復' : 'ダメージ'} ${Math.abs(number.amount)}`)}>
      {localize(number.named && <small>{localize(characterById(number.characterId).name)}</small>)}<strong><span className="combat-number__sign">{localize(number.amount > 0 ? '+' : '−')}</span>{localize(Math.abs(number.amount).toLocaleString())}</strong>
    </div>))}
  </div>;
}
