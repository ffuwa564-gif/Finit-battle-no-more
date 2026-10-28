import type { Battle, DungeonDef } from '../domain/types';

/** Downloaded game BGM; ownership and source links stay separate from project art. */
export const bgmTracks = {
  home: { title: '悲しみの曖昧な対象', file: 'kanashiminoaimainataishou.mp3', source: 'https://amachamusic.chagasi.com/music_kanashiminoaimainataishou.html' },
  novel: { title: '水に沈むオルガン', file: 'mizunishizumuorgan.mp3', source: 'https://amachamusic.chagasi.com/music_mizunishizumuorgan.html' },
  battle: { title: '渦巻き', file: 'uzumaki.mp3', source: 'https://amachamusic.chagasi.com/music_uzumaki.html' },
  boss: { title: '騎兵戦', file: 'kiheisen.mp3', source: 'https://amachamusic.chagasi.com/music_kiheisen.html' },
  japaneseBoss: { title: '打ち上げ花火', file: 'uchiagehanabi.mp3', source: 'https://amachamusic.chagasi.com/music_uchiagehanabi.html' },
  clockBoss: { title: 'チェス', file: 'chess.mp3', source: 'https://amachamusic.chagasi.com/music_chess.html' },
  clear: { title: '楽しい冒険', file: 'tanoshiibouken.mp3', source: 'https://amachamusic.chagasi.com/music_tanoshiibouken.html' },
} as const;
export type BgmScene = keyof typeof bgmTracks;

export function getBgmScene(battle: Pick<Battle, 'phase' | 'initialUnits'> | null | undefined, dungeon?: Pick<DungeonDef, 'bossMusic'>, novelActive = false): BgmScene {
  if (novelActive) return 'novel';
  if (!battle || battle.phase === 'failed') return 'home';
  if (battle.phase === 'reward') return 'clear';
  // Use the wave's initial units: killing the boss must not restart normal BGM
  // while its final attacks, dialogue and drops are still being presented.
  if (!battle.initialUnits.some(unit => unit.side === 'enemy' && unit.boss)) return 'battle';
  if (dungeon?.bossMusic === 'clock') return 'clockBoss';
  return dungeon?.bossMusic === 'japanese' ? 'japaneseBoss' : 'boss';
}
let player: HTMLAudioElement | undefined;
let scene: BgmScene = 'home';
let volume = 0.4;
let unlocked = false;

function syncBgm(): void {
  if (!unlocked) return;
  if (document.hidden || volume === 0) { player?.pause(); return; }
  if (!player) {
    player = document.createElement('audio');
    player.hidden = true;
    player.loop = true;
    player.preload = 'none';
    player.dataset.bgm = 'true';
    document.body.append(player);
  }
  if (player.dataset.scene !== scene) {
    player.pause();
    player.src = `${import.meta.env.BASE_URL}audio/${bgmTracks[scene].file}`;
    player.dataset.scene = scene;
    player.load();
  }
  player.volume = volume;
  // play() is called directly inside the gesture; browser policy/network failures
  // remain retryable on the next interaction and never block saved progression.
  if (player.paused) void player.play().catch(() => undefined);
}

export function configureBgm(nextScene: BgmScene, nextVolume: number): void {
  scene = nextScene;
  volume = Number.isFinite(nextVolume) ? Math.max(0, Math.min(1, nextVolume)) : 0;
  syncBgm();
}
export function unlockBgm(): void { unlocked = true; syncBgm(); }
export function refreshBgm(): void { syncBgm(); }
export function disposeBgm(): void {
  player?.pause();
  if (player) { player.removeAttribute('src'); player.load(); player.remove(); }
  player = undefined;
  unlocked = false;
}
