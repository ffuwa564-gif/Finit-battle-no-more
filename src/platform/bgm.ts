import {PcmMusic} from './pcm-music';
import { acquireGameAudioContext, releaseGameAudioContext,gameAudioOutput } from './audio-context';
import { resumeAudioContext } from './audio-resume';
import type { Battle, DungeonDef } from '../domain/types';

/** Downloaded game BGM; ownership and source links stay separate from project art. */
export const bgmTracks = {
  home: { title: '悲しみの曖昧な対象', file: 'kanashiminoaimainataishou.mp3', source: 'https://amachamusic.chagasi.com/music_kanashiminoaimainataishou.html' },
  novel: { title: '水に沈むオルガン', file: 'mizunishizumuorgan.mp3', source: 'https://amachamusic.chagasi.com/music_mizunishizumuorgan.html' },
  battle: { title: '渦巻き', file: 'uzumaki.mp3', source: 'https://amachamusic.chagasi.com/music_uzumaki.html' },
  normalBattle: { title: 'フィヨルドの澄んだ風', file: 'fjordnosundakaze.mp3', source: 'https://amachamusic.chagasi.com/music_fjordnosundakaze.html' },
  boss: { title: '騎兵戦', file: 'kiheisen.mp3', source: 'https://amachamusic.chagasi.com/music_kiheisen.html' },
  japaneseBoss: { title: '打ち上げ花火', file: 'uchiagehanabi.mp3', source: 'https://amachamusic.chagasi.com/music_uchiagehanabi.html' },
  clockBoss: { title: 'チェス', file: 'chess.mp3', source: 'https://amachamusic.chagasi.com/music_chess.html' },
  clear: { title: '楽しい冒険', file: 'tanoshiibouken.mp3', source: 'https://amachamusic.chagasi.com/music_tanoshiibouken.html' },
} as const;
export type BgmScene = keyof typeof bgmTracks;

export function getBgmScene(battle: Pick<Battle, 'phase' | 'initialUnits'> | null | undefined, dungeon?: Pick<DungeonDef, 'bossMusic' | 'kind'>, novelActive = false): BgmScene {
  if (novelActive) return 'novel';
  if (!battle || battle.phase === 'failed') return 'home';
  if (battle.phase === 'reward') return 'clear';
  // Use the wave's initial units: killing the boss must not restart normal BGM
  // while its final attacks, dialogue and drops are still being presented.
  if (!battle.initialUnits.some(unit => unit.side === 'enemy' && unit.boss)) {
    // Legacy campaign stages omit kind; they are normal dungeons too.
    return dungeon && (dungeon.kind ?? 'normal') === 'normal' ? 'normalBattle' : 'battle';
  }
  if (dungeon?.bossMusic === 'clock') return 'clockBoss';
  return dungeon?.bossMusic === 'japanese' ? 'japaneseBoss' : 'boss';
}
let player: HTMLAudioElement | undefined;
let scene: BgmScene = 'home';
let volume = 0.5;
// Global mix trim: settings remain 0–100%, independently of sound effects.
const BGM_MASTER_GAIN = 0.5;
let unlocked = false;
const ducks=new Map<symbol,number>();
let volumeContext: AudioContext | undefined;
let volumeGain: GainNode | undefined;
let mediaSource: MediaElementAudioSourceNode | undefined;
let volumeTarget: number | undefined;
let pcmMusic:PcmMusic|undefined;
let pcmRestore:{url:string;position:number}|undefined;
let failedPcmScene:BgmScene|undefined;
let restorePosition: { scene: string; time: number } | undefined;
function keepOriginalPitch(): void {
  if (!player) return;
  if (player.defaultPlaybackRate !== 1) player.defaultPlaybackRate = 1;
  if (player.playbackRate !== 1) player.playbackRate = 1;
  if (!player.preservesPitch) player.preservesPitch = true;
}
function restartNativeLoop(): void {
  if (!player || !unlocked || document.hidden || volume === 0) return;
  // Keep the already-unlocked element. WebKit's automatic media-source loop
  // can leave its resampler at EOF while the shared synth clock keeps running.
  keepOriginalPitch(); player.currentTime = 0;
  void player.play().catch(() => undefined);
}
function musicContextChanged(): void {
  if (unlocked && !document.hidden && volume > 0) syncBgm();
}
function removePlayer(): void {
  if (!player) return;
  player.removeEventListener('ratechange', keepOriginalPitch);
  player.removeEventListener('ended', restartNativeLoop);
  player.pause(); player.removeAttribute('src'); player.load(); player.remove();
  player = undefined;
}
function renewPlayer(): void {
  if (player) { restorePosition = { scene: player.dataset.scene ?? scene, time: player.currentTime }; removePlayer(); }
  mediaSource?.disconnect(); volumeGain?.disconnect();
  mediaSource = undefined; volumeGain = undefined; volumeTarget = undefined;
}
// iOS ignores HTMLMediaElement.volume, including installed web apps. Route its
// music through a native gain instead; desktop retains the existing media path.
function needsNativeVolume(): boolean {
  return typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function unlockVolumeContext(): void {
  if (!needsNativeVolume() || typeof window === 'undefined') return;
  try {
    const context = acquireGameAudioContext('music');
    if (context !== volumeContext) {
      // A media element may only be connected to one MediaElementSource, even
      // after its context closes. Replace it, retaining the current track/time.
      if(pcmMusic){pcmRestore=pcmMusic.snapshot();pcmMusic.dispose();pcmMusic=undefined;}
      if (volumeContext) renewPlayer();
      volumeContext?.removeEventListener('statechange', musicContextChanged);
      mediaSource?.disconnect(); volumeGain?.disconnect();
      mediaSource = undefined; volumeGain = undefined; volumeTarget = undefined;
      volumeContext = context;
      context.addEventListener('statechange', musicContextChanged);
    }
    if (context.state !== 'running') void resumeAudioContext(context);
  } catch { /* Media playback remains available if Web Audio is unavailable. */ }
}
function connectNativeVolume(): void {
  if (!player || !volumeContext || mediaSource) return;
  try {
    const gain = volumeContext.createGain();
    gain.gain.value = BGM_MASTER_GAIN * volume * Math.min(1, ...ducks.values());
    gain.connect(gameAudioOutput(volumeContext));
    mediaSource = volumeContext.createMediaElementSource(player);
    mediaSource.connect(gain);
    volumeGain = gain;
    volumeTarget = gain.gain.value;
    player.volume = 1;
  } catch { /* Fall back to the media element on unsupported browsers. */ }
}
function applyVolume():void {
  const level=BGM_MASTER_GAIN*volume*Math.min(1,...ducks.values());
  if(pcmMusic){pcmMusic.setVolume(level);return;}
  if (volumeGain) {
    if(volumeTarget===level)return;
    const param=volumeGain.gain,now=volumeContext!.currentTime;
    if(typeof param.setTargetAtTime==='function'){
      if(typeof param.cancelAndHoldAtTime==='function')param.cancelAndHoldAtTime(now);
      else {param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);}
      param.setTargetAtTime(level,now,.012);
    }else param.setValueAtTime(level,now);
    volumeTarget=level;
  }
  else if(player) player.volume=level;
}
/** Temporary mix gain never changes the player's saved music setting or track position. */
export function createBgmDucker(){
  const key=Symbol();ducks.set(key,1);
  return {
    set(gain:number){if(!ducks.has(key))return;ducks.set(key,Number.isFinite(gain)?Math.max(0,Math.min(1,gain)):1);applyVolume();},
    dispose(){ducks.delete(key);applyVolume();},
  };
}

