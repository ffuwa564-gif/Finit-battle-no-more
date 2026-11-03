import { useState } from 'react';
import { ArrowRight, Gem } from 'lucide-react';
import type { Content, GameSave } from '../domain/types';
import { PREPARATION_GOALS, preparationPlan, type PreparationGoal } from '../domain/preparation';
import { tr } from '../locales/i18n';
import { Button } from './index';
import './preparation-guide.css';

export interface PreparationGuideProps {
  content: Content; save: GameSave; busy?: boolean;
  onGems: (defId: string) => void; onDungeon: (id: string) => void;
}
export function PreparationGuide({content,save,busy=false,onGems,onDungeon}:PreparationGuideProps) {
  const [goal,setGoal]=useState<PreparationGoal>('white-flower-seed');
  const plan=preparationPlan(content,save,goal);
  return <section className="preparation-guide" aria-label={tr('次の装備実験')} data-testid="preparation-guide" data-step={plan.step}>
    <header><Gem size={17} aria-hidden="true"/><h3>{tr('次の装備実験')}</h3><span>{tr('装備済み {0} / {1}人').replace('{0}',String(plan.equippedPartyCount)).replace('{1}',String(save.partyIds.length))}</span></header>
    <div className="preparation-guide__choices" role="group" aria-label={tr('試したい戦い方')}>{PREPARATION_GOALS.map(id=><Button key={id} size="sm" variant="secondary" selected={goal===id} aria-pressed={goal===id} onClick={()=>setGoal(id)}>{tr(id==='wick-stone'?'攻撃と追撃を試す':'防御から回復を試す')}</Button>)}</div>
    <h4>{tr(plan.definition.name)}</h4>
    <p>{tr(goal==='wick-stone'?'攻撃の参照値を補い、次ラウンドの追撃へ。能力値そのものは上がりません。':'先頭に種を預け、その本人が通常の防御を実行すると回復。石の使用と防御で二手使います。')}</p>
    {plan.step==='farm'||plan.step==='craft'?<p className="preparation-guide__progress">{tr('同系統の欠片 {0} / {1}個').replace('{0}',String(plan.dust)).replace('{1}',String(plan.cost))}{plan.remaining>0&&<> · {tr('あと{0}個').replace('{0}',String(plan.remaining))}</>}</p>:<p className="preparation-guide__progress">{tr(plan.step==='equip'?'所持済み。製作せず、託す仲間を選びましょう。':'装備済み。通常探索で使う手順を確かめましょう。')}</p>}
    {plan.step==='farm'?<>{plan.farm?<><p>{tr('踏破報酬の欠片を集めます。この補助石そのものは製作で入手します。')}</p><Button variant="secondary" disabled={busy||Boolean(save.battle)} onClick={()=>onDungeon(plan.farm!.id)}>{tr(plan.farm.name)}<ArrowRight size={15}/></Button></>:<><p>{tr('通常探索を進め、同系統の欠片を集める道を開きましょう。')}</p>{plan.unlockRoute&&<Button variant="secondary" disabled={busy||Boolean(save.battle)} onClick={()=>onDungeon(plan.unlockRoute!.id)}>{tr('通常探索を進める')}<ArrowRight size={15}/></Button>}</>}</>:<Button variant="secondary" disabled={busy||Boolean(save.battle)} onClick={()=>onGems(goal)}>{tr(plan.step==='craft'?'この石の製作へ':'この石の装備を確認')}<ArrowRight size={15}/></Button>}
    <small>{tr('性能は固定。追加の調律をせずに使える、入門用の製作品です。')}</small>
    {plan.step==='try'&&plan.farm&&<Button disabled={busy||Boolean(save.battle)} onClick={()=>onDungeon(plan.farm!.id)}>{tr('通常探索で試す')}<ArrowRight size={15}/></Button>}
  </section>;
}
