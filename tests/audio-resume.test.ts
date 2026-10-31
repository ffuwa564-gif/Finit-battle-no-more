import { afterEach, describe, expect, it, vi } from 'vitest';
import { resumeAudioContext } from '../src/platform/audio-resume';

class InterruptedContext extends EventTarget {
  state: string = 'interrupted';
  resume = vi.fn(() => new Promise<void>(() => {}));
  change(state: string) { this.state = state; this.dispatchEvent(new Event('statechange')); }
}
afterEach(() => vi.useRealTimers());
describe('interrupted audio recovery', () => {
  it('retries synchronously during a new gesture while the first resume promise hangs', async () => {
    const context = new InterruptedContext();
    const first = resumeAudioContext(context as unknown as AudioContext);
    expect(context.resume).toHaveBeenCalledTimes(1);
    const retry = resumeAudioContext(context as unknown as AudioContext);
    expect(context.resume).toHaveBeenCalledTimes(2);
    context.change('running');
    expect(await first).toBe(true); expect(await retry).toBe(true);
  });
  it('bounds a stuck resume and leaves subsequent attempts retryable', async () => {
    vi.useFakeTimers(); const context = new InterruptedContext();
    const first = resumeAudioContext(context as unknown as AudioContext);
    await vi.advanceTimersByTimeAsync(1500); expect(await first).toBe(false);
    const retry = resumeAudioContext(context as unknown as AudioContext);
    context.change('running'); expect(await retry).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('handles blocked/closed contexts without rejecting game actions', async () => {
    const context = new InterruptedContext();
    context.resume.mockImplementationOnce(() => Promise.reject(new Error('gesture required')));
    expect(await resumeAudioContext(context as unknown as AudioContext)).toBe(false);
    const retry = resumeAudioContext(context as unknown as AudioContext);
    context.change('closed'); expect(await retry).toBe(false);
  });
});
