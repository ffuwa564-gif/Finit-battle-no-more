import type { AssetDef, CharacterDef, ChapterDef, DungeonDef, NovelPageDef, NovelSceneDef, SkillDef } from '../domain/types';

/** The retinue is part of Zakuro's illustration and skills, not extra turns or hidden units. */
export const zakuroSkills: SkillDef[] = [
  { id: 'area-28', name: '配役・天よりの葬列', template: 'area', strength: 28, soundProfile: 'area' },
  { id: 'barrier-28', name: '愛護・一人も欠けぬ庭', template: 'barrier', strength: 28, soundProfile: 'guard' },
];
export const zakuroCharacter: CharacterDef = {
  id: 'zakuro', name: 'ザクロ', epithet: '怠惰姫', speciesId: 'pomegranate', role: 'area_attacker',
  strength: 28, rarity: 'SSR', origin: ['recruit'], published: true,
  leaderStat: 'defense', leaderEffect: 'bulwark', skillIds: ['area-28', 'barrier-28'],
  artId: 'zakuro-art', portraitId: 'zakuro-portrait', encounterArtId: 'encounter-zakuro', soundProfile: 'default',
  flavor: '黒い神輿に身を預け、地にも空にも数多の少女を従える庭園の管理者。自分の足で歩くことさえ億劫がるが、一人ずつ異なる愛情の注ぎ方、少女同士の関係、役割の配分、個体を迎える儀式には一切手を抜かない。この世界で多くの個体が同じ庭に生きられることこそ、その才の証だ。他の管理者たちは彼女の無遠慮を好まない。それでも、あの庭を保てるのはザクロだけだと認めている。樹海で出会った侵入者へ、彼女は寝そべったまま、ためらいなく殲滅を命じる。',
  dialogue: {
    intro: '右の子は退路。空の子たちは盾の裏。……全員、容赦しなくていいわ。',
    threshold: 'その子はもう休ませて。次の列、お願い。……あなたたちへの手間は、惜しまないの。',
    defeat: '追撃はやめて。傷のある子から戻りなさい。……私が、一人ずつ診るわ。',
  },
};
const art = { path: 'art/zakuro.webp', width: 1024, height: 1536,
  rights: 'Original AI-generated Zakuro and adult female retinue illustration created for STILLVEIL on 2026-10-29.' };
export const zakuroAssets: AssetDef[] = [
  { ...art, id: 'zakuro-art', kind: 'illustration', anchor: '50% 30%' },
  { ...art, id: 'zakuro-portrait', kind: 'portrait', anchor: '48% 30%', portraitZoom: 3, portraitOrigin: '48% 30%' },
  { ...art, id: 'encounter-zakuro', kind: 'background', anchor: '50% 25%' },
];
export const zakuroChapter: ChapterDef = {
  id: 'pomegranate-forest', number: 4, title: '柘榴の樹海',
  subtitle: 'リオラと新しい個体を迎えるため、契生石の眠る森へ。',
  dungeonIds: ['ritual-stone-grove', 'zakuro-procession'],
  bossHint: '3ターンごとの全体攻撃。障壁と回復で備え、ザクロの障壁を砕いて反撃しよう。',
};
export const zakuroDungeons: DungeonDef[] = [
  {
    id: 'ritual-stone-grove', chapterId: zakuroChapter.id, kind: 'normal', name: '契生石の樹海',
    subtitle: 'ふたりの先へ続く可能性を、石に託す。',
    description: '第三章の先に開く樹海。リオラと特別な個体を生み出す儀式に必要な契生石を探す。クリア確認で契生石1個を獲得。',
    artId: 'encounter-zakuro', published: true, previousDungeonId: 'pale-throne',
    waves: [[{ characterId: 'moon-moth' }, { characterId: 'pale-wolf' }], [{ characterId: 'stone-drake', boss: true }]],
    bossLoot: { guaranteed: [{ materialId: 'ritual-stone:rare', count: 1 }] },
    narrative: {
      before: 'リオラと、私たちの特別な個体を生み出す儀式について話した。必要な契生石は樹海にしかない。彼女は盾を背負い、「私も行く。今回は、私自身が望んだことだ」と言った。',
      after: '苔むした根元から契生石を拾い、リオラとひとつずつ確かめて包む。帰ろうとした頭上で、少女の影が枝から離れた。前も後ろも、黒い衣の少女たちに塞がれていた。',
    },
  },
  {
    id: 'zakuro-procession', chapterId: zakuroChapter.id, kind: 'normal', name: '怠惰姫の渡御',
    subtitle: '彼女は動かない。地も、空も、すでに配役の中。',
    description: '契生石の樹海を踏破して解放。神輿でくつろぐ怠惰姫ザクロが、統率した少女たちを差し向ける。地上と空からの連携攻撃と、仲間を守る障壁に備えよう。',
    artId: 'encounter-zakuro', published: true, previousDungeonId: 'ritual-stone-grove',
    waves: [[{ characterId: 'zakuro', boss: true }]], bossScale: { hp: 650, attack: 140 },
    bossStrike: { every: 3, power: 260, name: '総配役・地天の包囲' },
    bossLoot: { guaranteed: [{ materialId: 'pomegranate:rare', count: 1 }], bonus: { chance: 20, reward: { materialId: 'pomegranate:epic', count: 1 } } },
    narrative: {
      before: '神輿に寝そべる赤髪の女を見て、リオラが「怠惰姫ザクロ」と呟く。話しかける暇はなかった。「退路を塞いで。空から盾の裏を」。眠たげな声が落ちた瞬間、少女たちが一斉に襲いかかった。',
      after: '包囲の継ぎ目を抜けても、ザクロは私たちを許さなかった。追撃を切ったのは、少女の袖に血を見つけたからだ。彼女は神輿の上で傷を確かめ、役割を組み直す。その手つきに、怠惰はなかった。',
    },
  },
];

