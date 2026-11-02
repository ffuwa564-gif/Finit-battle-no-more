"""Fresh current-main copy plus inherited Ruka/Neri proposals and contract-v2, in /tmp only."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[2];LAB=Path('/tmp/build-diary-03-lab');OUT=ROOT/'artifacts/build-diary-03/research';OUT.mkdir(parents=True,exist_ok=True)
s=(ROOT/'scripts/build-diary-02/research-bootstrap.py').read_text().replace("ROOT=Path(__file__).resolve().parents[2]",f'ROOT=Path({str(ROOT)!r})').replace('/tmp/build-diary-02-lab',str(LAB)).replace("ROOT/'artifacts/build-diary-02/research'",f'Path({str(OUT)!r})')
exec(compile(s,'inherited-isolated-bootstrap','exec'))
def patch(rel,a,b):
 p=LAB/rel;s=p.read_text();assert s.count(a)==1,(rel,a,s.count(a));p.write_text(s.replace(a,b))
e='src/domain/engine.ts'
patch(e,"const issued = command && commander && !commandUnavailableReason(input)","const issued = command && commander && !labResting(battle,commander) && !commandUnavailableReason(input)")
patch(e,"if (battle.partyOrder?.kind === 'guard') {","if (battle.partyOrder?.kind === 'guard' && !battle.units.some(u=>u.side==='party'&&u.characterId===battle.partyIds[0]&&labResting(battle,u))) {")
patch(e,'  clearScoutEffects(unit);','  clearScoutEffects(unit);delete (unit as any).researchReceipt;')
patch(e,'for (const text of expireScoutEffects(battle))',"for(const u of battle.units)if((u as any).researchReceipt&&((u as any).researchReceipt.until<battle.round))delete (u as any).researchReceipt;\n  for (const text of expireScoutEffects(battle))")
patch(e,'import{REST,restStart',"import{RECEIPT,receiptSkill,repairReceipt}from'./research-ione';\nimport{REST,restStart")
patch(e,'    const explicitPilotOrder',"    const repaired=repairReceipt(battle,actor,action);if(repaired){action=repaired.action;emit(battle,{kind:'buff',actorId:actor.uid,targetIds:action.targets.map(t=>t.uid),text:repaired.text,unitsAfter:clone(battle.units)});}\n    const explicitPilotOrder")
patch(e,'(restSkill(battle,actor,action.skill.id)??researchSkill', '(receiptSkill(battle,actor,action.skill.id)??restSkill(battle,actor,action.skill.id)??researchSkill')
patch(e,'(action.skill.id===REST?1:', '(action.skill.id===RECEIPT?1:action.skill.id===REST?1:')
import shutil
shutil.copy2(ROOT/'scripts/build-diary-03/research-rules.mts',LAB/'src/domain/research-ione.ts')
files={str(p.relative_to(LAB)):hashlib.sha256(p.read_bytes()).hexdigest()for p in(LAB/'src').rglob('*.ts')};(OUT/'research-prototype-hashes.json').write_text(json.dumps({'liveGameSourceUnchanged':True,'inheritedRestContract':'patched-v2','labRoot':str(LAB),'files':files},indent=2));print('IONE LAB READY',LAB)
