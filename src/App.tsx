import { useCallback, useEffect, useRef, useState } from 'react';
import { Backpack, BookOpen, ChevronRight, Coins, Compass, Gem, Heart, Home, Moon, Settings, Shield, Sparkles, Users, Volume2, VolumeX } from 'lucide-react';
import { Button, Panel, StatBadge, Toast, TownNavigation } from './ui';
import { content, validateContent } from './content';
import { createInitialSave, applyCommand } from './application/game';
import { assertSaveCompatibility, loadSave, persistSave, readBootMetadata } from './platform/save';
import { enableAudio, playSound, setAudioVolume } from './platform/audio';
import { animateEvent } from './platform/presentation';
import type { CharacterDef, GameCommand, GameSave } from './domain/types';
import { BagView, BattleView, CharacterDetail, CodexView, DungeonsView, GachaView, HomeView, PartyView, PreviewView, RecruitView, SettingsView, type Page } from './screens/GameViews';

const navigation = [
  { page: 'home', title: 'ホーム', icon: Home }, { page: 'dungeons', title: 'ダンジョン', icon: Compass },
  { page: 'party', title: 'パーティ', icon: Users }, { page: 'recruit', title: '仲間を迎える', icon: Heart },
  { page: 'bag', title: 'カバン・道具', icon: Backpack }, { page: 'gacha', title: '星の祈願', icon: Sparkles },
  { page: 'codex', title: '記憶の図鑑', icon: BookOpen }, { page: 'settings', title: '設定', icon: Settings },
] as const;
const validPages = new Set<string>([...navigation.map(n => n.page), 'preview']);
function currentPage(): Page { const route = location.hash.slice(1).split('/')[0]; return validPages.has(route) ? route as Page : 'home'; }

