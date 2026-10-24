import { tr, localize } from '../locales/i18n';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

const AnimationSettings = createContext({ reducedMotion: false, suspended: false });

/** Thumbnails share live preferences and pause behind character/reveal overlays. */
export function MotionSettingsProvider({ reducedMotion, suspended = false, children }: { reducedMotion: boolean; suspended?: boolean; children: ReactNode }) {
  const value = useMemo(() => ({ reducedMotion, suspended }), [reducedMotion, suspended]);
  return <AnimationSettings.Provider value={value}>{localize(children)}</AnimationSettings.Provider>;
}
export function useAnimationSettings() { return useContext(AnimationSettings); }
