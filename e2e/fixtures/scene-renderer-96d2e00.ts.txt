/** A texture-free, bounded WebGL layer. All positions use canvas-relative top-left coordinates. */
export type FxMode = 'menu' | 'battle';
export interface FxCue {
  kind: 'attack' | 'area' | 'heal' | 'guard' | 'buff' | 'debuff' | 'drop' | 'wave' | 'defeat';
  x: number;
  y: number;
  rarity?: 'common' | 'rare' | 'epic';
}
export interface SceneRenderer {
  resize(width: number, height: number, pixelRatio: number): void;
  cue(cue: FxCue): void;
  render(timeMs: number): void;
  dispose(): void;
}

const AMBIENT_COUNT = 32;
const PARTICLE_COUNT = 176;
const STRIDE = 14;
const EVENT_COUNT = 5;
const VERTEX = `
attribute vec2 a_position;
varying mediump vec2 v_uv;
void main() { v_uv = a_position * .5 + .5; gl_Position = vec4(a_position, 0., 1.); }
`;
const ATMOSPHERE = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying mediump vec2 v_uv;
uniform float u_time;
uniform float u_battle;
uniform vec2 u_resolution;
uniform vec4 u_events[5];
// No large-coordinate dot product or large sine multiplier: safe on 16-bit mediump GPUs.
float hash(vec2 p) {
  vec3 q=fract(vec3(p.xyx)*.1031);
  q+=dot(q,q.yzx+19.19);
  return fract((q.x+q.y)*q.z);
}
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
}
void main() {
  vec2 uv=vec2(v_uv.x,1.-v_uv.y);
  float t=u_time;
  // A 64-second closed path remains continuous when the CPU rebases its local clock.
  float phase=t*.09817477;
  float veil=noise(uv*vec2(3.,5.)+vec2(sin(phase),cos(phase))*.16);
  float mist=pow(1.-uv.y,3.)*.012 + pow(uv.y,5.)*veil*.04;
  float shaft=pow(max(0.,sin(uv.x*9.+uv.y*1.6+phase)),18.);
  float ray=shaft*pow(1.-uv.y,2.)*.039;
  float grain=(hash(floor(uv*u_resolution*.5)+floor(t*9.))-.5)*.002;
  float alpha=max(0.,(mist+ray+grain)*mix(1.,.68,u_battle));
  vec3 light=vec3(.60,.72,.79)*alpha;
  float aspect=u_resolution.x/max(u_resolution.y,1.);
  for(int i=0;i<5;i++) {
    vec4 event=u_events[i];
    float age=t-event.z;
    float alive=step(0.,age)*(1.-step(1.8,age));
    float p=clamp(age/1.8,0.,1.);
    vec2 d=(uv-event.xy)*vec2(aspect,1.);
    float radius=mix(.018,.24,p);
    float ring=exp(-pow(clamp((length(d)-radius)/.0035,-8.,8.),2.));
    float halo=exp(-dot(d,d)/(.008+p*.025))*.13;
    float isWave=step(7.5,event.w)*(1.-step(8.5,event.w));
    float isAttack=1.-step(.5,event.w);
    float slash=exp(-pow(clamp((d.y+d.x*.6)/.008,-8.,8.),2.))*exp(-dot(d,d)/.016);
    float treasure=step(5.5,event.w)*(1.-step(7.5,event.w));
    float shape=mix(ring*.12+halo,ring*.29+halo*1.6,treasure);
    shape=mix(shape,slash*.2,isAttack);
    shape=mix(shape,exp(-pow((uv.y-p*1.4+.2)/.075,2.))*.065,isWave);
    vec3 color=vec3(.59,.75,.88);
    if(event.w>1.5 && event.w<2.5) color=vec3(.65,.88,.76);
    if(event.w>4.5 && event.w<5.5) color=vec3(.65,.54,.79);
    if(event.w>5.5 && event.w<7.5) color=vec3(.89,.77,.52);
    if(event.w>6.5 && event.w<7.5) color=vec3(.77,.66,.91);
    if(event.w>8.5 && event.w<9.5) color=vec3(.35,.32,.43);
    float a=shape*pow(1.-p,1.6)*alive;
    light+=color*a;
    alpha+=a;
  }
  float boundedAlpha=min(alpha,.32);
  gl_FragColor=vec4(light*(boundedAlpha/max(alpha,.0001)),boundedAlpha);
}
`;
const PARTICLE_VERTEX = `
precision highp float;
attribute vec4 a_motion;
attribute vec4 a_life;
attribute vec4 a_color;
attribute vec2 a_style;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_pointMax;
varying mediump vec4 v_color;
varying mediump float v_style;
void main() {
  float ambient=a_style.y;
  float age=max(0.,u_time-a_life.x);
  float p=age/max(a_life.y,.01);
  if(ambient>.5) { age=mod(age+a_life.w*a_life.y,a_life.y); p=age/a_life.y; }
  vec2 pos=a_motion.xy+a_motion.zw*age;
  pos.x+=sin(age*.8+a_life.w*6.283)*.006;
  if(ambient>.5) { pos.y=fract(pos.y); pos.x=fract(pos.x); }
  float fade=sin(clamp(p,0.,1.)*3.141593);
  fade*=step(0.,u_time-a_life.x)*(1.-step(1.,p));
  gl_Position=vec4(pos.x*2.-1.,1.-pos.y*2.,0.,1.);
  gl_PointSize=min(u_pointMax,a_life.z*u_pixelRatio*(.75+fade*.25));
  v_color=vec4(a_color.rgb,a_color.a*fade);
  v_style=a_style.x;
}
`;
const PARTICLE_FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying mediump vec4 v_color;
varying mediump float v_style;
void main() {
  vec2 p=gl_PointCoord*2.-1.;
  float r=length(p);
  float glow=exp(-r*r*5.)*(1.-smoothstep(.75,1.,r));
  float star=pow(max(0.,1.-abs(p.x)*6.),3.)*pow(1.-abs(p.y),2.)
    +pow(max(0.,1.-abs(p.y)*6.),3.)*pow(1.-abs(p.x),2.);
  float shape=mix(glow,glow*.45+star*.55,step(.5,v_style));
  float a=shape*v_color.a;
  gl_FragColor=vec4(v_color.rgb*a,a);
}
`;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** Returns null when WebGL is unavailable; callers retain their ordinary artwork and CSS effects. */
export function createSceneRenderer(canvas: HTMLCanvasElement, mode: FxMode): SceneRenderer | null {
  let gl: WebGLRenderingContext | null = null;
  const shaders: WebGLShader[] = [];
  const programs: WebGLProgram[] = [];
  const buffers: WebGLBuffer[] = [];
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (!gl) return;
    for (const buffer of buffers) gl.deleteBuffer(buffer);
    for (const program of programs) gl.deleteProgram(program);
    for (const shader of shaders) gl.deleteShader(shader);
  };
  try {
    gl = canvas.getContext('webgl', {
      alpha: true, premultipliedAlpha: true, antialias: false, depth: false,
      stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power',
    });
    if (!gl) return null;
    const context = gl;
    const compile = (type: number, source: string) => {
      const shader = context.createShader(type);
      if (!shader) throw new Error('Shader allocation failed');
      shaders.push(shader);
      context.shaderSource(shader, source);
      context.compileShader(shader);
      if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) throw new Error('Shader compilation failed');
      return shader;
    };
    const program = (vertex: string, fragment: string) => {
      const result = context.createProgram();
      if (!result) throw new Error('Program allocation failed');
      programs.push(result);
      context.attachShader(result, compile(context.VERTEX_SHADER, vertex));
      context.attachShader(result, compile(context.FRAGMENT_SHADER, fragment));
      context.linkProgram(result);
      if (!context.getProgramParameter(result, context.LINK_STATUS)) throw new Error('Shader linking failed');
      return result;
    };
    const atmosphere = program(VERTEX, ATMOSPHERE);
    const particles = program(PARTICLE_VERTEX, PARTICLE_FRAGMENT);
    const allocateBuffer = () => {
      const result = context.createBuffer();
      if (!result) throw new Error('Buffer allocation failed');
      buffers.push(result);
      return result;
    };
    const quad = allocateBuffer();
    context.bindBuffer(context.ARRAY_BUFFER, quad);
    context.bufferData(context.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), context.STATIC_DRAW);
    const particleBuffer = allocateBuffer();
    const data = new Float32Array(PARTICLE_COUNT * STRIDE);
    const events = new Float32Array(EVENT_COUNT * 4);
    for (let i=0; i<EVENT_COUNT; i++) events[i*4+2] = -100;
    // Separate visual RNG: never consumes or affects combat/drop randomness.
    let seed = 0x51a7e;
    const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
    let now = 0;
    let clockOffset = 0;
    let baseline: number | undefined;
    let particleCursor = AMBIENT_COUNT;
    let eventCursor = 0;
    let dirty = true;
    let width = 1;
    let height = 1;
    let ratio = 1;
    const pointRange = context.getParameter(context.ALIASED_POINT_SIZE_RANGE) as Float32Array;
    const pointMax = Math.min(96, pointRange[1]);
    const setParticle = (index: number, x: number, y: number, vx: number, vy: number,
      life: number, size: number, color: readonly number[], style: number, ambient = 0) => {
      const offset = index * STRIDE;
      data.set([x,y,vx,vy,now,life,size,random(),color[0],color[1],color[2],color[3],style,ambient],offset);
    };
    for (let i=0; i<AMBIENT_COUNT; i++) {
      setParticle(i,random(),random(),(random()-.5)*.004,-.004-random()*.006,
        20+random()*22,1.5+random()*3.5,[.72,.81,.85,mode === 'menu' ? .22 : .14],0,1);
    }
    context.bindBuffer(context.ARRAY_BUFFER, particleBuffer);
    context.bufferData(context.ARRAY_BUFFER, data, context.DYNAMIC_DRAW);
    const atmospherePosition = context.getAttribLocation(atmosphere,'a_position');
    const attributes = [
      { location: context.getAttribLocation(particles,'a_motion'), size: 4, offset: 0 },
      { location: context.getAttribLocation(particles,'a_life'), size: 4, offset: 4 },
      { location: context.getAttribLocation(particles,'a_color'), size: 4, offset: 8 },
      { location: context.getAttribLocation(particles,'a_style'), size: 2, offset: 12 },
    ];
    const atmosphereUniforms = {
      time: context.getUniformLocation(atmosphere,'u_time'), resolution: context.getUniformLocation(atmosphere,'u_resolution'),
      battle: context.getUniformLocation(atmosphere,'u_battle'), events: context.getUniformLocation(atmosphere,'u_events[0]'),
    };
    const particleUniforms = {
      time: context.getUniformLocation(particles,'u_time'), resolution: context.getUniformLocation(particles,'u_resolution'),
      ratio: context.getUniformLocation(particles,'u_pixelRatio'), pointMax: context.getUniformLocation(particles,'u_pointMax'),
    };
    const resize = (cssWidth: number, cssHeight: number, pixelRatio: number) => {
      if (disposed || !Number.isFinite(cssWidth) || !Number.isFinite(cssHeight)) return;
      const w=Math.max(1,cssWidth), h=Math.max(1,cssHeight);
      ratio = Math.min(clamp(Number.isFinite(pixelRatio) ? pixelRatio : 1, .5, 1.5),
        Math.sqrt(1_400_000/(w*h)),2048/w,2048/h);
      width=Math.max(1,Math.min(2048,Math.round(w*ratio)));
      height=Math.max(1,Math.min(2048,Math.round(h*ratio)));
      // Uniform ratio must reflect the actual capped drawing buffer.
      ratio=Math.min(width/w,height/h);
      if (canvas.width !== width) canvas.width=width;
      if (canvas.height !== height) canvas.height=height;
      context.viewport(0,0,width,height);
    };
    const cue = (effect: FxCue) => {
      if (disposed || !Number.isFinite(effect.x) || !Number.isFinite(effect.y)) return;
      const x=clamp(effect.x,0,1), y=clamp(effect.y,0,1);
      const kinds: FxCue['kind'][]=['attack','area','heal','guard','buff','debuff','drop','wave','defeat'];
      let type=kinds.indexOf(effect.kind);
      if (type<0) return;
      if (effect.kind==='drop') type=effect.rarity==='epic' ? 7 : effect.rarity==='rare' ? 6 : 10;
      if (effect.kind==='wave') type=8;
      if (effect.kind==='defeat') type=9;
      events.set([x,y,now,type],eventCursor*4);
      eventCursor=(eventCursor+1)%EVENT_COUNT;
      const healing=effect.kind==='heal';
      const drop=effect.kind==='drop';
      const brightDrop=drop && (effect.rarity==='rare' || effect.rarity==='epic');
      const color: readonly number[] = healing ? [.65,.89,.76,.6]
        : effect.kind==='debuff' || effect.kind==='defeat' ? [.64,.55,.77,.42]
        : brightDrop ? (effect.rarity==='epic' ? [.81,.7,.95,.7] : [.94,.82,.52,.7])
        : effect.kind==='buff' || effect.kind==='guard' ? [.8,.88,.93,.5] : [.57,.76,.91,.52];
      const count=brightDrop ? 38 : effect.kind==='area' ? 28 : effect.kind==='wave' ? 22 : 16;
      for(let i=0;i<count;i++) {
        const angle=random()*Math.PI*2;
        const speed=.018+random()*.065;
        const ascending=healing || drop || effect.kind==='buff';
        const life=ascending ? 1.3+random()*1.4 : .6+random()*1.1;
        const vx=ascending ? (random()-.5)*.045 : Math.cos(angle)*speed;
        const vy=ascending ? -.025-random()*.065 : Math.sin(angle)*speed;
        const spread=brightDrop ? .12 : ascending ? .035 : .008;
        const size=brightDrop ? 8+random()*12 : 3+random()*8;
        setParticle(particleCursor,x+(random()-.5)*spread,y+(random()-.5)*spread,vx,vy,
          life,size,color,brightDrop || effect.kind==='attack' ? 1 : 0);
        particleCursor++;
        if(particleCursor>=PARTICLE_COUNT) particleCursor=AMBIENT_COUNT;
      }
      dirty=true;
    };
    const render = (timeMs: number) => {
      if (disposed || context.isContextLost() || !Number.isFinite(timeMs)) return;
      if (baseline===undefined) baseline=timeMs;
      now=Math.max(now,(timeMs-baseline)/1000-clockOffset);
      // Keep shader times below 64 seconds, including on GPUs without fragment highp.
      // Birth times move together with the clock, preserving live bursts across the boundary.
      const shift=Math.floor(now/64)*64;
      if(shift>0) {
        now-=shift;
        clockOffset+=shift;
        for(let i=0;i<PARTICLE_COUNT;i++) {
          const offset=i*STRIDE;
          const life=data[offset+5];
          const birth=data[offset+4]-shift;
          data[offset+4]=i<AMBIENT_COUNT
            ? now-((now-birth)%life)
            : Math.max(birth,now-life-1);
        }
        for(let i=0;i<EVENT_COUNT;i++) {
          const offset=i*4+2;
          events[offset]=Math.max(events[offset]-shift,now-2);
        }
        dirty=true;
      }
      context.disable(context.DEPTH_TEST);
      context.disable(context.CULL_FACE);
      context.enable(context.BLEND);
      context.blendFunc(context.ONE,context.ONE_MINUS_SRC_ALPHA);
      context.clearColor(0,0,0,0);
      context.clear(context.COLOR_BUFFER_BIT);
      context.useProgram(atmosphere);
      context.bindBuffer(context.ARRAY_BUFFER,quad);
      for(const attribute of attributes) context.disableVertexAttribArray(attribute.location);
      context.enableVertexAttribArray(atmospherePosition);
      context.vertexAttribPointer(atmospherePosition,2,context.FLOAT,false,0,0);
      context.uniform1f(atmosphereUniforms.time,now);
      context.uniform2f(atmosphereUniforms.resolution,width,height);
      context.uniform1f(atmosphereUniforms.battle,mode==='battle' ? 1 : 0);
      context.uniform4fv(atmosphereUniforms.events,events);
      context.drawArrays(context.TRIANGLE_STRIP,0,4);
      context.useProgram(particles);
      context.bindBuffer(context.ARRAY_BUFFER,particleBuffer);
      if(dirty) { context.bufferSubData(context.ARRAY_BUFFER,0,data); dirty=false; }
      context.disableVertexAttribArray(atmospherePosition);
      for(const attribute of attributes) {
        context.enableVertexAttribArray(attribute.location);
        context.vertexAttribPointer(attribute.location,attribute.size,context.FLOAT,false,STRIDE*4,attribute.offset*4);
      }
      context.uniform1f(particleUniforms.time,now);
      context.uniform2f(particleUniforms.resolution,width,height);
      context.uniform1f(particleUniforms.ratio,ratio);
      context.uniform1f(particleUniforms.pointMax,pointMax);
      context.drawArrays(context.POINTS,0,PARTICLE_COUNT);
    };
    resize(canvas.clientWidth || 1,canvas.clientHeight || 1,1);
    return { resize, cue, render, dispose };
  } catch {
    dispose();
    return null;
  }
}
