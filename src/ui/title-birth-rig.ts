import { Application, Rectangle, Sprite, Texture } from 'pixi.js';
import { createTitleCharacter, disposeTitleVideo, loadTitleVideo } from './title-character-video';

const W = 1672, H = 941;
export interface BirthRig {
  setRunning(running: boolean): void;
  snapshot(): Promise<string>;
  destroy(): void;
}

function image(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Title part could not be loaded'));
    img.src = url;
  });
}

/** A static world with the isolated Runway character composited using its separate alpha. */
export async function createBirthRig(host: HTMLElement, backgroundUrl: string, characterUrl: string, motionUrl: string, onFailure: () => void, signal?: AbortSignal): Promise<BirthRig> {
  const app = new Application();
  const textures: Texture[] = [];
  let destroyed = false;
  let video: HTMLVideoElement | undefined;
  let animated: ReturnType<typeof createTitleCharacter> | undefined;
  let wanted = false;
  try {
    const videoPromise = loadTitleVideo(motionUrl, host, signal).then(value => {
      video = value;
      if (destroyed) { disposeTitleVideo(value); throw new Error('Title closed'); }
      return value;
    });
    const [background, character] = await Promise.all([image(backgroundUrl), image(characterUrl), videoPromise]);
    if (signal?.aborted) throw new DOMException('Title was closed', 'AbortError');
    await app.init({ width: W, height: H, backgroundAlpha: 0, resolution: Math.min(devicePixelRatio || 1, 1.75), autoDensity: false,
      antialias: true, preference: 'webgl', powerPreference: 'low-power', autoStart: false });
    if (signal?.aborted) throw new DOMException('Title was closed', 'AbortError');
    app.ticker.maxFPS = 30;
    const backdropTexture = Texture.from(background), fullCharacter = Texture.from(character);
    textures.push(backdropTexture, fullCharacter);
    // Crop metadata only: the original transparent pixels remain unmodified.
    const characterTexture = new Texture({ source: fullCharacter.source, frame: new Rectangle(47, 39, 928, 1456) });
    const backdrop = new Sprite(backdropTexture);
    backdrop.width = W; backdrop.height = H;
    app.stage.addChild(backdrop);

    animated = createTitleCharacter(video!);
    app.stage.addChild(animated.mesh);

    const lightCanvas = document.createElement('canvas');
    lightCanvas.width = lightCanvas.height = 64;
    const context = lightCanvas.getContext('2d');
    if (!context) throw new Error('Title light renderer unavailable');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, '#ffefd6'); gradient.addColorStop(.2, '#ffefd666'); gradient.addColorStop(1, '#ffefd600');
    context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
    const lightTexture = Texture.from(lightCanvas); textures.push(lightTexture);
    const glow = new Sprite(lightTexture); glow.anchor.set(.5); glow.position.set(W / 2, 208);
    glow.width = 1130; glow.height = 260; glow.blendMode = 'add'; glow.alpha = .025;
    app.stage.addChild(glow);
    const motes = Array.from({ length: 24 }, (_, i) => {
      const sprite = new Sprite(lightTexture); sprite.anchor.set(.5); sprite.blendMode = 'add';
      sprite.width = sprite.height = 2 + i % 3;
      app.stage.addChild(sprite);
      return { sprite, phase: (i * .381966) % 1, x: 390 + (i * 137 % 900), y: 160 + (i * 71 % 550) };
    });
    // Very distant silhouettes emerge from light; their anatomy and dress are never regenerated.
    const births = [
      { sprite: new Sprite(characterTexture), x: 742, y: 232, phase: .12, size: .045 },
      { sprite: new Sprite(characterTexture), x: 970, y: 283, phase: .64, size: .035 },
    ];
    for (const { sprite, size } of births) { sprite.anchor.set(.5, 0); sprite.scale.set(size); sprite.tint = 0xded6c9; app.stage.addChildAt(sprite, 1); }

    let elapsed = 0;
    const draw = () => {
      animated!.update();
      glow.alpha = .022 + .012 * (1 + Math.sin(elapsed * .58));
      for (const mote of motes) {
        const phase = (mote.phase + elapsed / 16) % 1;
        mote.sprite.position.set(mote.x + Math.sin(elapsed * .24 + mote.phase * 6) * 6, mote.y + phase * 27);
        mote.sprite.alpha = Math.sin(phase * Math.PI) * .36;
      }
      for (const birth of births) {
        const phase = (birth.phase + elapsed / 22) % 1;
        birth.sprite.position.set(birth.x, birth.y + phase * 22);
        birth.sprite.alpha = Math.sin(Math.PI * phase) ** 3 * .28;
      }
    };
    draw();
    app.canvas.className = 'title-birth-scene__canvas';
    app.canvas.setAttribute('aria-hidden', 'true');
    app.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); if (!destroyed) { app.stop(); onFailure(); } });
    video!.addEventListener('error', () => { if (!destroyed) { app.stop(); onFailure(); } });
    host.appendChild(app.canvas);
    app.renderer.render(app.stage);
    app.ticker.add(ticker => {
      if (destroyed || document.hidden) return;
      elapsed += Math.min(50, ticker.deltaMS) / 1000;
      draw();
    });
    return {
      setRunning(running) {
        wanted = running;
        if (destroyed) return;
        if (running) {
          app.start();
          void video!.play().then(() => { if (destroyed || !wanted) video?.pause(); }).catch(() => { if (!destroyed && wanted) { app.stop(); onFailure(); } });
        } else { video!.pause(); app.stop(); }
      },
      snapshot() { return app.renderer.extract.base64({ target: app.stage, format: 'png', resolution: 1 }); },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        video!.pause();
        app.destroy(true, { children: true });
        animated?.destroy();
        disposeTitleVideo(video!);
        characterTexture.destroy(false);
        textures.forEach(texture => texture.destroy(true));
      },
    };
  } catch (error) {
    destroyed = true;
    if (video) disposeTitleVideo(video);
    animated?.destroy();
    try { app.destroy(true, { children: true }); } catch { /* Initialization may have stopped before the renderer existed. */ }
    textures.forEach(texture => texture.destroy(true));
    throw error;
  }
}
