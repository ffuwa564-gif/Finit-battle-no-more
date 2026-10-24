import { useId } from 'react';

export type MenuEmblemKind = 'party' | 'monster' | 'bag' | 'wish' | 'codex' | 'settings';

/** The illustrated menu vocabulary is shared, rather than redrawn by each screen. */
export function MenuEmblem({ kind }: { kind: MenuEmblemKind }) {
  const id = useId().replace(/:/g, '');
  const metal = `url(#${id}-metal)`, paper = `url(#${id}-paper)`;
  return <svg className={`menu-emblem menu-emblem--${kind}`} viewBox="0 0 120 92" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-metal`} x1="32" y1="14" x2="86" y2="84" gradientUnits="userSpaceOnUse"><stop stopColor="#8d94a4" /><stop offset=".56" stopColor="#697387" /><stop offset="1" stopColor="#a2a8b5" /></linearGradient>
      <linearGradient id={`${id}-paper`} x1="28" y1="19" x2="87" y2="81" gradientUnits="userSpaceOnUse"><stop stopColor="#f2ede2" /><stop offset="1" stopColor="#d2ccbf" /></linearGradient>
      <radialGradient id={`${id}-halo`}><stop stopColor="#d7dce4" stopOpacity=".78" /><stop offset="1" stopColor="#d7dce4" stopOpacity="0" /></radialGradient>
    </defs>
    <ellipse cx="60" cy="53" rx="53" ry="36" fill={`url(#${id}-halo)`} />
    {kind === 'party' && <>
      <path d="M29 79c-10-2-13-8-10-19 2-9 10-15 13-21-5-10-1-23 10-25 13-2 20 11 15 24-2 5-6 8-7 11 2 10 8 17 12 24-12-3-22 3-33 6Z" fill="#939aa8" opacity=".7" />
      <path d="M76 77c14 2 20-2 19-12-1-12-11-13-14-23 4-8 3-19-5-22-9-4-18 3-17 13 0 7 5 10 8 13-1 9-7 15-12 23 6 5 14 8 21 8Z" fill="#a8aebb" />
      <path d="M40 82c-9-3-10-9-7-16 3-8 14-13 18-19-9-11-5-27 5-29 15-3 24 12 18 25-3 6-8 10-8 16 4 5 13 12 18 20-18-4-30 0-44 3Z" fill={metal} />
      <path d="M57 26c5-5 13-1 15 6l-4 3 4 5-6 3-1 8-10-3c5-6 6-12 2-22Z" fill={paper} />
      <path d="M51 29c-4 13-1 23-7 35M48 43c3 12-1 20-7 27" stroke="#b6bbc4" strokeWidth="1.3" strokeLinecap="round" />
      <path d="m47 57 12 8 10-7" stroke="#c6c7cb" strokeWidth="1.1" />
    </>}
    {kind === 'monster' && <>
      <path d="M81 7c4 9 1 19-8 23 12 0 20-13 14-24-2-3-5-5-8-6l2 7Z" fill="#9ca2b3" />
      <path d="m31 22 15 14 14-7 17 7 15-16 1 27 10 13-17 1 7 12-21-3-10 13-10-12-21 2 6-13-18-4 15-11-3-23Z" fill={metal} />
      <path d="m38 34 9 10-7 2-2-12Zm46-2-9 12 8 1 1-13Z" fill={paper} />
      <path d="m46 51 9 5-7 2-2-7Zm30 0-8 5 7 2 1-7Z" fill="#edece5" />
      <path d="m55 61 7-4 7 4-7 7-7-7Z" fill="#e0e2e5" />
      <path d="m59 70 3 3 4-3" stroke="#c4c9d0" strokeWidth="1.3" />
      <path d="M26 82c-10-7-15-18-15-30M11 57l-5-5m6 13-6-2m11 12-6-1m80 7c10-7 15-17 16-29m-1 7 6-5m-8 14 7-2m-12 12 7-1" stroke="#a3aaa9" strokeWidth="1.4" strokeLinecap="round" />
      <path d="m20 75-3-8 7 4m73 3 3-8-7 5" fill="#a3aaa9" />
    </>}
    {kind === 'bag' && <>
      <path d="M45 26v-7c0-8 30-8 30 0v7" stroke="#6f7784" strokeWidth="5" />
      <path d="M31 31c0-6 58-6 58 0l8 42c1 8-70 9-72 1l6-43Z" fill={metal} stroke="#687080" strokeWidth="1.3" />
      <path d="m31 32-5 22c16 8 46 7 68-2l-5-21c-17 9-40 10-58 1Z" fill={paper} stroke="#9c9b99" strokeWidth="1.2" />
      <path d="m42 30-1 45m36-46 2 46" stroke="#b7b1a1" strokeWidth="8" />
      <path d="m42 30-1 45m36-46 2 46" stroke="#e2d8bc" strokeWidth="2" />
      <rect x="36" y="47" width="11" height="12" rx="2" fill="#7b808a" stroke="#e2d8bc" strokeWidth="1.6" />
      <rect x="73" y="46" width="11" height="12" rx="2" fill="#7b808a" stroke="#e2d8bc" strokeWidth="1.6" />
      <path d="M51 61h19v16H51z" fill="#8e98a3" stroke="#c5c8c9" strokeWidth="1.1" />
      <path d="M31 73c15 5 44 5 59-1" stroke="#ccd0d2" strokeWidth="1" />
    </>}
    {kind === 'wish' && <>
      <path d="m60 9 23 30-6 28-17 18-17-18-6-28L60 9Z" fill="#a9b9ce" stroke="#75879e" strokeWidth="1.4" />
      <path d="m60 9-4 32-13 26-6-28L60 9Z" fill="#dce5ee" />
      <path d="m60 9 8 32 15-2L60 9Z" fill="#c1d0df" />
      <path d="m56 41 12 0-8 44-4-44Z" fill="#f0f3f4" />
      <path d="m68 41 9 26-17 18 8-44Z" fill="#869fb9" />
      <path d="m56 41-13 26 17 18-4-44Z" fill="#b2c3d4" />
      <path d="m37 39 19 2 4-32m-4 32 12 0 15-2" stroke="#f5f5ef" strokeWidth="1.2" />
      <path d="m23 29 2 8 7 2-7 2-2 8-2-8-7-2 7-2 2-8Zm72 22 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" fill="#a7acb7" />
      <circle cx="33" cy="69" r="2" fill="#b0ac9d" /><circle cx="90" cy="26" r="1.5" fill="#b0ac9d" />
    </>}
    {kind === 'codex' && <>
      <path d="m34 17 49 7-7 57-51-8 9-56Z" fill={metal} stroke="#6f7887" strokeWidth="1.2" />
      <path d="m39 15 48 7-7 56-48-7 7-56Z" fill={paper} stroke="#9ba1a7" strokeWidth="1.2" />
      <path d="m40 14 43 6-7 54-43-6 7-54Z" fill="#818c9d" stroke="#c4c4bf" strokeWidth="1.2" />
      <path d="m46 21 30 4-5 40-30-4 5-40Z" stroke="#c4c3b8" strokeWidth=".8" />
      <path d="M57 59c-1-10 2-21 11-27m-10 13c-10-5-9-12-9-12 8 0 12 6 9 12Zm2-3c9 0 13-7 13-7-8-2-13 1-13 7Zm-4 10c-9-1-11-8-11-8 8-2 12 2 11 8Z" stroke="#dcd9c8" fill="#dcd9c8" strokeWidth=".8" strokeLinecap="round" />
      <path d="m32 72 47 7m-45-4 43 7" stroke="#d2cdbc" strokeWidth="1.2" />
      <path d="m17 64 4 6-6 1m77-13-3 8 7-3" fill="#a6ada9" />
    </>}
    {kind === 'settings' && <>
      <path d="m49 14 4 9 10-1 3-9 12 4-1 10 8 6 9-3 7 11-7 7 2 10 9 4-3 13-11-1-6 8 1 8-14 3-5-8-10-1-6 7-11-6 2-10-6-7-10 1-4-12 8-6 1-10-8-6 6-11 10 3 8-5 1-10 13-3Z" fill={metal} transform="translate(-2 -2) scale(.88) translate(10 7)" />
      <circle cx="61" cy="48" r="16" fill={paper} stroke="#c2c6c9" strokeWidth="2" />
      <circle cx="61" cy="48" r="7" fill="#a1a9b5" />
      <path d="M28 77c-7-6-10-14-10-22m0 7-6-3m9 12-7-1m80 7c7-6 10-14 10-22m0 7 6-3m-9 12 7-1" stroke="#adb1ab" strokeWidth="1.3" strokeLinecap="round" />
    </>}
  </svg>;
}
