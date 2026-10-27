import { openingNovel, campaignNovels } from './novels';
import { xrGacha } from './xr-gacha';
import { withMotionPosters } from './motion-posters';
import { goldExchanges, goldExchangeArt } from './gold-exchanges';
import { goddessTrial, ultimateGoddessTrial, impossibleGoddessTrial, tacticalTrial, frozenDawnClock, trialDialogues } from './trials';
import { rareEnemyArt, rareEnemySpecies, rareEnemyMaterials, rareEncounterFor } from './rare-encounters';
import { skillNames, skillTemplates, skillSoundProfiles } from '../domain/skill-info';
import type { AssetDef, CharacterDef, Content, DungeonDef, Role, SkillDef, SkillTemplate } from '../domain/types';
import { dawnStory, dawnAwakenings, dawnMemories, dawnMaterials, dawnDungeons, storyEncounter } from './seris-story';
import { stoneEvents } from './events';
import { eventDungeons, kuzuhaEvent, lunetteDungeons, lunetteEvent } from './boss-events';
import { campaignChapters, chapterRoute } from './chapters';
import { expandCampaign } from './campaign-stages';
import { goddessArt, goddessPortraitFocus, sharedGoddessIds, sharedSSRIds } from './gacha';
export { initialGacha } from './gacha';
export { validateContent } from './validation';

