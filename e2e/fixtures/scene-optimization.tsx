import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { MotionSettingsProvider } from '../../src/ui/animation-settings';
import { SceneEffects } from '../../src/ui/SceneEffects';
import { SceneAtmosphere } from '../../src/ui/SceneAtmosphere';
import '../../src/ui/moonlit-theme.css';

export function mount() {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  function Probe() {
    const [suspended, setSuspended] = useState(false);
    (window as any).setSceneSuspended = (value: boolean) => flushSync(() => setSuspended(value));
    return <MotionSettingsProvider reducedMotion={false} suspended={suspended}>
      <section style={{ position: 'relative', width: 240, height: 240 }}>
        <SceneEffects mode="battle" reducedMotion={false} />
        <SceneAtmosphere suspendWithScene mode="battle" />
        <SceneAtmosphere mode="memory" />
      </section>
    </MotionSettingsProvider>;
  }
  flushSync(() => root.render(<Probe />));
}
