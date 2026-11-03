"""Strict all-cohort import for reviewed main/supplementary/exploratory jobs."""
import pathlib,json,gzip,hashlib,argparse,shutil,itertools,sys
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/this-girl-01/research'
sys.path.insert(0,str(pathlib.Path(__file__).parent/'analysis'))
from paired_statistics import validate_rows
p=argparse.ArgumentParser();p.add_argument('directory',type=pathlib.Path);p.add_argument('--head',required=True);p.add_argument('--run-id',required=True);p.add_argument('--jobs-json',type=pathlib.Path);p.add_argument('--adopt',action='store_true');p.add_argument('--allow-partial',action='store_true');a=p.parse_args()
if a.adopt and a.allow_partial:raise SystemExit('Partial import prohibited')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):
 with(gzip.open(p,'rt')if str(p).endswith('.gz')else open(p))as f:return json.load(f)
lock=read(OUT/'confirmation-lock.json');digest=sha(OUT/'confirmation-lock.json');approval=ROOT/'docs/media/this-girl/episodes/01/confirmation-approval.json';approved=read(approval)
if not approved['approved']or approved['lockSha256']!=digest:raise ValueError('Local exact lock not approved')
for name,s in lock['sources'].items():
 if sha(ROOT/name)!=s:raise ValueError('Locked source changed '+name)
expected={('main',c['stage'],c['tier'],c['coreId'])for c in lock['cases']}|{(t,'supplementary',0,'all')for t in ['growth','stress','hidden','noel']}|{(t,'exploratory',0,'all')for t in ['roster','landscape']}
seedMaps={start:{s['logical']:s for s in lock['seedMap']if start<=s['logical']<start+256}for start in [930001,950001,960001]}
seen=set();report=[];copies=[];rawRows=0

def checkArm(arm,cap,start,config=None):
 global rawRows
 rows=arm['rows'];validate_rows(rows,cap);seeds=seedMaps[start]
 if [r['seed']for r in rows]!=list(seeds):raise ValueError('Missing/duplicate/reordered locked 256 rows')
 for r in rows:
  if any(r.get(k)!=seeds[r['seed']][k]for k in ['applicationSeed','departureSeed']):raise ValueError('Wrong native locked seed')
 if config is not None and arm['config']!=config:raise ValueError('Wrong frozen config')
 n=len(rows);win=sum(r['win']for r in rows);rnd=sum(r['cappedRounds']for r in rows)/n;pots=sum(r['potionsUsed']for r in rows)/n;all4=sum(r['win']and r['survivors']==4 for r in rows)
 if (arm['n'],arm['wins'],arm['meanCappedRounds'],arm['meanPotions'],arm['allSurvive'])!=(n,win,rnd,pots,all4):raise ValueError('Summary differs from raw rows')
 rawRows+=n

def checkDev(candidate,seeds):
 rows=candidate['rows']
 if [r['seed']for r in rows]!=seeds or any(r.get('applicationSeed')!=r['seed']for r in rows):raise ValueError('Wrong exploratory panel')

