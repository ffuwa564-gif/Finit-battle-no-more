"""Single-target, same-mark native traces with actual recorded frame IDs only."""
from pathlib import Path
import argparse,gzip,hashlib,json,re
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-01'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('id',default='sakuya',nargs='?');a=ap.parse_args();pp=O/'proofs'/f'{a.id}.json.gz';mp=O/'capture'/f'{a.id}.json';p=json.loads(gzip.decompress(pp.read_bytes()));m=json.loads(mp.read_text());assert p['applicationVerified']and m['nativeBrowserVerified']
 times={x['event']['id']:x for x in m['battleEvents']};events=p['events'];pending={};traces=[];excluded=[]
 for i,e in enumerate(events):
  if e.get('barrierReturnAction')=='capture':
   uid=e['actorId'];unit=next((u for u in e['unitsAfter']if u['uid']==uid),None);mark=unit.get('barrierReturn')if unit else None;incoming=events[i-1]if i else{}
   if not mark or uid not in incoming.get('targetIds',[])or not incoming.get('absorbed'):
    excluded.append({'eventId':e['id'],'reason':'No hostile absorption event for the marked recipient immediately preceding capture'});continue
   prior_event=next((x for x in reversed(events[:i-1])if x.get('unitsAfter')),None)
   prior_units={u['uid']:u for u in prior_event.get('unitsAfter',[])}if prior_event else{}
   after_units={u['uid']:u for u in incoming['unitsAfter']}
   losses={u:max(0,prior_units.get(u,{}).get('barrier',0)-after_units.get(u,{}).get('barrier',0))for u in incoming['targetIds']}
   protected_absorbed=incoming['absorbed'];attribution='Single recipient native absorbed field'
   if len(incoming['targetIds'])>1:
    prior_mark=prior_units.get(uid,{}).get('barrierReturn',{});gain=e['resourceAmount'];conversion=mark['conversionPercent'];hp=mark['referenceHp']
    low=(gain*hp+conversion-1)//conversion;high=((gain+1)*hp+conversion-1)//conversion-1
    valid=(incoming['kind']=='area'and re.fullmatch(r'area-\d+',incoming.get('skillId',''))and sum(losses.values())==incoming['absorbed']and losses.get(uid,0)>0 and mark['power']<mark['capacityPercent']and mark['power']-prior_mark.get('power',0)==gain and low==high==losses[uid])
    if not valid:excluded.append({'eventId':e['id'],'reason':'AoE target absorption not uniquely attributable from barrier snapshots and unsaturated integer conversion','barrierLosses':losses});continue
    protected_absorbed=losses[uid];attribution='Actual per-unit barrier snapshots; losses sum to native absorbed total; unique unsaturated reserve conversion independently confirms same integer absorption'
   if e['id']not in times or incoming['id']not in times:continue
   t=times[e['id']];key=(uid,mark['sourceId'],mark['skillId'],mark['until'])
   grants=[(j,x)for j,x in enumerate(events[:i])if x.get('actorId')==mark['sourceId']and x.get('skillId')==mark['skillId']and uid in x.get('targetIds',[])and x.get('kind')=='guard'and any(u['uid']==uid and u.get('barrierReturn',{}).get('until')==mark['until']for u in x.get('unitsAfter',[]))]
   grant_index,grant=grants[-1]if grants else(-1,{})
   state={'grantEventIndex':grant_index,'grantEventId':grant.get('id'),'grantSourceFrame':times.get(grant.get('id'),{}).get('sourceFrame'),'incomingEventIndex':i-1,'captureEventIndex':i,'absorptionAttribution':attribution,'perTargetBarrierLosses':losses,'protectedUnitId':uid,'sourceUnitId':mark['sourceId'],'skillId':mark['skillId'],'markUntilRound':mark['until'],'referenceHp':mark['referenceHp'],'capPercent':mark['capacityPercent'],'absorbedActual':protected_absorbed,'reserveBeforePercent':mark['power']-e['resourceAmount'],'reserveAfterPercent':mark['power'],'reserveGainPercent':e['resourceAmount'],'captureEventId':e['id'],'incomingEventId':incoming['id'],'incomingSourceFrame':times[incoming['id']]['sourceFrame'],'captureSourceFrame':t['sourceFrame'],'wave':t['wave'],'round':t['round']}
   pending[key]=state
  elif e.get('barrierReturnAction')=='consume':
   outgoing=events[i-1]if i else{};matches=[(k,v)for k,v in pending.items()if k[0]==e.get('actorId')and k[2]==e.get('skillId')]
   if not matches or outgoing.get('returnDamage',0)<=0 or outgoing.get('actorId')!=e.get('actorId')or e['id']not in times or outgoing['id']not in times:continue
   k,v=matches[-1];v={**v,'outgoingEventIndex':i-1,'consumeEventIndex':i,'primaryActualHpDamage':outgoing.get('amount',0)-outgoing['returnDamage'],'displayedTotalDamage':outgoing.get('amount'),'returnDamageIncludedInDisplayedTotal':True,'consumedReservePercent':e['resourceAmount'],'returnActualHpDamage':outgoing['returnDamage'],'outgoingEventId':outgoing['id'],'consumeEventId':e['id'],'outgoingSourceFrame':times[outgoing['id']]['sourceFrame'],'consumeSourceFrame':times[e['id']]['sourceFrame'],'enemyTargetIds':outgoing['targetIds']}
   # Same-mark resource arithmetic is explicit; multiple absorption captures are retained as separate records.
   traces.append(v);pending.pop(k,None)
  elif e.get('unitsAfter'):
   for key in list(pending):
    u=next((u for u in e['unitsAfter']if u['uid']==key[0]),None);mark=u.get('barrierReturn')if u else None
    # Consume has already been handled. Other disappearance/replacement invalidates pending attribution.
    if e.get('returnDamage',0)>0 and e.get('actorId')==key[0]:continue
    if not mark or(mark['sourceId'],mark['skillId'],mark['until'])!=key[1:]:pending.pop(key,None)
 boss=max(g['wave']for g in p['groups']);eligible=[t for t in traces if t['wave']==boss];selected=eligible[0]if eligible else None
 r={'passed':selected is not None,'proofSha256':sha(pp),'metadataSha256':sha(mp),'sourceSha256':m['cleanSha256'],'codeSha256':sha(__file__),'selectedBossTrace':selected,'allTraces':traces,'exclusions':excluded,'scope':'Illustration of a single recorded mechanism, not a causal win-rate estimate or final killing blow. Actual event fields and same mark UID/source/skill/expiry; AoE attribution additionally requires actual per-unit barrier loss and unique unsaturated integer conversion. Displayed total already includes return damage.'}
 out=O/'research'/f'mechanism-{a.id}.json';out.write_text(json.dumps(r,ensure_ascii=False,indent=2));print(json.dumps({'passed':r['passed'],'selected':selected,'traces':len(traces)},ensure_ascii=False))
if __name__=='__main__':main()
