import { storyActors, worldStorySupportingSpeakers } from '../domain/world-story';
import { useState } from 'react';
import { BookOpen, Check, ChevronRight, LockKeyhole, MapPin } from 'lucide-react';
import type { Content, GameSave } from '../domain/types';
import type { WorldLocation } from '../domain/world-map';
import { novelAvailable } from '../domain/novels';
import { dungeonLock } from '../domain/events';
import { tr } from '../locales/i18n';
import { Button } from './index';
export function WorldMapIndex({ content, save, places, onChoose, onOpen }: { content: Content; save: GameSave; places: WorldLocation[]; onChoose: (id: string) => void; onOpen: (mode: string) => void }) {
 const [tab,setTab]=useState<'journey'|'story'|'side'|'people'>('journey');
 const [chapterId,setChapterId]=useState(content.chapters?.find(c=>c.dungeonIds.some(id=>!save.completedDungeonIds.includes(id)))?.id??content.chapters?.[0]?.id);
 const chapter=content.chapters?.find(c=>c.id===chapterId);
 function location(p:WorldLocation){const d=content.dungeons.find(d=>d.id===p.dungeonId),locked=d&&dungeonLock(d,save,content);const seen=p.sceneId?save.novels?.seen.includes(p.sceneId):save.completedDungeonIds.includes(p.dungeonId??'');return <Button key={p.id} variant="secondary" className="world-index-place" onClick={()=>onChoose(p.id)}><span>{p.sceneId?<BookOpen size={16}/>:locked?<LockKeyhole size={16}/>:<MapPin size={16}/>}</span><span>{tr(p.label)}{p.sceneId&&<small>{tr(seen?'再生済み':'未読')}</small>}</span>{seen?<Check size={14}/>:<ChevronRight size={14}/>}</Button>;}
 return <div className="world-map__index">
  <div className={`world-index-tabs${save.worldStory?' has-people':''}`} role="group" aria-label={tr('地図の索引')}>
   <Button selected={tab==='journey'} variant="secondary" onClick={()=>setTab('journey')}>{tr('章の旅路')}</Button><Button selected={tab==='story'} variant="secondary" onClick={()=>setTab('story')}>{tr('物語')}</Button><Button selected={tab==='side'} variant="secondary" onClick={()=>setTab('side')}>{tr('追憶と寄り道')}</Button>
   {save.worldStory&&<Button selected={tab==='people'} variant="secondary" onClick={()=>setTab('people')}>{tr('仲間')}</Button>}
  </div>
  {tab==='people'&&content.worldStory&&storyActors(save,content.worldStory).map(a=><Button key={a.actorId} variant="secondary" onClick={()=>onChoose('actor:'+a.actorId)}>{tr(content.characters.find(c=>c.id===a.actorId)?.name??worldStorySupportingSpeakers[a.actorId]??'旅の少女')}<ChevronRight size={14}/></Button>)}
  {tab==='journey'&&<><div className="world-index-chapters" role="group" aria-label={tr('地図の章')}>
   {content.chapters?.map(c=><Button key={c.id} variant="secondary" selected={c.id===chapterId} onClick={()=>setChapterId(c.id)}>{tr('第{0}章').replace('{0}',String(c.number))}<small>{tr(c.title)}</small></Button>)}
  </div>{chapter&&<section className="world-index-section"><h3>{tr(chapter.title)}</h3><p>{tr(chapter.subtitle)}</p><small>{chapter.dungeonIds.filter(id=>save.completedDungeonIds.includes(id)).length} / {chapter.dungeonIds.length}</small>{chapter.dungeonIds.flatMap(id=>places.filter(p=>p.dungeonId===id)).map(location)}</section>}</>}
  {tab==='story'&&<>{(content.novels??[]).filter(s=>novelAvailable(s,save)).map(s=>places.find(p=>p.sceneId===s.id)).filter((p):p is WorldLocation=>Boolean(p)).map(location)}<p className="subtle">{tr('物語は、ゆかりの地を探索すると地図に現れます。')}</p></>}
  {tab==='side'&&<>{(['memory','event','trial']as const).map(category=><section className="world-index-section" key={category}><h3>{tr(category==='memory'?'追憶・覚醒':category==='event'?'イベント':'腕試し')}</h3>{places.filter(p=>p.category===category).map(location)}</section>)}<Button variant="secondary" onClick={()=>onOpen('tower')}>{tr('白亜の塔')}<ChevronRight size={14}/></Button></>}
  <Button variant="secondary" onClick={()=>onOpen('normal')}>{tr('すべての探索を一覧で見る')}</Button>
 </div>;
}
