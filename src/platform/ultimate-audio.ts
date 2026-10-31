import { RABBIT_VOLLEY, rabbitShotTimes, type UltimateVisual } from './ultimate-choreography';
import { renderProtectionSound } from './protection-audio';
import { renderUltimateCharge } from './ultimate-charge-audio';

export const ultimateSounds = ['ultimate', 'ultimate-strike', 'ultimate-magic', 'ultimate-stars', 'ultimate-sanctuary', 'ultimate-guard', 'ultimate-rally', 'ultimate-mechanism', 'ultimate-rabbits'] as const;
export type UltimateSound = typeof ultimateSounds[number];
export const isUltimateSound = (kind: string): kind is UltimateSound => (ultimateSounds as readonly string[]).includes(kind);
export const ultimateSoundFor = (theme: UltimateVisual): UltimateSound => ({ blade: 'ultimate-strike', stars: 'ultimate-stars', eclipse: 'ultimate-magic', bloom: 'ultimate-sanctuary', aegis: 'ultimate-guard', dawn: 'ultimate-rally', clockwork: 'ultimate-mechanism', 'rabbit-bits': 'ultimate-rabbits' } as const)[theme];

/** Original sound design: separate materials, envelopes and midrange, not palette swaps. */
export function renderUltimateSound(kind: UltimateSound, sampleRate: number): Float32Array {
  if (kind === 'ultimate-guard') return renderProtectionSound('guard', sampleRate, 0, { duration: 1.5, peak: .6 });
  if (kind === 'ultimate') return renderUltimateCharge(sampleRate);
  const heal = kind === 'ultimate-sanctuary';
  const duration = heal ? 1.7 : kind === 'ultimate-strike' ? 1.05 : kind === 'ultimate-rabbits' ? 1.75 : 1.5;
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  const pole = (hz: number) => 1 - Math.exp(-2 * Math.PI * hz / sampleRate);
  const lowA = pole(170), midA = pole(950), airA = pole(5900), floorA = pole(580);
  let seed = 0x51a71 + ultimateSounds.indexOf(kind) * 7919, low = 0, mid = 0, air = 0, floor = 0, phase = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const noise = (seed >>> 0) / 0x80000000 - 1;
    low += lowA * (noise-low); mid += midA * (noise-mid);
    air += airA * (noise-air); floor += floorA * (noise-floor);
    const grain = air-floor, body = mid-low;
    const attack = (speed: number) => Math.min(1,t*speed);
    let sound = 0;
    if (kind === 'ultimate-strike') {
      // Air slicing past, a brief hard edge, then dying steel partials.
      const whoosh = Math.exp(-t*13)*attack(180);
      const steel = Math.sin(2*Math.PI*2370*t)*Math.exp(-t*27)+.6*Math.sin(2*Math.PI*3890*t)*Math.exp(-t*35)+.3*Math.sin(2*Math.PI*5270*t)*Math.exp(-t*45);
      const thud = Math.sin(2*Math.PI*(105*t+2.2*(1-Math.exp(-t*30))))*Math.exp(-t*15);
      sound = grain*2.5*whoosh + body*1.9*Math.exp(-t*9)+steel*.14*attack(1400)+thud*.3;
    } else if (kind === 'ultimate-magic') {
      // Irregular discharges with a dark, substantial midrange thunder body.
      for (const [offset,strength] of [[0,1],[.038,.65],[.117,.47],[.194,.36],[.307,.2]]) {
        const age=t-offset;
        if(age<0 || age>.16) continue;
        const p=2*Math.PI*(1450*age-3400*age*age);
        const env=Math.min(1,age*1300)*Math.exp(-age*38)*strength;
        sound += (grain*1.8+.22*Math.sin(p+5.5*Math.exp(-age*19)*Math.sin(p*1.413)))*env;
      }
      sound += (body*2.7+low*1.1)*Math.exp(-t*4.8)*attack(250);
      sound += .22*(Math.sin(2*Math.PI*230*t)+.45*Math.sin(2*Math.PI*460*t))*Math.exp(-t*10);
    } else if (kind === 'ultimate-stars') {
      // Glassy falling stars and a broad airy impact, no electrical crack train.
      for(const [offset,freq] of [[0,1046],[.065,1568],[.16,2093]]) {
        const age=t-offset;if(age<0) continue;
        sound += .19*Math.sin(2*Math.PI*freq*age+1.4*Math.exp(-age*15)*Math.sin(2*Math.PI*freq*2.37*age))*Math.min(1,age*650)*Math.exp(-age*6);
      }
      sound += grain*1.4*Math.exp(-t*10)*attack(600)+body*1.8*Math.exp(-t*7);
    } else if (kind === 'ultimate-rabbits') {
      // Sixteen short plasma discharges, a breath, then a heavy final blast.
      for(let bit=0;bit<4;bit++)for(const offset of rabbitShotTimes(bit)){
        const age=t-offset;if(age<0||age>.16)continue;
        const env=Math.min(1,age*1800)*Math.exp(-age*52);
        const pitch=180+bit*31;
        const zap=Math.sin(2*Math.PI*(pitch*age+3.1*(1-Math.exp(-age*55))));
        sound+=(body*2.5+grain*1.1+.32*zap)*env*(.72+bit*.055);
      }
      // Discrete, darker echoes after the final hit: delay, not a metallic chime.
      for(const [offset,strength] of [[RABBIT_VOLLEY.finale,1],...RABBIT_VOLLEY.echoes.map((delay,index)=>[RABBIT_VOLLEY.finale+delay,.38/(index+1)])]){
        const age=t-offset;if(age<0)continue;
        const env=(1-Math.exp(-age*650))*Math.exp(-age*15);
        const sub=Math.sin(2*Math.PI*(80*age+2.7*(1-Math.exp(-age*30))));
        sound+=(body*3.8+grain*.9+low*1.5+.55*sub)*env*strength;
      }
    } else if (kind === 'ultimate-mechanism') {
      for(const offset of [0,.065,.13]) {
        const age=t-offset;if(age<0)continue;
        const env=Math.min(1,age*1800)*Math.exp(-age*39);
        const p=2*Math.PI*(980*age-2400*age*age);
        sound+=(body*1.8+grain*.7+.24*Math.sin(p+3*Math.sin(p*2.71)))*env;
      }
      sound+=.14*Math.sin(2*Math.PI*610*t)*Math.exp(-t*13)*attack(900);
    } else if (heal) {
      const env=(1-Math.exp(-t*22))*Math.exp(-t*3.2);
      sound=(Math.sin(2*Math.PI*396*t)+.6*Math.sin(2*Math.PI*594*t)+.28*Math.sin(2*Math.PI*792*t))*.2*env;
      sound += grain*.26*env + .07*Math.sin(2*Math.PI*2376*t)*(1-Math.exp(-t*8))*Math.exp(-t*4);
    } else {
      const env=(1-Math.exp(-t*38))*Math.exp(-t*4.6);
      phase += 2*Math.PI*(330+110*Math.min(1,t*7))/sampleRate;
      sound=(Math.sin(phase)+.45*Math.sin(phase*2)+.2*Math.sin(phase*3))*.22*env+body*.7*env;
    }
    // Keep the transient intact; saturate the body mildly, rather than flattening all layers.
    samples[i] = Math.tanh(sound*.9);
  }
  {
    const dry=samples.slice(), wet=kind==='ultimate-rabbits' ? 0 : heal ? .32 : kind==='ultimate-strike' ? .1 : .2;
    for(const [delay,strength] of [[.071,1],[.139,.65],[.233,.4],[.379,.2]]) {
      const offset=Math.round(delay*sampleRate);
      for(let i=offset;i<samples.length;i++)samples[i]+=dry[i-offset]*wet*strength;
    }
  }
  let peak=0;
  for(const sample of samples)peak=Math.max(peak,Math.abs(sample));
  const gain=(heal ? .62 : .83)/Math.max(peak,.001);
  for(let i=0;i<samples.length;i++) {
    const edge=Math.min(1,i/(sampleRate*.001),(samples.length-1-i)/(sampleRate*.08));
    samples[i]*=gain*edge;
  }
  return samples;
}
