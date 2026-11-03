from pathlib import Path
import urllib.request,zipfile,concurrent.futures,json
B=Path(__file__).resolve().parent;ref='0f2036c079cf3b4a979838dc7435ed9e94ef2a3b';base='https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/'+ref+'/'
def get(name):
 p=B/'reference'/name
 with urllib.request.urlopen(base+name,timeout=90)as r,p.open('wb')as f:
  while x:=r.read(1048576):f.write(x)
 return p
with concurrent.futures.ThreadPoolExecutor(max_workers=2)as ex:paths=list(ex.map(get,['Production-Materials-01.zip','Production-Materials-02.zip']))
rows=[]
for p in paths:
 with zipfile.ZipFile(p)as z:
  for i in z.infolist():
   if any(k in i.filename for k in ['assets/','artwork','asset-reuse','Credits','provenance'])and i.filename.lower().endswith(('.png','.webp','.json','.md','.txt')):
    rows.append({'name':i.filename,'size':i.file_size});dest=B/'restored'/i.filename
    assert dest.resolve().is_relative_to((B/'restored').resolve());dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(z.read(i))
(B/'reference/archive-index.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows[:35],indent=2));print('files',len(rows))
