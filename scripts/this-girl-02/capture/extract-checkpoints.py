"""Extract exact ready saves and event pointers from the already verified fixed proofs.
No game engine import, battle execution, seed selection, HP editing, or policy edits.
"""
from pathlib import Path
import gzip,json,hashlib,re,shutil
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-02';OUT=O/'capture-checkpoints';OUT.mkdir(parents=True,exist_ok=True)
def h(b):return hashlib.sha256(b).hexdigest()
def packed(x):return json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
def load(name):
 p=O/'proofs'/f'{name}.json.gz';b=p.read_bytes();d=json.loads(gzip.decompress(b));assert d['nativeVerified']and d['applicationVerified'];assert d['spec']['logicalSeed']==930001 and d['spec']['applicationSeed']==3503471766
 assert d['final']['battle']['phase']=='reward';frozen=OUT/'source-proofs'/p.name;frozen.parent.mkdir(parents=True,exist_ok=True);frozen.write_bytes(b)
 return d,{'path':str(p.relative_to(ROOT)),'sha256':h(b),'frozenCopy':str(frozen.relative_to(ROOT)),'proofDecompressedSha256':h(gzip.decompress(b)),'sourceGameCommit':d['sourceGameCommit'],'sourceTreeSha256':d['sourceTreeSha256'],'logicalSeed':d['spec']['logicalSeed'],'applicationSeed':d['spec']['applicationSeed'],'caseId':d['spec']['caseId'],'arm':d['spec']['arm'],'researchLockSha256':d['researchLockSha256']}
def ref(d,i):
 e=d['events'][i];m=re.search(r':w(\d+):r(\d+):',e['id']);wave,rnd=map(int,m.groups());matches=[]
 for gi,g in enumerate(d['groups']):
  if g['wave']!=wave or g['round']!=rnd:continue
  for ei,ge in enumerate(g['after']['battle']['events']):
   if ge['id']==e['id']:matches.append((gi,ei))
 assert matches,(i,e['id']);gi,ei=matches[0]
 assert d['groups'][gi]['after']['battle']['events'][ei]==e
 return {'globalEventIndex0':i,'globalEventOrdinal1':i+1,'eventId':e['id'],'flatJsonPointer':f'/events/{i}','groupIndex0':gi,'groupKind':d['groups'][gi]['kind'],'groupEventIndex0':ei,'groupJsonPointer':f'/groups/{gi}/after/battle/events/{ei}','waveIndex0':wave,'waveDisplay1':wave+1,'round':rnd,'exactTextOccurrence1':sum(x.get('text')==e.get('text')for x in d['events'][:i+1]),'kindOccurrence1':sum(x['kind']==e['kind']for x in d['events'][:i+1]),'event':{k:v for k,v in e.items()if k!='unitsAfter'}}
def checkpoint(name,d,meta,gi,label,end=None):
 g=d['groups'][gi];s=g['before'];b=s['battle'];assert b['phase']=='ready';p=OUT/f'{name}-{label}.save.json.gz';raw=packed(s);compressed=gzip.compress(raw,mtime=0);p.write_bytes(compressed);assert json.loads(gzip.decompress(p.read_bytes()))==s
 last=len(d['groups'])-1 if end is None else end
 return {'label':label,'path':str(p.relative_to(ROOT)),'sha256':h(compressed),'decompressedSha256':h(raw),'sourceProofSha256':meta['sha256'],'sourceJsonPointer':f'/groups/{gi}/before','groupIndex0':gi,'waveIndex0':b['wave'],'waveDisplay1':b['wave']+1,'round':b['round'],'phase':b['phase'],'battleSeed':b['seed'],'battleId':b['id'],'potionsRemaining':b['potionsRemaining'],'partyHp':{u['uid']:{'hp':u['hp'],'maxHp':u['maxHp']}for u in b['units']if u['side']=='party'},'enemyHp':{u['uid']:{'hp':u['hp'],'maxHp':u['maxHp'],'boss':u['boss']}for u in b['units']if u['side']=='enemy'},'replayGroupsInclusive':[gi,last],'replayCommands':[{ 'groupIndex0':i,'kind':d['groups'][i]['kind'],'waveIndex0':d['groups'][i]['wave'],'round':d['groups'][i]['round'],'sourceJsonPointer':f'/groups/{i}/commands','commands':d['groups'][i]['commands']}for i in range(gi,last+1)]}
S,SM=load('sakuya');A,AM=load('reference');events=S['events'];ri=next(i for i,e in enumerate(events)if e.get('returnDamage')==650);returnevent=events[ri];recipient=returnevent['actorId'];unit=lambda e,uid:next(u for u in e['unitsAfter']if u['uid']==uid)
stampkeys=['sourceId','skillId','until','referenceHp','conversionPercent','capacityPercent','payoutPercent'];mark=unit(events[ri-1],recipient)['barrierReturn'];stamp={k:mark[k]for k in stampkeys}
gi=next(i for i in range(ri-1,-1,-1)if events[i].get('actionSelection')and events[i].get('skillId')=='barrier-18'and recipient in events[i].get('targetIds',[]));ci=next(i for i in range(gi+1,ri)if events[i].get('barrierReturnAction')=='capture'and events[i].get('actorId')==recipient);ai=ci-1;xi=next(i for i in range(ri+1,len(events))if events[i].get('barrierReturnAction')=='consume'and events[i].get('actorId')==recipient)
assert gi==20 and ai==21 and ci==22 and ri==36 and xi==37
for i in range(gi,ri):
 if events[i].get('unitsAfter'):
  state=unit(events[i],recipient).get('barrierReturn');assert state and{k:state[k]for k in stampkeys}==stamp
