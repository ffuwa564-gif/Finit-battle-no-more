import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { createBattle } from '../src/domain/engine';
import type { BattleEvent } from '../src/domain/types';
import { statusNotices } from '../src/platform/status-feedback';

function fixture() {
  const party = content.characters.filter(c => c.origin.includes('initial')).map(c => c.id);
  const before = createBattle(content, party, party[0], 'silent-cathedral', 0, 42, 'status-notices').units;
  before.forEach(u => {u.hp = u.maxHp = 1000;});
  return {before, after: structuredClone(before)};
}
describe('status feedback follows saved combat outcomes', () => {
  it('distinguishes resisted status, skipped turn, and friendly fire without claiming infliction', () => {
    const {before, after} = fixture();
    const target = before[0];
    const event: BattleEvent = {id:'resist',kind:'debuff',text:'',actorId:before[1].uid,targetIds:[target.uid],ailment:'sleep',statusAction:'resist',unitsAfter:after};
    expect(statusNotices(event,before,1).map(n=>n.label)).toEqual(['睡眠 RESIST']);
    event.actorId=target.uid;event.statusAction='skip';
    expect(statusNotices(event,before,1).map(n=>n.label)).toEqual(['睡眠・行動不能']);
    event.statusAction='friendly_fire';event.ailment='charm';event.kind='attack';
    expect(statusNotices(event,before,1).map(n=>n.label)).toEqual(['魅了・同士討ち']);
  });
  it('reports application and removal even when cleansing has no HP change', () => {
    const {before, after} = fixture();
    after[0].ailments={sleep:{turns:2,sourceId:before[1].uid}};
    const event: BattleEvent={id:'apply',kind:'debuff',text:'',targetIds:[before[0].uid],unitsAfter:after};
    expect(statusNotices(event,before,1).map(n=>n.label)).toEqual(['睡眠']);
    expect(statusNotices({...event,kind:'buff',unitsAfter:before},after,1).map(n=>n.label)).toEqual(['睡眠解除']);
    before[0].hp=0;
    expect(statusNotices({...event,unitsAfter:before},after,1)).toEqual([]);
  });
  it('shows individual barrier absorption at the actual recipient including covered allies', () => {
    const {before,after}=fixture();
    before[0].barrier=100;before[0].barrierUntil=2;
    after[0].barrier=40;after[0].barrierUntil=2;
    before[1].barrier=50;before[1].barrierUntil=2;
    after[1].barrier=0;after[1].barrierUntil=2;after[1].hp-=20;
    const event:BattleEvent={id:'area',kind:'area',text:'',targetIds:[before[0].uid,before[1].uid],absorbed:110,unitsAfter:after};
    expect(statusNotices(event,before,1).map(n=>[n.unitId,n.label])).toEqual([
      [before[0].uid,'RESIST · 障壁吸収 60'],[before[1].uid,'障壁吸収 50'],[before[1].uid,'障壁消失'],
    ]);
  });
  it('does not mislabel recycling, expiry, boss sacrifice, or an HP-only hit as barrier resistance', () => {
    const {before,after}=fixture();before[0].barrier=100;before[0].barrierUntil=1;
    const event:BattleEvent={id:'consume',kind:'heal',text:'',targetIds:[before[0].uid],unitsAfter:after};
    expect(statusNotices(event,before,1)).toEqual([]);
    expect(statusNotices({...event,kind:'attack'},before,1)).toEqual([]);
    expect(statusNotices({...event,kind:'attack',absorbed:100,targetIds:[before[1].uid]},before,1)).toEqual([]);
    expect(statusNotices({...event,kind:'attack',absorbed:100},before,2)).toEqual([]);
    expect(statusNotices({...event,kind:'attack'},before,1,'shatter').map(n=>n.label)).toEqual(['障壁破壊']);
  });
  it('announces renewed buffs and shields but does not repeat unchanged effects each action', () => {
    const {before,after}=fixture();before[0].buffUntil=1;before[0].buffStrength=20;
    after[0].buffUntil=2;after[0].buffStrength=20;after[0].barrier=80;after[0].barrierUntil=2;
    const event:BattleEvent={id:'support',kind:'buff',text:'',unitsAfter:after};
    expect(statusNotices(event,before,1).map(n=>n.label)).toEqual(['攻撃↑','障壁 +80']);
    expect(statusNotices({...event,unitsAfter:structuredClone(after)},after,1)).toEqual([]);
  });
});
