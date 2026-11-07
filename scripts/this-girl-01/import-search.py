"""Validate complete remote search cohort; adopt only with --adopt after review.
Partial checks never select favorable jobs or authorize confirmation.
"""
import pathlib,json,gzip,hashlib,argparse,subprocess,shutil,itertools
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/this-girl-01/research'
p=argparse.ArgumentParser();p.add_argument('directory',type=pathlib.Path);p.add_argument('--head',required=True);p.add_argument('--run-id',required=True);p.add_argument('--allow-partial',action='store_true');p.add_argument('--adopt',action='store_true');p.add_argument('--jobs-json',type=pathlib.Path);a=p.parse_args()
if a.allow_partial and a.adopt:raise SystemExit('Partial cohorts cannot be adopted')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):
 with(gzip.open(p,'rt')if str(p).endswith('.gz')else open(p))as f:return json.load(f)
expected=set(itertools.product(['ivory-tower-010','kuzuha-awakening'],[3,4,6],['F1','F4'],['before','after']))
expected|={(s,6,'F5','after')for s in ['ivory-tower-010','kuzuha-awakening']}
expected|={(s,t,'global','after')for s in ['ivory-tower-010','kuzuha-awakening']for t in [3,4,6]}
script_names=['before-policy.mts','after-policy.mts','study-space.mts','study-io.mts','optimize.mts','global-search.mts']
closure=['package.json','package-lock.json']+[f'scripts/this-girl-01/{n}'for n in script_names]
for prefix in ['src','artifacts/this-girl-01/baseline/src']:
 closure.extend(str(x.relative_to(ROOT))for x in (ROOT/prefix).rglob('*')if x.is_file()and x.suffix in ['.ts','.tsx','.json'])
localHashes={k:sha(ROOT/k)for k in closure};reports=[];seen=set();copies=[];overlapForms=overlapRows=0
for pp in sorted(a.directory.rglob('runner-provenance.json')):
 provenance=read(pp);c=provenance['case'];case=(c['stage'],int(c['tier']),c['core'],c['mode'])
 if case not in expected or case in seen:raise ValueError('Unexpected/duplicate case '+str(case))
 seen.add(case)
 if provenance['sourceCommit']!=a.head or str(provenance['workflowRunId'])!=str(a.run_id):raise ValueError('Wrong remote revision/run')
 if not provenance['node'].startswith('v24.'):raise ValueError('Unexpected Node major')
 remote=provenance['sourceHashes'];missing=[k for k in localHashes if k not in remote];mismatch=[k for k,v in localHashes.items()if remote.get(k)!=v]
 if missing or mismatch:raise ValueError('Numeric closure differs '+str({'missing':missing,'mismatch':mismatch}))
 for prefix in ['src/','artifacts/this-girl-01/baseline/src/']:
  if {k for k in remote if k.startswith(prefix)}!={k for k in localHashes if k.startswith(prefix)}:raise ValueError('Native source file set differs')
 stage,tier,core,mode=case;relative=f'global/{stage}-{tier}.json.gz'if core=='global'else f'optimization/{stage}-{tier}-{mode}-{core}.json.gz';path=pp.parent/relative
 if not path.exists():
  reports.append({'case':case,'complete':False,'reason':'missing final result; partial/failed job is not discarded'})
  continue
 data=read(path)
 if data['stage']!=stage or data['tier']!=tier:raise ValueError('Mismatched result header')
 for k,v in (data.get('sourceInputs')or data.get('sources')or{}).items():
  if sha(ROOT/k)!=v:raise ValueError('Result source mismatch '+k)
 def checkRows(candidate,seeds):
  rows=candidate['rows']
  if [r['seed']for r in rows]!=seeds:raise ValueError('Wrong development panel')
  if any(r.get('applicationSeed')!=r['seed']for r in rows):raise ValueError('Wrong direct search seed')
 if core=='global':
  if len(data['train'])!=96 or len(data['selected'])!=8:raise ValueError('Wrong global finite budget')
  for v in data['train']:checkRows(v,list(range(910001,910005)))
  for v in data['selected']:checkRows(v,list(range(920001,920101)))
 else:
  forms=data['results'];n=17 if mode=='before'else 1
  if len(forms)!=n or len({v['id']for v in forms})!=n:raise ValueError('Incomplete healer cohort')
  if mode=='after'and forms[0]['id']!='mireille':raise ValueError('Unexpected modified form')
  for f in forms:
   if f['budget']!={'candidates':64,'trainSeeds':4,'selectionCandidates':6,'selectionSeeds':100}:raise ValueError('Wrong equal-form budget')
   if len(f['train'])!=64 or len(f['selected'])!=(9 if tier==6 else 6):raise ValueError('Wrong candidate count')
   for v in f['train']:checkRows(v,list(range(910001,910005)))
   for v in f['selected']:checkRows(v,list(range(920001,920101)))
   if tier==6:
    if len(f['mutation']['train'])!=24 or len(f['mutation']['selected'])!=4:raise ValueError('Wrong mutation budget')
    for v in f['mutation']['train']:checkRows(v,list(range(910009,910013)))
    for v in f['mutation']['selected']:checkRows(v,list(range(920001,920101)))
 for local in [OUT/relative,OUT/'optimization-progress'/path.name]if core!='global'else[OUT/relative]:
  if not local.exists():continue
  ld=read(local)
  if core=='global':
   for k in ['stage','tier','sources','budget','train','selected']:
    if ld[k]!=data[k]:raise ValueError('Global local/remote mismatch '+k)
  else:
   if ld['sourceInputs']!=data['sourceInputs']:raise ValueError('Local overlap used other source')
   for lf in ld['results']:
    rf=next((x for x in data['results']if x['id']==lf['id']),None)
    if rf!=lf:raise ValueError('Full raw local/remote form mismatch '+lf['id'])
    overlapForms+=1;overlapRows+=sum(len(v['rows'])for v in lf['train']+lf['selected'])+sum(len(v['rows'])for v in(lf.get('mutation')or{}).get('train',[]))
 reports.append({'case':case,'complete':True,'sourceClosureMatched':True,'resultSha256':sha(path),'provenanceSha256':sha(pp),'node':provenance['node'],'v8':provenance['v8']});copies.append((path,OUT/relative))
