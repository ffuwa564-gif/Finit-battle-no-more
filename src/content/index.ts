import type { AssetDef, CharacterDef, Content, DungeonDef, Role, SkillDef, SkillTemplate } from '../domain/types';
export { validateContent } from './validation';

const roleLabels: Record<Role, string> = { healer: '癒し手', tank: '守護者', attacker: '剣士', area_attacker: '詠唱者', supporter: '導き手', debuffer: '呪術師' };
export const roleName = (role: Role): string => roleLabels[role];
const labels: Record<SkillTemplate, string> = { attack: '月影の一閃', area: '静寂の雨', heal: '白花の祈り', guard: '守りの誓い', buff: '星灯の導き', debuff: '朽ちゆく祝福' };
const templates: SkillTemplate[] = ['attack', 'area', 'heal', 'guard', 'buff', 'debuff'];
const skillFor = (template: SkillTemplate, strength: number): string => `${template}-${strength}`;
const skills: SkillDef[] = [10, 11, 12, 14, 16, 18, 20, 22, 24].flatMap(strength => templates.map(template => ({ id: skillFor(template, strength), name: labels[template], template, strength, soundProfile: template })));
const required: Record<Role, SkillTemplate> = { healer: 'heal', tank: 'guard', attacker: 'attack', area_attacker: 'area', supporter: 'buff', debuffer: 'debuff' };
interface CharacterInput { id: string; name: string; epithet: string; flavor: string; role: Role; speciesId: string; strength: number; origin: CharacterDef['origin']; rarity?: CharacterDef['rarity'] }
const bossDialogues: Record<string, NonNullable<CharacterDef['dialogue']>> = {
  'pale-wolf': { intro: '……ここから先は、夢さえ帰れない。', threshold: 'まだ、その灯を消すわけにはいかない。', defeat: 'ようやく……あの人の足音が、聞こえる。' },
  'stone-drake': { intro: 'この庭の眠りを、誰が呼び覚ました。', threshold: '石は砕けても……約束は、残る。', defeat: '花を……踏まないで、おくれ。' },
  'hollow-keeper': { intro: '名を捨てた者だけが、この門を守れる。', threshold: '主よ……もう少しだけ、お待ちください。', defeat: '鍵を、あなたに。今度こそ……扉の向こうへ。' },
  'moon-moth': { intro: '欠けた月の夢を、あなたにも。', threshold: '薄れてゆく……誰かの、やさしい記憶。', defeat: '夜明けなど……来なくても、よかったのに。' },
  'veil-priestess': { intro: 'この祈りだけは、奪わないで。', threshold: '届かないと知っても……私は、祈る。', defeat: 'こんなにも静かに……終われるのですね。' },
  'thorn-witch': { intro: '枯れた花にも、帰る場所はある。', threshold: '咲かせましょう……最後の、一輪を。', defeat: '庭のこと……ときどき、思い出して。' },
};
const character = (input: CharacterInput): CharacterDef => ({ ...input, ...(bossDialogues[input.id] ? { dialogue: bossDialogues[input.id] } : {}), rarity: input.rarity ?? 'R', leaderStat: input.role === 'tank' || input.role === 'healer' ? 'hp' : input.role === 'supporter' || input.role === 'debuffer' ? 'defense' : 'attack', skillIds: [skillFor(required[input.role], input.strength), skillFor(input.role === 'attacker' ? 'area' : 'attack', input.strength)], portraitId: `${input.id}-portrait`, artId: `${input.id}-art`, published: true, soundProfile: 'default' });
const characters: CharacterDef[] = [
  character({ id: 'elaine', name: 'エレイン', epithet: '白花の祈り手', role: 'healer', speciesId: 'pilgrim', strength: 14, origin: ['initial', 'recruit'], flavor: '誰もいない礼拝堂に、今日も花を供える祈り手。救えなかった人々の名を、彼女だけがまだ覚えている。優しい声の奥には、もう二度と手を離さないという静かな決意がある。' }),
  character({ id: 'liora', name: 'リオラ', epithet: '錆銀の守護者', role: 'tank', speciesId: 'pilgrim', strength: 14, origin: ['initial', 'recruit'], flavor: '滅びた王国の門を守り続けた騎士。主のいない盾は重さを失わず、彼女はその重さを生きる理由に変えた。言葉は少ないが、仲間の歩幅に合わせることを決して忘れない。' }),
  character({ id: 'seris', name: 'セリス', epithet: '薄明の剣', role: 'attacker', speciesId: 'pilgrim', strength: 14, origin: ['initial', 'recruit'], flavor: '朝の来ない街で剣を振るう旅人。彼女の刃は、過ぎ去ったものへの弔いであり、まだ見ぬ明日への道標でもある。雨上がりの石畳を、いつも懐かしそうに眺めている。' }),
  character({ id: 'noelle', name: 'ノエル', epithet: '星読みの残響', role: 'area_attacker', speciesId: 'pilgrim', strength: 14, origin: ['initial', 'recruit'], flavor: '消えた星座を読み続ける魔術師。崩れた天文台から持ち出した一冊の本には、誰にも見えない空の記録が綴られている。旅の夜には、仲間に忘れられた星の名を教える。' }),
  character({ id: 'pale-wolf', name: '白霧の狼', epithet: '聖堂に残る遠吠え', role: 'attacker', speciesId: 'mist', strength: 10, origin: ['recruit'], flavor: '聖堂に迷い込んだ魂を、出口まで導く白い獣。その足跡は霧とともに消える。かつて誰かを待っていたというが、今ではその誰かの姿を思い出せない。' }),
  character({ id: 'stone-drake', name: '石燐の幼竜', epithet: '眠れる庭の番人', role: 'tank', speciesId: 'stone', strength: 11, origin: ['recruit'], flavor: '崩れた噴水の底で長い眠りについていた竜。石のような鱗の隙間から、青白い光がこぼれる。小さな花を踏まないよう、驚くほど慎重に歩く。' }),
  character({ id: 'hollow-keeper', name: '虚ろの守り手', epithet: '帰らぬ主への誓い', role: 'tank', speciesId: 'hollow', strength: 12, origin: ['recruit'], flavor: '錆銀の鎧に名前を隠した女騎士。朽ちた鍵束を腰に下げ、閉じるべき扉を探している。鎧の内側には、すっかり色の褪せた小さなリボンが縫い付けられている。' }),
  character({ id: 'moon-moth', name: '月翅の蛾', epithet: '欠けた月の使者', role: 'area_attacker', speciesId: 'moon', strength: 10, origin: ['recruit'], flavor: '月明かりの差す場所にだけ現れる幻の蛾。翅に散る燐粉は、触れた者に遠い夢を見せる。死者の言葉を運ぶとも、生きる者の寂しさが形になったとも言われる。' }),
  character({ id: 'veil-priestess', name: '帳の巫女', epithet: '届かない祈り', role: 'healer', speciesId: 'veil', strength: 11, origin: ['recruit'], flavor: '破れた聖歌を口ずさむ、角を持つ女性。人々が去った後も祈りの灯を絶やさなかった。差し出された手に触れると、冷えた指先だけが微かに震える。' }),
  character({ id: 'thorn-witch', name: '荊の魔女', epithet: '枯園の記憶', role: 'debuffer', speciesId: 'thorn', strength: 12, origin: ['recruit'], flavor: '花を咲かせなくなった庭に暮らす魔女。荊の冠は罰ではなく、彼女自身が選んだ約束のしるし。誰かが種を持ってくるたび、ほんの少しだけ口元を緩める。' }),
  character({ id: 'iris', name: 'イリス', epithet: '灰青の巡礼者', role: 'supporter', speciesId: 'pilgrim', strength: 12, origin: ['gacha'], rarity: 'R', flavor: '失われた鐘の音を探して街を巡る女性。小さなランタンに灯るのは、旅先で分けてもらった祈りのかけら。誰も道を覚えていなくても、彼女は立ち止まらない。' }),
  character({ id: 'mireille', name: 'ミレイユ', epithet: '鏡湖の歌姫', role: 'healer', speciesId: 'veil', strength: 18, origin: ['gacha'], rarity: 'SR', flavor: '鏡のように静かな湖で歌う亜人の女性。水面には、もうこの世にいない観客の影が揺れる。彼女が歌を止めると、遠くで季節の終わる音がする。' }),
  character({ id: 'asteria', name: 'アステリア', epithet: '落星の聖女', role: 'area_attacker', speciesId: 'moon', strength: 22, origin: ['gacha'], rarity: 'SSR', flavor: '夜空から一つの星が落ちた晩、廃都に現れた女性。その瞳には薄れた銀河が宿る。奇跡を願われることよりも、ただ名前を呼ばれることを望んでいる。' }),
  character({ id: 'evelyn', name: 'エヴリン', epithet: '終庭の女王', role: 'tank', speciesId: 'thorn', strength: 24, origin: ['gacha'], rarity: 'SSR', flavor: '誰もいない玉座を離れ、旅に加わった女王。王冠よりも重い記憶を抱えながら、今は一人の仲間として盾を持つ。枯れた花にも水をやる理由を、彼女は決して語らない。' }),
];

