import { mkdirSync, writeFileSync } from 'node:fs';
import { content } from '../src/content';
import { createBattle, advanceReplay, resolveRound, usePotion } from '../src/domain/engine';
import type { Strategy } from '../src/domain/types';

export const clockTeams = [
  { name: 'acceleration-fortuna', ids: ['eos-standard','selene','seris-awakened','fortuna'], leader: 'eos-standard' },
  { name: 'same-without-acceleration', ids: ['eos-standard','selene','seris-awakened','fortuna'], leader: 'fortuna' },
  { name: 'acceleration-knight', ids: ['eos-standard','selene','seris-awakened','liora-awakened'], leader: 'eos-standard' },
  { name: 'acceleration-no-gacha-SSR', ids: ['eos-standard','elaine-awakened','seris-awakened','liora-awakened'], leader: 'eos-standard' },
  { name: 'counter', ids: ['selene','iwanagahime','seris-awakened','rainbow-iris'], leader: 'selene' },
  { name: 'power', ids: ['athena','selene','asteria','freyja'], leader: 'athena' },
  { name: 'starter', ids: ['elaine','liora','seris','noelle'], leader: 'liora' },
];
export function simulateClock(team: typeof clockTeams[number], seed: number, policy: Strategy | 'switch' = 'switch') {
  let battle = createBattle(content, team.ids, team.leader, 'frozen-dawn-clock', 5, seed, `clock-${seed}`);
  const turns: { round: number; damage: number; breaks: number; bossHp: number; living: number; acceleration: boolean; finale: boolean }[] = [];
  while (battle.phase !== 'reward' && battle.phase !== 'failed' && turns.length < 45) {
    if (battle.phase === 'playing') { battle = advanceReplay(battle, content); continue; }
    battle.strategy = policy === 'switch' ? battle.round <= 7 ? 'survival' : 'aggressive' : policy;
    const weakest = battle.units.filter(unit => unit.side === 'party' && unit.hp > 0).sort((a,b) => a.hp/a.maxHp-b.hp/b.maxHp)[0];
    if (weakest && weakest.hp < weakest.maxHp * .55 && battle.potionsRemaining) battle = usePotion(battle, weakest.uid);
    const previous = battle.units.find(unit => unit.boss)!.hp, round = battle.round;
    battle = resolveRound(battle, content).battle;
    turns.push({ round, damage: previous - battle.units.find(unit => unit.boss)!.hp, breaks: battle.events.filter(event => event.clockAction === 'break').length, bossHp: battle.units.find(unit => unit.boss)!.hp, living: battle.units.filter(unit => unit.side === 'party' && unit.hp > 0).length, acceleration: battle.units.some(unit => unit.characterId === 'eos-standard' && unit.hp > 0) && team.leader === 'eos-standard', finale: battle.events.some(event => event.clockAction === 'finale') });
  }
  return { team: team.name, seed, policy, phase: battle.phase, turns, potions: 5 - battle.potionsRemaining };
}
if (process.argv[1]?.endsWith('balance-clock.ts')) {
  const results = clockTeams.flatMap(team => (['balanced','aggressive','survival','switch'] as const).flatMap(policy => Array.from({ length: 10 }, (_, index) => simulateClock(team, index + 1, policy))));
  for (const team of clockTeams) for (const policy of ['balanced','aggressive','survival','switch']) {
    const rows = results.filter(row => row.team === team.name && row.policy === policy);
    console.log(team.name, policy, { wins: rows.filter(row => row.phase === 'reward').length, rounds: rows.reduce((sum,row) => sum + row.turns.length, 0)/rows.length, firstBreak: rows[0]?.turns.find(turn => turn.breaks)?.round, lastHP: rows[0]?.turns.at(-1)?.bossHp });
  }
  mkdirSync('artifacts/frozen-dawn-clock', { recursive: true }); writeFileSync('artifacts/frozen-dawn-clock/balance.json', JSON.stringify(results, null, 2));
}
