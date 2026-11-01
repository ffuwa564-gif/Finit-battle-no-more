"""Unimplemented target-allocation model. NOT STILLVEIL combat or existing AI.
Three supplied intentions A/B/C, equalized single-target attack payloads, one
commander action sacrificed. All follower actions precede target C. No defense,
status, misses, healing, gems, coordination bonus or dynamic AI is simulated.
"""
import csv,itertools,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/command-lab';D=OUT/'delivery';D.mkdir(exist_ok=True)
def allocate(payload,capacity_cost,command=False,intents=('A','B','C'),commander_target='A'):
 selected=[0,1,2]if capacity_cost==1 else[0]
 assert sum(capacity_cost for i in selected)<=3
 targets=[('C'if command and i in selected else target)for i,target in enumerate(intents)]
 damage={k:0 for k in ['A','B','C']}
 if not command:damage[commander_target]+=20
 for target in targets:damage[target]+=payload
 return {'payload':payload,'command':command,'reservedFollowers':selected if command else[],'reservedCapacity':len(selected)*capacity_cost if command else 0,'originalIntentions':list(intents),'finalIntentions':targets,'actualTargetChanges':sum(a!=b for a,b in zip(intents,targets)),'allocatedDamage':damage,'totalAllocatedDamage':sum(damage.values()),'commanderAction':'command; no damage'if command else f'attack {commander_target} for 20'}
def run():
 cases={name:allocate(power,cost,command)for name,power,cost,command in [('R-no-command',40,1,False),('SSR-no-command',55,3,False),('R-command',40,1,True),('SSR-command',55,3,True)]}
 assert[cases[x]['allocatedDamage']['C']for x in cases]==[40,55,120,110]
 for c in cases.values():
  assert c['totalAllocatedDamage']==c['payload']*3+(0 if c['command']else 20)
  c['targetHp115RemovedBeforeItsAction']=c['allocatedDamage']['C']>=115
 distribution={55:0.,110:0.,165:0.}
 for bits in itertools.product([False,True],repeat=2):distribution[55*(1+sum(bits))]+=.25
 rows=[]
 for s in range(40,81):
  for hp in range(1,181):
   r=120>=hp;ssr=2*s>=hp;rows.append({'R_payload':40,'SSR_payload':s,'target_HP':hp,'R_command_removes_C':r,'SSR_command_removes_C':ssr,'R_only':r and not ssr})
 agreement={name:allocate(power,cost,command,('C','C','C'),'C')for name,power,cost,command in [('R-no-command',40,1,False),('SSR-no-command',55,3,False),('R-command',40,1,True),('SSR-command',55,3,True)]}
 assert [x['allocatedDamage']['C']for x in agreement.values()]==[140,185,120,165]
 result={'agreementCases':agreement,'scope':__doc__,'provisional':True,'rules':{'capacity':3,'R_cost':1,'SSR_cost':3,'commandConsumesCommanderNormalAction':True,'commanderNormalDamage':20,'damageValuesAreNotCharacterStats':True,'intentionsAreSuppliedNotCurrentAI':True,'enemyActsAfterAllFollowers':True,'noPostKillRetargetSimulation':True},'cases':cases,'SSR_random_p05_two_mismatches':{'distribution':distribution,'removeHp115Probability':.25,'allThreeNeedChangingProbability':.125},'boundary':{'R_command_C':120,'SSR_command_C':'2 × SSR_payload','R_onlyWindowAtSSR55':'HP111–120 (10 integer HP values)','parityAtSSRPayload':60,'fullAgreementNoCommand':{x:agreement[x+'-no-command']['allocatedDamage']['C']for x in ['R','SSR']},'fullAgreementCommand':{x:agreement[x+'-command']['allocatedDamage']['C']for x in ['R','SSR']}},'sweepRows':len(rows),'noGameWinRateClaim':True}
 (D/'Model-Results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 with(D/'Model-Sweep.csv').open('w',encoding='utf-8-sig',newline='')as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator='\n');w.writeheader();w.writerows(rows)
 import matplotlib;matplotlib.use('Agg')
 import matplotlib.pyplot as plt
 from matplotlib import font_manager
 fp=font_manager.FontProperties(fname='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc');plt.rcParams.update({'font.family':fp.get_name(),'axes.facecolor':'#132338','figure.facecolor':'#0d1929','text.color':'#f4f1e9','axes.labelcolor':'#f4f1e9','xtick.color':'#d1dce7','ytick.color':'#f4f1e9','axes.edgecolor':'#6c859c','font.size':26})
 fig,ax=plt.subplots(figsize=(11.6,5.1),dpi=100);labels=['R軍・指揮なし','SSR軍・指揮なし','R軍・指揮あり','SSR軍・指揮あり'];values=[40,55,120,110]
 ax.barh(labels,values,color=['#789ca9','#be93c8','#a8d99b','#dfbf86'],height=.6);ax.invert_yaxis();ax.set_xlim(0,145);ax.axvline(115,color='#f3a69b',linestyle='--',linewidth=2);ax.set_xlabel('Cへ向く予定火力（仮の配分模型）');ax.set_title('CのHP115：指揮の4条件',fontsize=27,pad=20)
 for i,v in enumerate(values):ax.text(v+2,i,str(v),va='center',fontsize=30)
 ax.spines[['top','right']].set_visible(False);fig.tight_layout();fig.savefig(D/'Allocation-Comparison.png');fig.savefig(D/'Allocation-Comparison.svg');plt.close(fig)
 print('Model verified',len(cases),'cases;',len(rows),'threshold combinations; probability enumeration exact')
if __name__=='__main__':run()
