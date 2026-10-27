/** Texture belongs to the illustration, never to input, text or combat state. */
export function SceneAtmosphere({ mode = 'quiet', reducedMotion = false, disturbance = false }: {
  mode?: 'quiet' | 'memory' | 'battle';
  reducedMotion?: boolean;
  disturbance?: boolean;
}) {
  return <div className={`scene-atmosphere scene-atmosphere--${mode}`} aria-hidden="true" data-reduced={reducedMotion} data-disturbance={disturbance}>
    <span className="scene-atmosphere__grain" />
    <span className="scene-atmosphere__shade" />
    <span className="scene-atmosphere__fracture" />
  </div>;
}
