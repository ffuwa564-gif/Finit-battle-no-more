import { useId } from 'react';
import { assetPath } from '../content';

export type MenuEmblemKind = 'party' | 'monster' | 'bag' | 'wish' | 'codex' | 'settings';

/** The illustrated menu vocabulary is shared, rather than redrawn by each screen. */
export function MenuEmblem({ kind }: { kind: MenuEmblemKind }) {
  const id = useId().replace(/:/g, '');
  const metal = `url(#${id}-metal)`, paper = `url(#${id}-paper)`;
  if (kind === 'bag' || kind === 'codex') return <img className={`menu-emblem menu-emblem--painted menu-emblem--${kind}`} src={assetPath(`menu-${kind}`)} alt="" aria-hidden="true" draggable={false} />;
  return <svg className={`menu-emblem menu-emblem--${kind}`} viewBox="0 0 120 92" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-metal`} x1="32" y1="14" x2="86" y2="84" gradientUnits="userSpaceOnUse"><stop stopColor="#747d8b" /><stop offset=".56" stopColor="#566171" /><stop offset="1" stopColor="#8d96a4" /></linearGradient>
      <linearGradient id={`${id}-paper`} x1="28" y1="19" x2="87" y2="81" gradientUnits="userSpaceOnUse"><stop stopColor="#f2ede2" /><stop offset="1" stopColor="#d2ccbf" /></linearGradient>
      <filter id={`${id}-ink`} x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" seed="14" stitchTiles="stitch" result="grain" />
        <feColorMatrix in="grain" type="saturate" values="0" />
        <feComponentTransfer><feFuncA type="linear" slope=".16" /></feComponentTransfer>
        <feComposite in2="SourceAlpha" operator="in" />
        <feBlend in="SourceGraphic" mode="multiply" />
      </filter>
      <radialGradient id={`${id}-halo`}><stop stopColor="#d7dce4" stopOpacity=".78" /><stop offset="1" stopColor="#d7dce4" stopOpacity="0" /></radialGradient>
    </defs>
    <g filter={`url(#${id}-ink)`}>
    <ellipse cx="60" cy="53" rx="53" ry="36" fill={`url(#${id}-halo)`} />
    {kind === 'party' && <>
      <path d="M27 80c9-4 12-11 12-20 0-8-5-12-5-24 0-17 12-28 28-28 18 0 29 12 28 28-1 7-4 11-8 16-3 5-4 10-2 16 1 5 5 9 10 13-16 0-28 2-39 4-9 2-18 1-24-5Z" fill={metal} />
      <path d="M64 17c9-1 17 6 18 15l-2 6 7 7c1 1 0 3-2 3l-6 1-1 8c-1 5-5 7-11 7-3 7 0 12 8 16-11 0-22 2-31 4 2-7 9-10 12-17 2-5 1-10-1-15 7-7 11-19 9-35Z" fill={paper} />
      <path d="M59 13c-15 7-18 21-13 34 5 14 1 24-8 33 15-7 20-18 16-31-5-15-4-25 5-36Z" fill="#d0d1cb" fillOpacity=".18" />
      <path d="M71 61c-5 3-7 8-6 13l10 6-20 3c5-6 8-12 8-19l8-3Z" fill="#8b9399" fillOpacity=".22" />
      <path d="M61 12c-14 7-16 17-12 33 4 17-3 23-11 32M56 16c-13 10-16 19-12 31 5 16-2 25-8 30M66 13c-9 8-9 18-4 27" stroke="#bdc1c7" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M42 31c-6 13 7 25 0 37-3 6-8 10-13 12m15-2c8-9 13-14 11-24M72 18c6 4 9 9 9 15" stroke="#e1dfd4" strokeOpacity=".6" strokeWidth=".65" strokeLinecap="round" />
      <path d="M50 18c-11 9-12 19-9 31 3 13-1 24-9 30m21-57c-6 9-5 17-2 25 4 11 1 20-4 26m12-54c-5 8-3 17-1 24m8-31c9 1 17 7 19 14" stroke="#e0dfd6" strokeOpacity=".52" strokeWidth=".7" strokeLinecap="round" />
      <path d="M67 60c5-1 8-3 9-7m-11 17 7 5m-13 0 9 4" stroke="#8d959b" strokeOpacity=".5" strokeWidth=".65" strokeLinecap="round" />
      <path d="M75 35c2-1 4 0 5 1" stroke="#747e8c" strokeWidth="1" strokeLinecap="round" />
      <path d="M88 79c9-6 13-15 14-26m-2 9 7-5m-10 14 8-3m-14 10 8-1" stroke="#a5aaa6" strokeWidth="1.15" strokeLinecap="round" />
      <path d="M101 60c-5-2-7-5-7-8 5 1 8 3 7 8Zm-5 11c-5 0-8-3-9-6 6-1 9 2 9 6Z" fill="#a5aaa6" />
    </>}
    {kind === 'monster' && <>
      <path d="M79 8c4 9 0 18-8 21 12 0 19-13 13-23-2-3-4-5-7-6l2 8Z" fill="#9ca3af" />
      <path d="M34 78c6-7 7-14 6-23-5-2-9-5-11-9 6 0 10-2 13-6-1-8 0-18 4-29 6 6 11 13 13 20 7-3 14-3 20-2 4 7 10 13 17 16l10 3c3 1 4 5 1 7-4 3-11 4-18 5-2 6-5 11-10 14l6 10c-8-2-14-3-21-2l-8 5-7-7-15-2Z" fill={metal} />
      <path d="M47 39c9-8 20-12 32-10-9 2-17 6-20 12-3 6-7 10-13 13 4-6 4-10 1-15Zm-3 18c8 0 13-3 18-8-3 14-9 23-19 28 4-7 4-13 1-20Z" fill="#c9cecf" fillOpacity=".2" />
      <path d="M64 56c8 1 14 1 23-2-5 8-9 14-15 17 3-6 0-11-8-15Z" fill="#3e4a5d" fillOpacity=".2" />
      <path d="M46 20c0 7 0 13 2 17l7-3-9-14Z" fill={paper} />
      <path d="M63 44c6-5 12-6 18-4l-6 7-12-3Z" fill="#d9dde0" />
      <path d="m70 44 7-1-2 4-5-3Z" fill="#697485" />
      <path d="M98 48c3 0 6 1 9 2-1 3-3 4-6 4l-3-6Z" fill="#495567" />
      <path d="M77 52c6 1 11 0 18-2m-7 8c6 0 11-1 16-4M50 39l5-3m4 1 5-3m-20 9 5-3m13 13-4 7m7-5-4 9m8-5-2 6m7 4 3 4m-27-4-4 5" stroke="#d5d7d3" strokeOpacity=".66" strokeWidth=".75" strokeLinecap="round" />
      <path d="M48 58c5 0 10-2 13-5-2 9-7 15-15 19m14-12c2 8 1 14-4 19m14-15c5 5 6 10 4 15" stroke="#bcc3ca" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M29 83C16 76 10 64 10 49m1 8-6-5m9 16-7-3m13 12-8-2m79 8c12-7 18-19 18-34m-1 9 6-5m-9 15 7-3m-13 12 8-2" stroke="#a1aaa5" strokeWidth="1.25" strokeLinecap="round" />
      <path d="m17 73-2-8 7 5m75 4 2-8-7 5" fill="#a1aaa5" />
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
    {kind === 'settings' && <>
      <path d="M49 82h26M54 78h16M61 72v8" stroke="#8a8f96" strokeWidth="2" strokeLinecap="round" />
      <circle cx="61" cy="44" r="31" fill={metal} fillOpacity=".17" stroke="#737d8c" strokeWidth="2" />
      <circle cx="61" cy="44" r="26" stroke="#b3b4b2" strokeWidth="1.2" />
      <path d="m48 16 2 5m24-5-2 5M33 31l5 2m46 22 5 2M33 57l5-2m46-22 5-2M48 72l2-5m24 5-2-5" stroke="#9b9fa3" strokeWidth=".7" />
      <ellipse cx="61" cy="44" rx="29" ry="12" transform="rotate(-30 61 44)" stroke="#828d9a" strokeWidth="1.6" />
      <path d="M61 10v7m0 54v7M27 44h7m54 0h7M37 20l5 5m38 38 5 5M37 68l5-5m38-38 5-5" stroke="#9ca2aa" strokeWidth="1.3" strokeLinecap="round" />
      <path d="m61 22 7 24-7 18-7-18 7-24Z" fill={metal} stroke="#848d9a" strokeWidth="1" />
      <path d="m61 22 0 25 7-1-7-24Z" fill="#d7d6cc" />
      <circle cx="61" cy="44" r="4" fill="#e0d5bd" stroke="#92959a" strokeWidth="1.1" />
      <path d="M16 68c-4-1-6-4-6-7 4 0 7 3 6 7Zm5 9c-4 1-7-1-9-4 4-1 8 0 9 4Zm85-9c4-1 6-4 6-7-4 0-7 3-6 7Zm-5 9c4 1 7-1 9-4-4-1-8 0-9 4Z" fill="#a1aaa5" />
      <path d="M25 79c-7-6-10-14-10-22m0 7-6-3m9 12-7-1m85 7c7-6 10-14 10-22m0 7 6-3m-9 12 7-1" stroke="#adb1ab" strokeWidth="1.15" strokeLinecap="round" />
    </>}
    </g>
  </svg>;
}
