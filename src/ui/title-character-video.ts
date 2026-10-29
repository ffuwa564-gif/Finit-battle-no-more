import { Mesh, MeshGeometry, Shader, Texture, VideoSource } from 'pixi.js';

/** RGB on the left, the matching alpha on the right: ordinary H.264 works on iPhone too. */
export function createTitleCharacter(video: HTMLVideoElement) {
  const source = new VideoSource({ resource: video, autoLoad: false, autoPlay: false, alphaMode: 'no-premultiply-alpha' });
  source.autoUpdate = false;
  const texture = new Texture({ source });
  const shader = Shader.from({
    gl: {
      vertex: `
        in vec2 aPosition; in vec2 aUV; out vec2 vUV;
        uniform mat3 uProjectionMatrix, uWorldTransformMatrix, uTransformMatrix;
        void main() {
          vUV = aUV;
          gl_Position = vec4((uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
        }`,
      fragment: `
        in vec2 vUV; out vec4 finalColor; uniform sampler2D uPacked;
        void main() {
          vec3 color = texture(uPacked, vec2(vUV.x * .5, vUV.y)).rgb;
          float alpha = clamp((texture(uPacked, vec2(.5 + vUV.x * .5, vUV.y)).r - .004) / .992, 0.0, 1.0);
          finalColor = vec4(color * alpha, alpha);
        }`,
    },
    resources: { uPacked: source },
  });
  const mesh = new Mesh({ geometry: new MeshGeometry({
    positions: new Float32Array([0, 0, 720, 0, 720, 1280, 0, 1280]),
    uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  }), shader, texture });
  // Match the isolated illustration's original crop in the 1672×941 scene.
  const scale = (500 / 1456) * (1024 / 720);
  mesh.scale.set(scale);
  mesh.position.set(836 - 512 * 500 / 1456, 116 - 39 * 500 / 1456 - 100 * scale);
  const geometry = mesh.geometry;
  return { mesh, update: () => source.update(), destroy() { geometry.destroy(); shader.destroy(true); texture.destroy(true); } };
}

export function loadTitleVideo(url: string, host: HTMLElement, signal?: AbortSignal): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true; video.defaultMuted = true; video.playsInline = true; video.loop = true;
    video.preload = 'auto'; video.setAttribute('aria-hidden', 'true');
    video.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:.001;pointer-events:none';
    const cleanup = () => { clearTimeout(timeout); signal?.removeEventListener('abort', aborted); video.removeEventListener('loadeddata', loaded); video.removeEventListener('error', failed); };
    const failed = () => { cleanup(); disposeTitleVideo(video); reject(new Error('Title character video unavailable')); };
    const aborted = () => { cleanup(); disposeTitleVideo(video); reject(new DOMException('Title closed', 'AbortError')); };
    const loaded = () => { cleanup(); resolve(video); };
    const timeout = setTimeout(failed, 15000);
    signal?.addEventListener('abort', aborted, { once: true });
    video.addEventListener('loadeddata', loaded, { once: true });
    video.addEventListener('error', failed, { once: true });
    if (signal?.aborted) { aborted(); return; }
    host.appendChild(video); video.src = url; video.load();
  });
}

export function disposeTitleVideo(video: HTMLVideoElement) {
  video.pause(); video.removeAttribute('src'); video.load(); video.remove();
}
