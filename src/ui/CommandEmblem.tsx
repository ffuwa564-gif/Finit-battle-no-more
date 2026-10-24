import { useId } from 'react';
import './command-emblem.css';

export type CommandEmblemKind = 'balanced' | 'aggressive' | 'survival' | 'advance' | 'replay' | 'potion';

/** Engraved command symbols share one material treatment across every combatant. */
export function CommandEmblem({ kind }: { kind: CommandEmblemKind }) {
  const id = useId().replace(/:/g, '');
  const metal = `url(#${id}-silver)`;
  return <svg className={`command-emblem command-emblem--${kind}`} viewBox="0 0 80 80" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-silver`} x1="16" y1="12" x2="63" y2="72" gradientUnits="userSpaceOnUse">
        <stop className="command-emblem__light" /><stop offset=".49" className="command-emblem__middle" /><stop offset="1" className="command-emblem__shade" />
      </linearGradient>
    </defs>
    {emblemShape(kind, metal)}
  </svg>;
}

function emblemShape(kind: CommandEmblemKind, metal: string) {
  switch (kind) {
    case 'advance':
    case 'aggressive': return <g strokeLinecap="round" strokeLinejoin="round">
      <path d="m17 9 13 6 29 34-8 7L21 23 17 9Z" fill={metal} stroke="currentColor" strokeWidth="1.1" />
      <path d="m20 13 34 38" stroke="#fffdf1" strokeWidth="1.4" opacity=".75" />
      <path d="m63 9-13 6-29 34 8 7 30-33 4-14Z" fill={metal} stroke="currentColor" strokeWidth="1.1" />
      <path d="m60 13-34 38" stroke="#fffdf1" strokeWidth="1.4" opacity=".8" />
      <path d="m15 48 16 14m-3-4-10 12-5-4 11-12m25-6 16 14m-13-5 10 13 5-4-11-12" fill={metal} stroke="currentColor" strokeWidth="2.2" />
      <path d="m12 47 5-3m14 17 1 5m16-19-1-4m17 19 5 1" stroke="currentColor" strokeWidth="2" />
    </g>;
    case 'balanced': return <>
      <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="40" cy="40" r="24" stroke="currentColor" strokeWidth=".7" opacity=".55" />
      <path d="m40 5 6 27 29 8-29 7-6 28-7-28-28-7 28-8 7-27Z" fill={metal} stroke="currentColor" strokeWidth="1" />
      <path d="m40 5 0 35 35 0-29-8-6-27Zm0 35v35l-7-28-28-7h35Z" fill="currentColor" opacity=".35" />
      <circle cx="40" cy="40" r="4" fill="#ded5bd" stroke="currentColor" strokeWidth="1.2" />
    </>;
    case 'survival': return <>
      <path d="M40 8c9 7 17 10 27 11v25c-1 13-12 23-27 29-15-6-26-16-27-29V19c10-1 18-4 27-11Z" fill={metal} stroke="currentColor" strokeWidth="1.8" />
      <path d="M40 14c7 6 14 8 21 10v19c-1 10-9 18-21 24-12-6-20-14-21-24V24c7-2 14-4 21-10Z" stroke="#fffdf1" strokeWidth="1.2" opacity=".75" />
      <path d="m40 23 4 13 12 5-12 4-4 15-4-15-12-4 12-5 4-13Z" fill="currentColor" opacity=".5" />
      <path d="M40 29v24" stroke="#fffdf1" strokeWidth="1.4" opacity=".7" />
    </>;
    case 'potion': return <>
      <path d="M31 10h18v9H31z" fill={metal} stroke="currentColor" strokeWidth="1.4" />
      <path d="M33 19v15c-11 8-16 15-16 24 0 11 9 16 23 16s23-5 23-16c0-9-5-16-16-24V19H33Z" fill={metal} fillOpacity=".5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M24 51c7-3 12 3 18 0s10-3 15 0c3 12-1 17-17 17s-20-5-16-17Z" className="command-emblem__liquid" />
      <path d="M28 39c-5 5-8 11-8 17m8-9c-3 5-3 10-1 14" stroke="#fffdf1" strokeWidth="2.5" strokeLinecap="round" opacity=".85" />
      <path d="M31 15h18M33 25h14" stroke="currentColor" strokeWidth="1" opacity=".6" />
      <circle cx="49" cy="58" r="2" fill="#f9f6e9" opacity=".75" />
    </>;
    case 'replay': return <>
      <path d="m17 18 22 22-22 22V18Zm26 0 22 22-22 22V18Z" fill={metal} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="m20 23 17 17m9-17 17 17" stroke="#fffdf1" strokeWidth="1.5" opacity=".8" />
    </>;
  }
  const unsupported: never = kind;
  throw new Error(`Unknown command emblem: ${unsupported}`);
}
