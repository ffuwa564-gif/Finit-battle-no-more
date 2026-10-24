import { useId } from 'react';
import './sigils.css';

/** Currency and encounter marks use the same etched silver vocabulary as the frame. */
export function CurrencyEmblem({ kind, size = 18 }: { kind: 'stone' | 'gold'; size?: number }) {
  const id = useId().replace(/:/g, '');
  return <svg className={`currency-emblem currency-emblem--${kind}`} width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <defs><linearGradient id={`${id}-metal`} x1="9" y1="3" x2="31" y2="37" gradientUnits="userSpaceOnUse"><stop stopColor={kind === 'stone' ? '#eef0f3' : '#eee3c8'} /><stop offset=".52" stopColor={kind === 'stone' ? '#9aaac0' : '#c4b18a'} /><stop offset="1" stopColor={kind === 'stone' ? '#6b7e9a' : '#928064'} /></linearGradient></defs>
    {kind === 'stone' ? <>
      <path d="m20 2 12 12-2 13-10 11L10 27 8 14 20 2Z" fill={`url(#${id}-metal)`} stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="m20 2-4 13 4 23 4-23-4-13Z" fill="#e6e9ef" /><path d="m8 14 8 1 4-13m-4 13-6 12m6-12h8l8-1m-8 1 6 12m-6-12-4 23" stroke="#f9f7ed" strokeWidth=".8" />
      <path d="m20 2 4 13-4 23 10-11 2-13L20 2Z" fill="#788ca8" opacity=".24" />
    </> : <>
      <circle cx="20" cy="20" r="17" fill={`url(#${id}-metal)`} stroke="currentColor" strokeWidth="1.5" /><circle cx="20" cy="20" r="13.5" stroke="#faf2da" strokeWidth="1" /><circle cx="20" cy="20" r="11.5" stroke="currentColor" strokeWidth=".7" opacity=".55" />
      <path d="M23 11c-9-2-13 11-5 15 4 2 8-1 8-6-5 4-10-1-7-6m-7 13 4 3m9-19 2 3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /><path d="M14 9a14 14 0 0 0-6 9" stroke="#fff8df" strokeWidth="1.4" strokeLinecap="round" />
    </>}
  </svg>;
}

export function EncounterCrest() {
  const id = useId().replace(/:/g, '');
  return <svg className="encounter-crest" viewBox="0 0 60 68" fill="none" aria-hidden="true">
    <defs><linearGradient id={`${id}-crystal`} x1="20" y1="9" x2="40" y2="59" gradientUnits="userSpaceOnUse"><stop stopColor="#faf7ea" /><stop offset=".5" stopColor="#bbc4d1" /><stop offset="1" stopColor="#687e99" /></linearGradient></defs>
    <path d="m30 2 12 10 12 8 3 14-8 14-7 10-12 8-12-8-7-10-8-14 3-14 12-8L30 2Z" fill="#303b4bcc" stroke="#c7bba2" strokeWidth="1.4" />
    <path d="m30 8 9 9 10 6 2 11-6 11-7 9-8 6-8-6-7-9-6-11 2-11 10-6 9-9Z" stroke="#eef0e54d" strokeWidth=".7" />
    <path d="m30 11 8 18-8 28-8-28 8-18Z" fill={`url(#${id}-crystal)`} stroke="#f5f0e3" strokeWidth=".9" /><path d="m30 11-2 18 2 28 4-28-4-18Z" fill="#f7f5e9" />
    <path d="m13 28 9 7 6 17-11-10-4-14Zm34 0-9 7-6 17 11-10 4-14Z" fill="#aeb9c9" stroke="#e8e7df" strokeWidth=".8" /><path d="M16 33 27 50m17-17L33 50" stroke="#f3f0e6" strokeWidth=".8" />
  </svg>;
}
