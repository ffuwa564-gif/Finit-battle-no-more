import type {Battle,BattleEvent} from '../domain/types';
import './exploration-complete.css';
export function ExplorationComplete({battle,event,reducedMotion}:{battle:Battle;event?:BattleEvent;reducedMotion:boolean}){
 if(battle.hunt?.stage!=='boss'||event?.kind!=='wave')return null;
 return <div key={event.id} className={`exploration-complete${reducedMotion?' is-still':''}`} role="status" aria-label="Exploration complete"><span>EXPLORATION</span><strong>COMPLETE</strong><i aria-hidden="true"/><small>BOSS APPROACHING</small></div>;
}
