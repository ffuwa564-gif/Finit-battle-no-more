"""Copy only source text to /tmp, then apply explicit research hooks. Live app remains untouched."""
from pathlib import Path
import shutil,json,hashlib
ROOT=Path(__file__).resolve().parents[2];LAB=Path('/tmp/stillveil-ruka-build-lab');LAB.mkdir(exist_ok=True)
shutil.copytree(ROOT/'src',LAB/'src',dirs_exist_ok=True);(LAB/'scripts/diary-part3').mkdir(parents=True,exist_ok=True)
shutil.copy2(ROOT/'scripts/diary-part3/core.ts',LAB/'scripts/diary-part3/core.ts');shutil.copy2(Path(__file__).with_name('prototype-rules.ts'),LAB/'src/domain/research-ruka.ts');(LAB/'package.json').write_text('{"type":"module"}')
deps=(ROOT/'node_modules').resolve();assert(deps/'tsx/package.json').exists(),'Install dependencies at the repository root first.'
if (LAB/'node_modules').is_symlink()and(LAB/'node_modules').resolve()!=deps:(LAB/'node_modules').unlink()
if not(LAB/'node_modules').exists():(LAB/'node_modules').symlink_to(deps)
def patch(path,a,b):
 p=LAB/path;s=p.read_text();assert s.count(a)==1,(path,a,s.count(a));p.write_text(s.replace(a,b))
eng='src/domain/engine.ts'
patch(eng,"import { CRYSTAL_POWER", "import {capResearchDamage,collectResearchThread,researchSkill,researchSuggested,finishResearchRound,STITCH} from './research-ruka';\nimport { CRYSTAL_POWER")
patch(eng,'const actual = Math.min(recipient.hp, amount - absorbed);','const actual = capResearchDamage(battle,recipient,Math.min(recipient.hp, amount - absorbed));')
patch(eng,'const amount = Math.min(recipient.hp, strength - absorbed);','const amount = capResearchDamage(battle,recipient,Math.min(recipient.hp, strength - absorbed));')
patch(eng,'const scoutAction = scoutSuggestedAction(actor, battle, skills, forecast);','const labAction=researchSuggested(battle,actor,skills);if(labAction)return labAction;\n  const scoutAction = scoutSuggestedAction(actor, battle, skills, forecast);')
patch(eng,'const customScout = action.skill && !memoryDef',"const customLab=action.skill&&!action.ultimate&&!action.forcedBy?researchSkill(battle,actor,action.skill.id):undefined;\n    const customScout = customLab ?? (action.skill && !memoryDef")
patch(eng,'scoutSkillAction(battle, actor, action.skill.id, potency, action.targets.map(target => target.uid)) : undefined;','scoutSkillAction(battle, actor, action.skill.id, potency, action.targets.map(target => target.uid)) : undefined);')
patch(eng,'for (const text of expireScoutEffects(battle))',"for(const text of collectResearchThread(battle))emit(battle,{kind:'buff',text,unitsAfter:clone(battle.units)});\n  for (const text of expireScoutEffects(battle))")
patch(eng,"if (!alive(battle.units, 'party').length) {\n    battle.nextPhase", "for(const text of finishResearchRound(battle))emit(battle,{kind:'heal',text,unitsAfter:clone(battle.units)});\n  if (!alive(battle.units, 'party').length) {\n    battle.nextPhase")
patch(eng,'scoutSkillCooldown(action.skill.id) ?? gemCooldown',"(action.skill.id===STITCH?3:undefined) ?? scoutSkillCooldown(action.skill.id) ?? gemCooldown")
# Preserve true action cost and prevent double-spending stored versus transient copies.
sc='src/domain/scout-skills.ts';patch(sc,"import { gainUltimate", "import{threadCount,spendThread,labState}from'./research-ruka';\nimport { gainUltimate")
patch(sc,"const threaded = (actor.scoutThreadUntil ?? -1) >= battle.round;", "const threaded = labState(battle)?threadCount(battle,actor)>0:(actor.scoutThreadUntil ?? -1) >= battle.round;\n  if(labState(battle)&&threaded)spendThread(battle,actor);")
patch(sc,"if (actor.characterId === 'ruka' && action.skillId === SCOUT_SKILLS.shear && hitEnemies.length > 0 && activeLeader(battle, 'ruka'))", "if ((!labState(battle) || labState(battle)?.stockEnabled === false) && actor.characterId === 'ruka' && action.skillId === SCOUT_SKILLS.shear && hitEnemies.length > 0 && activeLeader(battle, 'ruka'))")
mg='src/domain/memory-gems.ts';patch(mg,"export const GEM_DEFINITIONS: GemDefinition[] = [", "export const GEM_DEFINITIONS: GemDefinition[] = [\n definition('research-basting-spool','仮縫いの糸巻き','研究案：自分へ60障壁、次ラウンド終了まで。固定T3。','sanctuary','barrier',3,14,{fixedRoll:{power:80,trait:'none',value:0}}),")
files={str(p.relative_to(LAB)):hashlib.sha256(p.read_bytes()).hexdigest()for p in(LAB/'src').rglob('*.ts')};(ROOT/'artifacts/ruka-build-research/prototype-hashes.json').write_text(json.dumps({'liveGameSourceUnchanged':True,'labRoot':str(LAB),'files':files},indent=2))
# All native positive HP writes pass through the prototype's wound check.
# Scout/rescue heals can only target the party; wound is an enemy-only effect.
p=LAB/eng;s=p.read_text();s=s.replace('researchSuggested,finishResearchRound,STITCH','researchSuggested,finishResearchRound,capResearchHealing,STITCH');s=s.replace('const healed =','let healed =').replace('const amount =','let amount =')
import re
s,count=re.subn(r'\b(target|actor|unit)\.hp \+= (amount|healed|drained);',lambda m:f'{m[2]}=capResearchHealing(battle,{m[1]},{m[2]}); '+m[0],s);assert count==11,count;p.write_text(s)
# Re-stamp after all extension patches.
files={str(p.relative_to(LAB)):hashlib.sha256(p.read_bytes()).hexdigest()for p in(LAB/'src').rglob('*.ts')};(ROOT/'artifacts/ruka-build-research/prototype-hashes.json').write_text(json.dumps({'liveGameSourceUnchanged':True,'labRoot':str(LAB),'files':files},indent=2))

print('ISOLATED NATIVE PROTOTYPE READY',LAB)
