"""Add strict rest guard/commander gates in a new copy, leaving capture inputs immutable."""
from pathlib import Path
import shutil
ROOT=Path(__file__).resolve().parents[2];OLD=Path('/tmp/build-diary-02-lab');LAB=Path('/tmp/build-diary-02-contract-v2');LAB.mkdir(exist_ok=True)
for name in['src','scripts']:shutil.copytree(OLD/name,LAB/name,dirs_exist_ok=True)
shutil.copy2(OLD/'package.json',LAB/'package.json')
if not(LAB/'node_modules').exists():(LAB/'node_modules').symlink_to((ROOT/'node_modules').resolve())
p=LAB/'src/domain/engine.ts';s=p.read_text()
a="const issued = command && commander && !commandUnavailableReason(input)";assert s.count(a)==1;s=s.replace(a,"const issued = command && commander && !labResting(battle,commander) && !commandUnavailableReason(input)")
a="if (battle.partyOrder?.kind === 'guard') {";assert s.count(a)==1;s=s.replace(a,"if (battle.partyOrder?.kind === 'guard' && !battle.units.some(u=>u.side==='party'&&u.characterId===battle.partyIds[0]&&labResting(battle,u))) {")
p.write_text(s)
s=(ROOT/'scripts/build-diary-02/research-runner.mts').read_text().replace('/tmp/build-diary-02-lab','/tmp/build-diary-02-contract-v2');(LAB/'contract-runner.mts').write_text(s)
print('CONTRACT V2 COPY READY',LAB)