export default function App() {
  const [save, setSave] = useState<GameSave | null>(null);
  const state = useRef<GameSave | null>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState<Page>(currentPage);
  const [fatal, setFatal] = useState('');
  const [toast, setToast] = useState<{ text: string; tone: 'error' | 'success' } | null>(null);
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
      if (existing) { assertSaveCompatibility(existing, content); return existing; }
      const seed = crypto.getRandomValues(new Uint32Array(1))[0];
      const initial = createInitialSave(content, seed);
      await persistSave(initial);
      return initial;
    })();
    init.current.then(value => { if (active) { state.current = value; setSave(value); } }).catch(error => { if (active) setFatal(error instanceof Error ? error.message : '保存領域を利用できません。'); });
    return () => { active = false; };
  }, []);

  const navigate = useCallback((target: Page) => { location.hash = target; setPage(target); window.scrollTo({ top: 0 }); }, []);
  const command = useCallback(async (action: GameCommand, expectedEventId?: string) => {
    const previous = state.current;
    if (!previous || busyRef.current) return false;
    if (expectedEventId && previous.battle?.events[previous.battle.cursor]?.id !== expectedEventId) return false;
    busyRef.current = true; setBusy(true);
    try {
      const next = applyCommand(previous, action, content);
      await persistSave(next, previous.revision);
      state.current = next; setSave(next);
      if (action.type === 'recruit') { playSound('recruit'); setToast({ text: '新しい仲間との縁が結ばれました。', tone: 'success' }); }
      if (action.type === 'draw') {
        playSound('gacha');
        const acquired = next.ownedIds.find(id => !previous.ownedIds.includes(id));
        const found = content.characters.find(ch => ch.id === acquired);
        if (found) { setCharacter(found); setToast({ text: `${found.rarity} ${found.name} が仲間になりました。`, tone: 'success' }); }
      }
      if (action.type === 'buyPotion') setToast({ text: '回復薬を購入しました。', tone: 'success' });
      if (action.type === 'claim' || action.type === 'leaveFailure') {
        navigate('dungeons');
        // Deployed releases return to the stable launcher only at a safe town boundary.
        if (/^\/releases\/[^/]+\//.test(location.pathname)) location.assign('/');
      }
      return true;
    } catch (error) {
      const text = error instanceof Error ? error.message : '操作を保存できませんでした。';
      setToast({ text, tone: 'error' });
      if (/別のタブ|更新されています|競合/.test(text)) setFatal(`${text} 既存データを上書きせず停止しました。ページを再読み込みしてください。`);
      return false;
    } finally { busyRef.current = false; setBusy(false); }
  }, [navigate]);

  useEffect(() => {
    setAudioVolume(save?.settings.seVolume ?? 0.5);
    const onUI = () => { void enableAudio().then(() => playSound('ui')); };
    window.addEventListener('game:ui', onUI);
    return () => window.removeEventListener('game:ui', onUI);
  }, [save?.settings.seVolume]);
  useEffect(() => {
    document.documentElement.dataset.motion = save?.settings.reducedMotion ? 'reduced' : 'full';
  }, [save?.settings.reducedMotion]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const battle = save?.battle;
  const event = battle?.phase === 'playing' ? battle.events[battle.cursor] : undefined;
  useEffect(() => {
    if (!event || !save) return;
    playSound(event.kind, event.rarity);
    const cleanup = animateEvent(event, save.settings.reducedMotion);
    const duration = event.kind === 'dialogue' ? 2400 : event.kind === 'drop' ? 1050 : event.kind === 'wave' ? 800 : 650;
    let timer: ReturnType<typeof setTimeout>;
    const complete = () => {
      if (busyRef.current) { timer = setTimeout(complete, 100); return; }
      void command({ type: 'replay' }, event.id);
    };
    timer = setTimeout(complete, duration / save.settings.speed);
    return () => { clearTimeout(timer); cleanup(); };
  }, [event?.id, save?.settings.speed, save?.settings.reducedMotion, command]);

  if (fatal) return <div className="app-loading"><Panel><Shield size={30} /><h1>データを守るため、停止しました。</h1><p role="alert">{fatal}</p><p className="subtle">セーブの初期化や上書きは行っていません。</p><Button variant="primary" onClick={() => location.reload()}>再読み込み</Button></Panel></div>;
  if (!save) return <div className="app-loading" role="status"><Moon size={38} strokeWidth={1} /><p>記憶をたどっています…</p></div>;
  const props = { save, busy, command, navigate, inspect: setCharacter };
  const view = save.battle ? <BattleView {...props} /> : page === 'dungeons' ? <DungeonsView {...props} /> : page === 'party' ? <PartyView {...props} /> : page === 'bag' ? <BagView {...props} /> : page === 'recruit' ? <RecruitView {...props} /> : page === 'gacha' ? <GachaView {...props} /> : page === 'codex' ? <CodexView {...props} /> : page === 'settings' ? <SettingsView {...props} /> : page === 'preview' ? <PreviewView {...props} /> : <HomeView {...props} />;
  return <div className={`app-shell${save.battle ? ' is-exploring' : page === 'home' ? ' is-menu' : ''}`}><aside className="sidebar"><div className="brand"><Moon size={29} strokeWidth={1} /><div><strong>STILLVEIL</strong><span>静謐の残響</span></div></div><span className="sidebar-label">THE JOURNEY</span><nav aria-label="メインメニュー">{navigation.map(item => <Button key={item.page} variant={page === item.page && !save.battle ? 'primary' : 'secondary'} className="nav-item" disabled={!!save.battle} onClick={() => navigate(item.page)}><item.icon size={18} strokeWidth={1.4} /><span>{item.title}</span>{page === item.page && !save.battle && <ChevronRight size={13} />}</Button>)}</nav><div className="sidebar-bottom"><Shield size={16} /><p>自動保存</p></div></aside><div className="app-body"><header className="topbar"><div className="topbar-title"><Moon size={19} /><span>STILLVEIL</span><small>静謐の残響</small></div><div className="currencies"><StatBadge icon={<Coins size={16} />} value={save.gold.toLocaleString()} label="G" /><StatBadge icon={<Gem size={16} />} value={save.stones} label="石" /><Button variant="icon" title={save.settings.seVolume === 0 ? '効果音を有効にする' : '効果音をミュート'} disabled={busy} onClick={() => command({ type: 'settings', settings: { seVolume: save.settings.seVolume === 0 ? 0.5 : 0 } })}>{save.settings.seVolume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}</Button></div></header><main className="main-content" id="main-content">{view}</main></div>{(save.battle || page !== 'home') && <TownNavigation active={page} onNavigate={navigate} disabled={!!save.battle} />}{character && <CharacterDetail character={character} onClose={() => setCharacter(null)} />}{toast && <Toast tone={toast.tone} onClose={() => setToast(null)}>{toast.text}</Toast>}</div>;
}
