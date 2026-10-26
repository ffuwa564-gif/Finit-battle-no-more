import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { UltimateTheme } from '../domain/ultimates';
import { ULTIMATE_TIMING } from '../platform/ultimate-timing';

const palette: Record<UltimateTheme, number> = { blade: 0x79d7ff, stars: 0xa69aff, eclipse: 0xe17dff, bloom: 0x79ffd2, aegis: 0x89caff, dawn: 0xffd67b };
const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** A transparent, bounded GPU scene. Absolute game-clock time drives every frame. */
export async function createUltimateEffect(host: HTMLElement, theme: UltimateTheme, position: () => number, onFailure: () => void) {
  const app = new Application();
  try {
    await app.init({ width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight), backgroundAlpha: 0,
      resolution: Math.min(devicePixelRatio || 1, 1.5), autoDensity: true, antialias: true, preference: 'webgl',
      powerPreference: 'low-power', autoStart: false });
  } catch (error) {
    // init can fail on devices with no GPU; the caller keeps the SVG fallback.
    try { app.destroy(true); } catch { /* renderer may not exist yet */ }
    throw error;
  }
  const canvas = app.canvas;
  canvas.className = 'ultimate-pixi-canvas'; canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  const scene = new Container(), paths = new Graphics();
  paths.blendMode = 'add'; scene.addChild(paths); app.stage.addChild(scene);
  const glow = document.createElement('canvas'); glow.width = glow.height = 64;
  const context = glow.getContext('2d')!;
  const gradient = context.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'#ffffff'); gradient.addColorStop(.12,'#ffffff'); gradient.addColorStop(.3,'#ffffff88'); gradient.addColorStop(1,'#ffffff00');
  context.fillStyle = gradient; context.fillRect(0,0,64,64);
  const texture = Texture.from(glow);
  const particles = Array.from({ length: 88 }, (_, index) => {
    const sprite = new Sprite(texture); sprite.anchor.set(.5); sprite.blendMode = 'add'; sprite.tint = index % 5 === 0 ? 0xffffff : palette[theme]; scene.addChild(sprite);
    const angle = index * 2.39996323;
    return { sprite, angle, speed: .45 + ((index * 37) % 71) / 100, size: 4 + index % 7 };
  });
  let destroyed = false;
  const support = ['bloom','aegis','dawn'].includes(theme);
  const color = palette[theme];
  const stroke = (points: number[], width: number, alpha: number) => {
    if (alpha <= 0) return;
    for (const [scale, strength, tint] of [[4,.08,color],[1.8,.28,color],[1,1,0xffffff]]) {
      paths.moveTo(points[0],points[1]);
      for (let i = 2; i < points.length; i += 2) paths.lineTo(points[i],points[i+1]);
      paths.stroke({ width: width * scale, color: tint, alpha: alpha * strength, cap: 'round', join: 'round' });
    }
  };
  const draw = () => {
    if (destroyed || document.hidden) return;
    const elapsed = position(), time = (elapsed - ULTIMATE_TIMING.effect) / 1000;
    const hit = (elapsed - ULTIMATE_TIMING.impact) / 1000;
    const w = host.clientWidth, h = host.clientHeight, size = Math.min(w,h), cx = w*.5, cy = h*.46;
    if (w !== app.screen.width || h !== app.screen.height) app.renderer.resize(w,h);
    paths.clear(); scene.visible = time >= 0 && elapsed < ULTIMATE_TIMING.end;
    const fade = clamp((ULTIMATE_TIMING.end - elapsed) / (ULTIMATE_TIMING.end - ULTIMATE_TIMING.tail));
    scene.alpha = fade;
    if (!scene.visible) { app.render(); return; }
    // A contracting ring gives an unmistakable anticipation before impact.
    if (hit < 0) {
      const gather = clamp(time / ((ULTIMATE_TIMING.impact-ULTIMATE_TIMING.effect)/1000));
      paths.circle(cx,cy,size*(.48-.34*gather)).stroke({ color, width: 1 + gather*2, alpha: .65*gather });
    } else {
      // Expanding shockwaves, with bright cores rather than a full-screen flash.
      for (let ring=0;ring<3;ring++) {
        const age = hit - ring*.13;
        if (age < 0) continue;
        const alpha = Math.exp(-Math.max(0,age-.2)*1.5) * (1-ring*.22);
        paths.circle(cx,cy,size*(.08+age*(support ? .3 : .38))).stroke({ color, width: Math.max(1,5-age*3), alpha });
        paths.circle(cx,cy,size*(.08+age*(support ? .3 : .38))+5).stroke({ color: 0xffffff, width: 1, alpha: alpha*.6 });
      }
      if (!support) {
        const flare = Math.exp(-Math.max(0,hit-.08)*4);
        paths.circle(cx,cy,size*.065).fill({color,alpha:flare*.4});
        paths.circle(cx,cy,size*.025).fill({color:0xffffff,alpha:flare});
        stroke([cx-size*.2,cy,cx+size*.2,cy],3,flare);
        stroke([cx,cy-size*.22,cx,cy+size*.22],2,flare);
      }
      if (theme === 'blade') {
        for(let slash=0;slash<3;slash++) {
          const age = hit-slash*.085; if(age<0) continue;
          const alpha = Math.exp(-Math.max(0,age-.22)*1.7), reach = size*.64, y = cy+(slash-1)*size*.15;
          const points:number[]=[];
          for(let i=0;i<=24;i++) { const t=i/24; points.push(cx-reach+2*reach*t,y+reach*.7-1.4*reach*t-Math.sin(t*Math.PI)*size*.13); }
          stroke(points,slash===0?9:4,alpha);
        }
      }
      if (!support) {
        const bolts = theme==='blade'?5:8;
        for(let bolt=0;bolt<bolts;bolt++) {
          const age=hit-bolt*.025; if(age<0) continue;
          const alpha = Math.exp(-Math.max(0,age-.2)*1.9), angle=bolt*Math.PI*2/bolts+.2;
          const points=[cx,cy];
          for(let j=1;j<=8;j++) { const distance=size*.65*j/8, jitter=Math.sin(j*13.7+bolt*3.1)*size*.055;
            points.push(cx+Math.cos(angle)*distance+Math.cos(angle+Math.PI/2)*jitter,cy+Math.sin(angle)*distance+Math.sin(angle+Math.PI/2)*jitter); }
          stroke(points,2.8,alpha);
          stroke([points[8],points[9],points[8]+Math.cos(angle+.7)*size*.2,points[9]+Math.sin(angle+.7)*size*.2],1,alpha*.6);
        }
      } else {
        // A faceted shield/flower halo belongs around the party display.
        const alpha = clamp(hit*8)*Math.exp(-hit*.9), radius=size*.34;
        const points:number[]=[];
        const corners=theme==='bloom'?12:6;
        for(let i=0;i<=corners;i++) {const angle=i*Math.PI*2/corners-Math.PI/2;const r=theme==='bloom'&&i%2?radius*.65:radius;points.push(cx+Math.cos(angle)*r,cy+Math.sin(angle)*r);}
        stroke(points,2,alpha);
      }
    }
    for (let index=0;index<particles.length;index++) {
      const {sprite,angle,speed,size:pointSize}=particles[index];
      const anticipation=hit<0;
      const radius = anticipation ? size*(.55-clamp(time/.75)*.48)*speed : size*(.06+Math.max(0,hit)*speed*(support ? .25 : .65));
      const spin = anticipation ? time*1.6 : support?hit*.5:0;
      sprite.position.set(cx+Math.cos(angle+spin)*radius, cy+Math.sin(angle+spin)*radius*(support ? .85 : 1));
      sprite.alpha = anticipation ? clamp(time*3)*.65 : Math.exp(-Math.max(0,hit-.2)*1.2)*(.5+index%3*.2);
      const length=anticipation?pointSize:pointSize*(1+Math.min(hit,.4)*5);
      sprite.width=length; sprite.height=pointSize*(support?1:.42); sprite.rotation=angle+spin;
    }
    app.render();
  };
  const tick = () => {
    try { draw(); } catch { app.ticker.stop(); onFailure(); }
  };
  app.ticker.remove(app.render, app);
  app.ticker.maxFPS = 30; app.ticker.add(tick);
  const visibility = () => { if(document.hidden) app.ticker.stop(); else { app.ticker.start(); tick(); } };
  const lost = (event: Event) => { event.preventDefault(); onFailure(); };
  document.addEventListener('visibilitychange', visibility); canvas.addEventListener('webglcontextlost',lost);
  visibility();
  return () => {
    if(destroyed) return; destroyed=true;
    document.removeEventListener('visibilitychange',visibility); canvas.removeEventListener('webglcontextlost',lost);
    app.ticker.stop(); app.destroy(true,{children:true}); texture.destroy(true);
  };
}