const roleLabels: Record<Role, string> = { healer: '癒し手', tank: '守護者', attacker: '剣士', area_attacker: '詠唱者', supporter: '導き手', debuffer: '呪術師' };
export const roleName = (role: Role): string => roleLabels[role];
const labels = skillNames;
const templates = skillTemplates;
const skillFor = (template: SkillTemplate, strength: number): string => `${template.replaceAll('_', '-')}-${strength}`;
const goddessSkillNames: Record<number, Partial<Record<SkillTemplate, string>>> = {
  21: { heal: '月白のやすらぎ', barrier: '三日月の袖守り' },
  23: { guard: '梟の見守り', pierce: '知恵の一閃' },
  16: { heal: '百花のぬくもり', cleanse: '花風の浄め' },
  20: { buff: '虹糸の便り', dispel: '晴れ渡る空' },
  27: { dawn: '約束の朝', attack: '暁を返す一閃' },
  13: { guard: '不変の岩守', shatter: '磐砕き', attack: '追い風の一閃' },
  15: { buff: '曙の彩り', barrier: '朝霞の袖守り' },
  14: { debuff: '縁結びのほどき', dispel: '結び直す指先' },
  17: { heal: '真珠の祈り', mend_pair: '返し潮の抱擁' },
  19: { buff: '暁の綾織', barrier: '天衣の結界' },
  12: { buff: '神楽鈴の祝福' },
  18: { heal: '桜花の祈り', attack: '散り桜の一閃' },
  22: { area: '天照・暁のレース', attack: '八咫鏡の煌き' },
  25: { attack: '無赦の裁断', pierce: '零式・穿孔' },
  26: { debuff: '宵宮の幻惑', attack: '紅蓮の狐火' },
  30: { debuff: '九尾・夢幻結界', attack: '月蝕の狐火' },
  24: { guard: '黄泉のヴェール', attack: '黄泉路の黒薔薇' },
};
const skills: SkillDef[] = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 30].flatMap(strength => templates.map(template => ({ id: skillFor(template, strength), name: goddessSkillNames[strength]?.[template] ?? labels[template], template, strength, soundProfile: skillSoundProfiles[template] })));
skills.push(
  { id: skillFor('attack', 36), name: '星律の断罪', template: 'attack', strength: 36, soundProfile: skillSoundProfiles.attack },
  { id: skillFor('pierce', 36), name: '終天の一閃', template: 'pierce', strength: 36, soundProfile: skillSoundProfiles.pierce },
);
const required: Record<Role, SkillTemplate> = { healer: 'heal', tank: 'guard', attacker: 'attack', area_attacker: 'area', supporter: 'buff', debuffer: 'debuff' };
interface CharacterInput { id: string; name: string; epithet: string; flavor: string; role: Role; speciesId: string; strength: number; origin: CharacterDef['origin']; dialogue?: CharacterDef['dialogue']; encounterLoot?: CharacterDef['encounterLoot']; motionId?: string; familyId?: string; rarity?: CharacterDef['rarity'] }
const bossDialogues: Record<string, NonNullable<CharacterDef['dialogue']>> = {
  elaine: { intro: 'この花を、誰に渡すはずだったのでしょう。', threshold: '忘れても、約束はここに。', defeat: 'セリス……一緒に、帰りましょう。' },
  liora: { intro: 'この門は、私が開いた。', threshold: '命令より、帰る者を守る。', defeat: '帰還の許可なら、とうに出ている。' },
  noelle: { intro: '消えた名前を、もう一度読ませて。', threshold: '朝の記録は、まだ終わらない。', defeat: '余白には、あなたの名前を。' },
  lisette: { intro: '救ったものを、その手で失う覚悟はある？', threshold: 'あの夜を、繰り返させはしない。', defeat: '……最後の稽古は、隣を歩くことにしましょう。' },
  'seris-awakened': { intro: 'あの日の剣を、今度こそ越えて。', threshold: 'ひとりで夜を引き受けるのは、もう終わり。', defeat: '約束の朝へ。一緒に、帰ろう。' },
  lunette: { intro: 'ふふふっ、おねえさんよっわー', threshold: 'むぅ……うさぎ隊、もっと本気でいくよ！', defeat: 'ま、負けてないし……もう一回、遊んでくれる？' },
  'lunette-awakened': { intro: '星時計、ぜんまい全開！ あたしのうさぎ隊についてこれる？', threshold: 'ふふっ、やるじゃん！ ここからが本番だよ！', defeat: '……強いね、おねえさん。次は、あたしも連れてって。' },
  kuzuha: { intro: 'よくいらしたわ。今宵は、どんな願いを預けるの？', threshold: 'ふふ……その眼差し、少し気に入ったわ。', defeat: 'また逢いにきて。契りの続きは、その時に。' },
  'kuzuha-awakened': { intro: '九つの尾がほどける夜。もう、夢からは帰さない。', threshold: 'ここまで追ってくるなんて……本気にしてしまうわ。', defeat: 'あなたの願い、九つの尾に結びましょう。' },
  'pale-wolf': { intro: '……ここから先は、夢さえ帰れない。', threshold: 'まだ、その灯を消すわけにはいかない。', defeat: 'ようやく……あの人の足音が、聞こえる。' },
  'stone-drake': { intro: 'この庭の眠りを、誰が呼び覚ました。', threshold: '石は砕けても……約束は、残る。', defeat: '花を……踏まないで、おくれ。' },
  'hollow-keeper': { intro: '名を捨てた者だけが、この門を守れる。', threshold: '主よ……もう少しだけ、お待ちください。', defeat: '鍵を、あなたに。今度こそ……扉の向こうへ。' },
  'moon-moth': { intro: '欠けた月の夢を、あなたにも。', threshold: '薄れてゆく……誰かの、やさしい記憶。', defeat: '夜明けなど……来なくても、よかったのに。' },
  'veil-priestess': { intro: 'この祈りだけは、奪わないで。', threshold: '届かないと知っても……私は、祈る。', defeat: 'こんなにも静かに……終われるのですね。' },
  'thorn-witch': { intro: '枯れた花にも、帰る場所はある。', threshold: '咲かせましょう……最後の、一輪を。', defeat: '庭のこと……ときどき、思い出して。' },
};
const tactics: Record<string, { secondary: SkillTemplate; leader: NonNullable<CharacterDef['leaderEffect']> }> = {
  vespera: { secondary: 'overclock', leader: 'bulwark' },
  miette: { secondary: 'barrier_mend', leader: 'regeneration' },
  tikka: { secondary: 'jam', leader: 'finisher' },
  nox: { secondary: 'pierce', leader: 'finisher' },
  astraea: { secondary: 'pierce', leader: 'finisher' },
  'artemis-standard': { secondary: 'pierce', leader: 'finisher' },
  'persephone-standard': { secondary: 'regen', leader: 'lifesteal' },
  'hestia-standard': { secondary: 'barrier', leader: 'bulwark' },
  'hebe-standard': { secondary: 'mend_pair', leader: 'regeneration' },
  'eos-standard': { secondary: 'cleanse', leader: 'acceleration' },
  'nike-standard': { secondary: 'shatter', leader: 'finisher' },
  'rainbow-iris-standard': { secondary: 'dispel', leader: 'resonance' },
  'toyotama-standard': { secondary: 'barrier', leader: 'bulwark' },
  'selene-standard': { secondary: 'regen', leader: 'regeneration' },
  'athena-standard': { secondary: 'rally', leader: 'bulwark' },
  'flora-standard': { secondary: 'cleanse', leader: 'regeneration' },
  'amaterasu-standard': { secondary: 'barrier', leader: 'resonance' },
  'izanami-standard': { secondary: 'drain', leader: 'lifesteal' },
  lisette: { secondary: 'dispel', leader: 'finisher' },
  'elaine-awakened': { secondary: 'mend_pair', leader: 'regeneration' },
  'liora-awakened': { secondary: 'barrier', leader: 'bulwark' },
  'noelle-awakened': { secondary: 'pierce', leader: 'resonance' },
  'lisette-awakened': { secondary: 'dispel', leader: 'finisher' },
  'seris-awakened': { secondary: 'dawn', leader: 'finisher' },
  artemis: { secondary: 'pierce', leader: 'finisher' },
  persephone: { secondary: 'sleep', leader: 'lifesteal' },
  hestia: { secondary: 'barrier', leader: 'bulwark' },
  hebe: { secondary: 'mend_pair', leader: 'regeneration' },
  chrona: { secondary: 'attack', leader: 'bulwark' },
  fortuna: { secondary: 'barrier', leader: 'bulwark' },
  hecate: { secondary: 'dispel', leader: 'bulwark' }, freyja: { secondary: 'drain', leader: 'lifesteal' }, benzaiten: { secondary: 'mend_pair', leader: 'regeneration' },
  'seoritsu-standard': { secondary: 'cleanse', leader: 'regeneration' }, 'wakahirume-standard': { secondary: 'regen', leader: 'resonance' }, 'ukanomitama-standard': { secondary: 'barrier', leader: 'bulwark' },
  seoritsu: { secondary: 'confusion', leader: 'regeneration' },
  ukanomitama: { secondary: 'regen', leader: 'regeneration' },
  mizuhanome: { secondary: 'paralysis', leader: 'finisher' },
  haniyasu: { secondary: 'barrier', leader: 'bulwark' },
  toyotama: { secondary: 'mend_pair', leader: 'regeneration' }, wakahirume: { secondary: 'barrier', leader: 'resonance' },
  iwanagahime: { secondary: 'shatter', leader: 'bulwark' }, kukurihime: { secondary: 'dispel', leader: 'finisher' },
  eos: { secondary: 'barrier', leader: 'acceleration' },
  nike: { secondary: 'shatter', leader: 'finisher' },
  selene: { secondary: 'barrier', leader: 'regeneration' },
  athena: { secondary: 'rally', leader: 'bulwark' },
  flora: { secondary: 'cleanse', leader: 'regeneration' },
  'rainbow-iris': { secondary: 'dispel', leader: 'finisher' },
  lucielle: { secondary: 'barrier', leader: 'regeneration' }, nemuria: { secondary: 'sleep', leader: 'resonance' },
  lunette: { secondary: 'barrier', leader: 'bulwark' }, 'lunette-awakened': { secondary: 'barrier', leader: 'resonance' },
  kuzuha: { secondary: 'attack', leader: 'lifesteal' }, 'kuzuha-awakened': { secondary: 'attack', leader: 'lifesteal' },
  elaine: { secondary: 'cleanse', leader: 'regeneration' }, liora: { secondary: 'barrier', leader: 'bulwark' },
  seris: { secondary: 'pierce', leader: 'finisher' }, noelle: { secondary: 'attack', leader: 'resonance' },
  'pale-wolf': { secondary: 'drain', leader: 'finisher' }, 'stone-drake': { secondary: 'barrier', leader: 'bulwark' },
  'hollow-keeper': { secondary: 'paralysis', leader: 'bulwark' }, 'moon-moth': { secondary: 'sleep', leader: 'resonance' },
  'veil-priestess': { secondary: 'regen', leader: 'regeneration' }, 'thorn-witch': { secondary: 'charm', leader: 'lifesteal' },
  iris: { secondary: 'charm', leader: 'regeneration' }, mireille: { secondary: 'barrier', leader: 'regeneration' },
  asteria: { secondary: 'pierce', leader: 'resonance' }, evelyn: { secondary: 'drain', leader: 'lifesteal' },
};
const character = (input: CharacterInput): CharacterDef => ({ ...input, ...(input.motionId ? { portraitMotionId: `${input.id}-portrait-motion` } : {}), ...(bossDialogues[input.id] ? { dialogue: bossDialogues[input.id], encounterArtId: `encounter-${input.id}` } : {}), rarity: input.rarity ?? 'R', leaderEffect: tactics[input.id]?.leader, leaderStat: input.role === 'tank' || input.role === 'healer' ? 'hp' : input.role === 'supporter' || input.role === 'debuffer' ? 'defense' : 'attack', skillIds: [skillFor(required[input.role], input.strength), skillFor(tactics[input.id]?.secondary ?? (input.role === 'attacker' ? 'area' : 'attack'), input.strength)], portraitId: `${input.id}-portrait`, artId: `${input.id}-art`, published: true, soundProfile: 'default' });
const characters: CharacterDef[] = [
  character({ id: 'elaine', familyId: 'elaine', name: 'エレイン', epithet: '白花の祈り手', role: 'healer', speciesId: 'pilgrim', strength: 14, origin: ['initial', 'recruit'], flavor: '誰もいない礼拝堂に、今日も花を供える祈り手。救えなかった人々の名を、彼女だけがまだ覚えている。優しい声の奥には、もう二度と手を離さないという静かな決意がある。' }),
  character({ id: 'liora', familyId: 'liora', name: 'リオラ', epithet: '錆銀の守護者', role: 'tank', speciesId: 'pilgrim', strength: 14, origin: ['initial', 'recruit'], flavor: '滅びた王国の門を守っていた騎士。今は庭園の女を崇拝し、その言葉を拠り所に盾を取る。主人公への同行も命令によるもの。視線はいつも、旅先より帰って報告する相手へ向いている。' }),
  character({ id: 'seris', familyId: 'seris', name: 'セリス', epithet: '薄明の剣', role: 'attacker', speciesId: 'pilgrim', strength: 14, origin: ['initial', 'recruit'], flavor: '朝の来ない街で剣を振るう旅人。彼女の刃は、過ぎ去ったものへの弔いであり、まだ見ぬ明日への道標でもある。雨上がりの石畳を、いつも懐かしそうに眺めている。' }),
  character({ id: 'noelle', familyId: 'noelle', name: 'ノエル', epithet: '星読みの残響', role: 'area_attacker', speciesId: 'pilgrim', strength: 14, origin: ['initial', 'recruit'], flavor: '消えた星座を読み続ける魔術師。崩れた天文台から持ち出した一冊の本には、誰にも見えない空の記録が綴られている。旅の夜には、仲間に忘れられた星の名を教える。' }),
  character({ id: 'pale-wolf', name: '白霧の狼', epithet: '聖堂に残る遠吠え', role: 'attacker', speciesId: 'mist', strength: 10, origin: ['recruit'], flavor: '聖堂に迷い込んだ魂を、出口まで導く白い獣。その足跡は霧とともに消える。かつて誰かを待っていたというが、今ではその誰かの姿を思い出せない。' }),
  character({ id: 'stone-drake', name: '石燐の幼竜', epithet: '眠れる庭の番人', role: 'tank', speciesId: 'stone', strength: 11, origin: ['recruit'], flavor: '崩れた噴水の底で長い眠りについていた竜。石のような鱗の隙間から、青白い光がこぼれる。小さな花を踏まないよう、驚くほど慎重に歩く。' }),
  character({ id: 'hollow-keeper', name: '虚ろの守り手', epithet: '帰らぬ主への誓い', role: 'tank', speciesId: 'hollow', strength: 12, origin: ['recruit'], flavor: '錆銀の鎧に名前を隠した女騎士。朽ちた鍵束を腰に下げ、閉じるべき扉を探している。鎧の内側には、すっかり色の褪せた小さなリボンが縫い付けられている。' }),
  character({ id: 'moon-moth', name: '月翅の蛾', epithet: '欠けた月の使者', role: 'area_attacker', speciesId: 'moon', strength: 10, origin: ['recruit'], flavor: '月明かりの差す場所にだけ現れる幻の蛾。翅に散る燐粉は、触れた者に遠い夢を見せる。死者の言葉を運ぶとも、生きる者の寂しさが形になったとも言われる。' }),
  character({ id: 'veil-priestess', name: '帳の巫女', epithet: '届かない祈り', role: 'healer', speciesId: 'veil', strength: 11, origin: ['recruit'], flavor: '破れた聖歌を口ずさむ、角を持つ女性。人々が去った後も祈りの灯を絶やさなかった。差し出された手に触れると、冷えた指先だけが微かに震える。' }),
  character({ id: 'thorn-witch', name: '荊の魔女', epithet: '枯園の記憶', role: 'debuffer', speciesId: 'thorn', strength: 12, origin: ['recruit'], flavor: '花を咲かせなくなった庭に暮らす魔女。荊の冠は罰ではなく、彼女自身が選んだ約束のしるし。誰かが種を持ってくるたび、ほんの少しだけ口元を緩める。' }),
  character({ id: 'iris', name: 'アメノウズメ', epithet: '薄明の鈴舞', role: 'supporter', speciesId: 'pilgrim', strength: 12, origin: ['gacha'], rarity: 'R', flavor: '神楽の舞台で、赤茶の短い髪と紅いリボンを弾ませる女神。神楽鈴を高く掲げ、扇を開き、黒と生成りのゴシックロリータで軽やかに舞う。沈黙に閉ざされた街にも、もう一度笑い声が戻ると信じている。' }),
  character({ id: 'mireille', name: 'コノハナサクヤヒメ', epithet: '黒桜の花守', role: 'healer', speciesId: 'veil', strength: 18, origin: ['gacha'], rarity: 'SR', flavor: '富士を背に、桜の枝と小さな炎をそっと掲げる女神。桜色と黒いレースのゴシックロリータを纏い、火の粉を花びらのように遊ばせる。儚さと強さを知る彼女の祈りは、傷ついた仲間の命を静かにつなぎとめる。' }),
  character({ id: 'asteria', dialogue: trialDialogues.asteria, motionId: 'gacha-amaterasu-motion', name: 'アマテラス', epithet: '黒レースの暁光', role: 'area_attacker', speciesId: 'moon', strength: 22, origin: ['gacha'], rarity: 'SSR', flavor: '岩戸の向こうから朝を連れてくる女神。黒髪のボブに太陽の光輪を戴き、白と黒のフリルに金を添えたゴシックロリータを纏う。両手に掲げる八咫鏡が暁を映すと、閉ざされた街にも温かな光が満ちてゆく。' }),
  character({ id: 'evelyn', dialogue: trialDialogues.evelyn, motionId: 'gacha-izanami-motion', name: 'イザナミ', epithet: '黄泉のフリル', role: 'tank', speciesId: 'thorn', strength: 24, origin: ['gacha'], rarity: 'SSR', flavor: '黄泉の境界に立つ女神が、銀髪を黒い喪のヴェールで包み、黒と紫のゴシックロリータを纏った。胸には勾玉、手には赤い彼岸花と古い灯。閉ざされた岩の前で、今は隣に立つ仲間を守ることを選ぶ。' }),
  character({ id: "selene", dialogue: trialDialogues.selene, motionId: "gacha-selene-motion", name: "セレネ", epithet: "月白の振袖", role: "healer", speciesId: "moon", strength: 21, origin: ["gacha"], rarity: "SSR", flavor: "ギリシャ神話の月の女神を着想にした、花宴への客人。月白と紺の振袖を自ら選び、銀糸の三日月を袖に散らした。月を映す扇を開けば、仲間を守る柔らかな光が庭に満ちる。静かな宴を誰もが楽しめるよう、隅々まで目を配っている。" }),
  character({ id: "athena", dialogue: trialDialogues.athena, motionId: "gacha-athena-motion", name: "アテナ", epithet: "知恵咲く羽織", role: "tank", speciesId: "pilgrim", strength: 23, origin: ["gacha"], rarity: "SSR", flavor: "ギリシャ神話の知恵の女神を着想にした、花宴への客人。藍の羽織にはオリーブの枝と梟の刺繍。着物の文様に込められた工夫を楽しみながら、仲間の話に耳を傾ける。旅では冷静な判断と確かな守りで、一行の進む道を支える。" }),
  character({ id: "flora", name: "フローラ", epithet: "百花の晴れ衣", role: "healer", speciesId: "veil", strength: 16, origin: ["gacha"], rarity: "SR", flavor: "ローマ神話の花の女神を着想にした、花宴への客人。桜色と若草色の晴れ着に、牡丹や小さな野花をあしらった。庭で見つけた花の名前をひとつずつ覚え、出会った人へ小さな花束を贈る。その優しい花風は、仲間の傷と弱りをいたわる。" }),
  character({ id: "rainbow-iris", name: "イリス", epithet: "虹織の訪れ", role: "supporter", speciesId: "pilgrim", strength: 20, origin: ["gacha"], rarity: "SR", flavor: "ギリシャ神話の虹と伝令の女神を着想にした、花宴への客人。雲と流水を織り込んだ袖が、光を受けて淡い虹色に変わる。招待の返事を大切に携え、遠い土地の話を皆へ届ける。戦いでは仲間を励まし、敵にまとわりつく強化を晴らす。" }),
  character({ id: 'eos', name: 'エオス', epithet: '曙染めの小袖', role: 'supporter', speciesId: 'pilgrim', strength: 15, origin: ['gacha'], rarity: 'R', flavor: 'ギリシャ神話の暁の女神を着想にした、花宴への客人。朝顔と淡い光を織り込んだ小袖を選び、庭の朝露を楽しんでいる。仲間の小さな一歩にも気づき、そっと背中を押す。旅では朝霞のような障壁を広げ、新しい一日へ進む力を分けてくれる。' }),
  character({ id: 'nike', name: 'ニケ', epithet: '風結びの羽織', role: 'attacker', speciesId: 'pilgrim', strength: 13, origin: ['gacha'], rarity: 'R', flavor: 'ギリシャ神話の勝利の女神を着想にした、花宴への客人。青緑の羽織に月桂樹と羽根の文様をあしらい、祝いの結び紐を風に遊ばせる。彼女が喜ぶのは大きな名誉より、仲間が昨日できなかったことを成し遂げる瞬間。旅では行く手を阻む障壁をほどき、一行に追い風を届ける。' }),
  character({ id: 'vespera', familyId: 'vespera', name: 'ヴェスパ', epithet: '星炉の調律師', role: 'supporter', speciesId: 'clockwork', strength: 24, origin: ['gacha'], rarity: 'SSR', flavor: '機巧兵器の星炉を調律する技師。蒼い長髪に小さな星の留め具を飾り、自分の駆動核を削って仲間へ出力を分け与える。命令の完遂だけを信じるノクスとは対照的に、誰が次の一手を放つかを自ら選ぶ。「壊れる前に、力を渡せばいい。それが私の計算よ」' }),
  character({ id: 'miette', familyId: 'miette', name: 'ミエット', epithet: '修繕庭の縫い手', role: 'healer', speciesId: 'clockwork', strength: 18, origin: ['gacha'], rarity: 'SR', flavor: '廃温室の修繕工房で働く機巧職人。薔薇色の短髪と真鍮の指で、壊れた障壁をほどき、傷を繕う糸へと編み直す。どんな兵器にも帰る工房があっていいと信じている。「余った守りを、明日の命に仕立てましょう」' }),
  character({ id: 'tikka', familyId: 'tikka', name: 'ティッカ', epithet: '秒針のいたずら', role: 'debuffer', speciesId: 'clockwork', strength: 14, origin: ['gacha'], rarity: 'R', flavor: '古い時計塔の通信回路から生まれた機巧斥候。灰紫の三つ編みを揺らし、懐中時計から小さな機械蛾を放つ。敵の技が動き出す瞬間だけを、ほんの少し遅らせる。大きな力には敵わなくても、その一拍で仲間を救える。「あなたの番は、もう少しあとね」' }),
  character({ id: 'nox', familyId: 'nox', motionId: 'gacha-nox-motion', name: 'ノクス', epithet: '零式・無赦の執行者', role: 'attacker', speciesId: 'clockwork', strength: 25, origin: ['gacha'], rarity: 'SSR', flavor: '廃都の兵器工房で目を覚ました機巧少女。陶器の肌と氷色の瞳に、歓びも怒りも浮かばない。命乞いを聞いても、剣先は揺れない。標的を排除し、命令を完遂する。それだけが、胸の歯車に刻まれた存在理由だった。あなたの隣でも刃を収める理由は語らない。ただ、味方を狙うものから順に、無言で断ち切っていく。' }),
  character({ id: 'kuzuha', familyId: 'kuzuha', name: '葛葉', epithet: '宵宮の妖狐姫', role: 'debuffer', speciesId: 'fox', strength: 26, origin: ['event'], rarity: 'SSR', flavor: '参拝者の途絶えた稲荷の社で、今も人々の願いを預かる妖狐の姫。紅の結び紐と古い鈴は、忘れられた契りの数だけ増えてゆく。扇の向こうの笑みは、訪れる者を試す余裕と、誰かを待ち続ける寂しさを隠している。' }),
  character({ id: 'kuzuha-awakened', familyId: 'kuzuha', motionId: 'kuzuha-awakened-motion', name: '九尾・葛葉', epithet: '月蝕にひらく九つの契り', role: 'debuffer', speciesId: 'fox', strength: 30, origin: ['event'], rarity: 'SSR', flavor: '月が欠ける夜、封じた九つの尾と白銀の髪が本来の姿を取り戻す。揺れる狐火は、守りきれなかった願いの灯。それでも傍に立つと決めたあなたの名を、葛葉は最後の結び紐にそっと刻む。' }),

  character({ id: 'artemis', name: 'アルテミス', epithet: '月弓の狩衣', role: 'attacker', speciesId: 'moon', strength: 19, origin: ['gacha'], rarity: 'SR', flavor: 'ギリシャ神話の狩猟の女神を着想にした、花宴への客人。長い銀の三つ編みに三日月を挿し、深緑の着物に鹿と矢の銀糸を走らせる。静かな竹林で引く弓は、追い詰めるためよりも帰る道を開くため。堅い守りを射抜く一矢にも、森で眠る命への気遣いが残る。' }),
  character({ id: 'persephone', name: 'ペルセポネ', epithet: '柘榴咲く境界', role: 'debuffer', speciesId: 'thorn', strength: 18, origin: ['gacha'], rarity: 'SR', flavor: 'ギリシャ神話の春と冥府の女神を着想にした、花宴への客人。黒いボブに一筋の紅、葡萄酒色の裾には白い花と根が絡む。掌の柘榴は、帰り道を忘れないための灯。春と夜の境で敵の守りをほどき、傷ついたときは一筋の生命を借りて、もう一度立つ。' }),
  character({ id: 'hestia', name: 'ヘスティア', epithet: '帰り灯の小袖', role: 'tank', speciesId: 'pilgrim', strength: 14, origin: ['gacha'], rarity: 'R', flavor: 'ギリシャ神話の炉の女神を着想にした、花宴への客人。銅赤の髪を低く結び、生成りの小袖と炭色の羽織で小さな灯籠を抱く。宴の輪から少し離れ、冷えた手に最初の温もりを渡す人。かばう背中と灯の障壁は、皆が帰ってくる場所を空けておくためにある。' }),
  character({ id: 'hebe', name: 'ヘベ', epithet: '祝杯の水衣', role: 'healer', speciesId: 'veil', strength: 13, origin: ['gacha'], rarity: 'R', flavor: 'ギリシャ神話の青春と給仕の女神を着想にした、成人の姿の客人。淡い桃色の髪を高く結び、白鶴を織り込んだ水色の着物で一客の杯を運ぶ。彼女が祝うのは若さそのものより、新しい一歩を選ぶ勇気。回復の杯はひとりの深い傷を癒し、浅い傷ならふたりで分かち合える。' }),
  character({ id: 'seoritsu', name: 'セオリツヒメ', epithet: '白瀬にほどく禊', role: 'healer', speciesId: 'veil', strength: 19, origin: ['gacha'], rarity: 'SR', flavor: '瀬織津姫を着想にした、急流と祓いの女神。氷青の長髪に紙垂を結び、黒と白の礼装で朽ちた滝の社に立つ。祓串からほどける水は、忘れたい記憶を奪うためではない。傷ついた者が、その記憶を抱えたまま歩けるように。' }),
  character({ id: 'ukanomitama', name: 'ウカノミタマ', epithet: '宵倉の稲穂守り', role: 'supporter', speciesId: 'pilgrim', strength: 16, origin: ['gacha'], rarity: 'SR', flavor: '宇迦之御魂神を女性の姿として描いた、穀物と実りの神。麦金の編み髪と琥珀色の黒レース、掌には稲穂と古い蔵の鍵。誰も供えに来なくなった社でも、足元の白狐と種籾を分け合ってきた。明日の食卓を守る祝福は、仲間の力と、長い戦いを支える回復の灯になる。' }),
  character({ id: 'mizuhanome', name: 'ミヅハノメ', epithet: '雨帳の水鏡', role: 'debuffer', speciesId: 'moon', strength: 15, origin: ['gacha'], rarity: 'R', flavor: '弥都波能売神を着想にした、水の女神。紺の短い髪に雨粒の銀飾りを挿し、薄紫と黒の裾を濡らしながら古い橋を歩く。傘に積もる雨音は、川へ帰れなかった願いの声。彼女の水鏡は敵の守りを曇らせ、借り物の力を静かに洗い流す。' }),
  character({ id: 'haniyasu', name: 'ハニヤスヒメ', epithet: '金継ぎの埴土', role: 'tank', speciesId: 'stone', strength: 12, origin: ['gacha'], rarity: 'R', flavor: '埴安姫神を着想にした、土と粘土の女神。栗色の横結びと深紅の工房服、金継ぎの走る陶の盾が目印。崩れた窯の前で、小さな芽のための鉢を焼き続ける。ひびは弱さだけの印ではないと、仲間をかばう盾と、その上に重ねる障壁で教えてくれる。' }),
  character({ id: 'toyotama', name: 'トヨタマヒメ', epithet: '真珠に眠る返し潮', role: 'healer', speciesId: 'veil', strength: 17, origin: ['gacha'], rarity: 'SR', flavor: '海竜の姫が、深藍の絹と真珠のレースを纏って陸の月を見上げる。珊瑚の角と二筋の潮は、帰れなくなった海宮の記憶。貝の杯にすくう水は、傷ついた二人を隔てず包み込む。' }),
  character({ id: 'wakahirume', name: 'ワカヒルメ', epithet: 'ほどけぬ暁の織り手', role: 'supporter', speciesId: 'pilgrim', strength: 19, origin: ['gacha'], rarity: 'SR', flavor: '人の途絶えた機殿で、今日も朝の光を織り続ける女神。琥珀の髪に挿した小さな杼は、消えかけた願いを結び直すためのもの。黒いレースを縁取る金糸は、仲間の力を引き出し、迫る刃を柔らかな天衣で受け止める。' }),
  character({ id: 'iwanagahime', name: 'イワナガヒメ', epithet: '朽ちぬ石の黒レース', role: 'tank', speciesId: 'stone', strength: 13, origin: ['gacha'], rarity: 'R', flavor: '花の散った後も山を守る、永い命の女神。翡翠の瞳と短い石灰色の髪、重たい黒の衣に小さな高山の花を添える。拒まれた記憶を恨みに変えず、隣に立つ者を守る盾と、偽りの障壁を砕く石の笏に変えた。' }),
  character({ id: 'kukurihime', name: 'ククリヒメ', epithet: '月夜にほどく紅の契り', role: 'debuffer', speciesId: 'thorn', strength: 14, origin: ['gacha'], rarity: 'R', flavor: '生と黄泉の境に架かる橋で、こじれた願いの結び目をほどく女神。銅赤の三つ編みと水引の帯、髪に挿す銀の鋏は縁を断つためではない。敵に絡んだ力と再生の糸だけを静かに解き、仲間が歩く道をつくる。' }),
  character({ id: 'lisette', familyId: 'lisette', name: 'リゼット', epithet: '弔鐘の剣姫', role: 'debuffer', speciesId: 'pilgrim', strength: 18, origin: ['recruit'], rarity: 'SR', flavor: 'セリスに剣を教えた女性。割れた鐘の耳飾りを揺らし、夜明けへの道を塞ぐ。あの子に教えなかった構えがある。帰る者を、斬らずに止める構えだ。' }),
  character({ id: 'elaine-awakened', familyId: 'elaine', name: 'エレイン', epithet: '朝露を待つ白花', role: 'healer', speciesId: 'pilgrim', strength: 20, origin: ['awakening'], rarity: 'SR', flavor: '余分な一輪は弔いではなく、帰還の約束だった。白花を携え、今度は自分も朝へ向かう。' }),
  character({ id: 'liora-awakened', familyId: 'liora', name: 'リオラ', epithet: '帰還を迎える銀盾', role: 'tank', speciesId: 'pilgrim', strength: 20, origin: ['awakening'], rarity: 'SR', flavor: '盾のひびを金で継ぎ、門の外で仲間を待つ騎士。守るべきものを、自分の意志で選び直した。' }),
  character({ id: 'noelle-awakened', familyId: 'noelle', name: 'ノエル', epithet: '明け星を記す者', role: 'area_attacker', speciesId: 'pilgrim', strength: 20, origin: ['awakening'], rarity: 'SR', flavor: '星図の余白に、共に歩む者たちの名を書き足した。誰か一人を代償にする計算は、もう必要ない。' }),
  character({ id: 'lisette-awakened', familyId: 'lisette', name: 'リゼット', epithet: '朝を告げる弔鐘', role: 'debuffer', speciesId: 'pilgrim', strength: 22, origin: ['awakening'], rarity: 'SR', flavor: '弟子を夜に留める剣を下ろし、隣を歩く師。金で継いだ鐘は、弔いではなく朝の合図になる。' }),
  character({ id: 'seris-awakened', familyId: 'seris', motionId: 'seris-awakened-motion', name: 'セリス', epithet: '暁を返す剣', role: 'attacker', speciesId: 'pilgrim', strength: 27, origin: ['awakening'], rarity: 'SSR', flavor: '雨上がりの石畳を、彼女はもう懐かしそうには眺めない。その先へ、一緒に歩く人がいる。' }),

  character({"id": "selene-standard", "familyId": "selene", "name": "セレネ", "epithet": "月明かりの導き手", "role": "healer", "speciesId": "moon", "strength": 19, "origin": ["gacha"], "rarity": "SR", "flavor": "月白の衣と銀の飾りを纏い、夜の道を照らす女神。花宴の振袖をしまった日も、仲間を気遣う眼差しは変わらない。静かな光を傷ついた者へ分け、休める場所までそっと導く。本作の世界で旅をするときの、彼女のいつもの姿。"}),
  character({"id": "athena-standard", "familyId": "athena", "name": "アテナ", "epithet": "静謐の知恵", "role": "tank", "speciesId": "pilgrim", "strength": 18, "origin": ["gacha"], "rarity": "SR", "flavor": "白い衣に軽い銀の鎧を重ね、梟とともに廃都の地図を読む女神。花宴の華やかな装いとは違う、旅に馴染んだ身支度で仲間を迎える。敵の守りを見極め、一行が無理なく進める道を選ぶ。彼女にとって知恵は、誰かを守るためにある。"}),
  character({"id": "flora-standard", "familyId": "flora", "name": "フローラ", "epithet": "朝庭の花守り", "role": "healer", "speciesId": "veil", "strength": 12, "origin": ["gacha"], "rarity": "R", "flavor": "生成りと若草色の素朴なドレスで、朝の庭を手入れする女神。晴れ着を着ない日には、小さな花籠を持って散歩に出る。誰かの傷や疲れに気づくと、その人に似合う野花を一輪選ぶ。華やかな宴の外にも、彼女の優しい仕事は続いている。"}),
  character({"id": "amaterasu-standard", "familyId": "asteria", "name": "アマテラス", "epithet": "暁を照らす光", "role": "supporter", "speciesId": "moon", "strength": 17, "origin": ["gacha"], "rarity": "SR", "flavor": "白と朱の端正な衣に、小さな日輪の飾りを添えた女神。特別なレースの衣装を離れ、いつもの鏡で朝の光を仲間へ届ける。誰かを眩しく照らすより、進む道が見える明るさを大切にしている。本作の世界で描く、穏やかな旅姿。"}),
  character({"id": "izanami-standard", "familyId": "evelyn", "name": "イザナミ", "epithet": "静かな境の守り手", "role": "debuffer", "speciesId": "thorn", "strength": 15, "origin": ["gacha"], "rarity": "R", "flavor": "墨色と生成りの長衣を纏い、静かな水辺に灯をともす女神。特別な黒いレースを脱いでも、旅人を見守る気持ちは変わらない。敵の勢いを鎮め、仲間が息を整える時間をつくる。本作の世界での穏やかな姿として、柔らかな表情と確かな威厳を描く。"}),
  character({"id": "artemis-standard", "familyId": "artemis", "name": "アルテミス", "epithet": "月森の道しるべ", "role": "attacker", "speciesId": "moon", "strength": 18, "origin": ["gacha"], "rarity": "SR", "flavor": "銀の三つ編みを揺らし、森の小径を歩く女神。いつもの緑の旅装に弓を携え、獣の足跡から安全な道を探す。仲間が迷った夜には、言葉より先に小さな灯を置いていく。"}),
  character({"id": "persephone-standard", "familyId": "persephone", "name": "ペルセポネ", "epithet": "芽吹きを待つ庭", "role": "debuffer", "speciesId": "thorn", "strength": 17, "origin": ["gacha"], "rarity": "SR", "flavor": "黒い短髪に小さな柘榴の飾りを添えた女神。深紅の旅衣で枯れた庭を巡り、まだ眠っている種を集める。敵の勢いを静めながら仲間に再生の時間を与え、季節を待つ強さを教えてくれる。"}),
  character({"id": "hestia-standard", "familyId": "hestia", "name": "ヘスティア", "epithet": "帰り道の灯火", "role": "tank", "speciesId": "pilgrim", "strength": 13, "origin": ["gacha"], "rarity": "R", "flavor": "栗色の髪と素朴な前掛けが似合う女神。旅先で見つけた古い宿に火を入れ、誰でも休める場所を整える。戦いでは灯火のような障壁を張り、小さな盾と大きな安心で仲間を守る。"}),
  character({"id": "hebe-standard", "familyId": "hebe", "name": "ヘベ", "epithet": "ひと息の茶会", "role": "healer", "speciesId": "veil", "strength": 12, "origin": ["gacha"], "rarity": "R", "flavor": "桃色の髪を高く結び、青い旅衣で水辺を歩く女神。休憩のたびに小さな茶器を取り出し、疲れた仲間に温かな一杯を渡す。傷ついた二人へ同時に手を差し伸べる、旅の頼もしい世話役。"}),
  character({"id": "eos-standard", "familyId": "eos", "name": "エオス", "epithet": "朝風の旅人", "role": "supporter", "speciesId": "moon", "strength": 14, "origin": ["gacha"], "rarity": "R", "flavor": "淡い桃色の髪に朝の光を映す女神。軽い外套と灯りを携え、まだ暗い丘を仲間と越えていく。追い風で一行を励まし、まとわりつく不調を払いながら、一緒に夜明けを探している。"}),
  character({"id": "nike-standard", "familyId": "nike", "name": "ニケ", "epithet": "若葉の誓い", "role": "attacker", "speciesId": "pilgrim", "strength": 14, "origin": ["gacha"], "rarity": "R", "flavor": "青緑の三つ編みに月桂の葉を留めた女神。白い旅衣に軽い鎧を重ね、剣の手入れを欠かさない。勝ち急ぐより全員で帰ることを選び、頑丈な障壁を砕いて仲間の進む道を開く。"}),
  character({"id": "rainbow-iris-standard", "familyId": "rainbow-iris", "name": "イリス", "epithet": "雨上がりの便り", "role": "supporter", "speciesId": "moon", "strength": 16, "origin": ["gacha"], "rarity": "SR", "flavor": "紫の髪と小さな郵便鞄が目印の女神。薄紫の旅衣で廃都を渡り、途絶えた手紙を届けている。空に虹がかかると少しだけ足が速くなる。敵の強化をほどき、味方へ希望の便りを運ぶ。"}),
  character({"id": "toyotama-standard", "familyId": "toyotama", "name": "トヨタマヒメ", "epithet": "凪を運ぶ旅衣", "role": "healer", "speciesId": "veil", "strength": 16, "origin": ["gacha"], "rarity": "SR", "flavor": "藍色の長い髪に真珠を一粒飾った女神。穏やかな海色の衣で浜辺を歩き、貝の器に澄んだ水をすくう。波のような癒しと薄い水の障壁で、旅人たちが次の岸へ進むのを支える。"}),
  character({"id": "lunette", "familyId": "lunette", "name": "ルネット", "epithet": "時計庭のうさぎ姫", "role": "area_attacker", "speciesId": "clockwork", "strength": 20, "origin": ["event"], "rarity": "SSR", "flavor": "忘れられた時計庭に住む、小柄な発明家の少女。得意げな言葉とは裏腹に、壊れたうさぎを放っておけない。手製の機械うさぎに囲まれ、訪れた旅人を遊び相手に誘う。誰かと帰る約束を、ずっと待っていた。"}),
  character({"id": "lunette-awakened", "motionId": "lunette-awakened-motion", "familyId": "lunette", "name": "星時計・ルネット", "epithet": "夜明けを刻むうさぎ隊", "role": "area_attacker", "speciesId": "clockwork", "strength": 24, "origin": ["event"], "rarity": "SSR", "flavor": "大時計の奥で眠っていた星のぜんまいが、少女とうさぎたちの願いに応える。紺と白の旅装に星の歯車を飾り、今度は誰かを置いていかないと誓った。生意気な笑い声も、仲間の足音を確かめるための合図になった。"}),

  { ...character({ id: 'lucielle', name: 'リュシエル', epithet: '銀灯に迷う訪問者', role: 'supporter', speciesId: 'silverwing', strength: 14, origin: ['recruit'], rarity: 'SR', flavor: '灯りを失った回廊に、ごく稀に現れる銀髪の旅人。銀灯に集まる蛾は、帰り道を忘れた願いだという。「あなたの朝まで、少しだけ一緒に歩いてもいい？」手渡される小さな灯芯には、まだ温かな鈴の音が眠っている。', encounterLoot: { gold: 30, guaranteed: [{ materialId: 'silverwing:common', count: 3 }, { materialId: 'silverwing:rare', count: 1 }] } }), encounterArtId: 'encounter-lucielle' },
  { ...character({ id: 'nemuria', name: 'ネムリア', epithet: '夢蛾を連れる夜の客人', role: 'debuffer', speciesId: 'nightmoth', strength: 18, origin: ['recruit'], rarity: 'SR', flavor: '忘れられた庭を渡り歩く、眠たげな夜の客人。瓶にしまうのは誰にも話せなかった夢。夢蛾が翅を閉じると、敵意さえ静かな眠りへほどけてゆく。彼女が差す傘の下だけ、雨は遠い日の子守歌に聞こえる。', encounterLoot: { gold: 45, guaranteed: [{ materialId: 'nightmoth:common', count: 3 }, { materialId: 'nightmoth:rare', count: 1 }] } }), encounterArtId: 'encounter-nemuria' },

  character({ id: 'chrona', name: 'クローナ', epithet: '凍暁の機巧聖女', role: 'area_attacker', speciesId: 'clockwork', strength: 24, origin: ['trial'], rarity: 'SSR', flavor: '夜明けを失うことを恐れ、時計塔ごと時を閉ざした機巧の聖女。壊れた針を何度も繕う銀の指先は、もう誰のための祈りかも覚えていない。それでも歯車の奥では、小さな振り子が朝を待っている。「進むことが、失うこととは限らないのなら」砕けた時計盤の向こうに、初めて彼女自身の空が見える。' }),
  character({ id: 'fortuna', name: 'フォルトゥナ', epithet: '朽ちた金貨に宿る祈り', role: 'supporter', speciesId: 'pilgrim', strength: 23, origin: ['gold_exchange'], rarity: 'SSR', flavor: '貨幣を打つ音の絶えた造幣堂で、運命の輪を見守る女神。彼女が量るのは金貨の輝きではなく、一枚を持ち帰るまでに歩いた道のりだという。擦り切れた財布を差し出す旅人に、静かに微笑む。「幸運は、あなたがここまで運んできたものよ」古びた輪が動き出すとき、積み重ねた祈りは仲間を包む金色の守りになる。' }),
  character({ id: 'hecate', name: 'ヘカテ', epithet: '三叉路に灯す蒼火', role: 'debuffer', speciesId: 'thorn', strength: 24, origin: ['gacha'], rarity: 'SSR', flavor: '三つの道が交わる廃都の片隅で、蒼い灯火を絶やさない女神。腰の鍵は閉ざされた門ではなく、迷った心の出口を開くためのもの。敵の祝福を静かにほどき、旅人が自分で道を選ぶまで、少し離れて見守っている。' }),
  character({ id: 'freyja', name: 'フレイヤ', epithet: '琥珀に眠る鷹の歌', role: 'attacker', speciesId: 'pilgrim', strength: 23, origin: ['gacha'], rarity: 'SSR', flavor: '鷹羽の外套と琥珀の首飾りを纏い、二匹の猫と忘れられた北の庭を巡る女神。美しいものを愛するからこそ、失われる痛みを知っている。「帰る場所なら、これから一緒につくればいい」傷を引き受けた手は、次の一撃でも揺らがない。' }),
  character({ id: 'benzaiten', name: '弁財天', epithet: '水鏡にほどける琵琶', role: 'healer', speciesId: 'veil', strength: 22, origin: ['gacha'], rarity: 'SSR', flavor: '水辺の朽ちた社で、誰も忘れた歌を琵琶に託す女神。ひとつの音が波紋になるたび、離れた心の傷にも小さな安らぎが届く。華やかな宴より、旅人たちが言葉もなく寄り添う夜を好み、最後の一音まで席を立たない。' }),
  character({ id: 'seoritsu-standard', familyId: 'seoritsu', name: 'セオリツヒメ', epithet: '清流を渡る旅衣', role: 'healer', speciesId: 'veil', strength: 16, origin: ['gacha'], rarity: 'SR', flavor: '長い水色の髪を夜風にほどき、滝から滝へ祈りを運ぶ女神。簡素な旅衣と銀の水鉢だけを携え、立ち止まる仲間の不調を洗い流す。橋の向こうに何が待つかは語らず、渡り終えるまで隣を歩いてくれる。' }),
  character({ id: 'wakahirume-standard', familyId: 'wakahirume', name: 'ワカヒルメ', epithet: '朝糸を結ぶ旅人', role: 'supporter', speciesId: 'pilgrim', strength: 17, origin: ['gacha'], rarity: 'SR', flavor: '織りかけの朝を小さな糸巻きに収め、廃都を歩く女神。いつもの生成りの旅衣には、仲間が直してくれた縫い目がいくつも残る。ほどけた糸を結ぶ仕草は、急がなくても旅を続けてよいと教えてくれる。' }),
  character({ id: 'ukanomitama-standard', familyId: 'ukanomitama', name: 'ウカノミタマ', epithet: '実りを分ける旅支度', role: 'supporter', speciesId: 'pilgrim', strength: 13, origin: ['gacha'], rarity: 'R', flavor: '稲穂と小さな升を抱え、白狐と里の跡を巡る女神。普段の旅衣は土の色に近く、畦道に座っても気にしない。残った実りを等しく分け、仲間の背に薄い守りを添えてから、自分の分をそっと取り分ける。' }),
  character({ id: 'astraea', name: 'アストレア', epithet: '終天を裁く星冠', role: 'attacker', speciesId: 'moon', strength: 36, origin: ['xr_gacha'], rarity: 'XR', flavor: '砕けた星座の王冠を戴き、夜の果てを見守る女神。銀の髪に降り積もるのは、帰らなかった祈りの残光。星剣が告げる裁きに慈悲はない。それでも、最後の一人が朝へ辿り着くまで、彼女は決して空を閉ざさない。' }),
];

