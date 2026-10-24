import { useState, type CSSProperties } from 'react';
import { ChevronRight, Users } from 'lucide-react';
import { assetPath, content } from '../content';
import type { GameCommand, GameSave } from '../domain/types';
import { tr } from '../locales/i18n';
import { AnimatedIllustration } from './AnimatedIllustration';
import { Button, Modal } from './index';
import './home-artwork.css';

export function HomeArtwork({ save, busy, command, suspended }: {
 save: GameSave; busy: boolean; command: (command: GameCommand) => Promise<boolean>; suspended: boolean;
}) {
 const [open,setOpen]=useState(false);
 const selected=content.characters.find(char=>char.id===save.settings.homeCharacterId && save.ownedIds.includes(char.id));
 const choices=content.characters.filter(char=>save.ownedIds.includes(char.id));
 const poster=selected?.artId??'menu-hero', motion=selected?.motionId??(!selected?'home-portrait-motion':undefined);
 // Home artwork needs its own framing; small face crops and gallery anchors do not apply here.
 const anchor=selected?'50% 0%':undefined;
 async function choose(id:string|null){if(await command({type:'settings',settings:{homeCharacterId:id}}))setOpen(false);}
 return <>
  {selected&&<div className="home-artwork-backdrop" aria-hidden="true" style={{backgroundImage:`url("${assetPath(poster)}")`}} />}
  <div className={`home-artwork${selected?' is-character-home':''}`} style={{'--home-art-anchor':anchor} as CSSProperties}>
   {motion?<AnimatedIllustration key={selected?.id??'default'} posterId={poster} motionId={motion} alt={tr(selected?.name??'月下の廃聖堂に佇む銀髪の巡礼者と白い狼')} reducedMotion={save.settings.reducedMotion} suspended={suspended||open} />:<img src={assetPath(poster)} alt={tr(selected!.name)} />}
  </div>
  <Button className="home-character-change" variant="secondary" aria-label={tr('ホームのキャラを変更')} disabled={busy} onClick={()=>setOpen(true)}><Users size={16}/><span><small>{tr('ホームのキャラ')}</small><strong>{tr(selected?.name??'いつものホーム')}</strong></span><ChevronRight size={15}/></Button>
  <Modal open={open} title={tr('ホームのキャラクター')} onClose={()=>{if(!busy)setOpen(false);}}>
   <p className="home-character-help">{tr('所持している仲間を選べます。動画のあるキャラはアニメーション、ないキャラは原画を表示します。')}</p>
   <div className="home-character-choices">
    <Button className="home-character-choice" variant="secondary" selected={!selected} disabled={busy} onClick={()=>void choose(null)}><img src={assetPath('menu-hero')} alt=""/><strong>{tr('いつものホーム')}</strong><small>{tr('アニメーション')}</small></Button>
    {choices.map(char=><Button key={char.id} className="home-character-choice" variant="secondary" selected={selected?.id===char.id} disabled={busy} aria-label={tr(`${char.name}／${char.epithet}をホームに表示`)} onClick={()=>void choose(char.id)}><img src={assetPath(char.portraitId)} alt="" loading="lazy"/><strong>{tr(char.name)}</strong><small>{tr(char.epithet)}</small><em>{tr(char.motionId?'アニメーション':'イラスト')}</em></Button>)}
   </div>
  </Modal>
 </>;
}