for pp in sorted(a.directory.rglob('confirmation-runner-provenance.json')):
 pr=read(pp);c=pr['case'];case=(c['task'],c['stage'],int(c['tier']),c['core'])
 if case not in expected or case in seen:raise ValueError('Unexpected/duplicate confirmation job '+str(case))
 seen.add(case)
 if pr['sourceCommit']!=a.head or str(pr['workflowRunId'])!=a.run_id or not pr['approved']:raise ValueError('Wrong CI run/review')
 if pr['lockSha256']!=digest or pr['approvalSha256']!=sha(approval)or pr['sourcesVerifiedBeforeCombat']!=lock['sources']:raise ValueError('CI did not verify exact current lock/source/review')
 task,stage,tier,core=case;files=[]
 if task=='main':files=[f'confirmation/{stage}-T{tier}-{core}.json.gz']
 elif task=='growth':files=[f"growth/{g['id'].replace(':','_')}.json.gz"for g in lock['growth']]
 elif task=='stress':files=[f"stress/{c['id']}.json.gz"for c in lock['cases']if c['tier']==6]
 elif task=='hidden':files=[f'hidden/{s}-{co}.json.gz'for s in ['lunette-awakening','ivory-tower-025','moonshield-rehearsal']for co in ['F1','F4']]
 elif task=='noel':files=[f"noel/{c['stage']}.json.gz"for c in lock['noel']]
 elif task=='roster':files=['roster-screen.json.gz']
 elif task=='landscape':files=['landscape.json.gz']
 missing=[f for f in files if not(pp.parent/f).is_file()]
 if missing:
  report.append({'case':case,'complete':False,'missing':missing});continue
 for relative in files:
  path=pp.parent/relative;d=read(path)
  if task in ['main','growth','stress','hidden','noel']and d['lockSha']!=digest:raise ValueError('Output lock mismatch')
  if task=='main':
   lc=next(x for x in lock['cases']if x['id']==d['id'])
   if lc['stage']!=stage or lc['tier']!=tier or lc['coreId']!=core or set(d['arms'])!=set(lc['arms'])or d['cap']!=lc['cap']:raise ValueError('Wrong primary case')
   for name,arm in d['arms'].items():
    spec=lc['arms'][name];checkArm(arm,lc['cap'],930001,spec['config'])
    if arm['mode']!=spec['mode']or arm['payoutPercent']!=spec.get('payoutPercent',100):raise ValueError('Wrong arm mode or E payout')
  elif task=='growth':
   g=next(x for x in lock['growth']if x['id']==d['id']);checkArm(d['low'],g['cap'],930001,g['low']);checkArm(d['high'],g['cap'],930001,g['high'])
  elif task=='stress':
   lc=next(x for x in lock['cases']if x['id']==d['id']);scenarios={x['scenario']['id']for x in d['results']}
   if len(d['results'])!=5 or scenarios!={'zero','high25','high50','enemyMinus10','enemyPlus10'}:raise ValueError('Missing stress including zero')
   for result in d['results']:
    if set(result['arms'])!={'A','C','E'}:raise ValueError('Wrong stress arms')
    for name,arm in result['arms'].items():checkArm(arm,lc['cap'],950001,lc['arms'][name]['config'])
  elif task=='hidden':
   lc=next(x for x in lock['cases']if x['id']==d['sourceCase']);cap=read(OUT/'roster-definitions.json')['stageCaps'][d['stage']]
   for name,arm in d['arms'].items():
    checkArm(arm,cap,960001,lc['arms'][name]['config'])
  elif task=='noel':
   n=next(x for x in lock['noel']if x['stage']==d['stage']);lc=next(x for x in lock['cases']if x['stage']==d['stage']);
   if set(d['arms'])!={'never','conditional','always','sakuyaLeader'}:raise ValueError('Wrong Noel arms')
   for name,arm in d['arms'].items():
    config={**n['sakuya'],'command':False,'commandMode':'never'}if name=='sakuyaLeader'else{**n['commander'],'command':name!='never','commandMode':name};checkArm(arm,lc['cap'],930001,config)
  elif task=='roster':
   people=d['results'];ids={x['id']for x in people}
   expectedIds={x['id']for x in read(OUT/'roster-definitions.json')['characters']}
   if len(people)!=75 or ids!=expectedIds:raise ValueError('Missing roster forms')
   for person in people:
    if len(person['contexts'])not in [0,2,4]:raise ValueError('Wrong roster context budget')
    for ctx in person['contexts']:
     for mode in ['before','after']:
      if len(ctx[mode])!=8:raise ValueError('Unequal roster screen bank')
      for candidate in ctx[mode]:checkDev(candidate,[940001,940002,940003,940004])
  elif task=='landscape':
   prereg=read(ROOT/'docs/media/this-girl/episodes/01/preregistration.json');stages={s for v in prereg['stages'].values()for s in v};cases={(x['stage'],x['tier'])for x in d['results']}
   if len(d['results'])!=72 or cases!={(s,t)for s in stages for t in [3,4,6]}:raise ValueError('Wrong24-stage baseline')
   for ctx in d['results']:
    for group in ['unrestricted','sakuya']:
     if len(ctx[group])!=8:raise ValueError('Unequal landscape budget')
     for candidate in ctx[group]:checkDev(candidate,[940001])
  local=OUT/relative
  if local.exists()and read(local)!=d:raise ValueError('Conflicting prior measured result '+relative)
  copies.append((path,local));
 report.append({'case':case,'complete':True,'files':files,'fileHashes':{f:sha(pp.parent/f)for f in files},'provenanceSha256':sha(pp)})
missing=sorted(expected-seen);incomplete=[r['case']for r in report if not r['complete']];complete=not missing and not incomplete and len(seen)==18
summary={'lockSha256':digest,'runId':a.run_id,'sourceCommit':a.head,'complete':complete,'expectedJobs':18,'observedJobs':len(seen),'missing':missing,'incomplete':incomplete,'rawConfirmationRowsChecked':rawRows,'cases':report,'adopted':False}
if a.adopt:
 if not complete or not a.jobs_json:raise ValueError('Complete cohort and job conclusions required')
 jobs=read(a.jobs_json)['jobs']
 if len(jobs)!=18 or len({j['id']for j in jobs})!=18 or any(j.get('status')!='completed'or j.get('conclusion')!='success'or str(j['run_id'])!=a.run_id or j['head_sha']!=a.head for j in jobs):raise ValueError('A failed/incomplete/wrong CI job cannot be omitted')
 for src,dest in copies:
  dest.parent.mkdir(parents=True,exist_ok=True);tmp=dest.with_suffix(dest.suffix+'.remote-partial');shutil.copyfile(src,tmp);tmp.replace(dest)
 summary['jobMetadataSha256']=sha(a.jobs_json);summary['adopted']=True
OUT.mkdir(parents=True,exist_ok=True);dest=OUT/('remote-confirm-import.json'if a.adopt else'remote-confirm-validation.json');dest.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:summary[k]for k in ['complete','observedJobs','expectedJobs','rawConfirmationRowsChecked','adopted']}))
if not complete and not a.allow_partial:raise SystemExit('Incomplete results retained as incomplete; nothing adopted')
