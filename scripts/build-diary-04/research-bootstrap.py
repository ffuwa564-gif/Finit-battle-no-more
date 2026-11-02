"""Generate a current-main isolated native snapshot, with explicitly inherited research contracts."""
from pathlib import Path
import shutil,json,hashlib
ROOT=Path(__file__).resolve().parents[2];LAB=Path('/tmp/build-diary-04-lab');OUT=ROOT/'artifacts/build-diary-04/research';SNAP=ROOT/'scripts/build-diary-04/research-native';OUT.mkdir(parents=True,exist_ok=True)
s=(ROOT/'scripts/build-diary-03/research-bootstrap.py').read_text().replace("ROOT=Path(__file__).resolve().parents[2]",f'ROOT=Path({str(ROOT)!r})').replace('/tmp/build-diary-03-lab',str(LAB)).replace("ROOT/'artifacts/build-diary-03/research'",f'Path({str(OUT)!r})')
exec(compile(s,'inherited-03-isolated-bootstrap','exec'))
def patch(rel,a,b):
 p=LAB/rel;s=p.read_text();assert s.count(a)==1,(rel,a,s.count(a));p.write_text(s.replace(a,b))
e='src/domain/engine.ts'
patch(e,'import{RECEIPT,receiptSkill',"import{SUPPLY,supplySkill,paySupplyAfterAction,expireSupply,supplySuggested}from'./research-fio';\nimport{RECEIPT,receiptSkill")
patch(e,'  const scoutAction = scoutSuggestedAction(actor, battle, skills, forecast);',"  const preparedSupply=supplySuggested(battle,actor,skills);if(preparedSupply)return preparedSupply;\n  const scoutAction = scoutSuggestedAction(actor, battle, skills, forecast);")
patch(e,"const susceptible = enemies.filter(unit => !hasAilment(unit) && (unit.statusWardUntil ?? -1) < battle.round).sort((a,b) => b.attack - a.attack || byId(a,b))[0];","const susceptible = enemies.filter(unit => !hasAilment(unit) && (unit.statusWardUntil ?? -1) < battle.round).sort((a,b) => (actor.side==='enemy'&&control?.template==='sleep' ? Number(character(content,b.characterId).role==='healer')-Number(character(content,a.characterId).role==='healer') : 0) || b.attack-a.attack || byId(a,b))[0];")
patch(e,'(receiptSkill(battle,actor,action.skill.id)??restSkill', '(supplySkill(battle,actor,action.skill.id,potency)??receiptSkill(battle,actor,action.skill.id)??restSkill')
patch(e,'(action.skill.id===RECEIPT?1:', '(action.skill.id===SUPPLY?4:action.skill.id===RECEIPT?1:')
patch(e,"  const def = dungeon(content, battle.dungeonId);\n  delete battle.commandOrder;", "  const def = dungeon(content, battle.dungeonId);\n  delete (battle as any).researchSupplyBoxes;\n  delete battle.commandOrder;")
patch(e,'  expireRoundEffects(battle);',"  for(const ev of expireSupply(battle))emit(battle,{...ev,unitsAfter:clone(battle.units)});\n  expireRoundEffects(battle);")
patch(e,"for (const text of scoutMessages) emit(battle, { kind:","for (const text of scoutMessages) emit(battle, { ...(text.startsWith('研究：預かり箱')?{researchSupplyBoxesAfter:clone((battle as any).researchSupplyBoxes??{})}:{}), kind:")
patch(e,'    const settled = settleAction(battle, content, before);\n    goldEarned += settled.goldEarned;',"    for(const ev of paySupplyAfterAction(battle,actor,before,action))emit(battle,{...ev,unitsAfter:clone(battle.units)});\n    const settled = settleAction(battle, content, before);\n    goldEarned += settled.goldEarned;")
shutil.copy2(ROOT/'scripts/build-diary-04/research-rules.mts',LAB/'src/domain/research-fio.ts')
# Keep the generated executable snapshot in this episode's owned source tree, not an absolute /tmp dependency.
SNAP.mkdir(exist_ok=True);shutil.copytree(LAB/'src',SNAP/'src',dirs_exist_ok=True);shutil.copytree(LAB/'scripts',SNAP/'scripts',dirs_exist_ok=True);shutil.copy2(LAB/'package.json',SNAP/'package.json')
files={str(p.relative_to(SNAP)):hashlib.sha256(p.read_bytes()).hexdigest()for p in SNAP.rglob('*.ts')};(OUT/'research-prototype-hashes.json').write_text(json.dumps({'liveGameSourceUnchanged':True,'labRoot':str(LAB),'snapshotRoot':str(SNAP.relative_to(ROOT)),'inheritedRestContract':'patched-v2','files':files},indent=2));print('FIO NATIVE SNAPSHOT READY',SNAP)
