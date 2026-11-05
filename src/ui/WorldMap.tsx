import { useMapCamera } from './useMapCamera';
import { WorldMapIndex } from './WorldMapIndex';
import { MAP_WIDTH as W, MAP_HEIGHT as H, MAP_MAX_ZOOM, mapBase, boundMapCamera } from '../domain/map-camera';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Castle, Check, ChevronRight, Compass, Crown, Crosshair, Flag, Footprints, Hexagon, LockKeyhole, MapPin, MessageCircle, Minus, Mountain, Plus, Sparkles, Swords, Trees, X } from 'lucide-react';
import type { Content, GameSave, GameCommand } from '../domain/types';
import { WORLD_START, parseWorldTravel, routePosition, travelSeconds, worldLocations, worldRegions, worldChapterPaths, type MapPosition, type WorldTravelState } from '../domain/world-map';
import { dungeonDifficulty } from '../domain/engine';
import { dungeonLock } from '../domain/events';
import { assetPath } from '../content';
import { tr } from '../locales/i18n';
import { Button, CurrencyEmblem, Modal, NovelLibrary, PortraitArt } from './index';
import { GameImage } from './GameMedia';
import './world-map.css';
const storageKey = 'stillveil-world-travel-v1';
const icons = { cathedral: Castle, cave: Mountain, tower: Crown, forest: Trees, story: MessageCircle, event: Sparkles, trial: Swords };
function readTravel(): WorldTravelState { try { return parseWorldTravel(JSON.parse(localStorage.getItem(storageKey) ?? 'null')); } catch { return { position: WORLD_START }; } }
export function WorldMap({ content, save, busy, command, onSelect, onOpen, onBack, onPolish }: { content: Content; save: GameSave; busy: boolean; command: (command: GameCommand) => Promise<boolean>; onSelect: (id: string) => void; onOpen: (mode: string) => void; onBack: () => void; onPolish: () => void }) {
  const places = useMemo(() => worldLocations(content, save.completedDungeonIds), [content, save.completedDungeonIds]);
  const openingId=content.novels?.find(s=>s.trigger.kind==='opening')?.id;
  const unreadEncounter = places.find(p => p.encounter && !save.novels?.seen.includes(p.sceneId!)) ?? places.find(p => p.sceneId && p.sceneId!==openingId && !save.novels?.seen.includes(p.sceneId));
  const lastSeenScene = [...(save.novels?.seen ?? [])].reverse().map(id => content.novels?.find(s => s.id === id)).find(s => s?.mapEncounter);
  const lead = lastSeenScene?.mapEncounter && !save.completedDungeonIds.includes(lastSeenScene.mapEncounter.leadDungeonId) ? places.find(p => p.dungeonId === lastSeenScene.mapEncounter!.leadDungeonId) : undefined;
  const goal = lead ?? unreadEncounter;
  const [travel, setTravel] = useState(readTravel);
  const [now, setNow] = useState(Date.now);
  const [selectedId, setSelectedId] = useState(() => readTravel().journey?.destinationId ?? lead?.id ?? unreadEncounter?.id ?? places.find(p => p.dungeonId && !dungeonLock(content.dungeons.find(d => d.id === p.dungeonId)!, save, content) && !save.completedDungeonIds.includes(p.dungeonId))?.id ?? places[0]?.id);
  const [nearby, setNearby] = useState(false);
  const [story, setStory] = useState(false);
  const [size, setSize] = useState({ width: 390, height: 650 });
  const seenKey = (save.novels?.seen ?? []).join('|');
  const previousSeen = useRef(seenKey);
  const surface = useRef<HTMLDivElement>(null);
  const {camera,setCamera,zoom,handlers}=useMapCamera(surface,size);
  const atlasRegions=useMemo(()=>worldRegions(content),[content]);
  const chapterPaths=useMemo(()=>worldChapterPaths(content,places),[content,places]);
  const place = places.find(p => p.id === selectedId) ?? places[0]!;
  const storyteller = content.characters.find(c => c.id === 'elaine');
  const stage = content.dungeons.find(d => d.id === place?.dungeonId);
  const lock = stage ? dungeonLock(stage, save, content) : null;
  const j = travel.journey;
  const progress = j ? Math.max(0, Math.min(1, (now - j.startedAt) / (j.arrivesAt - j.startedAt))) : 0;
  const position = j ? routePosition(j.from, j.to, progress) : travel.position;
  const reached = Math.hypot(position.x - place.x, position.y - place.y) < .008;
  const base = mapBase(size);
  const scale = base * camera.zoom;
  const bounded = (c:typeof camera) => boundMapCamera(c,size);
  function focus(id: string) {
    const target = places.find(p => p.id === id); if (!target) return;
    setSelectedId(id); setCamera(c => bounded({ ...c, x: (.5-target.x)*W*base*c.zoom, y: (.5-target.y)*H*base*c.zoom }));
  }
  useEffect(() => { if (previousSeen.current === seenKey) return; previousSeen.current = seenKey; if (lead) focus(lead.id); }, [seenKey]);
  function recenter() { setCamera(c => bounded({ ...c, x: (.5 - position.x) * W * base * c.zoom, y: (.5 - position.y) * H * base * c.zoom })); }
  useEffect(() => { const el = surface.current; if (!el) return; const observer = new ResizeObserver(([entry]) => { if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height }); }); observer.observe(el); return () => observer.disconnect(); }, []);
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(travel)); } catch { /* The map still works in this session. */ } }, [travel]);
  useEffect(() => { if (!j) return; const tick = () => { const time = Date.now(); setNow(time); if (time >= j.arrivesAt) setTravel({ position: j.to }); }; tick(); const id = window.setInterval(tick, 250); return () => window.clearInterval(id); }, [j]);
  function act() {
    if (busy || lock || j) return;
    if (!reached) { const startedAt = Date.now(); setNow(startedAt); setTravel({ position, journey: { from: position, to: { x: place.x, y: place.y }, destinationId: place.id, startedAt, arrivesAt: startedAt + travelSeconds(position, place) * 1000 } }); return; }
    if (place.sceneId) { void command({ type: 'novelStart', sceneId: place.sceneId }); }
    else if (place.id === 'world-memories') onOpen('memories');
    else if (place.id === 'world-tower') onOpen('tower');
    else if (stage) onSelect(stage.id);
    else if (place.kind === 'story') setStory(true);
    else onOpen(place.kind === 'trial' ? 'trial' : 'boss-events');
  }
  const routeTo = j?.to ?? place;
  const routeFrom = j?.from ?? position;
  const visible = places.filter(p => p.id === selectedId || p.encounter || (p.category === 'story' ? camera.zoom >= 1.8 || !save.novels?.seen.includes(p.sceneId!) : !p.region || p.representative || camera.zoom >= 2));
  return <section className="world-map" aria-label={tr('世界地図')}>
    <div ref={surface} data-guide="chapters" className="world-map__surface" tabIndex={0} role="group" aria-label={tr('ドラッグで移動、ピンチで拡大縮小')} onKeyDown={e => { if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) { e.preventDefault(); setCamera(c => bounded({ ...c, x: c.x + (e.key === 'ArrowLeft' ? 60 : e.key === 'ArrowRight' ? -60 : 0), y: c.y + (e.key === 'ArrowUp' ? 60 : e.key === 'ArrowDown' ? -60 : 0) })); } }}
      {...handlers}>
      <div className="world-map__land" data-map-zoom={camera.zoom.toFixed(3)} style={{ width: W, height: H, transform: `translate(${size.width / 2 + camera.x}px, ${size.height / 2 + camera.y}px) scale(${scale}) translate(-50%, -50%)` }}>
        <GameImage className="world-map__art" src={assetPath('world-map')} alt="" />
        <svg className={`world-map__paths${camera.zoom>=1.8?' is-detailed':''}`} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">{chapterPaths.map(path=><polyline key={path.id} className={path.id===place.region?'is-current':''} points={path.points.map(p=>`${p.x*W},${p.y*H}`).join(' ')}/>)}</svg>
        {atlasRegions.map(r=><div key={r.id} className={`world-region-label${place.region===r.id?' is-current':''}`} style={{left:`${r.x*100}%`,top:`${(r.y-.105)*100}%`,transform:`translate(-50%,-50%) scale(${1/scale})`}}><small>{tr('第{0}章').replace('{0}',String(r.number))}</small><span>{tr(r.title)}</span></div>)}
        <svg className="world-map__route" viewBox={`0 0 ${W} ${H}`} aria-hidden="true"><path d={`M ${routeFrom.x*W} ${routeFrom.y*H} Q ${((routeFrom.x+routeTo.x)/2+.055)*W} ${(routeFrom.y+routeTo.y)/2*H} ${routeTo.x*W} ${routeTo.y*H}`} /></svg>
        {visible.map(p => { const d = content.dungeons.find(s => s.id === p.dungeonId); const locked = d && dungeonLock(d, save, content); const Icon = p.sceneId&&!p.encounter?BookOpen:icons[p.kind]; const person = content.characters.find(c => c.id === p.characterId) ?? (p.id==='world-story'?storyteller:undefined); const unread = Boolean(p.sceneId && !save.novels?.seen.includes(p.sceneId)); return <Button key={p.id} variant="icon" className={`world-pin${p.encounter ? ' world-pin--encounter' : p.sceneId ? ' world-pin--chronicle' : ''}${unread ? ' is-unread' : ''}${p.region ? ' world-pin--region' : ''}${p.id === place.id ? ' is-selected' : ''}${locked ? ' is-locked' : ''}${p.region && p.category!=='story' && !p.representative && p.id !== selectedId ? ' is-minor' : ''}`} style={{ left: `${p.x*100}%`, top: `${p.y*100}%`, '--pin-scale': 1/scale, '--label-shift': `${Math.max(0, 88 - (size.width/2 + camera.x + (p.x-.5)*W*scale)) - Math.max(0, (size.width/2 + camera.x + (p.x-.5)*W*scale) + 88 - size.width)}px` } as React.CSSProperties} aria-label={tr(p.label)} selected={p.id === place.id} onClick={() => setSelectedId(p.id)}><span className={p.kind === 'story' && person ? 'world-pin__portrait' : 'world-pin__symbol'}>{p.kind === 'story' && person ? <><PortraitArt character={person!} face/><MessageCircle size={16}/></> : locked ? <LockKeyhole size={19} /> : <Icon size={23} />}</span><span className="world-pin__label">{unread && <i>{tr('未読')}</i>}{p.kind === 'trial' && <small>BOSS RUSH</small>}{tr(p.label)}{p.dungeonId && save.completedDungeonIds.includes(p.dungeonId) && <Check size={11} />}</span></Button>; })}
        <div className="world-map__position" style={{ left: `${position.x*100}%`, top: `${position.y*100}%`, transform: `translate(-50%,-50%) scale(${1/scale})` }}>{j ? <Footprints size={23} /> : <i />}<span>{tr(j ? '移動中' : '現在地')}</span></div>
      </div>
    </div>
    <header className="world-map__header"><Button variant="icon" aria-label={tr('ホームへ戻る')} onClick={onBack}><ArrowLeft size={21} /></Button><h1>{tr('世界地図')}<small>STILLVEIL</small></h1><div><span><CurrencyEmblem kind="stone" size={14}/>{save.stones.toLocaleString()}</span><span><CurrencyEmblem kind="gold" size={14}/>{save.gold.toLocaleString()}</span></div></header>
    {goal && <Button variant="secondary" className="world-map__story-goal" onClick={() => focus(goal.id)}><MessageCircle size={16}/><span><small>{tr(goal.sceneId ? '新しい気配' : '手がかりの行き先')}</small><strong>{tr(goal.label)}</strong></span><ChevronRight size={15}/></Button>}
    <div className="world-map__compass" aria-hidden="true"><span>N</span><Compass size={42} strokeWidth={1}/></div>
    <div className="world-map__tools"><Button variant="icon" aria-label={tr('拡大')} disabled={camera.zoom >= MAP_MAX_ZOOM} onClick={() => zoom(1.3)}><Plus /></Button><Button variant="icon" aria-label={tr('縮小')} disabled={camera.zoom <= 1} onClick={() => zoom(1/1.3)}><Minus /></Button><Button variant="icon" aria-label={tr('現在地へ')} onClick={recenter}><Crosshair /></Button><Button variant="icon" aria-label={tr('探索地点の一覧')} onClick={() => setNearby(true)}><Flag size={20}/></Button></div>
    <div className="world-map__destination">
      {place.characterId ? <div className="world-map__destination-portrait"><PortraitArt character={content.characters.find(c => c.id === place.characterId)!} face/></div> : stage ? <GameImage src={assetPath(stage.artId)} alt="" /> : <div className="world-map__destination-icon"><BookOpen size={32}/></div>}
      <div className="world-map__destination-copy"><small>{j ? tr('目的地へ移動中') : place.sceneId ? tr(save.novels?.seen.includes(place.sceneId) ? '再訪できる物語' : place.encounter?'地図で見つけた物語':'物語の記録') : place.region ? tr(content.chapters?.find(c => c.id === place.region)?.title ?? '') : place.kind === 'trial' ? 'BOSS RUSH' : 'DESTINATION'}</small><h2>{tr(place.label)}</h2><p>{stage && <span><Hexagon size={12}/>{tr('難易度 ')}{dungeonDifficulty(stage, content).toFixed(1)}</span>}<span><Footprints size={13}/>{j ? `${Math.max(0,Math.ceil((j.arrivesAt-now)/1000))}${tr('秒')}` : reached ? tr('到着済み') : `${tr('約')}${travelSeconds(position,place)}${tr('秒')}`}</span></p>
      <Button className="world-map__travel" data-guide={reached && !lock ? 'prepare' : undefined} disabled={busy || Boolean(lock) || Boolean(j)} onClick={act}>{j ? tr('移動中') : lock ? <LockKeyhole size={17}/> : reached ? tr(place.encounter ? '声をかける' : place.kind === 'story' ? '物語を読む' : '探索の準備') : tr('自動移動')}{!j && !lock && <ChevronRight size={15}/>}</Button></div>
      {j ? <div className="world-map__travel-status"><Button variant="secondary" size="sm" onClick={onPolish}><Sparkles size={13}/>{tr('原石を磨く')}</Button><progress value={progress} max={1} aria-label={tr('移動の進み具合')}/><Button variant="icon" aria-label={tr('移動を中止')} onClick={() => setTravel({ position })}><X size={15}/></Button></div> : <p className="world-map__hint">{lock ? tr(lock) : place.teaser ? tr(place.teaser) : reached ? tr('目的地に到着しました') : tr('目的地に到着すると挑戦できます')}</p>}
    </div>
    <Modal open={story} onClose={() => setStory(false)} title={tr('旅人の灯')}><NovelLibrary save={save} busy={busy} command={async action => { const ok = await command(action); if (ok && action.type === 'novelStart') setStory(false); return ok; }}/><Button variant="secondary" onClick={() => { setStory(false); onOpen('memories'); }}>{tr('追憶・覚醒')}</Button></Modal>
    <Modal open={nearby} onClose={() => setNearby(false)} title={tr('探索地点の一覧')}><WorldMapIndex content={content} save={save} places={places} onChoose={id=>{setNearby(false);focus(id);}} onOpen={mode=>{setNearby(false);onOpen(mode);}}/></Modal>
  </section>;
}
