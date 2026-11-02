"""Native engine extensions in a new isolated copy. Does not write src/ or Part1."""
from pathlib import Path
import shutil,json,hashlib
ROOT=Path(__file__).resolve().parents[2];LAB=Path('/tmp/build-diary-02-lab');OUT=ROOT/'artifacts/build-diary-02/research';OUT.mkdir(exist_ok=True,parents=True)
# Preserve Ruka's exact research proposal while adding a disjoint rest ability.
py=(ROOT/'scripts/ruka-build-research/bootstrap.py').read_text().replace("ROOT=Path(__file__).resolve().parents[2]",f'ROOT=Path({str(ROOT)!r})').replace('/tmp/stillveil-ruka-build-lab',str(LAB)).replace("Path(__file__).with_name('prototype-rules.mts')",f"Path({str(ROOT/'scripts/ruka-build-research/prototype-rules.mts')!r})").replace("ROOT/'artifacts/ruka-build-research/prototype-hashes.json'",f"Path({str(OUT/'research-ruka-base-hashes.json')!r})")
exec(compile(py,'isolated-ruka-bootstrap','exec'))
shutil.copy2(ROOT/'scripts/build-diary-02/research-rules.mts',LAB/'src/domain/research-neri.ts')
def patch(rel,a,b):
 p=LAB/rel;s=p.read_text();assert s.count(a)==1,(rel,a,s.count(a));p.write_text(s.replace(a,b))
e='src/domain/engine.ts'
patch(e,'import {capResearchDamage',"import{REST,restStart,restSkill,restFinish,labResting}from'./research-neri';\nimport {capResearchDamage")
patch(e,'  expireRoundEffects(battle);',"  for(const ev of restStart(battle))emit(battle,{...ev,unitsAfter:clone(battle.units)});\n  expireRoundEffects(battle);")
patch(e,'    const before = clone(battle.units);\n    const controlled',"    if(labResting(battle,actor)){emit(battle,{kind:'buff',actorId:actor.uid,targetIds:[actor.uid],text:'研究：休息中 — 攻撃・回復・石・必殺を行わない',unitsAfter:clone(battle.units)});continue;}\n    const before = clone(battle.units);\n    const controlled")
patch(e,'researchSkill(battle,actor,action.skill.id):undefined;', '(restSkill(battle,actor,action.skill.id)??researchSkill(battle,actor,action.skill.id)):undefined;')
patch(e,'(action.skill.id===STITCH?3:undefined)', '(action.skill.id===REST?1:action.skill.id===STITCH?3:undefined)')
patch(e,"  if (!alive(battle.units, 'party').length) {\n    battle.nextPhase", "  for(const ev of restFinish(battle))emit(battle,{...ev,unitsAfter:clone(battle.units)});\n  if (!alive(battle.units, 'party').length) {\n    battle.nextPhase")
patch(e,"if (!alive(battle.units, 'party').length) {\n    battle.nextPhase","if (!alive(battle.units, 'party').length || (battle as any).researchDutyRules?.objectiveFailed) {\n    battle.nextPhase")
files={str(p.relative_to(LAB)):hashlib.sha256(p.read_bytes()).hexdigest()for p in(LAB/'src').rglob('*.ts')};(OUT/'research-prototype-hashes.json').write_text(json.dumps({'liveGameSourceUnchanged':True,'labRoot':str(LAB),'files':files},indent=2))
print('NERI RESEARCH READY',LAB)
