import { initialNovelProgress } from './domain/novels';
import { combatSignature } from './platform/combat-signatures';
import { ultimateVisualFor } from './platform/ultimate-choreography';
import { ultimateSoundFor } from './platform/ultimate-audio';
import { ULTIMATE_TIMING, UltimateClock } from './platform/ultimate-timing';
import { battleEventDuration } from './platform/battle-timing';
import { tr, localize, useLanguage } from './locales/i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Backpack, BookOpen, ChevronRight, Compass, Heart, Home, Moon, Settings, Shield, Sparkles, Users, Volume2, VolumeX } from 'lucide-react';
import { VisualNovel, FairyGuide, FairyGuideButton, Button, MotionSettingsProvider, Panel, StatBadge, Toast, TownNavigation, CurrencyEmblem, TitleScreen, GachaResults } from './ui';
import { content, validateContent, characterById } from './content';
import { createInitialSave, applyCommand } from './application/game';
import { assertSaveCompatibility, loadSave, persistSave, readBootMetadata } from './platform/save';
import { enableAudio, playSound, scheduleUltimateSound, setAudioVolume } from './platform/audio';
import { configureBgm, getBgmScene, unlockBgm, refreshBgm, disposeBgm } from './platform/bgm';
import { battleSounds, commandSounds } from './platform/sound-cues';
import { hpChanges } from './platform/combat-feedback';
import { animateEvent } from './platform/presentation';
import type { CharacterDef, GameCommand, GameSave, GachaResult } from './domain/types';
import { BagView, BattleView, CharacterDetail, CodexView, DungeonsView, GachaView, HomeView, PartyView, PreviewView, RecruitView, SettingsView, type Page } from './screens/GameViews';

const navigation = [
  { page: 'home', title: 'ホーム', icon: Home }, { page: 'dungeons', title: 'ダンジョン', icon: Compass },
  { page: 'party', title: 'パーティ', icon: Users }, { page: 'recruit', title: '仲間を迎える', icon: Heart },
  { page: 'bag', title: 'カバン・道具', icon: Backpack }, { page: 'gacha', title: '女神の祈願', icon: Sparkles },
  { page: 'codex', title: '記憶の図鑑', icon: BookOpen }, { page: 'settings', title: '設定', icon: Settings },
] as const;
const validPages = new Set<string>([...navigation.map(n => n.page), 'preview']);
function currentPage(): Page { const route = location.hash.slice(1).split('/')[0]; return validPages.has(route) ? route as Page : 'home'; }

