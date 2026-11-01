"""Unimplemented damage-routing model. NOT the tower engine or a win-rate model.
D is post-original-defense / pre-barrier damage, specified externally. No AI,
speed order, statuses, dungeon scaling, progression, or DPS is simulated here.
"""
from dataclasses import dataclass,field,asdict
from copy import deepcopy
from pathlib import Path
import json,random,csv
P=Path('artifacts/athena-council/research')
@dataclass
class State:
 max_hp:list[int]=field(default_factory=lambda:[160,240,240,240])
 hp:list[int]=field(default_factory=lambda:[160,240,240,240])
 barrier:list[int]=field(default_factory=lambda:[0,0,0,0])
 debt:list[int]=field(default_factory=lambda:[0,0,0,0])
 due:list[int]=field(default_factory=lambda:[0,0,0,0])
 token:int=1
 last_borrow:int=-99
 charge_awarded:int=0
 leader_alive:bool=True
 command_issued:bool=False
 bell_actor:str|None=None
 bell_until:int=0
 last_refill:int=-99
 last_aggregation:int=-99

def _take(s,i,n):
 absorbed=min(s.barrier[i],n);s.barrier[i]-=absorbed;loss=min(s.hp[i],n-absorbed);s.hp[i]-=loss;return loss,absorbed