export const zakuroEncounterNovel: NovelSceneDef = {
  id: 'zakuro-forest-encounter', title: '樹海 ― 怠惰姫の行列',
  trigger: { kind: 'dungeon-clear', dungeonId: 'ritual-stone-grove' },
  pages: [
    { backgroundId: 'encounter-zakuro', text: '契生石を包み終えたとき、鈴が鳴った。\n地上にも、頭上の枝の間にも、少女がいた。誰も迷わず、別々の位置へ散っていく。' },
    { backgroundId: 'encounter-zakuro', speaker: 'リオラ', text: '……怠惰姫ザクロ。庭園の管理者だ。\n動くな。あの行列は、もう私たちを囲んでいる。' },
    { backgroundId: 'encounter-zakuro', text: '黒い神輿に、赤髪の女が横たわっていた。\n彼女は少女の手首の飾りを結び直し、「昨日と同じ役はつらいでしょう」と、隣の子へ灯りを渡す。' },
    { backgroundId: 'encounter-zakuro', speaker: '私', text: 'あれだけの個体が、同じ庭に……。' },
    { backgroundId: 'encounter-zakuro', speaker: 'リオラ', text: '数だけではない。誰が誰の隣なら落ち着くか、何を任せられるか。\n愛情も関係も、儀式も、整え続けている証拠だ。' },
    { backgroundId: 'encounter-zakuro', speaker: '私', text: '私たちは、儀式の石を探しに来ただけで――' },
    { backgroundId: 'encounter-zakuro', speaker: 'ザクロ', text: '聞いていないわ。\n地上は退路。空は盾の裏。ためらわず、仕留めて。' },
    { backgroundId: 'encounter-zakuro', text: '警告も、試すための手加減もなかった。\n少女たちが降る。リオラの盾が、私の目の前を塞いだ。', shade: 'dark' },
  ],
};
export const zakuroEpilogue: NovelPageDef[] = [
  { backgroundId: 'encounter-zakuro', text: '一人が傷つくと、別の子が前へ出る。\nザクロは誰の名前も取り違えず、帰る列と守る列を分けた。最後まで、神輿から立ち上がらなかった。' },
  { backgroundId: 'encounter-zakuro', speaker: 'ザクロ', text: '手を抜いていいのは、私が歩くところだけ。\nこの子たちを迎えた儀式も、今日を生きる役目も、明日の居場所も。省いたことは、一度もないわ。' },
  { backgroundId: 'encounter-zakuro', text: '友好の申し出はなく、私たちは森を離れた。\n容赦なく襲ってきた女の手が、傷ついた少女へ触れるときだけ、驚くほど優しかった。' },
  { backgroundId: 'novel-awakening-garden', speaker: '庭園の女', text: 'ザクロに会ったの？ 相変わらず無作法ね。\n好きにはなれないけれど、あの数の個体を、互いに壊させずに育てる才能は本物よ。他の管理者たちも、それは認めているわ。' },
  { backgroundId: 'novel-awakening-garden', speaker: 'リオラ', text: '私たちの儀式も、石を揃えれば終わりではない。\n迎える個体に、誰かの代わりをさせたくない。役割を与える前に、その子の声を聞こう。' },
  { backgroundId: 'novel-awakening-garden', speaker: '私', text: 'うん。今度は、途中で止まることも一緒に決めよう。\n契生石を机に置く。儀式の準備は、ここからだった。' },
];
