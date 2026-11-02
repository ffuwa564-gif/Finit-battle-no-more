import { useState } from 'react';
import { materialName } from '../content';
import { GEM_FAMILIES } from '../domain/memory-gems';
import { summarizeExpeditions } from '../domain/expedition-ledger';
import type { Content, GameSave } from '../domain/types';
import { tr } from '../locales/i18n';
import { InventorySection } from './InventorySection';
import './expedition-ledger.css';

const outcomeLabels={victory:'踏破',defeat:'全滅',timeout:'期限到達',retreat:'撤退'} as const;
function duration(ms:number|null):string {
  if(ms===null)return tr('未計測');
  if(ms>0&&ms<1000)return tr('1秒未満');
  const seconds=Math.floor(ms/1000);
  return tr('{0}分{1}秒').replace('{0}',String(Math.floor(seconds/60))).replace('{1}',String(seconds%60));
}
export function ExpeditionLedger({save,content}:{save:GameSave;content:Content}) {
  const [version,setVersion]=useState('current'),[dungeonId,setDungeonId]=useState('');
  const records=(save.expeditionHistory??[]).slice(0,30);
  const filter={...(version==='current'?{contentVersion:content.contentVersion,rulesVersion:content.rulesVersion}:{}),...(dungeonId?{dungeonId}:{})};
  const summary=summarizeExpeditions(records,filter);
  const visible=records.filter(record=>(version!=='current'||record.contentVersion===content.contentVersion&&record.rulesVersion===content.rulesVersion)&&(!dungeonId||record.dungeonId===dungeonId));
  const dungeonName=(id:string)=>tr(content.dungeons.find(dungeon=>dungeon.id===id)?.name??id);
  const namedMaterial=(id:string)=>tr(content.materials?.find(material=>material.id===id)?.name??materialName(id));
  const dustName=(id:string)=>tr(GEM_FAMILIES[id as keyof typeof GEM_FAMILIES]?.name??id);
  const rate=(value:number)=>value.toLocaleString(undefined,{maximumFractionDigits:1});
  const entries=(values:Record<string,number>,name:(id:string)=>string,perHour=false)=>Object.entries(values).filter(([,amount])=>amount>0).map(([id,amount])=><li key={id}><span>{name(id)}</span><strong>{perHour?rate(amount):amount.toLocaleString()}</strong></li>);
  const yields=(earned:typeof summary.earned,perHour=false)=><div className="expedition-ledger__yields">
    <section><h4>{tr('確保した金貨・記憶石')}</h4><ul><li><span>{tr('金貨')}</span><strong>{perHour?rate(earned.gold):earned.gold.toLocaleString()}</strong></li><li><span>{tr('記憶石（個）')}</span><strong>{perHour?rate(earned.gemCount):earned.gemCount}</strong></li></ul></section>
    <section><h4>{tr('受取時の祈願石・素材・欠片')}</h4><ul><li><span>{tr('祈願石')}</span><strong>{perHour?rate(earned.stones):earned.stones}</strong></li>{entries(earned.materials,namedMaterial,perHour)}{entries(earned.dust,id=>`${dustName(id)} ${tr('欠片')}`,perHour)}</ul></section>
  </div>;
  return <InventorySection id="expedition-ledger" title="周回の実績" count={records.length} tone="night">
    <div className="expedition-ledger" data-testid="expedition-ledger">
      <div className="expedition-ledger__filters"><label>{tr('集計する版')}<select value={version} onChange={event=>setVersion(event.target.value)}><option value="current">{tr('現在のコンテンツ・ルール版')}</option><option value="all">{tr('すべての版')}</option></select></label><label>{tr('ダンジョン')}<select value={dungeonId} onChange={event=>setDungeonId(event.target.value)}><option value="">{tr('すべてのダンジョン')}</option>{[...new Set(records.map(record=>record.dungeonId))].map(id=><option key={id} value={id}>{dungeonName(id)}</option>)}</select></label></div>
      <p className="expedition-ledger__note">{tr('更新後に開始した最新{0}件のうち、条件に合う{1}件を集計。最大30探索を保存します。').replace('{0}',String(records.length)).replace('{1}',String(summary.total))}</p>
      {!summary.total?<p>{tr('この条件の探索記録はまだありません。')}</p>:<>
        <dl className="expedition-ledger__stats"><div><dt>{tr('全試行')}</dt><dd>{summary.total}</dd></div><div><dt>{tr('踏破率')}</dt><dd>{summary.successRate===null?'—':`${rate(summary.successRate*100)}%`}</dd></div><div><dt>{tr('時間を計測した試行')}</dt><dd>{summary.timedCount} / {summary.total}</dd></div><div><dt>{tr('平均の実経過時間（計測分）')}</dt><dd>{summary.timedCount?duration(summary.timedDurationMs/summary.timedCount):tr('未計測')}</dd></div></dl>
        <p className="expedition-ledger__outcomes">{Object.entries(summary.outcomes).map(([key,count])=>`${tr(outcomeLabels[key as keyof typeof outcomeLabels])} ${count}`).join(' · ')}</p>
        <h3>{tr('全試行の収穫')}</h3>{yields(summary.earned)}<p>{tr('使用した回復薬')}：{summary.potionsUsed}{summary.unknownPotionCount>0&&<> · {tr('使用数未記録 {0}件').replace('{0}',String(summary.unknownPotionCount))}</>}</p>
        <h3>{tr('正の実経過時間を計測した{0}件の実績 / 時間').replace('{0}',String(summary.rateEligibleCount))}</h3>{summary.timedCount>summary.rateEligibleCount&&<p className="expedition-ledger__note">{tr('0秒の記録は時給計算に含めません。')}</p>}{summary.perHour?<>{yields(summary.perHour,true)}<p>{tr('回復薬の使用 / 時間')}：{summary.perHour.potionsUsed===null?tr('未計測'):rate(summary.perHour.potionsUsed)}</p></>:<p>{tr('時給を計算できる時間記録はまだありません。')}</p>}
        <p className="expedition-ledger__note">{tr('実経過には放置・オフライン・演出・入力待ちを含み、結果確定後の受取待ちは含みません。未計測は0秒として数えません。時給は計測した試行だけの過去実績で、将来の収穫を保証しません。薬は個数のまま集計し、収穫と相殺しません。')}</p>
        <h3>{tr('探索履歴')}</h3><ol className="expedition-ledger__history">{visible.map(record=><li key={record.runId}><strong>{dungeonName(record.dungeonId)}</strong><span>{tr(outcomeLabels[record.outcome])} · {duration(record.durationMs)}</span><small>{record.contentVersion} / {tr('ルール')} {record.rulesVersion}</small></li>)}</ol>
      </>}
    </div>
  </InventorySection>;
}
