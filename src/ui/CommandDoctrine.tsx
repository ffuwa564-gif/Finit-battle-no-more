import { useEffect, useState } from 'react';
import { Check, Crown, Megaphone, Target, Users } from 'lucide-react';
import { content as currentContent } from '../content';
import type { Battle, CommandOrder, Content, Unit } from '../domain/types';
import { commandUnits } from '../domain/party-orders';
import { commandCapacity, commandCost, commandLoad, commandUnavailableReason, validateCommandOrder } from '../domain/command-doctrine';
import { tr } from '../locales/i18n';
import { Button, Modal } from './index';
import { PortraitArt } from './PortraitArt';
import './command-doctrine.css';

export interface CommandDoctrineProps {
  battle: Battle;
  content?: Content;
  busy?: boolean;
  onOrder: (order: CommandOrder | null) => void;
}

/** Selects a target and followers, never a forecast of their hidden skill choices. */
export function CommandDoctrine({battle,content=currentContent,busy=false,onOrder}:CommandDoctrineProps) {
  const [open,setOpen]=useState(false);
  const [targetId,setTargetId]=useState('');
  const [followerIds,setFollowerIds]=useState<string[]>([]);
  useEffect(()=>{setOpen(false);setFollowerIds([]);setTargetId('');},[battle.id,battle.wave]);
  const capacity=commandCapacity(battle.leaderId);
  if(!capacity)return null;
  // Replays contain precomputed results; only expose the snapshot already shown.
  const visibleBattle={...battle,units:commandUnits(battle)};
  const commander=visibleBattle.units.find(unit=>unit.side==='party'&&unit.characterId===battle.leaderId);
  const enemies=visibleBattle.units.filter(unit=>unit.side==='enemy'&&unit.hp>0);
  const followers=visibleBattle.units.filter(unit=>unit.side==='party'&&unit.characterId!==battle.leaderId);
  const currentFollowerIds=followerIds.filter(id=>followers.some(unit=>unit.uid===id));
  const order:CommandOrder={targetId,followerIds:currentFollowerIds};
  const load=commandLoad(order,visibleBattle,content);
  const remaining=Math.max(0,capacity-load);
  const editable=battle.phase==='ready'&&!busy;
  const name=(unit:Unit)=>content.characters.find(character=>character.id===unit.characterId)?.name??unit.characterId;
  const character=(unit:Unit)=>content.characters.find(character=>character.id===unit.characterId);
  let reason=commandUnavailableReason(visibleBattle);
  if(!reason&&!followerIds.length)reason='従う仲間を選んでください。';
  if(!reason)try{validateCommandOrder(order,visibleBattle,content);}catch(error){reason=error instanceof Error?error.message:'今は号令を予約できません。';}
  const canReserve=editable&&!reason;
  function show(){
    setTargetId(battle.commandOrder?.targetId??enemies[0]?.uid??'');
    setFollowerIds([...(battle.commandOrder?.followerIds??[])]);
    setOpen(true);
  }
  function toggle(id:string){setFollowerIds(ids=>ids.includes(id)?ids.filter(value=>value!==id):[...ids,id]);}
  function protectedAction(unit:Unit){
    if(unit.ultimateQueued)return '必殺予約を優先';
    if(unit.characterId===battle.partyIds[0]&&battle.partyOrder)return '先頭の明示指示を優先';
    return undefined;
  }
  return <span className="command-doctrine" data-testid="command-doctrine">
    <Button variant="icon" className="command-doctrine__trigger" selected={Boolean(battle.commandOrder)} disabled={busy} aria-label={tr('号令指揮')} title={tr('号令指揮')} onClick={show}><Megaphone size={19} aria-hidden="true"/>{battle.commandOrder&&<span className="command-doctrine__queued" aria-hidden="true"/>}</Button>
    <Modal open={open} title={tr('号令指揮')} className="command-doctrine-modal" onClose={()=>setOpen(false)} footer={<div className="command-doctrine__actions"><Button disabled={!canReserve} onClick={()=>{onOrder({targetId,followerIds:[...currentFollowerIds]});setOpen(false);}}>{tr(battle.commandOrder?'号令の予約を更新':'この号令を予約')}<Check size={16}/></Button>{battle.commandOrder&&<Button variant="secondary" disabled={!editable} onClick={()=>{onOrder(null);setOpen(false);}}>{tr('号令の予約を解除')}</Button>}</div>}>
      <div className="command-doctrine__leader"><Crown size={17} aria-hidden="true"/><strong>{commander?tr(name(commander)):tr('指揮役')}</strong><span>{tr('指揮役')}</span></div>
      <p className="command-doctrine__intro">{tr('標的と、号令に従う仲間を選びます。実際に使う技を先に決めるものではありません。')}</p>
      <div className="command-doctrine__tradeoff" data-testid="command-tradeoff"><strong>{tr('集中する代わりに、指揮役は行動を使います')}</strong><p>{tr('このラウンドは指揮役の通常1手と追加リーダー効果を使います。回復や範囲技を単体攻撃に変える号令ではありません。')}</p></div>
      <div className="command-doctrine__capacity" aria-label={tr('連携負荷')} data-testid="command-load"><span><Users size={16} aria-hidden="true"/>{tr('連携負荷')}</span><strong>{load} / {capacity}</strong><small>{tr('残り{0}枠').replace('{0}',String(remaining))}</small></div>
      <p className="command-doctrine__hint">{tr('負荷はR 1・SR 2・SSR 3・XR 4。覚醒前の負荷を引き継ぎ、別衣装は別に数えます。')}</p>
      <fieldset className="command-doctrine__selection"><legend><Target size={16} aria-hidden="true"/>{tr('狙う敵')}</legend><div className="command-doctrine__enemies">{enemies.map((unit,index)=><Button key={unit.uid} variant="secondary" selected={targetId===unit.uid} disabled={!editable} aria-pressed={targetId===unit.uid} data-command-target={unit.uid} onClick={()=>setTargetId(unit.uid)}><span className="command-doctrine__enemy-index">#{index+1}</span><span>{tr(name(unit))}</span>{targetId===unit.uid&&<Check size={14} aria-hidden="true"/>}</Button>)}</div></fieldset>
      <fieldset className="command-doctrine__selection"><legend><Users size={16} aria-hidden="true"/>{tr('従う仲間')}</legend><div className="command-doctrine__followers">{followers.map(unit=>{
        const selected=followerIds.includes(unit.uid),cost=commandCost(unit.characterId,content),protectedBy=protectedAction(unit),definition=character(unit);
        const full=!selected&&cost>remaining,dead=unit.hp<=0;
        return <Button key={unit.uid} variant="secondary" className="command-doctrine__follower" selected={selected} aria-pressed={selected} data-command-follower={unit.uid} disabled={!editable||dead||full} onClick={()=>toggle(unit.uid)}>
          {definition&&<span className="command-doctrine__portrait"><PortraitArt character={definition} face/></span>}
          <span className="command-doctrine__member"><strong>{tr(name(unit))}</strong><span>{tr('連携負荷 {0}').replace('{0}',String(cost))}</span>{dead?<small>{tr('戦闘不能')}</small>:full?<small>{tr('空き枠が足りません')}</small>:protectedBy?<small>{tr(protectedBy)}</small>:Object.keys(unit.ailments??{}).length?<small>{tr('状態異常あり')}</small>:null}</span>
          <span className="command-doctrine__check" aria-hidden="true">{selected?<Check size={17}/>:null}</span>
        </Button>;
      })}</div></fieldset>
      <div className="command-doctrine__rules"><p>{tr('号令は本人の通常行動1回を使います。そのラウンドは固有リーダー効果を休み、基本の能力補正は残ります。')}</p><p>{tr('必殺予約・先頭への明示指示・石の使用などを上書きしません。選んだ全員が同じ技を使う保証はありません。')}</p></div>
      {canReserve&&<p className="command-doctrine__reservation-summary" data-testid="command-reservation-summary">{tr('{0}人の通常単体行動の宛先を「{1}」へ。指揮役の通常1手を消費。').replace('{0}',String(currentFollowerIds.length)).replace('{1}',tr(name(enemies.find(unit=>unit.uid===targetId)!)))}</p>}
      {reason&&<p className="command-doctrine__reason" role="status" data-testid="command-unavailable">{tr(reason)}</p>}
    </Modal>
  </span>;
}
