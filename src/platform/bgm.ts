/** Downloaded game BGM; ownership and source links stay separate from project art. */
export const bgmTracks = {
  home: { title: '悲しみの曖昧な対象', file: 'kanashiminoaimainataishou.mp3', source: 'https://amachamusic.chagasi.com/music_kanashiminoaimainataishou.html' },
  battle: { title: '渦巻き', file: 'uzumaki.mp3', source: 'https://amachamusic.chagasi.com/music_uzumaki.html' },
} as const;
type BgmScene = keyof typeof bgmTracks;
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
