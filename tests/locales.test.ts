import { describe,it,expect } from 'vitest';
import { tr,setLanguage } from '../src/locales/i18n';
import { content,materialName } from '../src/content';
import { skillDescription,leaderEffectDescription } from '../src/domain/skill-info';
import { createInitialSave } from '../src/application/game';
const japanese=/[\u3040-\u30ff\u3400-\u9fff]/;
describe('Japanese and English presentation',()=>{
 it('translates names, stories, dungeons and all skill conditions',()=>{
  const texts=[...content.characters.flatMap(c=>[c.name,c.epithet,c.flavor,leaderEffectDescription(c),...Object.values(c.dialogue??{})]),...content.dungeons.flatMap(d=>[d.name,d.subtitle,d.description]),...content.skills.map(skillDescription),...content.species.flatMap(s=>['common','rare','epic'].map(r=>materialName(`${s.id}:${r}`)))];
  for(const text of texts)expect(tr(text,'en'),text).not.toMatch(japanese);
 });
 it('formats persisted events and interpolated labels without changing the save',()=>{
  expect(tr('エレイン — 白花の祈り','en')).toBe('Elaine — Whiteflower Prayer');
  expect(tr('白霧の狼「……ここから先は、夢さえ帰れない。」','en')).toContain('Pale Wolf:');
  expect(tr('石5個で祈願する','en')).toBe('Summon for 5 Wishstones');
  expect(tr('セリス — 銀閃の貫突（障壁が12軽減）','en')).not.toMatch(japanese);
  expect(tr('status.regen','en')).toBe('Regen');expect(tr('status.regen','ja')).toBe('再生');
  const save=createInitialSave(content,42),before=JSON.stringify(save);setLanguage('en');setLanguage('ja');expect(JSON.stringify(save)).toBe(before);
 });
});
