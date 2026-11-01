"""Arithmetic for explanatory diagrams, NOT a balance simulation of the game."""
import json,math,pathlib
OUT=pathlib.Path(__file__).resolve().parents[2]/'artifacts/myth-lab'
def redistribute(hp_a,max_a,hp_b,max_b):
 total=hp_a+hp_b
 lower=max(1,total-max_b);upper=min(max_a,total-1)
 new_a=min(upper,max(lower,math.floor(total*max_a/(max_a+max_b)+.5)))
 return new_a,total-new_a
def split_heal(hp_a,hp_b,planned,max_hp=100,original_target=0):
 assert original_target in (0,1)
 a=planned//2+(planned%2 if original_target==0 else 0);b=planned//2+(planned%2 if original_target==1 else 0)
 return min(max_hp,hp_a+a),min(max_hp,hp_b+b)
checks=0
for ma in range(1,21):
 for mb in range(1,21):
  for a in range(1,ma+1):
   for b in range(1,mb+1):
    x,y=redistribute(a,ma,b,mb)
    assert x+y==a+b and 1<=x<=ma and 1<=y<=mb
    checks+=1
assert redistribute(320,400,20,200)==(227,113)
assert split_heal(20,20,80)==(60,60)
assert split_heal(20,100,80)==(60,100)
assert split_heal(20,20,81,original_target=0)==(61,60)
assert split_heal(20,20,81,original_target=1)==(60,61)
result={'scope':'Unimplemented proposal diagrams only. Arithmetic invariants and worked examples; no game combat, win-rate, balance or implementation proof.','hpTransfer':{'before':[320,20],'maximum':[400,200],'after':[227,113],'totalBefore':340,'totalAfter':340,'ifBReceives90':23,'ifAReceives250':'would fall'},'healRouting':{'bothWounded':{'before':[20,20],'planned':80,'after':[60,60]},'fullSelfHealer':{'before':[20,100],'planned':80,'after':[60,100],'effectiveHealBefore':0,'effectiveHealAfter':40},'oddAmounts':'Remainder stays with original target in the proposed rule.'},'smallIntegerConservationChecks':checks}
(OUT/'Worked-Examples.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('Diagram arithmetic verified',checks,flush=True)
