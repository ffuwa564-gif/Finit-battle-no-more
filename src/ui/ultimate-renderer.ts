import { Application, Texture } from 'pixi.js';

interface RendererLease { app: Application; glow: Texture; reusable: boolean }
let idle: RendererLease | undefined;
let expiry: ReturnType<typeof setTimeout> | undefined;

function destroy(lease: RendererLease) {
  try { lease.app.destroy(true, { children: true }); } catch { /* Lost/partial context. */ }
  lease.glow.destroy(true);
}

/** One detached idle context, no ticker or scene retained between cut-ins. */
export async function acquireUltimateRenderer(width: number, height: number): Promise<RendererLease> {
  clearTimeout(expiry);
  const previous = idle; idle = undefined;
  if (previous?.reusable) {
    previous.app.renderer.resolution = Math.min(devicePixelRatio || 1, 1.5);
    previous.app.renderer.resize(width, height);
    return previous;
  }
  if (previous) destroy(previous);
  const app = new Application();
  try {
    await app.init({ width, height, backgroundAlpha: 0,
      resolution: Math.min(devicePixelRatio || 1, 1.5), autoDensity: true,
      antialias: true, preference: 'webgl', powerPreference: 'low-power', autoStart: false });
  } catch (error) { try { app.destroy(true); } catch { /* Partial init. */ } throw error; }
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!, gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(.14, '#ffffffff');
  gradient.addColorStop(.35, '#ffffff70'); gradient.addColorStop(1, '#ffffff00');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  const lease: RendererLease = { app, glow: Texture.from(canvas), reusable: true };
  app.canvas.addEventListener('webglcontextlost', () => { lease.reusable = false; });
  return lease;
}

export function releaseUltimateRenderer(lease: RendererLease) {
  lease.app.ticker.stop(); lease.app.canvas.remove();
  if (!lease.reusable || idle) { destroy(lease); return; }
  idle = lease;
  expiry = setTimeout(() => { if (idle === lease) { idle = undefined; destroy(lease); } }, 30000);
}
