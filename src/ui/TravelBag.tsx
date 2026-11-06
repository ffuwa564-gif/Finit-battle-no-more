import type { GameSave } from '../domain/types';
import { InventoryScene, InventoryHotspot } from './InventoryScene';
export type BagPlace = 'gems'|'polish'|'workshop'|'builds'|'items'|'materials'|'notes';
export function TravelBag({save,onOpen,onBack}: {save:GameSave;onOpen:(place:BagPlace)=>void;onBack:()=>void}) {
  return <InventoryScene kind="travel-bag" title="カバン" onBack={onBack}>
    <InventoryHotspot place="potions" label="道具" count={save.potions} onClick={()=>onOpen('items')}/>
    <InventoryHotspot place="materials" label="素材" count={Object.values(save.materials).filter(n=>n>0).length} onClick={()=>onOpen('materials')}/>
    <InventoryHotspot place="craft" label="クラフト" onClick={()=>onOpen('workshop')}/>
    <InventoryHotspot place="gems" label="記憶石の管理" count={save.memoryGems?.items.length??0} onClick={()=>onOpen('gems')}/>
    <InventoryHotspot place="polish" label="原石を磨く" count={save.memoryGems?.rough?.length??0} onClick={()=>onOpen('polish')}/>
    <InventoryHotspot place="builds" label="ビルド" onClick={()=>onOpen('builds')}/>
    <InventoryHotspot place="notes" label="旅の記録" onClick={()=>onOpen('notes')}/>
  </InventoryScene>;
}
