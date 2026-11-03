"""Analyze only the committed/frozen paired panel. No combat or selection here."""
import gzip,json,pathlib,sys,hashlib
sys.path.insert(0,str(pathlib.Path(__file__).parent/'analysis'))
from paired_statistics import analyze_pair,adjust_family,absolute_win_interval
root=pathlib.Path(__file__).resolve().parents[2];out=root/'artifacts/this-girl-01/research'
def read(p):
    with (gzip.open(p,'rt')if str(p).endswith('.gz')else open(p))as f:return json.load(f)
def save(p,data):
    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(data,ensure_ascii=False,indent=2))
lock=read(out/'confirmation-lock.json');locksha=hashlib.sha256((out/'confirmation-lock.json').read_bytes()).hexdigest()
seeds=[s['logical']for s in lock['seedMap']if 930001<=s['logical']<=930256]
seedmap={s['logical']:s for s in lock['seedMap']if 930001<=s['logical']<=930256}
def validate_lock_seeds(rows):
    if [r['seed']for r in rows]!=seeds:raise ValueError('Unexpected locked seed ordering')
    for r in rows:
        expected=seedmap[r['seed']]
        if any(r.get(k)!=expected[k]for k in ['applicationSeed','departureSeed']):raise ValueError('Arm uses wrong precommitted native seed mapping')
comparisons=[];expected=[];absolute=[];recording=[]
for c in lock['cases']:
    data=read(out/'confirmation'/f"{c['id']}.json.gz")
    if data['lockSha']!=locksha:raise ValueError('Lock hash mismatch')
    for arm in data['arms'].values():validate_lock_seeds(arm['rows'])
    C=data['arms']['C']['rows']
    for name in ['A','B','Dfast','Dsafe','Dfrugal','E']:
        cid=f"{c['id']}:C-{name}";expected.append(cid)
        comparisons.append(analyze_pair(C,data['arms'][name]['rows'],c['cap'],comparison_id=cid,expected_seed_ids=seeds))
    absolute.append({'id':c['id'],'C':absolute_win_interval(C)})
    for a,s in zip(data['arms']['A']['rows'],C):
        t=s['telemetry']
        if a['win']and s['win']and all(t.get(k,0)>0 for k in ['petalsStored','petalsSpent','returnDamage']):
            recording.append({'caseId':c['id'],'logicalSeed':s['seed'],'applicationSeed':s['applicationSeed'],'stageId':c['stage'],'tier':c['tier'],'sourceGameCommit':lock.get('sourceGameCommit'),'arms':{n:c['arms'][n]for n in ['A','C']},'selectionRule':'first ascending common victory with positive capture/consume/returnDamage; illustration, not win-rate evidence'});break
adjust_family(comparisons,expected_hypotheses=288,expected_comparison_ids=expected)
save(out/'analysis/main.json',{'lockSha':locksha,'status':'partial measured claims only; whole-character certification requires all gates and audit','comparisons':comparisons,'absolute':absolute})
recording.sort(key=lambda r:([6,4,3].index(r['tier']),['ivory-tower-010','kuzuha-awakening'].index(r['stageId']),0 if r['caseId'].endswith('-F1')else 1))
save(out/'recording-candidates.json',recording)
growth=[];gids=[]
for g in lock['growth']:
    d=read(out/'growth'/f"{g['id'].replace(':','_')}.json.gz")
    if d['lockSha']!=locksha:raise ValueError('Growth lock mismatch')
    validate_lock_seeds(d['low']['rows']);validate_lock_seeds(d['high']['rows'])
    gids.append(g['id']);growth.append(analyze_pair(d['high']['rows'],d['low']['rows'],g['cap'],comparison_id=g['id'],expected_seed_ids=seeds))
adjust_family(growth,expected_hypotheses=48,expected_comparison_ids=gids,label='growth')
save(out/'analysis/growth.json',{'lockSha':locksha,'comparisons':growth,'scope':'controlled T6-selected template downrolled, same policies; not independently optimized tier adoption'})
print('Analyzed',len(comparisons),'main and',len(growth),'growth pairs; candidates',len(recording))
