from pathlib import Path
import json,hashlib,urllib.request,time
from concurrent.futures import ThreadPoolExecutor
B=Path(__file__).resolve().parent;sha=json.loads((B/'SHA256.json').read_text());commit=(B/'download-commit.txt').read_text().strip();root='https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/'+commit+'/'
def verify(item):
 name,expected=item
 url=root+name
 for attempt in range(5):
  try:
   h=hashlib.sha256();size=0
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'STILLVEIL-Media-Verification'}),timeout=120)as r:
    while chunk:=r.read(1048576):h.update(chunk);size+=len(chunk)
   actual=h.hexdigest();assert actual==expected,(name,actual,expected)
   return {'file':name,'url':url,'size':size,'sha256':actual,'passed':True}
  except Exception:
   if attempt==4:raise
   time.sleep(2)
with ThreadPoolExecutor(max_workers=4)as pool:results=list(pool.map(verify,sha.items()))
(B/'Publication-Verification.json').write_text(json.dumps({'downloadCommit':commit,'fullRemoteReadback':results,'passed':True},ensure_ascii=False,indent=2));print('Public SHA-256 read-back passed:',len(results),'files')