missing=sorted(expected-seen);incomplete=[r['case']for r in reports if not r['complete']];complete=not missing and not incomplete and len(seen)==32
report={'runId':a.run_id,'sourceCommit':a.head,'expectedCases':32,'observedCases':len(seen),'complete':complete,'missing':missing,'incomplete':incomplete,'numericClosure':localHashes,'overlapForms':overlapForms,'overlapRows':overlapRows,'cases':reports,'adopted':False}
if a.adopt:
 if not complete:raise ValueError('Cannot adopt incomplete cohort')
 if not a.jobs_json:raise ValueError('Adoption requires complete GitHub job conclusions JSON')
 jobs=read(a.jobs_json);jobs=jobs['jobs']
 if len(jobs)!=32 or len({j['id']for j in jobs})!=32:raise ValueError('Missing GitHub jobs (use per_page=100)')
 if any(j.get('conclusion')!='success'or j.get('status')!='completed'or str(j.get('run_id'))!=str(a.run_id)or j.get('head_sha')!=a.head for j in jobs):raise ValueError('A failed/incomplete/wrong-source CI job cannot be discarded')
 report['jobMetadataSha256']=sha(a.jobs_json)
 if overlapForms<34:raise ValueError('Require both completed local T6 tower cohorts as deterministic witnesses')
 for source,target in copies:
  target.parent.mkdir(parents=True,exist_ok=True);tmp=target.with_suffix(target.suffix+'.remote-partial');shutil.copyfile(source,tmp);tmp.replace(target)
 report['adopted']=True
OUT.mkdir(parents=True,exist_ok=True);dest=OUT/('remote-search-import.json'if a.adopt else'remote-search-validation.json');dest.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:report[k]for k in ['complete','observedCases','expectedCases','overlapForms','overlapRows','adopted']}))
if not complete and not a.allow_partial:raise SystemExit('Incomplete cohort retained as incomplete; nothing adopted')
