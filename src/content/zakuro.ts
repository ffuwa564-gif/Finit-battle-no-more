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
  flavor: '黒い神輿に寝そべり、地上にも空にも数多の少女を従える庭園の管理者。一人ひとりの名や傷、誰の隣にいると落ち着くかまで覚えている。自分で歩くのは億劫がるが、少女たちの世話や役目の交代、新たな個体を迎える儀式には手を抜かない。その才は他の管理者も認めるが、彼女を好む者は少ない。庭へ近づく相手には、事情を聞かず殲滅を命じる。黒柘榴の素材を携えて旅へ誘っても、留守を任せる相手が決まるまで返事はない。かつて刃を向けたことについても、謝る気配はない。',
  dialogue: {
    intro: '右の子は退路を塞いで。空の子たちは盾の後ろへ。……容赦はいらないわ。',
    threshold: 'その子の肩、血が滲んでいるわ。棒を下ろして。……次の子、持てる？',
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
      before: '街に朝が来てからも、療養室へ通う日々は続いた。リオラと儀式の準備をしていた日、世話をする者の名を書くところで、彼女の筆が止まった。「護衛、と書こうとした。……違うな。その子に何をしたいか聞いてみたい。一緒にやれることもあるかもしれない」。そこへ自分の名を書き、私に筆を渡した。危険なら中断する合図も決め、二人で契生石を探しに樹海へ入った。',
      after: '苔むした木の根元で契生石を拾い、二人で確かめて布に包んだ。帰り道、枝に吊られた鈴が鳴り、リオラの盾に刃が打ちつけられた。頭上では、苔に紛れていた赤い紐が揺れている。庭の境を示すものだと気づいたときには、前後の道を少女たちに塞がれていた。',
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
      before: 'リオラが最初の一撃を受け止めても、次の刃が迫る。神輿の女は盾と石包みを見て目を細め、「この子たちに近づけないで」と指を振った。枝に隠れていた標の先は、ザクロの行列が通る道だった。',
      after: 'リオラの盾が一列を押し返した。私は石包みへ伸ばしかけた手で彼女の腕を支え、空いた道を指す。「今、戻ろう」。ザクロは血の滲んだ少女の名を呼び、追撃を切った。その声に振り返らず、二人で赤い紐の外へ走った。',
    },
  },
];

export const zakuroEncounterNovel: NovelSceneDef = {
  id: 'zakuro-forest-encounter', title: '樹海 ― 怠惰姫の行列',
  trigger: { kind: 'dungeon-clear', dungeonId: 'ritual-stone-grove' },
  pages: [
    { backgroundId: 'encounter-zakuro', text: '帰り道、絡んだ枝の下で鈴が鳴った。\n頭上から振り下ろされた刃を、リオラの盾が弾く。腕を掴まれ、私はその陰へ引き戻された。見上げると、苔に紛れた赤い紐が揺れていた。' },
    { backgroundId: 'encounter-zakuro', speaker: 'リオラ', text: '伏せろ。……あの鈴、庭の境か。\n怠惰姫ザクロ。前も後ろも、もう押さえられている。' },
    { backgroundId: 'encounter-zakuro', text: '次の刃を盾が弾いた。その向こうで、赤髪の女が黒い神輿に寝そべっていた。\n少女の傷を避けて飾り紐を結び直し、手元のランタンを隣の子へ渡す。こちらを見るのは、その後だった。' },
    { backgroundId: 'encounter-zakuro', speaker: '私', text: '……あの人だけ、立ち上がりもしない。' },
    { backgroundId: 'encounter-zakuro', speaker: 'リオラ', text: '右の、槍を持つ子を見ろ。隣の子に肩を貸したまま、退路を塞いでいる。\n……あそこも通れない。私の後ろから離れるな。' },
    { backgroundId: 'encounter-zakuro', speaker: '私', text: '境だと知らなかった。私たちは、儀式の石を探しに来ただけで――' },
    { backgroundId: 'encounter-zakuro', speaker: 'ザクロ', text: '聞きたくないわ。この子たちに近づけないで。\n地上の子は退路を塞いで。空からは盾の後ろを狙いなさい。仕留めて。' },
    { backgroundId: 'encounter-zakuro', text: '神輿の鈴が、もう一度鳴った。\n地上の槍が揃い、少女たちが降る。リオラの盾越しに、逃げ道が一本ずつ消えていった。', shade: 'dark' },
  ],
};
export const zakuroEpilogue: NovelPageDef[] = [
  { backgroundId: 'encounter-zakuro', text: '赤い紐の内側で、行列は足を止めていた。\nザクロは負傷した少女を神輿に座らせ、足の傷を診た。「今夜は、いつもの子と休みましょう」。灯りを持つ少女が首を振る。「私、夜番がある。代わりはいないの」。担ぎ棒を受けた別の少女が、肩を入れ直して息を詰めた。' },
  { backgroundId: 'encounter-zakuro', speaker: 'ザクロ', text: '今夜はここで休むわ。神輿を下ろして、担いでいた子から一人、夜番を代わって。見回りは鈴の聞こえる所まで。追わなくていい。\n……その紐、傷に当たるわね。少し足を上げて。あなたはどこで寝たい？' },
  { backgroundId: 'encounter-zakuro', text: '「一人は嫌。灯りの見えるところで待ってる」。負傷した少女が言った。灯りを持つ子は森の外を見た。「あの二人が、まだ近くにいるかもしれない」。ザクロは答えず、足に絡んだ紐をほどいた。担ぎ手が一斉に膝を折り、神輿が下りた。\n森の外で、私はリオラの盾の留め具を直していた。石包みは鞄にある。リオラから受け取った水筒で、私は手の傷を洗った。' },
  { backgroundId: 'novel-awakening-garden', speaker: '庭園の女', text: 'ザクロに会ったの？ 相変わらず、人の話を聞かないのね。\nあの女を好きだと言う管理者には、会ったことがないわ。でも、あれだけの個体が同じ庭で暮らし続けている。あの才だけは、認めるしかないのよ。' },
  { backgroundId: 'novel-awakening-garden', text: 'あの人なら、私たちが迎える子の世話もしてくれるだろうか。そう思ってから、自分の手の傷を見た。飾り紐を直してもらっていた少女も、私に槍を向けていたかもしれない。\nリオラは盾を膝に載せたまま、女に尋ねた。「会いに行くなら、どうすればあの連中に襲われずに済む？」' },
  { backgroundId: 'novel-awakening-garden', text: 'ザクロへの文面を考えているうちに、見舞いに出る時刻になった。「石を見てほしい」と書いては消し、紙の端が薄くなっていた。\nリオラが椅子から立つ。「続きは後にしろ。支度は？」。私は書きかけを伏せた。療養室で何を話すか決めておきたかったが、決められないまま靴を履いた。' },
];