export default function App() {
  const language = useLanguage();
  useEffect(() => { document.documentElement.lang = language; document.title = language === 'ja' ? 'STILLVEIL — 静謐の残響' : 'STILLVEIL — Echoes of Silence'; }, [language]);
  const [started, setStarted] = useState(false);
  const [entering, setEntering] = useState(false);
  const [save, setSave] = useState<GameSave | null>(null);
  const state = useRef<GameSave | null>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState<Page>(currentPage);
  const [fatal, setFatal] = useState('');
  const [toast, setToast] = useState<{ text: string; tone: 'error' | 'success' } | null>(null);
  const [summon, setSummon] = useState<{ results: GachaResult[]; introIndex: number } | null>(null);
  const [character, setCharacter] = useState<CharacterDef | null>(null);
  const init = useRef<Promise<GameSave> | null>(null);

  useEffect(() => {
    const onHash = () => setPage(currentPage());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    let active = true;
    if (!init.current) init.current = (async () => {
      const errors = validateContent(content);
      if (errors.length) throw new Error(`コンテンツを読み込めません。${errors[0]}`);
      const metadata = await readBootMetadata();
      if (metadata && (metadata.appVersion !== content.appVersion || metadata.contentVersion !== content.contentVersion || metadata.rulesVersion !== content.rulesVersion || metadata.schemaVersion !== content.schemaVersion)) throw new Error('このセーブは別のリリースで作成されています。本番の起動ページから対応する版を開いてください。セーブは保持しています。');
      const existing = await loadSave();
      if (existing) {
        assertSaveCompatibility(existing, content);
        if (!existing.novels) {
          const updated = { ...existing, novels: initialNovelProgress(content, false), revision: existing.revision + 1 };
          await persistSave(updated, existing.revision); return updated;
        }
        return existing;
      }
      const seed = crypto.getRandomValues(new Uint32Array(1))[0];
      const initial = createInitialSave(content, seed, { opening: true });
      await persistSave(initial);
      return initial;
    })();
    init.current.then(value => { if (active) { state.current = value; setSave(value); } }).catch(error => { if (active) setFatal(error instanceof Error ? error.message : '保存領域を利用できません。'); });
    return () => { active = false; };
  }, []);

  const navigate = useCallback((target: Page) => { location.hash = target; setPage(target); window.scrollTo({ top: 0 }); document.getElementById('root')?.scrollTo({ top: 0 }); }, []);
  const command = useCallback(async (action: GameCommand, expectedEventId?: string) => {
    const previous = state.current;
    if (!previous || busyRef.current) return false;
    if (expectedEventId && previous.battle?.events[previous.battle.cursor]?.id !== expectedEventId) return false;
    busyRef.current = true; setBusy(true);
    try {
      const next = applyCommand(previous, action, content);
      await persistSave(next, previous.revision);
      state.current = next; setSave(next);
      setAudioVolume(next.settings.seVolume);
      const cue = commandSounds[action.type];
      if (cue) playSound(cue);
      if (action.type === 'settings' && action.settings.seVolume !== undefined && action.settings.seVolume > 0) playSound('confirm');
      if (action.type === 'potion' && previous.battle && next.battle) window.dispatchEvent(new CustomEvent('game:hp', { detail: { id: `potion:${next.revision}`, changes: hpChanges(previous.battle.units, next.battle.units) } }));
      if (next.battle?.phase === 'reward' && previous.battle?.phase !== 'reward') playSound('victory');
      if (action.type === 'recruit') { setToast({ text: '新しい仲間との縁が結ばれました。', tone: 'success' }); }
      if (action.type === 'eventRecruit' || action.type === 'awaken' || action.type === 'goldRecruit') {
        const found = content.characters.find(char => next.ownedIds.includes(char.id) && !previous.ownedIds.includes(char.id));
        if (found) setCharacter(found);
      }
      if (action.type === 'draw' || action.type === 'drawXR') {
        const results = next.lastGachaResults ?? (next.lastGachaResult ? [next.lastGachaResult] : []);
        if (results.length) setSummon({ results, introIndex: previous.drawCount < 2 && next.drawCount >= 2 ? 1 - previous.drawCount : -1 });
      }
      if (action.type === 'buyPotion') setToast({ text: '回復薬を購入しました。', tone: 'success' });
      if (action.type === 'claim' || action.type === 'leaveFailure') {
        const previousDungeon = content.dungeons.find(dungeon => dungeon.id === previous.battle?.dungeonId);
        const returnHash = previousDungeon?.kind === 'trial' ? 'dungeons/trials' : previousDungeon?.eventId ? 'dungeons/boss-events' : previousDungeon?.kind === 'event' ? 'dungeons/events' : previousDungeon?.previousDungeonId && !previousDungeon.chapterId ? 'dungeons/memories' : '';
        navigate('dungeons');
        if (returnHash) location.hash = returnHash;
        // Deployed releases return to the stable launcher only at a safe town boundary.
        if (import.meta.env.MODE !== 'itch' && /^\/releases\/[^/]+\//.test(location.pathname)) location.assign(returnHash ? `/#${returnHash}` : '/');
      }
      return true;
    } catch (error) {
      const text = error instanceof Error ? error.message : '操作を保存できませんでした。';
      playSound('error');
      setToast({ text, tone: 'error' });
      if (/別のタブ|更新されています|競合/.test(text)) setFatal(`${text} 既存データを上書きせず停止しました。ページを再読み込みしてください。`);
      return false;
    } finally { busyRef.current = false; setBusy(false); }
  }, [navigate]);

  useEffect(() => {
    setAudioVolume(save?.settings.seVolume ?? 1);
    const onUI = (event: Event) => { unlockBgm(); const kind = (event as CustomEvent).detail?.kind; void enableAudio().then(() => playSound(kind === 'cancel' || kind === 'select' ? kind : 'confirm')); };
    window.addEventListener('game:ui', onUI);
    return () => window.removeEventListener('game:ui', onUI);
  }, [save?.settings.seVolume]);
  const bgmScene = getBgmScene(save?.battle, content.dungeons.find(dungeon => dungeon.id === save?.battle?.dungeonId), Boolean(save?.novels?.active));
  useEffect(() => {
    if (save && !fatal) configureBgm(bgmScene, save.settings.bgmVolume);
    else configureBgm('home', 0);
  }, [!!save, bgmScene, save?.settings.bgmVolume, fatal]);
  useEffect(() => {
    document.addEventListener('visibilitychange', refreshBgm);
    return () => { document.removeEventListener('visibilitychange', refreshBgm); disposeBgm(); };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = save?.settings.reducedMotion ? 'reduced' : 'full';
  }, [save?.settings.reducedMotion]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!entering) return;
    const timer = setTimeout(() => setStarted(true), 320);
    return () => clearTimeout(timer);
  }, [entering]);

  const battle = save?.battle;
  const event = battle?.phase === 'playing' ? battle.events[battle.cursor] : undefined;
  const soundedEvent = useRef<string | null>(null);
  const soundedImpact = useRef<string | null>(null);
  const heardImpact = useRef<string | null>(null);
  const ultimateClock = useRef(new UltimateClock());
  const activeUltimateSound = useRef<{ eventId: string; voice: NonNullable<ReturnType<typeof scheduleUltimateSound>> } | undefined>(undefined);
  useEffect(() => () => activeUltimateSound.current?.voice.cancel(), []);
  useEffect(() => {
    if (!save || save.novels?.active || !started || battle?.phase !== 'playing') return;
    // Old saves can be paused at the end of a Wave with no remaining event.
    if (!event) { void command({ type: 'replay' }); return; }
    if (event.ultimate) ultimateClock.current.sync(event.id, save.settings.speed, performance.now());
    if (soundedEvent.current !== event.id) {
      soundedEvent.current = event.id;
      const cue = event.ultimate ? 'ultimate' : battleSounds[event.kind];
      const skill = event.ultimate ? undefined : content.skills.find(skill => skill.id === event.skillId)?.template;
      playSound(cue, event.rarity, skill, event.ultimate ? undefined : event.actorId, combatSignature(cue, skill));
    }
    const cleanup = event.ultimate ? () => {} : animateEvent(event, save.settings.reducedMotion);
    let cleanupImpact = () => {};
    const actor = event.ultimate ? battle.units.find(unit => unit.uid === event.actorId) : undefined;
    const impactCue = actor ? ultimateSoundFor(ultimateVisualFor(characterById(actor.characterId))) : 'ultimate-strike';
    let scheduled = activeUltimateSound.current?.eventId === event.id ? activeUltimateSound.current.voice : undefined;
    const reserveSound = () => {
      if (!event.ultimate || heardImpact.current === event.id || document.hidden) return;
      const remaining = ultimateClock.current.delay(ULTIMATE_TIMING.impact, performance.now());
      // Returning from a hidden tab never plays past impacts in a burst.
      if (remaining <= 0) { heardImpact.current = event.id; return; }
      scheduled = scheduleUltimateSound(impactCue, remaining);
      activeUltimateSound.current = scheduled ? { eventId: event.id, voice: scheduled } : undefined;
    };
    const visibility = () => {
      if (document.hidden) { if (scheduled?.hasStarted()) heardImpact.current = event.id; scheduled?.cancel(); scheduled = undefined; activeUltimateSound.current = undefined; }
      else reserveSound();
    };
    reserveSound();
    if (event.ultimate) document.addEventListener('visibilitychange', visibility);
    const impactTimer = event.ultimate ? setTimeout(() => {
      if (soundedImpact.current === event.id) return;
      soundedImpact.current = event.id;
      if (!scheduled && heardImpact.current !== event.id && !document.hidden) playSound(impactCue);
      heardImpact.current = event.id;
      cleanupImpact = animateEvent(event, save.settings.reducedMotion);
    }, ultimateClock.current.delay(ULTIMATE_TIMING.impact, performance.now())) : undefined;
    const duration = event.ultimate ? ultimateClock.current.delay(ULTIMATE_TIMING.end, performance.now()) : battleEventDuration(event, save.settings.speed);
    let timer: ReturnType<typeof setTimeout>;
    const complete = () => {
      if (busyRef.current) { timer = setTimeout(complete, 100); return; }
      void command({ type: 'replay' }, event.id);
    };
    timer = setTimeout(complete, duration);
    return () => {
      clearTimeout(timer); clearTimeout(impactTimer); cleanup(); cleanupImpact();
      document.removeEventListener('visibilitychange', visibility);
      if (scheduled?.hasStarted()) heardImpact.current = event.id;
      const current = state.current?.battle;
      // Speed/settings changes keep an already sounding tail; NEXT/event changes stop it.
      const changed = current?.events[current.cursor]?.id !== event.id;
      scheduled?.cancel(changed);
      if (changed || !scheduled?.hasStarted()) activeUltimateSound.current = undefined;
    };
  }, [started, event?.id, save?.settings.speed, save?.settings.reducedMotion, command]);

  if (fatal) return <div className="app-loading"><Panel><Shield size={30} /><h1>{tr("データを守るため、停止しました。")}</h1><p role="alert">{localize(fatal)}</p><p className="subtle">{tr("セーブの初期化や上書きは行っていません。")}</p><Button variant="primary" onClick={() => location.reload()}>{tr("再読み込み")}</Button></Panel></div>;
  if (!save) return <div className="app-loading" role="status"><Moon size={38} strokeWidth={1} /><p>{tr("記憶をたどっています…")}</p></div>;
  if (!started) return <TitleScreen leaving={entering} returning={!!save.battle} onStart={() => {
    if (entering) return;
    configureBgm(bgmScene, save.settings.bgmVolume);
    unlockBgm();
    void enableAudio().then(() => playSound('confirm'));
    setEntering(true);
  }} />;
  const novel = content.novels?.find(scene => scene.id === save.novels?.active?.sceneId);
  const props = { save, busy, artworkSuspended: !!character || !!summon || !!novel, command, navigate, inspect: setCharacter };
  const view = save.battle ? <BattleView {...props} /> : page === 'dungeons' ? <DungeonsView {...props} /> : page === 'party' ? <PartyView {...props} /> : page === 'bag' ? <BagView {...props} /> : page === 'recruit' ? <RecruitView {...props} /> : page === 'gacha' ? <GachaView {...props} /> : page === 'codex' ? <CodexView {...props} /> : page === 'settings' ? <SettingsView {...props} /> : page === 'preview' ? <PreviewView {...props} /> : <HomeView {...props} />;
  return <MotionSettingsProvider reducedMotion={save.settings.reducedMotion} suspended={!!character || !!summon || !!event?.ultimate || !!novel}><div inert={Boolean(novel)} className={`app-shell${save.battle ? ' is-exploring' : page === 'home' ? ' is-menu' : ''}`}><aside className="sidebar"><div className="brand"><Moon size={29} strokeWidth={1} /><div><strong>STILLVEIL</strong><span>{tr("静謐の残響")}</span></div></div><span className="sidebar-label">THE JOURNEY</span><nav aria-label={tr("メインメニュー")}>{localize(navigation.map(item => <Button key={item.page} variant={page === item.page && !save.battle ? 'primary' : 'secondary'} className="nav-item" disabled={!!save.battle} onClick={() => navigate(item.page)}><item.icon size={18} strokeWidth={1.4} /><span>{localize(item.title)}</span>{localize(page === item.page && !save.battle && <ChevronRight size={13} />)}</Button>))}</nav><div className="sidebar-bottom"><Shield size={16} /><p>{tr("自動保存")}</p></div></aside><div className="app-body"><header className="topbar"><div className="topbar-title"><Moon size={19} /><span>STILLVEIL</span><small>{tr("静謐の残響")}</small></div><div className="currencies"><FairyGuideButton compact /><StatBadge icon={<CurrencyEmblem kind="gold" size={16} />} value={save.gold.toLocaleString()} label={tr("G")} /><StatBadge icon={<CurrencyEmblem kind="stone" size={16} />} value={save.stones} label={tr("石")} /><Button sound={false} variant="icon" title={tr(save.settings.seVolume === 0 ? '効果音を有効にする' : '効果音をミュート')} disabled={busy} onClick={() => command({ type: 'settings', settings: { seVolume: save.settings.seVolume === 0 ? 1 : 0 } })}>{localize(save.settings.seVolume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />)}</Button></div></header><main className="main-content" id="main-content">{localize(view)}</main></div>{localize((save.battle || page !== 'home') && <TownNavigation active={page} onNavigate={navigate} disabled={!!save.battle} />)}{localize(summon && <GachaResults key={`${save.drawCount}-${save.xrDrawCount ?? 0}`} results={summon.results} introIndex={summon.introIndex} reducedMotion={save.settings.reducedMotion} onClose={() => setSummon(null)} onReveal={ssr => playSound(ssr ? 'victory' : 'recruit')} />)}{localize(character && <CharacterDetail onInspect={setCharacter} save={save} character={character} reducedMotion={save.settings.reducedMotion} onClose={() => setCharacter(null)} />)}<FairyGuide save={save} page={page} suspended={!!character || !!summon || !!novel} /><Toast present={!!toast} tone={toast?.tone} onClose={() => setToast(null)}>{localize(toast?.text)}</Toast></div>{novel && save.novels?.active && <VisualNovel key={novel.id} scene={novel} pageIndex={save.novels.active.page} reducedMotion={save.settings.reducedMotion} busy={busy} onNext={() => command({ type: 'novelNext' })} onBack={() => command({ type: 'novelBack' })} onFinish={() => command({ type: 'novelFinish' })} />}</MotionSettingsProvider>;
}
