import { mkdir, writeFile } from 'node:fs/promises';
import { content } from '../src/content';
import { IVORY_TOWER_CURVE } from '../src/content/ivory-tower';
import { advanceReplay, createBattle, resolveRound, usePotion, useBattleBloom, useBattleFairy } from '../src/domain/engine';
import { bossWindupStatus } from '../src/domain/boss-pressure';
import { partyOrderOptions } from '../src/domain/party-orders';
import { ivoryTowerId, TOWER_ROUND_LIMIT } from '../src/domain/ivory-tower';
import type { MemoryGem } from '../src/domain/memory-gems';
import type { Battle, Content } from '../src/domain/types';

const seedArg = process.argv.find(arg => arg.startsWith('--seeds='));
const seeds = seedArg ? Number(seedArg.split('=')[1]) : 3;
if (!Number.isInteger(seeds) || seeds < 1 || seeds > 20) throw Error('Use --seeds=1..20');
const selected = process.argv.find(arg => arg.startsWith('--party='))?.split('=')[1];
export const towerBalanceParties = [
  { name:'initial', ids:['seris','liora','elaine','noelle'], leader:'liora' },
  { name:'SSR', ids:['nox','athena','selene','asteria'], leader:'athena' },
  { name:'mixed-awakened', ids:['seris-awakened','athena','selene','zakuro'], leader:'athena' },
  { name:'curse-burst', ids:['kuzuha-awakened','athena','selene','zakuro'], leader:'kuzuha-awakened' },
  { name:'rabbits', ids:['lunette-awakened','athena','selene','seris-awakened'], leader:'lunette-awakened' },
  { name:'battery', ids:['nox','athena','selene','vespera'], leader:'athena' },
  { name:'double-tank', ids:['seris-awakened','athena','evelyn','selene'], leader:'athena' },
  { name:'acceleration', ids:['seris-awakened','athena','selene','eos'], leader:'eos' },
  { name:'awakened', ids:['seris-awakened','liora-awakened','elaine-awakened','noelle-awakened'], leader:'liora-awakened' },
  { name:'defensive-SSR', ids:['nox','evelyn','selene','benzaiten'], leader:'evelyn' },
  { name:'XR-ceiling', ids:['astraea','evelyn','selene','benzaiten'], leader:'evelyn' },
];
const parties = towerBalanceParties.filter(party => !selected || party.name === selected);
if (!parties.length) throw Error('Unknown party');
export const towerBalanceQualities = [
  { name:'bare', power:-1, value:0 }, { name:'legacy-basic', power:0, value:0 },
  { name:'practical', power:35, value:35 }, { name:'excellent', power:75, value:75 },
  { name:'ideal', power:100, value:100 },
];
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

export function runTowerBattle(floor: number, party: typeof parties[number], quality: typeof towerBalanceQualities[number], seed: number, frameActions = true) {
  let battle = createBattle(content,party.ids,party.leader,ivoryTowerId(floor),5,seed,`tower-balance-${floor}-${seed}`);
  if (quality.power >= 0) {
    // Identical base skills and variants isolate roll quality; no tier-specific gear swap.
    const defIds = ['shield-break','pale-ward','hollow-lantern','dawn-crown'];
    battle.memoryGems = Object.fromEntries(party.ids.map((id,index) => [id, {
      id:`balance-${index}`, defId:defIds[index], variant:'pure',
      ...(quality.name === 'legacy-basic' ? {} : { roll:{ power:quality.power, trait:index === 0 || index === 3 ? 'execution' : 'bulwark', value:quality.value } }),
    } satisfies MemoryGem]));
  }
  let rounds=0, guard=0, broken=0, steps=0;
  while (!['failed','reward'].includes(battle.phase) && steps++ < 3000) {
    if (battle.phase === 'playing') { battle=advanceReplay(battle,content); continue; }
    if (frameActions) {
      const wounded = battle.units.some(unit => unit.side === 'party' && unit.hp > 0 && unit.hp < unit.maxHp * .65);
      battle.crystalRole = wounded ? 'healer' : content.characters.find(character => character.id === party.ids[0])!.role;
      if (battle.fairies?.visitor) { battle = useBattleFairy(battle, battle.fairies.visitor.id, content); continue; }
      if (battle.blooms?.flower) { battle = useBattleBloom(battle, battle.blooms.flower.id, content).battle; continue; }
    }
    prepareOrder(battle,content);
    guard += Number(battle.partyOrder?.kind === 'guard');
    battle=resolveRound(battle,content).battle;
    broken+=battle.events.filter(event => event.text.includes('溜めを崩した')).length;
    rounds++;
  }
  return { win:battle.phase === 'reward', rounds, guard, broken, survivors:battle.units.filter(unit => unit.side === 'party' && unit.hp > 0).length, potions:5-battle.potionsRemaining };
}

if (process.argv[1]?.endsWith('balance-tower.ts')) {
const records = [];
for (const party of parties) for (const quality of towerBalanceQualities) {
  const byFloor: {floor:number;wins:number;seeds:number;rounds:number;survivors:number}[]=[];
  let frontier=0;
  for(let floor=1;floor<=100;floor++) {
    const outcomes=Array.from({length:seeds},(_,index)=>runTowerBattle(floor,party,quality,index+1));
    const result={floor,wins:outcomes.filter(outcome=>outcome.win).length,seeds,rounds:outcomes.reduce((sum,outcome)=>sum+outcome.rounds,0)/seeds,survivors:outcomes.reduce((sum,outcome)=>sum+outcome.survivors,0)/seeds};
    byFloor.push(result);
    if (!result.wins) break;
    frontier=floor;
  }
  const hundred=Array.from({length:seeds},(_,index)=>runTowerBattle(100,party,quality,index+1));
  const consecutive = (requiredWins: number) => { let floor=0; for (const entry of byFloor) { if (entry.wins < requiredWins) break; floor=entry.floor; } return floor; };
  const result={party:party.name,gear:quality.name,seeds,frontier,reliableFrontier:consecutive(seeds),majorityFrontier:consecutive(Math.ceil(seeds/2)),floor100Wins:hundred.filter(outcome=>outcome.win).length,byFloor};
  records.push(result);console.log(JSON.stringify({...result,byFloor:undefined}));
}
await mkdir('artifacts/ivory-tower',{recursive:true});
await writeFile(`artifacts/ivory-tower/balance${selected ? '-' + selected : ''}.json`,JSON.stringify({kind:'real-domain-engine',roundLimitPerWave:TOWER_ROUND_LIMIT,curve:IVORY_TOWER_CURVE,policy:'read-boss-supports-gems-items-ultimates-and-frame-actions',frontierDefinitions:{frontier:'Highest contiguous floor with at least one win; retries can change turn-order seed.',reliableFrontier:'Highest contiguous floor won under every sampled seed.',majorityFrontier:'Highest contiguous floor won under at least half of sampled seeds.',floor100Wins:'Direct summit samples, not proof that earlier floors were cleared.'},assumptions:{potionsPerEncounter:5,crystalResonance:'adaptive-healer-or-pilot',frameFlowers:true,fairyCharges:true,qualityChangesOnlyRolls:true,initialPartyReorderedForAttackPilot:true,XRProfileIsFutureStressTest:true},loadout:['shield-break','pale-ward','hollow-lantern','dawn-crown'],qualities:towerBalanceQualities,records},null,2));

}
