import type { AwakeningDef, CharacterMemoryDef, DungeonDef, NamedMaterialDef, StorylineDef } from '../domain/types';

export const dawnStory: StorylineDef = {
  id: 'promised-dawn', title: '薄明の剣と、約束の朝', subtitle: '四つの記憶が、夜の向こうで彼女を待つ。',
  protagonistId: 'seris', relatedIds: ['elaine', 'liora', 'noelle', 'lisette'],
};
export const dawnMaterials: NamedMaterialDef[] = [
  { id: 'elaine-memory:rare', name: '白花の追憶' }, { id: 'liora-memory:rare', name: '開門の追憶' },
  { id: 'noelle-memory:rare', name: '明け星の追憶' }, { id: 'lisette-memory:rare', name: '弔鐘の追憶' },
  { id: 'seris-memory:rare', name: '薄明の剣片' },
];
export const dawnAwakenings: AwakeningDef[] = [
  ...dawnStory.relatedIds.map(id => ({ id: `awaken-${id}`, baseId: id, awakenedId: `${id}-awakened`, cost: { materialId: `${id}-memory:rare`, count: 40 }, requiredOwnedIds: [], requiredDungeonIds: [id === 'elaine' ? 'veiled-cloister' : id === 'liora' ? 'hollow-gate' : id === 'noelle' ? 'last-observatory' : 'pale-throne'] })),
  { id: 'awaken-seris', baseId: 'seris', awakenedId: 'seris-awakened', cost: { materialId: 'seris-memory:rare', count: 300 }, requiredOwnedIds: dawnStory.relatedIds.map(id => `${id}-awakened`), requiredDungeonIds: ['pale-throne'] },
];
export const dawnMemories: CharacterMemoryDef[] = [
  { characterId: 'seris', encounter: '朝の来ない街で剣を振るう旅人。雨上がりの石畳を、いつも懐かしそうに眺めている。彼女の剣には、夜より暗いひびが一本ある。', companion: '礼拝堂の白花、門の鍵、星図の余白、遠い鐘。知らないはずのものに触れるたび、剣を握る手が止まる。「誰かと、帰る約束をした気がするんだ」', awakened: '街が滅びる朝を、彼女は剣で切り離した。人々を守った夜は、やがて名前まで奪っていった。四人が取り戻したのは奇跡ではなく、明日を共に引き受ける約束。雨上がりの石畳を、彼女はもう懐かしそうには眺めない。その先へ、一緒に歩く人がいる。' },
  { characterId: 'elaine', encounter: '礼拝堂の花は、いつも一輪だけ多い。誰のためか尋ねると、彼女は旅人の剣を見た。', companion: '旅立ちの日、エレインはセリスに花を渡さなかった。「帰ったら、一緒に摘みましょう」。その言葉だけが、祈りの途中で何度も唇に戻る。', awakened: '朝を封じに行くセリスを、彼女は止められなかった。だから残した一輪は弔いではない。「今度は私も行く。帰り道で、花の名前を忘れないように」。白い花は、初めて朝露を待つ。' },
  { characterId: 'liora', encounter: '門を破った傷は、外側にはひとつもない。錆銀の騎士は、鍵を誰にも預けない。', companion: '最後の勅命は、城門を閉ざすことだった。リオラはその命令書を盾の裏に隠している。折り目の向こうに、セリスの足跡だけが残る。', awakened: 'あの夜、門を内側から開いたのはリオラだった。王国への誓いより、帰ってくる一人を選んだのだ。金色に継いだ盾を掲げ、今度は門の外でセリスを待つ。「帰還の許可なら、とうに出ている」' },
  { characterId: 'noelle', encounter: '彼女の本には、一夜分だけ朝の記録がある。末尾の名前は、何度も書き直されていた。', companion: '星図に朝を描くたび、同じ場所のインクが消える。ノエルはそこにセリスの名を書き、消える前に声に出して読んだ。', awakened: '封印を解けば、街は止められていた滅びと再び向き合う。ノエルはそれを知り、一人に代償を負わせる計算を捨てた。星図の余白に四人の名を添えると、消えていた明け星が戻った。' },
  { characterId: 'lisette', encounter: 'あの子に教えなかった構えがある。帰る者を、斬らずに止める構えだ。割れた鐘の耳飾りが、風のない夜に鳴った。', companion: 'セリスに剣を教えた女は、夜明けへの道を塞いだ。「救ったものを、その手で失う覚悟はある？」。問いの切っ先は、弟子よりも彼女自身へ向いている。', awakened: '弟子に街の命運を背負わせたまま、師は夜の終わりを恐れていた。弔鐘のひびを金で継ぎ、リゼットは剣を下ろす。「最後の稽古だ。今度は、私の隣を歩きなさい」。鐘は弔いではなく、朝の合図になる。' },
  { characterId: 'pale-wolf', encounter: '白霧の足跡は、礼拝堂から門へ続く。', companion: '狼は紺の外套の裾を嗅ぐと、雨上がりの道に伏せた。帰る者を待つ仕草だった。', awakened: '霧の向こうに、まだ名を呼ぶ声が残っている。' },
  { characterId: 'thorn-witch', encounter: '枯園の荊には、白い布の切れ端が結ばれている。', companion: '「あの剣が朝を斬った日から、種は芽を出す夢ばかり見る」。魔女は新しい鉢を窓辺に置いた。', awakened: 'その鉢は、まだ誰のためとも呼ばれていない。' },
];
const memberStages = ['veiled-cloister', 'hollow-gate', 'last-observatory', 'pale-throne'];
export function storyEncounter(stage: DungeonDef, index: number): DungeonDef {
  const member = dawnStory.relatedIds[memberStages.indexOf(stage.id)];
  if (!member) return stage;
  return { ...stage, storyId: dawnStory.id, artId: `${member}-art`,
    subtitle: ['花を一輪、残した理由。', '閉ざされた門は、内側から開いた。', '星図の余白に、消えた名前を。', '弔鐘の剣姫が、朝への道を塞ぐ。'][memberStages.indexOf(stage.id)]!,
    waves: [...stage.waves.slice(0, -1), [{ characterId: member, boss: true }]],
    bossLoot: { guaranteed: [{ materialId: `${member}-memory:rare`, count: 6 }, { materialId: 'seris-memory:rare', count: 3 }], bonus: { chance: 15, reward: { materialId: 'seris-memory:rare', count: 12 } } },
    description: `${stage.description} ${index === 9 ? 'リゼットを仲間にし、セリスへつながる最後の記憶を辿る。' : '記憶に囚われた仲間の声を聴き、覚醒への追憶を集める。'}`,
  };
}
export const dawnDungeons: DungeonDef[] = [
  ...dawnStory.relatedIds.map((id, index): DungeonDef => ({
    id: `memory-${id}`, storyId: dawnStory.id, kind: 'normal', name: `追憶・${['白花の約束', '開かれた門', '明け星の余白', '弔鐘の稽古'][index]}`, subtitle: '忘れたはずの夜を、もう一度。',
    description: '通常最奥の踏破後に開く追憶。関係者の追憶10個と薄明の剣片6個を確定で仮取得。20%で剣片12個を追加。',
    artId: `${id}-awakened-art`, published: true, previousDungeonId: 'pale-throne', bossScale: { hp: 500, attack: 100 },
    bossLoot: { guaranteed: [{ materialId: `${id}-memory:rare`, count: 10 }, { materialId: 'seris-memory:rare', count: 6 }], bonus: { chance: 20, reward: { materialId: 'seris-memory:rare', count: 12 } } },
    waves: [[{ characterId: index % 2 ? 'hollow-keeper' : 'thorn-witch' }, { characterId: 'veil-priestess' }], [{ characterId: id, boss: true }]],
  })),
  { id: 'memory-seris', storyId: dawnStory.id, kind: 'normal', name: '追憶・朝を斬った剣', subtitle: 'あの日の選択を、ひとりに返さない。',
    description: '四人の覚醒後に開く最後の追憶。薄明の剣片12個を確定で仮取得。20%で24個を追加。', artId: 'seris-awakened-art', published: true,
    previousDungeonId: 'pale-throne', requiresOwnedIds: dawnStory.relatedIds.map(id => `${id}-awakened`), bossScale: { hp: 500, attack: 100 },
    bossLoot: { guaranteed: [{ materialId: 'seris-memory:rare', count: 12 }], bonus: { chance: 20, reward: { materialId: 'seris-memory:rare', count: 24 } } },
    waves: [[{ characterId: 'hollow-keeper' }, { characterId: 'thorn-witch' }], [{ characterId: 'lisette', boss: false }], [{ characterId: 'seris-awakened', boss: true }]],
  },
];
