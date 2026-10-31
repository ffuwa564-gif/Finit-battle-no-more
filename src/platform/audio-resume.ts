/** WebKit may leave resume() pending while interrupted. Observe the real state
 * and bound the wait so another foreground gesture can always retry. */
export function resumeAudioContext(context: AudioContext, timeoutMs = 1500): Promise<boolean> {
  return new Promise(resolve => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let finished = false;
    const finish = (running: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      context.removeEventListener('statechange', changed);
      resolve(running);
    };
    const changed = () => {
      if (context.state === 'running') finish(true);
      else if (context.state === 'closed') finish(false);
    };
    context.addEventListener('statechange', changed);
    timer = setTimeout(() => finish(context.state === 'running'), timeoutMs);
    try {
      // Must execute synchronously inside the native gesture, even if an older
      // resume attempt is still pending.
      void context.resume().then(changed, () => finish(context.state === 'running'));
      changed();
    } catch { finish(false); }
  });
}