assert unit(events[gi],recipient)['barrierReturn']['power']==0
assert unit(events[ai],recipient)['barrierReturn']['power']==82==events[ci]['resourceAmount']==events[xi]['resourceAmount']
assert events[ai]['actorId'].startswith('enemy:')and events[ai]['absorbed']==70
assert unit(events[gi],recipient)['barrier']==70 and unit(events[ai],recipient)['barrier']==0
assert unit(events[ri],recipient).get('barrierReturn')is None
victim=returnevent['targetIds'][0];beforehp=unit(events[ri-1],victim)['hp'];afterhp=unit(events[ri],victim)['hp'];assert beforehp-afterhp==1443==returnevent['amount'];assert returnevent['returnDamage']==650
scheck=[checkpoint('sakuya',S,SM,2,'grant-and-absorb-ready',6),checkpoint('sakuya',S,SM,6,'return650-ready',6),checkpoint('sakuya',S,SM,18,'boss-final-round-and-flower-ready'),checkpoint('sakuya',S,SM,20,'boss-last-flower-ready')]
acheck=[checkpoint('reference',A,AM,13,'boss-last-two-rounds-ready'),checkpoint('reference',A,AM,14,'boss-last-round-with-items-ready'),checkpoint('reference',A,AM,16,'boss-last-round-after-items-ready')]
sv=next(i for i,e in enumerate(events)if e.get('bloomAction')=='strike'and any(u['uid']=='enemy:w1:0:noelle'and u['hp']==0 for u in e.get('unitsAfter',[])))
av=next(i for i,e in enumerate(A['events'])if e.get('actionSelection')and any(u['uid']=='enemy:w1:0:noelle'and u['hp']==0 for u in e.get('unitsAfter',[])))
manifest={'schema':1,'status':'exact extracted checkpoints from the previously fixed first common-win proof; no new research outcome selection','indexConvention':'groups/events are zero-based; UI wave display is waveIndex+1. Occurrence counts are explicit, not guessed recorder log indices.','resumeRule':'Import the exact saved state; resume its current battleId/seed and replay the listed original commands in order. Do not depart again, reset RNG, refill HP/potions, skip items/fairies, or replace the policy. Excerpt jumps must be labeled as excerpts.','proofs':{'sakuya':SM,'reference':AM},'samePaidMark':{'recipient':recipient,'identityFields':stamp,'grant':ref(S,gi),'actualEnemyAbsorption':ref(S,ai),'capture':ref(S,ci),'returnDamage650':ref(S,ri),'consume':ref(S,xi),'assertions':{'sameMarkIdentityPreservedUntilConsumption':True,'grantShield':70,'actualShieldAbsorbed':70,'recipientHpBeforeAbsorption':unit(events[gi],recipient)['hp'],'recipientHpAfterAbsorption':unit(events[ai],recipient)['hp'],'storedPercentPoints':82,'damageTarget':victim,'enemyHpBeforeReturnAttack':beforehp,'enemyHpAfterReturnAttack':afterhp,'totalAttackDamage':1443,'primaryDamagePortion':793,'returnDamagePortion':650},'recordingSpanGroupsInclusive':[2,6]},'sakuyaVictory':{'event':ref(S,sv),'actualFinisher':'BattleBloom strike for 55 damage at waveIndex1 round10, not the 650 return. End phase reward.','endPhase':S['final']['battle']['phase']},'referenceVictory':{'event':ref(A,av),'actualFinisher':'Astraea normal attack for 355 damage at waveIndex1 round8. End phase reward.','endPhase':A['final']['battle']['phase']},'checkpoints':{'sakuya':scheck,'reference':acheck}}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
lines=['# 固定proofから抽出した再開候補','','新しい戦闘・seed選抜・HP変更は一切行っていない。元proofのnative/applicationVerifiedとcase/seedを確認し、ready状態をそのまま抽出した。indexは0始まり、画面のWaveは+1。','','|場面|group|元proof flat event|同group event|画面|内容|','|---|---:|---:|---:|---|---|']
for label,i in [('付与',gi),('実吸収',ai),('蓄積表示',ci),('返礼650',ri),('消費表示',xi)]:
 r=ref(S,i);lines.append(f"|{label}|{r['groupIndex0']}|{i}|{r['groupEventIndex0']}|Wave{r['waveDisplay1']} R{r['round']}|{r['event']['text']}|")
lines+=['','同じアストレアの印（期限R3、参照HP426、source=mireille）が、R1付与→70吸収/82pt蓄積→R3消費まで保持されたことを全中間event状態で検査。R3の1443ダメージには返礼650が含まれる（主攻撃793＋返礼650）。650を1443へさらに加算しない。','','Cの最終勝利はWave2 R10の月晶の花55ダメージ。返礼650がボスの最後の一撃だったとは説明しない。AはWave2 R8のアストレア通常攻撃355で勝利。','','checkpointごとの完全save、元JSONpointer、SHA、HP/RNG、再生すべきcommandsはmanifest.json。再開後に新規出発やHP・薬・seed変更をしない。']
(OUT/'README.md').write_text('\n'.join(lines)+'\n');print('Extracted7 exact ready checkpoints; source proofs preserved; no battles run.');print('C650 groups2..6, global20/21/22/36/37; Cfinish group20 bloom55; Afinish group16 attack355')
