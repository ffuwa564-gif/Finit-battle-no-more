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
  flavor: '黒い神輿に寝そべり、地にも空にも数多の少女を連れる庭園の管理者。少女の名と傷、隣にいると落ち着く相手まで覚えている。自分で歩くことは億劫がるが、一人ずつへの愛情、役目の交代、個体を迎える儀式には手を抜かない。多くの個体が同じ庭で生きられる、その才を他の管理者も認めている。ただし、好かれてはいない。自分の庭へ近づく者には、事情を聞かず殲滅を命じるからだ。黒柘榴の素材を携えた招きにも、少女たちの居場所を確かめるまで頷かない。同行は服従でも、かつての襲撃への謝罪でもない。',
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
      before: '街に朝が来てからも、療養室へ通う日々が続いた。その帰り道、リオラが「私も、誰かを迎える側に立ちたい」と言った。失った人の代わりではない一人を迎えるため、二人で中断の手順まで確かめ、個体の輪郭を支える契生石を探しに樹海へ入った。',
      after: '苔むした根元で契生石を拾い、二人で確かめて包んだ。帰り道、絡んだ枝の下をくぐると、頭上で鈴が鳴った。赤い紐が風もなく張る。境を示す標だったのだと気づいたとき、黒い衣の少女たちが前後の道を塞いでいた。',
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
      before: '枝に隠れた標の向こうは、ザクロの行列が通る道だった。神輿の女は、私たちの盾と石包みへ目を細める。「この子たちのところへ、近づけないで」。事情を聞く気配もなく、地上と空へ合図が飛んだ。リオラの盾に、最初の刃が落ちる。',
      after: 'リオラの盾で一列を押し返し、包囲の継ぎ目へ走る。ザクロが追撃を切ったのは、少女の袖に血を見つけたからだった。彼女は名前を呼び、傷のある腕から鈴を外して、別の子へ渡す。こちらに背を向けたその手に、怠惰はなかった。',
    },
  },
];

export const zakuroEncounterNovel: NovelSceneDef = {
  id: 'zakuro-forest-encounter', title: '樹海 ― 怠惰姫の行列',
  trigger: { kind: 'dungeon-clear', dungeonId: 'ritual-stone-grove' },
  pages: [
    { backgroundId: 'encounter-zakuro', text: '帰り道、絡んだ枝の下をくぐると、鈴が鳴った。\n苔の奥に赤い紐が見えた。地上にも、頭上の枝の間にも、少女がいた。誰も迷わず、別々の位置へ散っていく。' },
    { backgroundId: 'encounter-zakuro', speaker: 'リオラ', text: '……その鈴は、庭の境を示すものだ。枝に隠れていたのか。\n怠惰姫ザクロ。動くな。あの行列は、もう私たちを囲んでいる。' },
    { backgroundId: 'encounter-zakuro', text: '黒い神輿に、赤髪の女が横たわっていた。\n「今日は左手ね。右は昨日、痛めたでしょう」。少女の飾り紐を結び直し、隣の子へ灯りを渡す。こちらを見るのは、その後だった。' },
    { backgroundId: 'encounter-zakuro', speaker: '私', text: 'あれだけの個体が、同じ庭に……。\n私たちは、たった一人を迎える準備だけで、こんなに迷っているのに。' },
    { backgroundId: 'encounter-zakuro', speaker: 'リオラ', text: 'あの灯り持ち、さっきまで列の外にいた。隣の子が手を引いたら戻った。\n命じるだけでは、あの数は暮らせない。あの女は、一人ずつ見ている。' },
    { backgroundId: 'encounter-zakuro', speaker: '私', text: '境だと知らなかった。私たちは、儀式の石を探しに来ただけで――' },
    { backgroundId: 'encounter-zakuro', speaker: 'ザクロ', text: '聞いていないわ。この子たちに近づけないで。\n地上は退路。空は盾の裏。ためらわず、仕留めて。' },
    { backgroundId: 'encounter-zakuro', text: '警告も、試すための手加減もなかった。\n少女たちが降る。リオラの盾が、私の目の前を塞いだ。', shade: 'dark' },
  ],
};
export const zakuroEpilogue: NovelPageDef[] = [
  { backgroundId: 'encounter-zakuro', text: '「あなたは戻って。隣は、あの子に頼んで」。\nザクロは少女の袖を裂き、傷に巻いた。名前を取り違えることはなかった。最後まで、神輿から立ち上がらなかった。' },
  { backgroundId: 'encounter-zakuro', speaker: 'ザクロ', text: 'その子は高いところが怖いの。灯りを持つ役へ戻して。\n……私が歩くのは面倒よ。でも、この子が泣く理由を確かめるのまで、省いたことはないわ。' },
  { backgroundId: 'encounter-zakuro', text: '赤い紐を背に、私たちは森を離れた。追ってこないのは、許されたからではない。\nザクロは傷ついた少女へ顔を寄せていた。あの声で、ついさっき、私たちを仕留めろと命じたのだ。' },
  { backgroundId: 'novel-awakening-garden', speaker: '庭園の女', text: 'ザクロに会ったの？ 相変わらず、話を聞かないのね。\nあの女を好く管理者には会ったことがないわ。でも、あれだけの個体が、互いを壊さず同じ庭で暮らし続けている。その才は、誰も否定しない。' },
  { backgroundId: 'novel-awakening-garden', speaker: 'リオラ', text: '次は、樹海へ入る前に道を確かめよう。私の盾だけでは、守れないものがあった。\n……石は、まだここにある。迎える子の寝床は、窓の近くでいいだろうか。明るいところを嫌うかもしれないな。' },
  { backgroundId: 'novel-awakening-garden', speaker: '私', text: '聞いてから、決めよう。\n契生石を机に置き、二人で決めた中断の手順を開く。夕方には療養室へ行く。持ち帰った石は、失くした人を取り戻すためのものではなかった。' },
];