def single(s,target,damage,mode,round=1,boss_flag=False,enemy=True,attack_kind='single'):
 """Post-defense D is split before recipient barriers; defense is NEVER reapplied.
 Only lethal-predicted enemy single attacks can trigger a doctrine. Per-split
 damage charge is pooled to <=10, not four independent +10 rewards.
 """
 assert damage>=0 and 0<=target<len(s.hp)
 before=deepcopy(s);would_hp=max(0,damage-s.barrier[target]);eligible=enemy and attack_kind=='single' and would_hp>=s.hp[target]>0 and s.leader_alive and s.hp[2]>0
 scatter=mode=='scatter' and eligible and s.token>0 and len(s.hp)==4 and all(s.hp)
 if scatter:
  other=damage//5;parts=[other]*4;parts[target]=damage-3*other;s.token-=1
 else:parts=[damage if i==target else 0 for i in range(4)]
 losses=[];absorbed=[];deferred=0
 for i,n in enumerate(parts):
  if not n:losses.append(0);absorbed.append(0);continue
  if mode=='debt' and eligible and i==target and not s.debt[i] and round-s.last_borrow>=2:
   blocked=min(s.barrier[i],n);s.barrier[i]-=blocked;potential=n-blocked;deferred=min(potential//2,s.max_hp[i]);s.debt[i]=deferred;s.due[i]=round+1;s.last_borrow=round;actual=min(s.hp[i],potential-deferred);s.hp[i]-=actual;losses.append(actual);absorbed.append(blocked)
  else:
   l,a=_take(s,i,n);losses.append(l);absorbed.append(a)
 # Receiving multiple portions never grants +10 to four recipients.
 if any(loss>0 and s.hp[i]>0 for i,loss in enumerate(losses)):s.charge_awarded+=10
 return {'before':asdict(before),'after':asdict(s),'inputDamage':damage,'parts':parts,'hpLoss':losses,'absorbed':absorbed,'deferred':deferred,'triggered':scatter or deferred>0,'bossFlag':boss_flag}

def heal(s,target,n):actual=min(n,s.max_hp[target]-s.hp[target])if s.hp[target]>0 else 0;s.hp[target]+=actual;return actual

def receipt(s,target,amount):actual=min(s.debt[target],max(0,amount))if s.hp[target]>0 else 0;s.debt[target]-=actual;return actual

def settle(s,round,force=False):
 paid=[]
 for i,n in enumerate(s.debt):
  if n and (force or s.due[i]<=round):
   amount=min(s.hp[i],n);s.hp[i]-=amount;paid.append((i,amount,n));s.debt[i]=0;s.due[i]=0
 return paid

def replenish(s,followers,round=1):
 # One round-end aggregation. Bell's ACTUALLY resolved ordinary command-follow
 # record can bridge one round; the same actor can never count as two people.
 if round<=s.last_aggregation:return s.token
 s.last_aggregation=round
 valid=[x for x in followers if x.get('obeyed') and x.get('ordinary') and x.get('single') and x.get('damage',0)>0]
 if s.bell_until<round:s.bell_actor=None
 if s.token==0:
  for x in valid:
   if x.get('bell'):s.bell_actor=x['actor'];s.bell_until=round+1
 distinct={x['actor']for x in valid}
 if s.bell_actor and s.bell_until>=round:distinct.add(s.bell_actor)
 if s.leader_alive and s.hp[2]>0 and len(distinct)>=2 and s.last_refill!=round:
  s.token=1;s.last_refill=round;s.bell_actor=None;s.bell_until=0
 return s.token

def run():
 scenarios=[]
 for ident,damage,initial,twice,kind in [('single220',220,160,False,'single'),('single320',320,160,False,'single'),('double220',220,160,True,'single'),('wounded80',220,80,False,'single'),('area100',100,160,False,'area')]:
  for mode in ['none','scatter','debt']:
   s=State();s.hp[0]=initial;events=[]
   if kind=='area':
    # AoE is one attack across the four targets, outside both doctrines.
    for i in range(4):events.append(single(s,i,damage,mode,attack_kind='area'))
   else:
    events.append(single(s,0,damage,mode))
    if twice:events.append(single(s,0,damage,mode))
   scenarios.append({'id':ident,'mode':mode,'hp':s.hp,'debt':s.debt,'token':s.token,'events':events,'survivors':sum(v>0 for v in s.hp)})
 debt=[]
 for recovery in [0,80]:
  s=State();event=single(s,0,220,'debt');after_hit=deepcopy(s);healed=heal(s,0,recovery);before_pay=deepcopy(s);paid=settle(s,2);debt.append({'healingRequested':recovery,'initial':event['before'],'afterHit':asdict(after_hit),'healed':healed,'beforePayment':asdict(before_pay),'paid':paid,'final':asdict(s)})
 # Meaningful conservation, scope, recursion and resource checks.
 rr=random.Random(20261101)
 for _ in range(3000):
  d=rr.randrange(1,5000);s=State();e=single(s,rr.randrange(4),d,'scatter');assert sum(e['parts'])==d and 0<=s.token<=1 and s.charge_awarded<=10
 a=State();b=State();single(a,0,220,'scatter',boss_flag=False);single(b,0,220,'scatter',boss_flag=True);assert asdict(a)==asdict(b)
 for kind in ['area','status']:
  s=State();single(s,0,220 if kind=='area'else 0,'scatter',attack_kind=kind);assert s.token==1
 s=State();single(s,0,220,'scatter',enemy=False);assert s.token==1
 s=State();s.hp[3]=0;single(s,0,220,'scatter');assert s.token==1
 s=State();single(s,0,220,'scatter');assert s.hp==[72,196,196,196] and s.token==0
 single(s,0,220,'scatter');assert s.hp[0]==0
 s=State();single(s,0,220,'debt');assert s.hp[0]==50 and s.debt[0]==110
 before=s.charge_awarded;heal(s,0,80);s.barrier[0]=999;settle(s,2);assert s.hp[0]==20 and s.barrier[0]==999 and s.charge_awarded==before
 s=State();single(s,0,320,'debt');assert s.hp[0]==0 # no universal lethal immunity
 s=State();s.token=0;x={'actor':'r1','ordinary':True,'single':True,'obeyed':True,'damage':1};assert replenish(s,[x,x])==0
 y={**x,'actor':'r2'};s=State();s.token=0;assert replenish(s,[x,y])==1 and replenish(s,[x,y])==1
 s=State();single(s,0,220,'debt');assert receipt(s,0,999)==110 and receipt(s,0,40)==0
 s=State();single(s,0,220,'debt');heal(s,0,999);second=single(s,0,220,'debt');assert second['deferred']==0 and s.debt[0]==110
 s=State();s.leader_alive=False;single(s,0,220,'scatter');assert s.token==1
 s=State();s.barrier[0]=100;single(s,0,220,'debt');assert s.debt[0]==0 and s.hp[0]==40
 s=State();s.command_issued=True;single(s,0,220,'scatter');assert s.hp==[72,196,196,196] # proposed exception, NOT current leaderEffect getter
 s=State();s.token=0;bell={'actor':'iris','ordinary':True,'single':True,'obeyed':True,'damage':1,'bell':True};follower={**bell,'actor':'nox','bell':False}
 assert replenish(s,[bell],1)==0 and s.bell_actor=='iris'
 assert replenish(s,[follower],2)==1 and s.bell_actor is None
 s.token=0;assert replenish(s,[bell,follower],2)==0 # cannot refill twice in one round
 s=State();s.token=0;replenish(s,[bell],1);assert replenish(s,[follower],3)==0 # expires
 s=State();s.token=0;replenish(s,[bell],1);assert replenish(s,[bell],2)==0 # same actor is not two
 s=State();single(s,0,220,'debt');before=s.charge_awarded;settle(s,1,force=True);assert s.hp[0]==0 and s.debt[0]==0 and s.charge_awarded==before # no free early-victory escape
 result={'status':'unimplemented toy damage-routing model, NOT tower victory simulation','parameters':{'hp':[160,240,240,240],'scatter':[.4,.2,.2,.2],'debtFraction':.5,'debtCap':'target max HP','resourceCap':1,'debtPayment':'next round end, before outcome; cannot be shielded/redeferred'},'scenarios':scenarios,'debtTimeline':debt,'validation':{'passed':True,'randomConservationCases':3000,'normalAndBossFlagBothEligible':True,'proposedStockWorksDuringCommand':True,'bellRecordBridgesOneRound':True,'bellRecordConsumedAndDistinct':True,'maxOneRefillPerRound':True,'roundEndAggregationIdempotent':True,'aoeExcluded':True,'friendlyFireExcluded':True,'fourAliveRequiredForScatter':True,'twoDistinctFollowersRequired':True,'tokenCappedAtOne':True,'aggregateSplitHitChargeCappedAt10':True,'paymentIgnoresBarrierAndGainsNoCharge':True,'earlyVictoryStillSettlesOutstandingDebt':True}}
 (P/'mechanism-model.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(result['validation']);print('DEBT',[(x['healingRequested'],x['final']['hp'][0])for x in debt]);return result
if __name__=='__main__':run()
