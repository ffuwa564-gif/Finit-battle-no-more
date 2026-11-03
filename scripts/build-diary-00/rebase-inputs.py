from pathlib import Path
import json
B=Path(__file__).resolve().parent
p=B/'narration.json';n=json.loads(p.read_text())
for v in n['lines']:v['source']=str(B/'speech'/Path(v['source']).name)
p.write_text(json.dumps(n,ensure_ascii=False,indent=2))
print('Paths restored; regenerate timeline and all final-media audits.')
