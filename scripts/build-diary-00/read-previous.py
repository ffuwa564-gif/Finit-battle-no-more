from pathlib import Path
import urllib.request,json,concurrent.futures
B=Path(__file__).resolve().parent;root='https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/'
refs=[('01','c85eb5fabd4eb01c3f5267505bb496a74063b111'),('02','1752754181ce75232337acbdd1f9fb8422d8b4e5'),('03','cb684b62495efe889b76ba57b919ee012330d021'),('04','b7975038f8685ae429ea7f2c13abb53961eb0cbc'),('05','0f2036c079cf3b4a979838dc7435ed9e94ef2a3b'),('command','ad81b5dbe415224aa5ae98a59570e767a8ff09da'),('athena','8d49be3a9b1e2386e87ff8be9a73a850470614e5')]
jobs=[(label,sha,name)for label,sha in refs for name in (['README.md','Gem-Audit.json']if label.isdigit()else['README.md','Design-Decision.md'])]
def get(job):
 label,sha,name=job;url=root+sha+'/'+name
 try:
  data=urllib.request.urlopen(url,timeout=30).read();(B/'reference'/f'{label}-{name}').write_bytes(data);return{'source':label,'url':url,'bytes':len(data)}
 except Exception as e:return{'source':label,'url':url,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=5)as ex:rows=list(ex.map(get,jobs))
(B/'reference/previous-series.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
