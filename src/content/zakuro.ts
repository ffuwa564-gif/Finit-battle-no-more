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
      before: '街に朝が来てからも、療養室へ通う日々は続いた。帰り道に読み合わせた儀式の手順で、リオラの指が迎え手の欄に止まる。「私の名も、ここへ。迎えた後の世話も、私がする」。二人で中断の合図を決め、個体の輪郭を支える契生石を探しに樹海へ入った。',
      after: '苔むした根元で契生石を拾い、二人で確かめて包んだ。帰り道、枝の下で鈴が鳴り、リオラの盾に刃が落ちた。苔に隠れた赤い紐が、頭上で揺れている。境の標だと気づいたときには、前後の道を少女たちが塞いでいた。',
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
      before: '最初の刃を盾で受けても、行列は止まらない。神輿の女は私たちの盾と石包みへ目を細め、「この子たちのところへ、近づけないで」と指を振った。枝に隠れた標の向こうは、ザクロの行列が通る道だった。',
      after: 'リオラの盾が一列を押し返した。私は石包みへ伸ばしかけた手で彼女の腕を支え、空いた道を指す。「今、戻ろう」。ザクロは血の滲んだ少女の名を呼び、追撃を切った。その声に振り返らず、二人で赤い紐の外へ走った。',
    },
  },
];

export const zakuroEncounterNovel: NovelSceneDef = {
  id: 'zakuro-forest-encounter', title: '樹海 ― 怠惰姫の行列',
  trigger: { kind: 'dungeon-clear', dungeonId: 'ritual-stone-grove' },
  pages: [
    { backgroundId: 'encounter-zakuro', text: '帰り道、絡んだ枝の下で鈴が鳴った。\n同時に、頭上から刃が落ちる。リオラの盾が鳴り、私はその陰へ引き戻された。苔の奥で、赤い紐が揺れていた。' },
    { backgroundId: 'encounter-zakuro', speaker: 'リオラ', text: '伏せろ。……あの鈴、庭の境か。\n怠惰姫ザクロ。前も後ろも、もう押さえられている。' },
    { backgroundId: 'encounter-zakuro', text: '次の刃を盾が弾いた。その向こうで、赤髪の女が黒い神輿に寝そべっていた。\n少女の傷を避けて飾り紐を結び直し、余った灯りを隣の子へ渡す。こちらを見るのは、その後だった。' },
    { backgroundId: 'encounter-zakuro', speaker: '私', text: '……あの人だけ、立ち上がりもしない。' },
    { backgroundId: 'encounter-zakuro', speaker: 'リオラ', text: '右の槍を見ろ。隣の子に肩を貸したまま、退路を塞いでいる。\n……あそこも通れない。私の後ろから離れるな。' },
    { backgroundId: 'encounter-zakuro', speaker: '私', text: '境だと知らなかった。私たちは、儀式の石を探しに来ただけで――' },
    { backgroundId: 'encounter-zakuro', speaker: 'ザクロ', text: '聞いていないわ。この子たちに近づけないで。\n地上は退路。空は盾の裏。ためらわず、仕留めて。' },
    { backgroundId: 'encounter-zakuro', text: '神輿の鈴が、もう一度鳴った。\n地上の槍が揃い、少女たちが降る。リオラの盾越しに、逃げ道が一本ずつ消えていった。', shade: 'dark' },
  ],
};
export const zakuroEpilogue: NovelPageDef[] = [
  { backgroundId: 'encounter-zakuro', text: '赤い紐の外で、私はリオラの盾の留め具を確かめた。石包みは、まだ鞄にある。\n振り返ると、神輿を支える少女が、隣の子の分まで肩を入れていた。空いた手が、負傷者を女のもとへ押し上げる。' },
  { backgroundId: 'encounter-zakuro', speaker: 'ザクロ', text: 'その結び目は、傷に当たるわ。私に貸して。\n……そう、こっち側。今夜はあなたの隣で眠らせて。あなたの声なら、落ち着くから。' },
  { backgroundId: 'encounter-zakuro', text: '最後の少女がこちらを見た。私の手の傷に目を留め、それから槍を構え直した。\n守っているのは、あの神輿へ戻る道だった。鈴が遠ざかるまで、私もリオラの腕から手を離せなかった。' },
  { backgroundId: 'novel-awakening-garden', speaker: '庭園の女', text: 'ザクロに会ったの？ 相変わらず、話を聞かないのね。\nあの女を好く管理者には会ったことがないわ。でも、あれだけの個体が、互いを壊さず同じ庭で暮らし続けている。その才は、誰も否定しない。' },
  { backgroundId: 'novel-awakening-garden', text: '私は傷のある手を握った。あの少女たちが、あそこへ帰る理由を知りたい。けれど、私たちへ向けられた刃まで、頷く気にはなれなかった。\nリオラは盾の留め具を直していた。「次に見るなら、先に招かれる道を探す。いいな」。' },
  { backgroundId: 'novel-awakening-garden', text: '契生石の横に、停止の頁を開いた。手帳に「あの庭へ招かれるには」と書き、次の行で筆を止める。\n夕方には療養室へ行く。鍵を使わなかった夜を隠さず話すための言葉も、まだ書きかけだった。' },
];
