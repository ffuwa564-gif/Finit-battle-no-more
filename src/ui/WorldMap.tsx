import type { DungeonPanel } from '../application/dungeon-navigation';
import { currentWorldObjective } from '../domain/world-objective';
import { missingStoryTool } from '../domain/industry';
import { WorldStoryControls } from './WorldStoryControls';
import { WorldStoryPeople } from './WorldStoryPeople';
import { WorldStoryLandscape } from './WorldStoryLandscape';
import { storyActors, storyNext, storyText, storyTravelSeconds, worldStorySupportingSpeakers } from '../domain/world-story';
import { getLanguage } from '../locales/i18n';
import { mapPlacesAtPoint, overlappingMapPlaces } from './map-hit-targets';
import { runUIInteraction } from './interaction';
import { useMapCamera } from './useMapCamera';
import { WorldMapIndex } from './WorldMapIndex';
import { MAP_WIDTH as W, MAP_HEIGHT as H, MAP_MAX_ZOOM, MAP_MIN_ZOOM, mapBase, boundMapCamera } from '../domain/map-camera';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Factory, Maximize2, Minimize2, ArrowLeft, BookOpen, Castle, Check, ChevronRight, Compass, Crown, Crosshair, Flag, Footprints, Hexagon, LockKeyhole, MapPin, MessageCircle, Minus, Mountain, Plus, Sparkles, Swords, Trees, X } from 'lucide-react';
import type { Content, GameSave, GameCommand } from '../domain/types';
import { WORLD_START, parseWorldTravel, routePosition, travelSeconds, worldLocations, worldRegions, worldChapterPaths, type MapPosition, type WorldTravelState, type WorldLocation } from '../domain/world-map';
import { dungeonDifficulty } from '../domain/engine';
import { dungeonLock } from '../domain/events';
import { assetPath } from '../content';
import { tr, useLanguage } from '../locales/i18n';
import { Button, CurrencyEmblem, Modal, NovelLibrary, PortraitArt } from './index';
import { GameImage } from './GameMedia';
import './world-map.css';
const storageKey = 'stillveil-world-travel-v1';
const icons = { cathedral: Castle, cave: Mountain, tower: Crown, forest: Trees, story: MessageCircle, event: Sparkles, trial: Swords, workshop: Factory };
function readTravel(): WorldTravelState { try { return parseWorldTravel(JSON.parse(localStorage.getItem(storageKey) ?? 'null')); } catch { return { position: WORLD_START }; } }
export function WorldMap({ content, save, busy, command, onSelect, onOpen, onBack, onPolish, focusDungeonId, onWorkshop }: { onWorkshop: (recipeId?: string) => void; focusDungeonId?: string; content: Content; save: GameSave; busy: boolean; command: (command: GameCommand) => Promise<boolean>; onSelect: (id: string) => void; onOpen: (panel: DungeonPanel) => void; onBack: () => void; onPolish: () => void }) {
  const language=useLanguage();
  const actors=content.worldStory?storyActors(save,content.worldStory):[];
  const nextStory=content.worldStory?storyNext(save,content.worldStory):undefined;
  const places = useMemo<WorldLocation[]>(() => [...worldLocations(content, save.completedDungeonIds),...(content.worldStory?storyActors(save,content.worldStory).map(a=>({id:'actor:'+a.actorId,actorNodeId:a.node.id,hubId:a.hub.id,characterId:content.characters.some(c=>c.id===a.actorId)?a.actorId:undefined,label:content.characters.find(c=>c.id===a.actorId)?.name??worldStorySupportingSpeakers[a.actorId]??'旅の少女',kind:'story' as const,category:'living' as const,x:a.hub.x,y:a.hub.y,teaser:storyText(a.node.bubble,save.worldStory!.profile,getLanguage())})):[])], [content, save.completedDungeonIds,save.worldStory,language]);
  const openingId=content.novels?.find(s=>s.trigger.kind==='opening')?.id;
  const unreadEncounter = places.find(p => p.encounter && !save.novels?.seen.includes(p.sceneId!)) ?? places.find(p => p.sceneId && p.sceneId!==openingId && !save.novels?.seen.includes(p.sceneId));
  const lastSeenScene = [...(save.novels?.seen ?? [])].reverse().map(id => content.novels?.find(s => s.id === id)).find(s => s?.mapEncounter);
  const lead = lastSeenScene?.mapEncounter && !save.completedDungeonIds.includes(lastSeenScene.mapEncounter.leadDungeonId) ? places.find(p => p.dungeonId === lastSeenScene.mapEncounter!.leadDungeonId) : undefined;
  const goal = lead ?? unreadEncounter;
  const [localTravel, setTravel] = useState(readTravel);
  const [now, setNow] = useState(Date.now);
  const storyJourney=save.worldStory?.journey;
  const travel=save.worldStory?{position:storyJourney&&now>=storyJourney.arrivesAt?storyJourney.to:save.worldStory.position,journey:storyJourney&&now<storyJourney.arrivesAt?storyJourney:undefined}:localTravel;
  const [selectedId, setSelectedId] = useState(() => (save.worldStory?.journey?.destinationId.startsWith('hub-')?places.find(p=>'hubId'in p&&p.hubId===save.worldStory?.journey?.destinationId)?.id:save.worldStory?.journey?.destinationId) ?? (save.worldStory?(nextStory?.recipeId?'world-workshop':nextStory?.node?'actor:'+nextStory.node.actorId:nextStory?.dungeonId):undefined) ?? readTravel().journey?.destinationId ?? lead?.id ?? unreadEncounter?.id ?? places.find(p => p.dungeonId && !dungeonLock(content.dungeons.find(d => d.id === p.dungeonId)!, save, content) && !save.completedDungeonIds.includes(p.dungeonId))?.id ?? places[0]?.id);
  const objective = currentWorldObjective(save, content);
  const [expanded, setExpanded] = useState(false);
  const [nearby, setNearby] = useState(false);
  const [indexTab, setIndexTab] = useState<'journey' | 'side'>('journey');
  const [overlapIds, setOverlapIds] = useState<string[]>([]);
  const [story, setStory] = useState(false);
  const [size, setSize] = useState({ width: 390, height: 650 });
  const seenKey = (save.novels?.seen ?? []).join('|');
  const previousSeen = useRef(seenKey);
  const storyProgress=(save.worldStory?.completed??[]).join('|');
  const previousProgress=useRef<string|undefined>(save.worldStory?storyProgress:undefined);
  const surface = useRef<HTMLDivElement>(null);
  const {camera,setCamera,zoom,handlers}=useMapCamera(surface,size,point=>{
    if (!surface.current) return false;
    const ids = mapPlacesAtPoint(surface.current,point);
    if (!ids.length) return false;
    runUIInteraction(()=>{if(ids.length>1)setOverlapIds(ids);else choosePlace(ids[0]);},'select');
    return true;
  });
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
  useEffect(() => {
    if (!focusDungeonId) return;
    const target = places.find(p => p.dungeonId === focusDungeonId);
    if (target) focus(target.id);
  }, [focusDungeonId, size.width, size.height]);
  useEffect(() => { if (selectedId) focus(selectedId); }, []);
  useEffect(() => { if (previousSeen.current === seenKey) return; previousSeen.current = seenKey; if (lead) focus(lead.id); }, [seenKey]);
  useEffect(()=>{if(!save.worldStory||previousProgress.current===storyProgress)return;previousProgress.current=storyProgress;const target=nextStory?.recipeId?'world-workshop':nextStory?.node?'actor:'+nextStory.node.actorId:nextStory?.dungeonId;if(target)focus(target);},[Boolean(save.worldStory),storyProgress]);
  function recenter() { setCamera(c => bounded({ ...c, x: (.5 - position.x) * W * base * c.zoom, y: (.5 - position.y) * H * base * c.zoom })); }
  useEffect(() => { const el = surface.current; if (!el) return; const observer = new ResizeObserver(([entry]) => { if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height }); }); observer.observe(el); return () => observer.disconnect(); }, []);
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(localTravel)); } catch { /* The map still works in this session. */ } }, [localTravel]);
  useEffect(() => { if (!j) return; const tick = () => { const time = Date.now(); setNow(time); if (time >= j.arrivesAt && !save.worldStory) setTravel({ position: j.to }); }; tick(); const id = window.setInterval(tick, 250); return () => window.clearInterval(id); }, [j]);
  function choosePlace(id: string) {
    const target=places.find(p=>p.id===id);if(target&&'actorNodeId'in target&&missingStoryTool(save,target.actorNodeId as string)){onWorkshop(missingStoryTool(save,target.actorNodeId as string));return;}if(!busy&&!j&&target&&Math.hypot(position.x-target.x,position.y-target.y)<.008&&'actorNodeId'in target)void command({type:'worldTalk',nodeId:target.actorNodeId as string});else setSelectedId(id);
  }
  function act() {
    if (busy || lock || j) return;
    if (place.id === 'world-workshop') { onWorkshop(objective.recipeId); return; }
    if (!reached && save.worldStory) {void command({type:'worldTravel',destinationId:'hubId'in place?place.hubId as string:place.id});return;}
    if (!reached) { const startedAt = Date.now(); setNow(startedAt); setTravel({ position, journey: { from: position, to: { x: place.x, y: place.y }, destinationId: place.id, startedAt, arrivesAt: startedAt + travelSeconds(position, place) * 1000 } }); return; }
    if ('actorNodeId' in place && missingStoryTool(save, place.actorNodeId as string)) {onWorkshop(missingStoryTool(save, place.actorNodeId as string));}
    else if ('actorNodeId' in place) {void command({type:'worldTalk',nodeId:place.actorNodeId as string});}
    else if (place.sceneId) { void command({ type: 'novelStart', sceneId: place.sceneId }); }
    else if (place.id === 'world-workshop') onWorkshop(objective.recipeId);
    else if (place.id === 'world-memories') onOpen('memories');
    else if (place.id === 'world-tower') onOpen('tower');
    else if (stage) onSelect(stage.id);
    else if (place.kind === 'story') setStory(true);
    else { setIndexTab('side'); setNearby(true); }
  }
  const routeTo = j?.to ?? place;
  const routeFrom = j?.from ?? position;
  const visible = places.filter(p => !('actorNodeId'in p) && (!save.worldStory || !p.sceneId) && ( p.id === selectedId || p.encounter || (p.category === 'story' ? camera.zoom >= 1.8 || !save.novels?.seen.includes(p.sceneId!) : !p.region || p.representative || camera.zoom >= 2)));
  return <section className={`world-map${expanded ? ' is-expanded' : ''}`} aria-label={tr('世界地図')}>
    <div ref={surface} data-guide="chapters" className="world-map__surface" tabIndex={0} role="group" aria-label={tr('ドラッグで移動、ピンチで拡大縮小')} onKeyDown={e => { if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) { e.preventDefault(); setCamera(c => bounded({ ...c, x: c.x + (e.key === 'ArrowLeft' ? 60 : e.key === 'ArrowRight' ? -60 : 0), y: c.y + (e.key === 'ArrowUp' ? 60 : e.key === 'ArrowDown' ? -60 : 0) })); } }}
      {...handlers} onClickCapture={e => {
        handlers.onClickCapture(e);
        if (e.isPropagationStopped() || !(e.target instanceof Element)) return;
        const ids = overlappingMapPlaces(e.currentTarget, e.target);
        if (ids.length < 2) return;
        e.preventDefault(); e.stopPropagation();
        runUIInteraction(() => setOverlapIds(ids), 'select');
      }}>
      <div className="world-map__land" data-map-zoom={camera.zoom.toFixed(3)} style={{ width: W, height: H, transform: `translate(${size.width / 2 + camera.x}px, ${size.height / 2 + camera.y}px) scale(${scale}) translate(-50%, -50%)` }}>
        <GameImage className="world-map__art" src={assetPath('world-map')} alt="" />
        <WorldStoryLandscape save={save} content={content}/><svg className={`world-map__paths${camera.zoom>=1.8?' is-detailed':''}`} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">{chapterPaths.map(path=><polyline key={path.id} className={path.id===place.region?'is-current':''} points={path.points.map(p=>`${p.x*W},${p.y*H}`).join(' ')}/>)}</svg>
        {atlasRegions.map(r=><div key={r.id} className={`world-region-label${place.region===r.id?' is-current':''}`} style={{left:`${r.x*100}%`,top:`${(r.y-.105)*100}%`,transform:`scale(${1/scale}) translate(-50%,-50%)`}}><small>{tr('第{0}章').replace('{0}',String(r.number))}</small><span>{tr(r.title)}</span></div>)}
        <svg className="world-map__route" viewBox={`0 0 ${W} ${H}`} aria-hidden="true"><path d={`M ${routeFrom.x*W} ${routeFrom.y*H} Q ${((routeFrom.x+routeTo.x)/2+.055)*W} ${(routeFrom.y+routeTo.y)/2*H} ${routeTo.x*W} ${routeTo.y*H}`} /></svg>
        {visible.map(p => { const d = content.dungeons.find(s => s.id === p.dungeonId); const locked = d && dungeonLock(d, save, content); const Icon = p.sceneId&&!p.encounter?BookOpen:icons[p.kind]; const person = content.characters.find(c => c.id === p.characterId) ?? (p.id==='world-story'?storyteller:undefined); const unread = Boolean(p.sceneId && !save.novels?.seen.includes(p.sceneId)); return <Button key={p.id} data-map-place={p.id} variant="icon" className={`world-pin${p.encounter ? ' world-pin--encounter' : p.sceneId ? ' world-pin--chronicle' : ''}${unread ? ' is-unread' : ''}${p.region ? ' world-pin--region' : ''}${p.id === place.id ? ' is-selected' : ''}${locked ? ' is-locked' : ''}${p.region && p.category!=='story' && !p.representative && p.id !== selectedId ? ' is-minor' : ''}`} style={{ left: `${p.x*100}%`, top: `${p.y*100}%`, '--pin-scale': 1/scale } as React.CSSProperties} aria-label={tr(p.label)} selected={p.id === place.id} onClick={() => choosePlace(p.id)}><span className={p.kind === 'story' && person ? 'world-pin__portrait' : 'world-pin__symbol'}>{p.kind === 'story' && person ? <><PortraitArt character={person!} face/><MessageCircle size={16}/></> : locked ? <LockKeyhole size={19} /> : <Icon size={23} />}</span><span className="world-pin__label">{unread && <i>{tr('未読')}</i>}{p.kind === 'trial' && <small>BOSS RUSH</small>}{tr(p.label)}{p.dungeonId && save.completedDungeonIds.includes(p.dungeonId) && <Check size={11} />}</span></Button>; })}
        <WorldStoryPeople content={content} save={save} scale={scale} detailed={camera.zoom >= 1.8} selected={selectedId} onSelect={choosePlace}/>
        <div className="world-map__position" style={{ left: `${position.x*100}%`, top: `${position.y*100}%`, transform: `scale(${1/scale}) translate(-50%,-50%)` }}>{j ? <Footprints size={23} /> : <i />}<span>{tr(j ? '移動中' : '現在地')}</span></div>
      </div>
    </div>
    <header className="world-map__header"><Button variant="icon" aria-label={tr('ホームへ戻る')} onClick={onBack}><ArrowLeft size={21} /></Button><h1>{tr('世界地図')}<small>STILLVEIL</small></h1><div><span><CurrencyEmblem kind="stone" size={14}/>{save.stones.toLocaleString()}</span><span><CurrencyEmblem kind="gold" size={14}/>{save.gold.toLocaleString()}</span></div></header>
    {content.worldStory&&<WorldStoryControls content={content} save={save} busy={busy} command={command} onFocus={focus} onWorkshop={onWorkshop}/>}
    {!save.worldStory && goal && <Button variant="secondary" className="world-map__story-goal" onClick={() => focus(goal.id)}><MessageCircle size={16}/><span><small>{tr(goal.sceneId ? '新しい気配' : '手がかりの行き先')}</small><strong>{tr(goal.label)}</strong></span><ChevronRight size={15}/></Button>}
    <div className="world-map__compass" aria-hidden="true"><span>N</span><Compass size={42} strokeWidth={1}/></div>
    <div className="world-map__tools"><Button variant="icon" aria-label={tr(expanded ? '地図の表示を戻す' : '地図を広く表示')} selected={expanded} onClick={() => setExpanded(v => !v)}>{expanded ? <Minimize2/> : <Maximize2/>}</Button><Button variant="icon" aria-label={tr('拡大')} disabled={camera.zoom >= MAP_MAX_ZOOM} onClick={() => zoom(1.3)}><Plus /></Button><Button variant="icon" aria-label={tr('縮小')} disabled={camera.zoom <= MAP_MIN_ZOOM} onClick={() => zoom(1/1.3)}><Minus /></Button><Button variant="icon" aria-label={tr('現在地へ')} onClick={recenter}><Crosshair /></Button><Button variant="icon" aria-label={tr('探索地点の一覧')} onClick={() => { setIndexTab('journey'); setNearby(true); }}><Flag size={20}/></Button></div>
    <div className="world-map__destination">
      {place.characterId ? <div className="world-map__destination-portrait"><PortraitArt character={content.characters.find(c => c.id === place.characterId)!} face/></div> : stage ? <GameImage src={assetPath(stage.artId)} alt="" /> : <div className="world-map__destination-icon"><BookOpen size={32}/></div>}
      <div className="world-map__destination-copy"><small>{objective.locationId === place.id ? tr('次にすること') : j ? tr('目的地へ移動中') : place.sceneId ? tr(save.novels?.seen.includes(place.sceneId) ? '再訪できる物語' : place.encounter?'地図で見つけた物語':'物語の記録') : place.region ? tr(content.chapters?.find(c => c.id === place.region)?.title ?? '') : place.kind === 'trial' ? 'BOSS RUSH' : 'DESTINATION'}</small><h2>{tr(place.label)}</h2><p>{stage && <span><Hexagon size={12}/>{tr('難易度 ')}{dungeonDifficulty(stage, content).toFixed(1)}</span>}<span><Footprints size={13}/>{j ? `${Math.max(0,Math.ceil((j.arrivesAt-now)/1000))}${tr('秒')}` : reached ? tr('到着済み') : `${tr('約')}${storyTravelSeconds(save,content,position,place,place.id)}${tr('秒')}`}</span></p>
      <Button className="world-map__travel" data-guide={!lock ? 'prepare' : undefined} disabled={busy || Boolean(lock) || Boolean(j)} onClick={act}>{j ? tr('移動中') : lock ? <LockKeyhole size={17}/> : place.id === 'world-workshop' ? tr('クラフトを開く') : reached ? tr(('actorNodeId'in place)||place.encounter ? '声をかける' : place.kind === 'story' ? '物語を読む' : '探索の準備') : tr('自動移動')}{!j && !lock && <ChevronRight size={15}/>}</Button></div>
      {j ? <div className="world-map__travel-status"><Button variant="secondary" size="sm" onClick={onPolish}><Sparkles size={13}/>{tr('原石を磨く')}</Button><progress value={progress} max={1} aria-label={tr('移動の進み具合')}/><Button variant="icon" aria-label={tr('移動を中止')} onClick={() => save.worldStory?void command({type:'worldTravelCancel'}):setTravel({ position })}><X size={15}/></Button></div> : <p className="world-map__hint">{lock ? tr(lock) : place.teaser ? tr(place.teaser) : reached ? tr('目的地に到着しました') : tr('目的地に到着すると挑戦できます')}</p>}
    </div>
    <Modal open={overlapIds.length > 1} onClose={() => setOverlapIds([])} title={tr('重なっている地点')}>
      <div className="world-map__index">{overlapIds.flatMap(id => {
        const p = places.find(p => p.id === id); if (!p) return [];
        const dungeon = content.dungeons.find(d => d.id === p.dungeonId);
        const locked = dungeon && dungeonLock(dungeon, save, content);
        const Icon = locked ? LockKeyhole : icons[p.kind];
        return <Button key={id} data-map-choice={id} variant="secondary" className="world-index-place" selected={selectedId === id} onClick={() => { setOverlapIds([]); choosePlace(id); }}>
          <Icon size={20}/><span>{tr(p.label)}<small>{tr('actorNodeId' in p ? '仲間' : p.kind === 'story' ? '物語' : p.dungeonId ? 'ダンジョン' : p.label)}</small></span><ChevronRight size={16}/>
        </Button>;
      })}</div>
    </Modal>
    <Modal open={story} onClose={() => setStory(false)} title={tr('旅人の灯')}><NovelLibrary save={save} busy={busy} command={async action => { const ok = await command(action); if (ok && action.type === 'novelStart') setStory(false); return ok; }}/><Button variant="secondary" onClick={() => { setStory(false); onOpen('memories'); }}>{tr('追憶・覚醒')}</Button></Modal>
    <Modal open={nearby} onClose={() => setNearby(false)} title={tr('探索地点の一覧')}><WorldMapIndex initialTab={indexTab} content={content} save={save} places={places} onChoose={id=>{setNearby(false);focus(id);}} onOpen={mode=>{setNearby(false);onOpen(mode);}}/></Modal>
  </section>;
}
