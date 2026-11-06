import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, LockKeyhole, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import type { MemoryGemsProps } from './MemoryGems';
import { MemoryGems } from './MemoryGems';
import { memoryGemStacks, preferredStackItem, type MemoryGemStack } from './memory-gem-stacks';
import { gemDescription, gemName, gemTier } from '../domain/memory-gems';
import { tr } from '../locales/i18n';
import { Button, Modal, InventoryScene, CollectedGemArt } from './index';
import './memory-cabinet.css';

export function MemoryCabinet(props: MemoryGemsProps & {onBack:()=>void}) {
  const {save, content, dispatch, busy, targetDefId}=props;
  const items=save.memoryGems?.items??[],equipped=save.memoryGems?.equipped??{};
  const [filter,setFilter]=useState<'all'|'equipped'|'locked'>('all');
  const [page,setPage]=useState(0),[selectedId,setSelectedId]=useState('');
  const [inspect,setInspect]=useState(false);
  const openDetail=()=>{setInspect(true);setDetail(true);};
  const [detail,setDetail]=useState(Boolean(targetDefId||save.memoryGems?.pending));
  const [characterId,setCharacterId]=useState(save.partyIds[0]??save.ownedIds[0]??'');
  const stacks=memoryGemStacks([...items].reverse(),equipped).filter(s=>filter==='all'||(filter==='equipped'?s.equippedCount>0:s.lockedCount>0));
  const pages=Math.max(1,Math.ceil(stacks.length/16)),currentPage=Math.min(page,pages-1),visible=stacks.slice(currentPage*16,currentPage*16+16);
  const itemFor=(stack:MemoryGemStack,character=characterId)=>filter==='locked'?stack.items.find(i=>i.locked)!:filter==='equipped'?stack.items.find(i=>Object.values(equipped).includes(i.id))!:preferredStackItem(stack,equipped,character);
  const selected=items.find(i=>i.id===selectedId)??(visible[0]?itemFor(visible[0]):undefined);
  const owner=selected&&Object.entries(equipped).find(([,id])=>id===selected.id)?.[0];
  useEffect(()=>{if(save.memoryGems?.pending)setDetail(true);},[save.memoryGems?.pending]);
  const chooseFilter=(value:typeof filter)=>{setFilter(value);setPage(0);setSelectedId('');};
  return <>
    <InventoryScene kind="memory-cabinet" title="記憶石" onBack={props.onBack}>
      <nav className="cabinet-filters" aria-label={tr('表示する記憶石')}>{(['all','equipped','locked'] as const).map((f,i)=><Button key={f} variant="secondary" selected={filter===f} onClick={()=>chooseFilter(f)}>{tr(['すべて','装備中','保護中'][i])}</Button>)}</nav>
      <div className="cabinet-collection" aria-label={tr('記憶石の収集箱')}>
        {Array.from({length:16},(_,index)=>{const stack=visible[index];if(!stack)return <div key={`empty-${index}`} className="cabinet-cell cabinet-cell--empty" aria-hidden="true"/>;
          const item=itemFor(stack);
          return <Button key={stack.key} variant="secondary" className="cabinet-cell" selected={selected?.id===item.id} data-testid="cabinet-gem" data-gem-id={item.id} aria-label={`${tr(gemName(item))} · T${gemTier(item)} · ×${stack.items.length}`} onClick={()=>setSelectedId(item.id)}>
            <CollectedGemArt id={item.defId}/><span className="cabinet-cell__tier">T{gemTier(item)}</span>{stack.items.length>1&&<small className="cabinet-cell__count">×{stack.items.length}</small>}
            <span className="cabinet-cell__marks">{stack.equippedCount>0&&<ShieldCheck size={12}/ >}{stack.lockedCount>0&&<LockKeyhole size={12}/>}</span>
          </Button>;})}
      </div>
      {!stacks.length&&<p className="cabinet-empty">{tr(items.length?'この条件の記憶石はありません。':'まだ見ぬ記憶を探しに。')}</p>}
      <div className="cabinet-pagination"><Button variant="icon" aria-label={tr('前のページ')} disabled={currentPage===0} onClick={()=>{setPage(currentPage-1);setSelectedId('');}}><ChevronLeft size={17}/></Button><span>{currentPage+1} / {pages}<small> · {items.length}</small></span><Button variant="icon" aria-label={tr('次のページ')} disabled={currentPage>=pages-1} onClick={()=>{setPage(currentPage+1);setSelectedId('');}}><ChevronRight size={17}/></Button></div>
      <article className="cabinet-tray" aria-label={tr('記憶石の詳細')}>
        <div className="cabinet-tray__gem">{selected&&<CollectedGemArt id={selected.defId}/>}</div>
        <div className="cabinet-tray__card">{selected?<><h2><span>{tr(gemName(selected))}</span><small>T{gemTier(selected)}</small></h2><p>{tr(gemDescription(selected))}</p><label className="cabinet-owner"><span className="sr-only">{tr('石を託す仲間')}</span><select aria-label={tr('石を託す仲間')} value={characterId} onChange={e=>{const id=e.target.value;setCharacterId(id);const stack=stacks.find(s=>s.items.some(i=>i.id===selected?.id));if(stack)setSelectedId(itemFor(stack,id).id);}}>{content.characters.filter(c=>save.ownedIds.includes(c.id)).map(c=><option key={c.id} value={c.id}>{tr(c.name)}</option>)}</select></label><div className="cabinet-tray__actions"><Button disabled={busy||!characterId||equipped[characterId]===selected.id} onClick={()=>owner&&owner!==characterId?openDetail():dispatch({type:'equipMemoryGem',characterId,gemId:selected.id})}>{tr(equipped[characterId]===selected.id?'装備中':owner&&owner!==characterId?'この仲間へ移す':'装備')}</Button><Button variant="secondary" onClick={openDetail}>{tr('詳細')}</Button></div></>:<><h2>{tr('記憶石')}</h2><p>{tr('まだ見ぬ記憶を探しに。')}</p><Button variant="secondary" onClick={openDetail}>{tr('詳細')}</Button></>}</div>
      </article>
      <Button className="cabinet-manage" variant="secondary" onClick={()=>{setInspect(false);setDetail(true);}}><SlidersHorizontal size={14}/>{tr('整理・調律')}</Button>
    </InventoryScene>
    <Modal open={detail} title={tr('記憶石の管理')} className="inventory-room-modal cabinet-detail-modal" onClose={()=>setDetail(false)}>
      <MemoryGems key={`${inspect?selected?.id:'all'}:${characterId}`} {...props} initialGemId={inspect?selected?.id:undefined} initialCharacterId={characterId} />
    </Modal>
  </>;
}
