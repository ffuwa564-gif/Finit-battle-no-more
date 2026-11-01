import type { AssetDef, CharacterDef, MaterialCost, NamedMaterialDef, SkillDef } from '../domain/types';
import { SCOUT_SKILLS } from '../domain/scout-skills';

/** Four adult residents, recruited through guaranteed story materials rather than a compulsory banner. */
export const scoutMaidenSkills: SkillDef[] = [
  { id: SCOUT_SKILLS.mark, name: '宛先の余白', template: 'debuff', strength: 16, soundProfile: 'debuff' },
  { id: SCOUT_SKILLS.lantern, name: '交代の灯', template: 'barrier', strength: 13, soundProfile: 'guard' },
  { id: SCOUT_SKILLS.overflow, name: '余花の包帯', template: 'heal', strength: 17, soundProfile: 'heal' },
  { id: SCOUT_SKILLS.shear, name: '夜継ぎの鋏', template: 'attack', strength: 19, soundProfile: 'attack' },
];
export const scoutRecruitments = [
  { characterId: 'ione', dungeonId: 'register-return', materialId: 'name-register:rare', count: 1 },
  { characterId: 'fio', dungeonId: 'infirmary-handover', materialId: 'herbal-cloth:rare', count: 1 },
  { characterId: 'neri', dungeonId: 'lantern-return', materialId: 'night-watch:rare', count: 1 },
  { characterId: 'ruka', dungeonId: 'two-signatures', materialId: 'night-thread:rare', count: 1 },
] as const;
export const scoutMaidenRecruitments = scoutRecruitments;
export function scoutRecruitmentCost(characterId: string): MaterialCost[] | undefined {
  const offer = scoutRecruitments.find(r => r.characterId === characterId);
  return offer ? [{ materialId: offer.materialId, count: offer.count }] : undefined;
}
const common = { origin: ['recruit'] as CharacterDef['origin'], published: true, soundProfile: 'default' };
export const scoutMaidenCharacters: CharacterDef[] = [
  { ...common, id: 'ione', recruitCost: scoutRecruitmentCost('ione'), familyId: 'ione', name: 'イオネ', epithet: '空欄を預かる書記', speciesId: 'pilgrim', role: 'supporter', strength: 16, rarity: 'SR', leaderStat: 'defense', skillIds: ['buff-16', SCOUT_SKILLS.mark], portraitId: 'ione-portrait', artId: 'ione-art',
    flavor: '名簿を整える書記。空欄を埋める前に、本人へ聞くことを大切にしている。自分の帰る庭の欄だけは、まだ書いていない。「書き直していいよ。まだ、返していないから」。第5章で名簿の綴じ紐を受け取り、旅へ迎えられる。',
    dialogue: { intro: 'あなたの名前を、どこへ返せばいい？', threshold: '消す前に、本人へ聞きましょう。', defeat: 'その余白は……あなたに預けます。' } },
  { ...common, id: 'neri', recruitCost: scoutRecruitmentCost('neri'), familyId: 'neri', name: 'ネリ', epithet: '灯を返す夜番', speciesId: 'pilgrim', role: 'tank', strength: 13, rarity: 'R', leaderStat: 'hp', skillIds: ['guard-13', SCOUT_SKILLS.lantern], portraitId: 'neri-portrait', artId: 'neri-art',
    flavor: '街の夜番を務める女性。休む順番を譲りがちだが、誰かの代わりに永遠に立つつもりはない。灯油の残量には厳しく、朝食だけは少し贅沢する。「守るよ。でも、次の番は頼むね」。大技の予告へ灯を差し出し、先頭の仲間を守る。',
    dialogue: { intro: 'この灯の向こうへは、通さない。', threshold: '交代の時間まで、まだ立てる。', defeat: '……次の番を、頼んでもいい？' } },
  { ...common, id: 'fio', recruitCost: scoutRecruitmentCost('fio'), familyId: 'fio', name: 'フィオ', epithet: '余り布の薬草師', speciesId: 'pilgrim', role: 'healer', strength: 17, rarity: 'SR', leaderStat: 'hp', skillIds: ['heal-17', SCOUT_SKILLS.overflow], portraitId: 'fio-portrait', artId: 'fio-art',
    flavor: '療養室と温室の間を行き来する薬草師。余った包帯も捨てられず、棚はいつもいっぱい。人を休ませるのは得意でも、自分の休みは後回しだ。「余ったぶん？ 次の誰かのために、取ってあるの」。半量の手当から余った分だけ、短い守りへ仕立てる。',
    dialogue: { intro: '傷のない人ほど、休んでいない顔をする。', threshold: '包帯は、まだ残っているから。', defeat: '今度は……私が休む番ね。' } },
  { ...common, id: 'ruka', recruitCost: scoutRecruitmentCost('ruka'), familyId: 'ruka', name: 'ルカ', epithet: '夜継ぎの仕立て屋', speciesId: 'pilgrim', role: 'attacker', strength: 19, rarity: 'SSR', leaderStat: 'attack', skillIds: ['pierce-19', SCOUT_SKILLS.shear], portraitId: 'ruka-portrait', artId: 'ruka-art',
    flavor: '帰還した人の服を継ぐ仕立て屋。傷んだ縫い目は直しても、持ち主が残したい切れ端には鋏を入れない。無口に見えて、糸の好みにはよく喋る。「使わなかった守りも、無駄だったとは思わない」。自然に役目を終えた障壁から残り糸を受け取り、次の一撃へ継ぐ。',
    dialogue: { intro: 'そこを切るなら、先に持ち主へ聞いて。', threshold: 'まだ、縫い直せる場所がある。', defeat: 'その糸を……捨てずに持っていて。' } },
];
export const scoutMaidenMaterials: NamedMaterialDef[] = [
  { id: 'name-register:rare', name: '名簿の綴じ紐' }, { id: 'night-watch:rare', name: '返された夜番灯' },
  { id: 'herbal-cloth:rare', name: '薬草と余り布' }, { id: 'night-thread:rare', name: '帰還の残り糸' },
];
export const scoutMaidenAssets: AssetDef[] = ['ione', 'neri', 'fio', 'ruka'].flatMap(id => {
  const source = { path: `art/scout-${id}.webp`, width: 1024, height: 1536, rights: 'Original AI-generated adult female character artwork created for the STILLVEIL scout conference and reused for version1.10.' };
  return [
    { ...source, id: `${id}-art`, kind: 'illustration' as const, anchor: '50% 25%' },
    { ...source, id: `${id}-portrait`, kind: 'portrait' as const, anchor: '50% 16%', portraitZoom: 2.8, portraitOrigin: '50% 16%' },
  ];
});
