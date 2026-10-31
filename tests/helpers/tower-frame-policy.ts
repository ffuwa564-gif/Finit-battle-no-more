import { content } from '../../src/content';
import { advanceReplay, createBattle, resolveRound, usePotion, useBattleFairy, useBattleBloom } from '../../src/domain/engine';
import { bossWindupStatus } from '../../src/domain/boss-pressure';
import { partyOrderOptions } from '../../src/domain/party-orders';
import { ivoryTowerId } from '../../src/domain/ivory-tower';
import type { MemoryGem } from '../../src/domain/memory-gems';
import type { Battle, Content } from '../../src/domain/types';

/** Fixed legal party and counter-build; sparse-floor stress policy, not a frontier search. */
const party = { name:'actual-SSR', ids:['nox','athena','selene','asteria'], leader:'athena' };
export interface TowerFrameQuality { power: number; value: number }
const damage = new Set(['attack','area','pierce','drain','shatter','dawn']);

function prepareOrder(battle: Battle, c: Content): void {
  let friends = battle.units.filter(unit => unit.side === 'party' && unit.hp > 0);
  const enemies = battle.units.filter(unit => unit.side === 'enemy' && unit.hp > 0);
  if (!friends.length || !enemies.length) return;
  const wounded = [...friends].sort((a,b) => a.hp/a.maxHp-b.hp/b.maxHp)[0];
  if (wounded.hp < wounded.maxHp*.4 && battle.potionsRemaining > 0 && !battle.potionUsed) { Object.assign(battle, usePotion(battle, wounded.uid)); friends = battle.units.filter(unit => unit.side === 'party' && unit.hp > 0); }
  const pilot = friends.find(unit => unit.characterId === battle.partyIds[0]);
  if (!pilot) return;
  const boss = enemies.find(unit => unit.boss);
  const strike = c.dungeons.find(dungeon => dungeon.id === battle.dungeonId)?.bossStrike;
  const pressure = boss && strike ? bossWindupStatus(boss,strike,battle.round) : undefined;
  const healer = enemies.find(unit => c.characters.find(character => character.id === unit.characterId)?.role === 'healer');
  const weak = [...enemies].sort((a,b) => a.hp-b.hp)[0];
  battle.focusTargetId = pressure?.phase === 'charging' ? boss!.uid : (healer ?? weak).uid;
  for (const friend of friends) if (friend.uid !== pilot.uid && friend.ultimateCharge === 100) {
    const role = c.characters.find(character => character.id === friend.characterId)!.role;
    if (role !== 'healer' || friends.some(unit => unit.hp < unit.maxHp*.75)) friend.ultimateQueued = true;
  }
  const opts = partyOrderOptions(pilot,battle,c).filter(option => !option.disabled);
  const emergency = friends.some(unit => unit.hp < unit.maxHp*.4);
  const heal = opts.find(option => ['heal','mend_pair','cleanse'].includes(option.template));
  const ultimate = opts.find(option => option.id === 'ultimate');
  const gem = opts.find(option => option.id.startsWith('skill:memory:') && damage.has(option.template));
  const attack = opts.filter(option => option.order?.kind === 'skill' && damage.has(option.template)).at(-1);
  battle.partyOrder = pressure?.phase === 'striking' ? {kind:'guard'} : emergency && heal ? heal.order ?? undefined : ultimate?.order ?? gem?.order ?? attack?.order ?? undefined;
}

export function runFrameAssistedTower(floor: number, quality: TowerFrameQuality, seed: number) {
  let battle = createBattle(content,party.ids,party.leader,ivoryTowerId(floor),5,seed,`tower-balance-${floor}-${seed}`);
  if (quality.power >= 0) {
    const defIds = ['shield-break','pale-ward','hollow-lantern','dawn-crown'];
    battle.memoryGems = Object.fromEntries(party.ids.map((id,index) => [id, {
      id:`balance-${index}`, defId:defIds[index], variant:'pure',
      roll:{ power:quality.power, trait:index === 0 || index === 3 ? 'execution' : 'bulwark', value:quality.value },
    } satisfies MemoryGem]));
  }
  let rounds=0, guard=0, broken=0, steps=0;
  while (!['failed','reward'].includes(battle.phase) && steps++ < 3000) {
    if (battle.phase === 'playing') { battle=advanceReplay(battle,content); continue; }
    battle.crystalRole = content.characters.find(character => character.id === party.ids[0])!.role;
    if (battle.fairies?.visitor) { battle = useBattleFairy(battle, battle.fairies.visitor.id, content); continue; }
    if (battle.blooms?.flower) { battle = useBattleBloom(battle, battle.blooms.flower.id, content).battle; continue; }
    prepareOrder(battle,content);
    guard += Number(battle.partyOrder?.kind === 'guard');
    battle=resolveRound(battle,content).battle;
    broken+=battle.events.filter(event => event.text.includes('溜めを崩した')).length;
    rounds++;
  }
  return { win:battle.phase === 'reward', rounds, guard, broken, survivors:battle.units.filter(unit => unit.side === 'party' && unit.hp > 0).length, potions:5-battle.potionsRemaining };
}