const storyCharacters = [...dawnStory.relatedIds, dawnStory.protagonistId, ...dawnAwakenings.map(def => def.awakenedId)];
// Portrait crops follow each painting rather than assuming all story art shares a face position.
const companionPortraitFocus: Record<string, { anchor: string; zoom: number; origin: string }> = {
  chrona: { anchor: '50% 0%', zoom: 1.9, origin: '50% 0%' },
  lucielle: { anchor: '50% 0%', zoom: 2, origin: '50% 0%' },
  nemuria: { anchor: '50% 0%', zoom: 2, origin: '50% 0%' },
  lunette: { anchor: '50% 0%', zoom: 1.9, origin: '50% 0%' },
  'lunette-awakened': { anchor: '50% 0%', zoom: 1.9, origin: '50% 0%' },
  'veil-priestess': { anchor: '50% 50%', zoom: 2.2, origin: '50% 22%' },
  'thorn-witch': { anchor: '50% 50%', zoom: 2.2, origin: '50% 22%' },
  iris: { anchor: '50% 0%', zoom: 2.6, origin: '50% 0%' },
  mireille: { anchor: '50% 0%', zoom: 2.6, origin: '50% 0%' },
  'elaine-awakened': { anchor: '50% 0%', zoom: 1.9, origin: '50% 0%' },
  'liora-awakened': { anchor: '50% 0%', zoom: 1.9, origin: '50% 0%' },
  'noelle-awakened': { anchor: '50% 0%', zoom: 1.9, origin: '50% 0%' },
};
// Match static fallbacks to the exact full/portrait video framing, keeping source art intact.
const lunetteLoopPoster = { path: 'art/event-lunette-awakened-loop-poster.png', width: 720, height: 960 };
const lunettePortraitLoopPoster = { path: 'art/event-lunette-awakened-portrait-loop-poster.png', width: 320, height: 480 };
const characterAssets: AssetDef[] = characters.flatMap(char => {
  const fullScene = Boolean(char.encounterArtId);
  const humanScene = ['hollow', 'veil', 'thorn'].includes(char.speciesId);
  const wolf = char.id === 'pale-wolf';
  const landscape = wolf || char.id === 'stone-drake' || char.id === 'moon-moth';
  const goddess = char.origin.includes('xr_gacha') ? `xr-${char.id}` : char.origin.includes('event') ? `event-${char.id}` : rareEnemyArt[char.id] ?? (char.origin.includes('trial') ? `trial-${char.id}` : undefined) ?? goldExchangeArt[char.id] ?? goddessArt[char.id] ?? (storyCharacters.includes(char.id) ? char.id : undefined);
  // These original paintings place faces lower than the awakened story artwork.
  const initialFace = char.origin.includes('initial') ? { anchor: '50% 0%', zoom: 1.9, origin: '50% 0%' } : undefined;
  const standardFace = ([...sharedGoddessIds, ...sharedSSRIds].includes(char.id) || Boolean(goldExchangeArt[char.id])) ? { anchor: '50% 0%', zoom: 1.9, origin: '50% 0%' } : undefined;
  const framing = (char.origin.includes('xr_gacha') ? { anchor: '50% 0%', zoom: 2.6, origin: '50% 0%' } : undefined) ?? standardFace ?? initialFace ?? companionPortraitFocus[char.id] ?? goddessPortraitFocus[char.id] ?? (storyCharacters.includes(char.id) ? { anchor: '50% 0%', zoom: 2.6, origin: '50% 0%' } : undefined);
  const generated = Boolean(goddess) || char.origin.includes('initial') || char.origin.includes('recruit');
  const common = { path: goddess ? `art/${goddess}.${(['selene', 'athena', 'flora', 'rainbow-iris', 'eos', 'nike'].includes(char.id) || [...sharedGoddessIds, ...sharedSSRIds].includes(char.id) || Boolean(goldExchangeArt[char.id]) || char.origin.includes('trial')) ? 'webp' : 'png'}` : fullScene ? `art/${char.encounterArtId}.png` : `art/${char.id}.${generated ? 'png' : 'svg'}`, width: ['vespera', 'miette', 'tikka'].includes(char.id) ? 1086 : char.id === 'astraea' ? 1280 : char.id === 'nox' ? 1440 : char.origin.includes('event') || rareEnemyArt[char.id] || storyCharacters.includes(char.id) ? 1024 : fullScene || landscape ? 1536 : generated ? 1024 : 640, height: ['vespera', 'miette', 'tikka'].includes(char.id) ? 1448 : char.id === 'astraea' || char.id === 'nox' ? 1920 : char.origin.includes('event') || rareEnemyArt[char.id] || storyCharacters.includes(char.id) ? 1536 : fullScene || landscape ? 1024 : generated ? 1536 : 900, rights: generated ? 'Original AI-generated illustration for this project.' : 'Original SVG artwork created for this project. No third-party source.', ...(char.id === 'lunette-awakened' ? lunetteLoopPoster : {}) };
  return [
    { ...common, id: char.artId, kind: 'illustration', anchor: framing?.anchor ?? (landscape ? '50% 50%' : '50% 22%') },
    { ...common, ...(char.id === 'lunette-awakened' ? lunettePortraitLoopPoster : {}), id: char.portraitId, kind: 'portrait', anchor: framing?.anchor ?? (char.origin.includes('event') || char.motionId ? '50% 0%' : fullScene ? '50% 50%' : landscape ? '25% 30%' : generated ? '50% 8%' : '50% 28%'), portraitZoom: framing?.zoom ?? (char.origin.includes('event') || char.motionId ? 2.6 : fullScene ? (humanScene ? 2.2 : 1.4) : char.id === 'moon-moth' ? 1.1 : landscape ? 1.4 : goddess ? 2 : char.origin.includes('initial') ? 1.9 : generated ? 1.7 : 1.25), portraitOrigin: framing?.origin ?? (fullScene || char.motionId ? '50% 0%' : char.id === 'moon-moth' ? '50% 40%' : landscape ? '25% 30%' : generated ? '50% 18%' : '50% 22%') },
  ];
});
const stages = [
  ['silent-cathedral', '忘却の聖堂', '忘れられた祈りが、まだ息づく。', 'pale-wolf', 'moon-moth'],
  ['moon-garden', '月翅の庭', '羽音だけが静寂を渡る。', 'moon-moth', 'pale-wolf'],
  ['stone-fountain', '石燐の泉', '眠れる水底に、青い灯。', 'stone-drake', 'pale-wolf'],
  ['veiled-cloister', '白帳の回廊', '届かぬ聖歌の、その先へ。', 'veil-priestess', 'moon-moth'],
  ['thorn-court', '荊冠の中庭', '枯れた花々の名前を呼ぶ。', 'thorn-witch', 'pale-wolf'],
  ['hollow-gate', '虚ろの門', '最後の鍵は、まだ冷たい。', 'hollow-keeper', 'moon-moth'],
  ['silver-crypt', '錆銀の地下墓所', '弔いの銀に、触れる。', 'pale-wolf', 'thorn-witch'],
  ['ashen-library', '灰の書庫', '頁に残された月の匂い。', 'moon-moth', 'veil-priestess'],
  ['last-observatory', '終わりの天文台', 'もう見えない星を探して。', 'stone-drake', 'thorn-witch'],
  ['pale-throne', '白夜の玉座', 'ここで、ひとつの祈りが終わる。', 'hollow-keeper', 'thorn-witch'],
] as const;
const normalDungeons: DungeonDef[] = stages.map(([id, name, subtitle, main, second], index) => ({ id, name, subtitle, description: `廃都の奥に残された${name}。${subtitle} 同じ種族の素材を集め、彼女たちの物語に触れる。`, artId: 'cathedral', published: true, waves: [
  Array.from({ length: 4 }, () => ({ characterId: main })),
  [{ characterId: main }, { characterId: main }, { characterId: index < 3 ? 'moon-moth' : second }],
  [{ characterId: main === 'veil-priestess' ? second : main, boss: true }],
] }));