function syncBgm(): void {
  if (!unlocked) return;
  applyVolume();
  if (document.hidden || volume === 0) { player?.pause();pcmMusic?.pause(); return; }
  unlockVolumeContext();
  if(needsNativeVolume()&&volumeContext&&typeof volumeContext.decodeAudioData==='function'&&typeof volumeContext.createBufferSource==='function'&&failedPcmScene!==scene){
    const level=BGM_MASTER_GAIN*volume*Math.min(1,...ducks.values());
    if(!pcmMusic){removePlayer();mediaSource?.disconnect();volumeGain?.disconnect();mediaSource=undefined;volumeGain=undefined;volumeTarget=undefined;pcmMusic=new PcmMusic(volumeContext,level,(url)=>{failedPcmScene=url.endsWith(bgmTracks[scene].file)?scene:undefined;pcmMusic?.dispose();pcmMusic=undefined;syncBgm();},pcmRestore);pcmRestore=undefined;}
    pcmMusic.sync(`${import.meta.env.BASE_URL}audio/${bgmTracks[scene].file}`,level,true);
    return;
  }
  if (!player) {
    player = document.createElement('audio');
    player.hidden = true;
    player.loop = !needsNativeVolume();
    if (!player.loop) player.addEventListener('ended', restartNativeLoop);
    player.preload = 'auto';
    player.dataset.bgm = 'true';
    player.addEventListener('ratechange', keepOriginalPitch);
    const element = player;
    player.addEventListener('loadedmetadata', () => {
      if (element !== player) return;
      const saved = restorePosition;
      if (saved && player && player.dataset.scene === saved.scene && Number.isFinite(saved.time)) {
        player.currentTime = Math.max(0, Math.min(saved.time, Number.isFinite(player.duration) ? Math.max(0, player.duration - .01) : saved.time));
      }
      restorePosition = undefined;
    });
    document.body.append(player);
  }
  keepOriginalPitch();
  connectNativeVolume();
  if (player.dataset.scene !== scene) {
    player.pause();
    if (restorePosition?.scene !== scene) restorePosition = undefined;
    player.src = `${import.meta.env.BASE_URL}audio/${bgmTracks[scene].file}`;
    player.dataset.scene = scene;
    player.load();
  }
  applyVolume();
  // play() is called directly inside the gesture; browser policy/network failures
  // remain retryable on the next interaction and never block saved progression.
  if (player.paused) void player.play().catch(() => undefined);
}

export function configureBgm(nextScene: BgmScene, nextVolume: number): void {
  scene = nextScene;
  setBgmVolume(nextVolume);
}
/** Apply inside the settings gesture so Safari can resume a muted media element. */
export function setBgmVolume(nextVolume: number): void {
  volume = Number.isFinite(nextVolume) ? Math.max(0, Math.min(1, nextVolume)) : 0;
  syncBgm();
}
export function unlockBgm(): void { unlocked = true; unlockVolumeContext(); syncBgm(); }
export function refreshBgm(): void { syncBgm(); }
export function getBgmPlaybackState(){return {backend:pcmMusic?'pcm':player?'media':'idle',scene,position:pcmMusic?.position??player?.currentTime??0,playing:pcmMusic?.playing??(!!player&&!player.paused),sampleRate:volumeContext?.sampleRate};}
export function disposeBgm(): void {
  pcmMusic?.dispose();pcmMusic=undefined;pcmRestore=undefined;failedPcmScene=undefined;
  removePlayer();
  restorePosition = undefined;
  mediaSource?.disconnect(); volumeGain?.disconnect();
  mediaSource = undefined; volumeGain = undefined; volumeTarget = undefined;
  if (volumeContext) { volumeContext.removeEventListener('statechange', musicContextChanged); releaseGameAudioContext('music', volumeContext); }
  volumeContext = undefined;
  ducks.clear();
  unlocked = false;
}
