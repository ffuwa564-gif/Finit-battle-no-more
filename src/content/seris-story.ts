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
  { characterId: 'seris', encounter: '朝の来ない街で剣を振るう旅人。雨上がりの石畳を、いつも懐かしそうに眺めている。彼女の剣には、夜より暗いひびが一本ある。', companion: '礼拝堂の白花、門の鍵、星図の余白、遠い鐘。知らないはずのものに触れるたび、剣を握る手が止まる。「誰かと、帰る約束をした気がするんだ」', awakened: '街が滅びる朝を、セリスは剣で切り離した。その夜に誰がいたのか、やがて思い出せなくなった。封印を解いた後も剣にはひびが残る。四人の顔を確かめてから鞘へ戻すと、セリスは皆の後ろについた。前へ出ようとして、一度足を止める。「……今日は、道を教えてもらっていい？」' },
  { characterId: 'elaine', encounter: '礼拝堂の花は、いつも一輪だけ多い。誰のためか尋ねると、彼女は旅人の剣を見た。', companion: '旅立ちの日、エレインはセリスに花を渡さなかった。「帰ったら、一緒に摘みましょう」。その言葉だけが、祈りの途中で何度も唇に戻る。', awakened: 'セリスを送り出した日から、エレインは礼拝堂の花を一輪多く世話してきた。朝が戻り、一緒に摘む約束をようやく果たせそうになると、療養室の鉢に目が留まった。「これはまだ、ここに要るんです」。摘みかけた手を引き、代わりに鉢皿の水を替えた。' },
  { characterId: 'liora', encounter: '門を破った傷は、外側にはひとつもない。錆銀の騎士は、鍵を誰にも預けない。', companion: '最後の勅命は、城門を閉ざすことだった。盾の裏の命令書には、リオラ自身の筆跡で「破棄」とある。その上に重ねた庭園の女の指示書には、折り目が一つもなかった。', awakened: 'あの夜、閉ざせと命じられた門を、リオラは内側から開けた。命令書は捨てず、盾の裏に残してある。今は門柱のそばに立ち、人が通るたび盾を引く。「そこに立つな。後が詰まる」。セリスにも同じ調子で声をかけ、全員が抜けるまで戸口を空けていた。' },
  { characterId: 'noelle', encounter: '彼女の本には、一夜分だけ朝の記録がある。末尾の名前は、何度も書き直されていた。', companion: '星図に朝を描くたび、同じ場所のインクが消える。ノエルはそこにセリスの名を書き、消える前に声に出して読んだ。帰還を記す欄はある。けれど、セリスが自分の意思で夜の外へ出る道を、ノエルはまだ描けずにいた。', awakened: '封印を解けば、街は止められていた滅びと再び向き合う。ノエルは一人に代償を負わせる計算を捨て、星図の余白に四人の役目と退避の合図を書き込んだ。水門が開き、剣が最後の封印を解いた後、彼女は戻った明け星の位置を記す。名前の横に、帰還の時刻を一つずつ添えながら。' },
  { characterId: 'lisette', encounter: 'リゼットは剣を合わせると、刃を滑らせて相手の手元を押さえる。セリスはその受け方を教わっていない。師の割れた鐘の耳飾りが、踏み込むたびに鳴った。', companion: 'セリスに剣を教えた女は、玉座の前で道を塞いだ。「水はまだ引いていない。今ここを斬れば、戻る道まで潰れる」。剣を抜いたまま、床の震えを確かめていた。', awakened: '水門が開いても、止めていた朝が安全に戻る保証はなかった。足元の揺れが弱まるのを確かめ、リゼットはようやく剣を出口へ向けた。弟子が封印を斬る間、その背後に立つ。鐘が鳴った後も、皆を街へ戻す道を見ていた。' },
  { characterId: 'pale-wolf', encounter: '白霧の足跡は、礼拝堂から門へ続く。', companion: '狼は紺の外套の裾を嗅ぐと、雨上がりの道に伏せた。帰る者を待つ仕草だった。', awakened: '霧の向こうに、まだ名を呼ぶ声が残っている。' },
  { characterId: 'thorn-witch', encounter: '枯園の荊には、白い布の切れ端が結ばれている。', companion: '「あの剣が朝を斬った日から、種は芽を出す夢ばかり見る」。魔女は新しい鉢を窓辺に置いた。', awakened: 'その鉢を誰に贈るのか、まだ決めていない。' },
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