const dungeons = [...expandCampaign(normalDungeons.map(storyEncounter)).map(chapterRoute).map((stage, index) => ({ ...stage, rareEncounter: rareEncounterFor(index) })), ...dawnDungeons.map((stage, index) => ({ ...stage, rareEncounter: rareEncounterFor(index + normalDungeons.length) })), ...eventDungeons, ...lunetteDungeons, ...stoneEvents, goddessTrial, ultimateGoddessTrial, impossibleGoddessTrial, tacticalTrial, frozenDawnClock];
const encounterAssets: AssetDef[] = characters.flatMap(char => char.encounterArtId ? [{
  id: char.encounterArtId, path: rareEnemyArt[char.id] ? `art/${rareEnemyArt[char.id]}.png` : char.origin.includes('event') ? `art/event-${char.id}.png` : storyCharacters.includes(char.id) ? `art/${char.id}.png` : `art/${char.encounterArtId}.png`, kind: 'background' as const,
  width: char.origin.includes('event') || rareEnemyArt[char.id] || storyCharacters.includes(char.id) ? 1024 : 1536, height: char.origin.includes('event') || rareEnemyArt[char.id] || storyCharacters.includes(char.id) ? 1536 : 1024, anchor: char.origin.includes('event') || storyCharacters.includes(char.id) ? '50% 0%' : '50% 50%', rights: 'Original AI-generated complete encounter painting for this project.', ...(char.id === 'lunette-awakened' ? lunetteLoopPoster : {}),
}] : []);
const portraitMotionAssets: AssetDef[] = characters.filter(char => char.portraitMotionId).map(char => ({
  id: char.portraitMotionId!, path: `video/${char.id}-portrait${char.id === 'athena' ? '-anime' : char.id === 'selene' ? '-v2' : char.id === 'lunette-awakened' ? '-loop' : ''}.mp4`, kind: 'video', width: 320, height: 480,
  anchor: '50% 0%', rights: `Optimized portrait export of original project animation ${char.motionId}; 320x480, 18fps, H.264 Baseline Level 3.0.`,
}));
const menuAssets: AssetDef[] = [
  { id: 'gacha-selene-motion', path: 'video/gacha-selene-v2.mp4', kind: 'video', width: 720, height: 1080, anchor: '50% 0%', rights: 'Original project Selene kimono illustration animated with Runway; task cdf471e0-c6d0-4ff6-871e-854922b3beac.' },
  { id: 'gacha-athena-motion', path: 'video/gacha-athena-anime.mp4', kind: 'video', width: 720, height: 1080, anchor: '50% 0%', rights: 'Original project anime-style Athena kimono illustration animated with Runway; task 1aceb7d3-6966-4dab-b652-892629560349.' },
  { id: 'seris-awakened-motion', path: 'video/seris-awakened.mp4', kind: 'video', width: 720, height: 1080, anchor: '50% 0%', rights: 'Original project Seris dawn illustration animated with Runway; task 5e312a67-100d-448a-afa6-b2b00b7a8bb7.' },
  { id: 'gacha-nox-motion', path: 'video/gacha-nox.mp4', kind: 'video', width: 720, height: 960, anchor: '50% 0%', rights: 'Original project clockwork maiden Nox animated with Runway; generation details in docs/clockwork-maidens.md.' },
  { id: 'lunette-awakened-motion', path: 'video/lunette-awakened-loop.mp4', kind: 'video', width: 720, height: 960, anchor: '50% 0%', rights: 'Original project awakened Lunette illustration animated with Runway; base task 8359e9fb-8015-4c91-8232-8a937424eab2 plus return bridge d57d4e7d-52e7-4cd7-a54a-0b29ff7580b2; about 10 seconds, silent.' },
  { id: 'kuzuha-awakened-motion', path: 'video/kuzuha-awakened.mp4', kind: 'video', width: 720, height: 1080, anchor: '50% 18%', rights: 'Original project illustration with understated chest silhouette animated with Runway; task 7b9e961c-2a25-47cc-89f1-2f537bc7d520.' },
  { id: 'gacha-izanami-motion', path: 'video/gacha-izanami.mp4', kind: 'video', width: 720, height: 1080, anchor: '50% 22%', rights: 'Original project goddess illustration animated with Runway; task d2d265ba-0283-46ed-84cd-bdee1ffd8ccf.' },
  { id: 'gacha-amaterasu-motion', path: 'video/gacha-amaterasu.mp4', kind: 'video', width: 720, height: 1080, anchor: '50% 22%', rights: 'Original project goddess illustration animated with Runway; task 3b46aceb-e02f-4277-9ec0-ba114d5afcf1.' },
  { id: 'home-portrait-motion', path: 'video/home-portrait-anime.mp4', kind: 'video', width: 1080, height: 1080, anchor: '50% 18%', rights: 'Original project menu illustration animated with Runway; task 0340ee09-e6c0-4ad5-9bb1-c54236e5a0eb; restrained anime hair motion; H.264 High Level 4.0.' },
  { id: 'notice-moonlight', path: 'art/notice-moonlight.png', kind: 'background', width: 2172, height: 724, anchor: '50% 50%', rights: 'Original AI-generated moonlit notification frame for this project.' },
  { id: 'command-moonlight', path: 'art/command-moonlight.png', kind: 'background', width: 1536, height: 1024, anchor: '50% 50%', rights: 'Original AI-generated moonlit command surface for this project.' },
  { id: 'menu-logos', path: 'art/menu-logos.png', kind: 'icon', width: 1536, height: 1024, anchor: '50% 50%', rights: 'Original AI-generated monochrome menu crest atlas for this project.' },
  { id: 'control-frames', path: 'art/control-frames.png', kind: 'icon', width: 1536, height: 1024, anchor: '50% 50%', rights: 'Original AI-generated complete framed control atlas for this project.' },
  { id: 'menu-atlas', path: 'art/menu-atlas.png', kind: 'icon', width: 1536, height: 1024, anchor: '50% 50%', rights: 'Original AI-generated painted UI icon atlas for this project.' },
  { id: 'command-atlas', path: 'art/command-atlas.png', kind: 'icon', width: 1536, height: 1024, anchor: '50% 50%', rights: 'Original AI-generated painted UI icon atlas for this project.' },
{ id: 'menu-bag', path: 'art/menu-bag.png', kind: 'icon', width: 1254, height: 1254, anchor: '50% 50%', rights: 'Original AI-generated artwork for this project.' }, { id: 'menu-codex', path: 'art/menu-codex.png', kind: 'icon', width: 1254, height: 1254, anchor: '50% 50%', rights: 'Original AI-generated artwork for this project.' }, { id: 'menu-hero', path: 'art/menu-hero.png', kind: 'background', width: 1254, height: 1254, anchor: '50% 50%', rights: 'Original AI-generated artwork for this project.' }];

