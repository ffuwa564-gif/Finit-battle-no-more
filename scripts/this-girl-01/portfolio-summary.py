"""Exploratory restricted-archive diversity, not proof of all-roster viability."""
import pathlib,gzip,json,collections
ROOT=pathlib.Path(__file__).resolve().parents[2];D=ROOT/'artifacts/this-girl-01/research'
def read(p):
 with gzip.open(p,'rt')as f:return json.load(f)
facts=json.loads((D/'implementation-facts.json').read_text());people={c['id']:c for c in facts['healers']};gemdefs={s['definition']['id']:s['definition']for s in facts['stones']};roster={c['id']:c for c in json.loads((D/'roster-definitions.json').read_text())['characters']}
results=[]
for stage in ['ivory-tower-010','kuzuha-awakening']:
 for tier in [3,4,6]:
  selected=[]
  for core in ['F1','F4']:
   b=read(D/'optimization'/f'{stage}-{tier}-before-{core}.json.gz');a=read(D/'optimization'/f'{stage}-{tier}-after-{core}.json.gz')
   selected.extend(v for c in b['results']if c['id']!='mireille'for v in c['selected']);selected.extend(a['results'][0]['selected'])
  selected.extend(read(D/'global'/f'{stage}-{tier}.json.gz')['selected']);selected=list({v['key']:v for v in selected}.values())
  best=max(v['wins']for v in selected);near=[v for v in selected if v['wins']>=best-5]
  def cluster(v):
   c=v['config'];leader=roster[c['leader']];functions=sorted(json.dumps([roster[id]['role'],roster[id]['templates'],roster[id]['barrierReturn']])for id in c['party']);policy=c.get('policy',0);strategy='survival'if policy in [2,5,7]else'aggressive'if policy in [1,6]else'balanced';return json.dumps([functions,[leader['leaderEffect'],leader['leaderStat']],sorted(gemdefs[g['defId']]['skill']['template']for g in c['gems']if g),sorted((g['roll']['trait']for g in c['gems']if g)),strategy,c.get('commandMode')if c.get('command')else'never'],ensure_ascii=False)
  clusters=list({cluster(v):v for v in near}.values())
  noath=[v for v in selected if 'athena'not in v['config']['party']and'athena-standard'not in v['config']['party']]
  results.append({'stage':stage,'tier':tier,'uniqueSelectionCandidates':len(selected),'observedBestWinsOf100':best,'observedNoAthenaBestWinsOf100':max((v['wins']for v in noath),default=None),'withinObserved5ppCandidateClusters':len(clusters),'clusterRule':'coarse party role/native-template/return-mechanism signatures + leader function/stat + stone action/trait multisets + strategy/command mode; exact ID and cosmetic policy copies collapse; may merge unmodeled ID-specific mechanisms','leaderCounts':dict(collections.Counter(v['config']['leader']for v in clusters)),'stoneActionCounts':dict(collections.Counter(gemdefs[g['defId']]['skill']['template']for v in clusters for g in v['config']['gems']if g)),'examples':[{'key':v['key'],'config':v['config'],'wins':v['wins'],'rounds':v['meanCappedRounds'],'potions':v['meanPotions'],'all4':v['allSurvive']}for v in clusters]})
(D/'portfolio-summary.json').write_text(json.dumps({'status':'selection archive only, exploratory; neither certified viable-build count nor universal dependency proof','results':results},ensure_ascii=False,indent=2))
print('Saved restricted archive diversity; observed selection-only figures')
