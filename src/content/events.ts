import type { DungeonDef } from '../domain/types';

/** Short repeatable routes: swarms, healing, and sturdy guards. */
export const stoneEvents: DungeonDef[] = [
  {
    id: 'event-stardust-garden', kind: 'event', name: '星屑の庭',
    subtitle: '月翅の群れを抜け、星の欠片を拾う。',
    description: '月の光が降り積もる庭。月翅の蛾と白霧の狼を越え、最後に月翅の主へ挑む。全体攻撃を活かす短い2Wave。踏破のたびに祈願石1個。',
    artId: 'encounter-moon-moth', published: true,
    waves: [[{ characterId: 'moon-moth' }, { characterId: 'moon-moth' }, { characterId: 'pale-wolf' }], [{ characterId: 'moon-moth', boss: true }]],
  },
  {
    id: 'event-whiteflower-path', kind: 'event', name: '白花の祈り路',
    subtitle: '癒しの祈りが響く回廊を、ひと息に。',
    description: '白い花が導く祈りの道。帳の巫女が狼を癒し、奥では巫女自身が道を守る。攻撃重視で回復を上回る短い2Wave。踏破のたびに祈願石1個。',
    artId: 'encounter-veil-priestess', published: true,
    waves: [[{ characterId: 'veil-priestess' }, { characterId: 'pale-wolf' }], [{ characterId: 'veil-priestess', boss: true }]],
  },
  {
    id: 'event-silver-lantern', kind: 'event', name: '銀灯の守門',
    subtitle: '石燐の鱗と銀の鎧、その先の灯へ。',
    description: '銀灯が揺れる古い門。石燐の幼竜と荊の魔女を越え、虚ろの守り手と向き合う。回復を織り交ぜて守りを崩す短い2Wave。踏破のたびに祈願石1個。',
    artId: 'encounter-hollow-keeper', published: true,
    waves: [[{ characterId: 'stone-drake' }, { characterId: 'thorn-witch' }], [{ characterId: 'hollow-keeper', boss: true }]],
  },
];