export const content: Content = { xrGacha, goldExchanges, chapters: campaignChapters, appVersion: '0.1.0', contentVersion: 'initial-r1', rulesVersion: '1', schemaVersion: 1, characters, skills, awakenings: dawnAwakenings, memories: dawnMemories, storylines: [dawnStory], materials: [...dawnMaterials, ...rareEnemyMaterials], events: [kuzuhaEvent, lunetteEvent], species: [ ...rareEnemySpecies, ...dawnMaterials.map(item => ({ id: item.id.split(':')[0]!, name: item.name })), { id: 'clockwork', name: '機巧' }, { id: 'lunette-clockwork', name: '星時計' }, { id: 'fox', name: '妖狐' }, { id: 'kuzuha-contract', name: '契り' }, { id: 'pilgrim', name: '巡礼' }, { id: 'mist', name: '白霧' }, { id: 'stone', name: '石燐' }, { id: 'hollow', name: '虚ろ' }, { id: 'moon', name: '月翅' }, { id: 'veil', name: '白帳' }, { id: 'thorn', name: '荊冠' } ], assets: withMotionPosters([{ id: 'novel-desire-gate', path: 'art/novel-desire-gate.webp', kind: 'background', width: 1600, height: 900, anchor: '50% 50%', rights: 'Original project opening illustration; prompt and task in docs/visual-novels.md.' }, { id: 'novel-awakening-garden', path: 'art/novel-awakening-garden.webp', kind: 'background', width: 1600, height: 900, anchor: '80% 40%', rights: 'Original project opening illustration; prompt and task in docs/visual-novels.md.' }, { id: 'fairy-guide', path: 'art/fairy-guide-lumi.webp', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: 'Original fairy guide Lumi created with Runway for STILLVEIL; prompt and task details in docs/fairy-tutorial.md.' }, ...characterAssets, ...encounterAssets, ...menuAssets, ...portraitMotionAssets, { id: 'app-icon', path: 'art/app-icon-portrait.png', kind: 'icon', width: 1254, height: 1254, anchor: '50% 50%', rights: 'Original AI-generated silver-haired female portrait for this project.' }, { id: 'apple-touch-icon', path: 'apple-touch-icon.png', kind: 'icon', width: 180, height: 180, anchor: '50% 50%', rights: '180px export of original AI-generated project portrait.' }, { id: 'key-art', path: 'art/key-art.png', kind: 'background', width: 1536, height: 1024, anchor: '70% 50%', rights: 'Original AI-generated artwork for this project.' }, { id: 'cathedral', path: 'art/cathedral.png', kind: 'background', width: 1536, height: 1024, anchor: '50% 45%', rights: 'Original AI-generated background created for this project.' }, ...(['common', 'rare', 'epic'] as const).map(rarity => ({ id: `material-${rarity}`, path: `art/material-${rarity}.svg`, kind: 'icon' as const, width: 128, height: 128, anchor: '50% 50%', rights: 'Original SVG artwork created for this project.' }))]), dungeons };

export function characterById(id: string): CharacterDef { const found = content.characters.find(char => char.id === id); if (!found) throw new Error(`未知のキャラクター: ${id}`); return found; }
export function assetPath(id: string): string { const asset = content.assets.find(item => item.id === id); if (!asset) throw new Error(`未知のアセット: ${id}`); const base = typeof import.meta.env === 'object' ? import.meta.env.BASE_URL : '/'; return `${base.replace(/\/$/, '')}/${asset.path.replace(/^\//, '')}`; }
export function materialName(id: string): string {
  const named = content.materials?.find(item => item.id === id);
  if (named) return named.name;
  const special = content.events?.flatMap(event => [event.fragment, event.core]).find(item => item.id === id);
  if (special) return special.name;
  const [speciesId, rarity] = id.split(':'); const name = content.species.find(item => item.id === speciesId)?.name ?? speciesId; const suffix = ({ common: '欠片', rare: '結晶', epic: '核' } as Record<string, string>)[rarity] ?? rarity; return `${name}の${suffix}`; }

content.novels = [openingNovel, ...campaignNovels(content.chapters ?? [], content.dungeons)];