const characterAssets: AssetDef[] = characters.flatMap(char => {
  const wolf = char.id === 'pale-wolf';
  const landscape = wolf || char.id === 'stone-drake' || char.id === 'moon-moth';
  const generated = char.origin.includes('initial') || char.origin.includes('recruit');
  const common = { path: `art/${char.id}.${generated ? 'png' : 'svg'}`, width: landscape ? 1536 : generated ? 1024 : 640, height: landscape ? 1024 : generated ? 1536 : 900, rights: generated ? 'Original AI-generated illustration for this project.' : 'Original SVG artwork created for this project. No third-party source.' };
  return [
    { ...common, id: char.artId, kind: 'illustration', anchor: landscape ? '50% 50%' : '50% 42%' },
    { ...common, id: char.portraitId, kind: 'portrait', anchor: landscape ? '25% 30%' : generated ? '50% 8%' : '50% 28%', portraitZoom: char.id === 'moon-moth' ? 1.1 : landscape ? 1.4 : char.origin.includes('initial') ? 1.9 : generated ? 1.7 : 1.25, portraitOrigin: char.id === 'moon-moth' ? '50% 40%' : landscape ? '25% 30%' : generated ? '50% 18%' : '50% 22%' },
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
const dungeons: DungeonDef[] = stages.map(([id, name, subtitle, main, second], index) => ({ id, name, subtitle, description: `廃都の奥に残された${name}。${subtitle} 同じ種族の素材を集め、彼女たちの物語に触れる。`, artId: 'cathedral', published: true, waves: [
  Array.from({ length: 4 }, () => ({ characterId: main })),
  [{ characterId: main }, { characterId: main }, { characterId: index < 3 ? 'moon-moth' : second }],
  [{ characterId: main === 'veil-priestess' ? second : main, boss: true }],
] }));

const menuAssets: AssetDef[] = [{ id: 'menu-bag', path: 'art/menu-bag.png', kind: 'icon', width: 1254, height: 1254, anchor: '50% 50%', rights: 'Original AI-generated artwork for this project.' }, { id: 'menu-codex', path: 'art/menu-codex.png', kind: 'icon', width: 1254, height: 1254, anchor: '50% 50%', rights: 'Original AI-generated artwork for this project.' }, { id: 'menu-hero', path: 'art/menu-hero.png', kind: 'background', width: 1254, height: 1254, anchor: '50% 50%', rights: 'Original AI-generated artwork for this project.' }];

export const content: Content = { appVersion: '0.1.0', contentVersion: 'initial-r1', rulesVersion: '1', schemaVersion: 1, characters, skills, species: [ { id: 'pilgrim', name: '巡礼' }, { id: 'mist', name: '白霧' }, { id: 'stone', name: '石燐' }, { id: 'hollow', name: '虚ろ' }, { id: 'moon', name: '月翅' }, { id: 'veil', name: '白帳' }, { id: 'thorn', name: '荊冠' } ], assets: [...characterAssets, ...menuAssets, { id: 'app-icon', path: 'art/icon.svg', kind: 'icon', width: 512, height: 512, anchor: '50% 50%', rights: 'Original SVG artwork created for this project.' }, { id: 'apple-touch-icon', path: 'apple-touch-icon.png', kind: 'icon', width: 180, height: 180, anchor: '50% 50%', rights: 'Rasterization of original project SVG artwork.' }, { id: 'key-art', path: 'art/key-art.png', kind: 'background', width: 1536, height: 1024, anchor: '70% 50%', rights: 'Original AI-generated artwork for this project.' }, { id: 'cathedral', path: 'art/cathedral.png', kind: 'background', width: 1536, height: 1024, anchor: '50% 45%', rights: 'Original AI-generated background created for this project.' }, ...(['common', 'rare', 'epic'] as const).map(rarity => ({ id: `material-${rarity}`, path: `art/material-${rarity}.svg`, kind: 'icon' as const, width: 128, height: 128, anchor: '50% 50%', rights: 'Original SVG artwork created for this project.' }))], dungeons };

export function characterById(id: string): CharacterDef { const found = content.characters.find(char => char.id === id); if (!found) throw new Error(`未知のキャラクター: ${id}`); return found; }
export function assetPath(id: string): string { const asset = content.assets.find(item => item.id === id); if (!asset) throw new Error(`未知のアセット: ${id}`); const base = typeof import.meta.env === 'object' ? import.meta.env.BASE_URL : '/'; return `${base.replace(/\/$/, '')}/${asset.path.replace(/^\//, '')}`; }
export function materialName(id: string): string { const [speciesId, rarity] = id.split(':'); const name = content.species.find(item => item.id === speciesId)?.name ?? speciesId; const suffix = ({ common: '欠片', rare: '結晶', epic: '核' } as Record<string, string>)[rarity] ?? rarity; return `${name}の${suffix}`; }
