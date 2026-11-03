"""Generate auditable prose/tables from measured files; never certify the global mission."""
import pathlib,gzip,json,hashlib,collections
ROOT=pathlib.Path(__file__).resolve().parents[2];DATA=ROOT/'artifacts/this-girl-01/research';DOC=ROOT/'docs/media/this-girl/episodes/01/reports'
def read(p):
 with(gzip.open(p,'rt')if str(p).endswith('.gz')else open(p))as f:return json.load(f)
def text(name,s):DOC.mkdir(parents=True,exist_ok=True);(DOC/name).write_text(s)
lock=read(DATA/'confirmation-lock.json');analysis=read(DATA/'analysis/main.json');growth=read(DATA/'analysis/growth.json');facts=read(DATA/'implementation-facts.json');lookup={x['id']:x for x in analysis['comparisons']};absolute={x['id']:x['C']for x in analysis['absolute']}
if analysis['lockSha']!=hashlib.sha256((DATA/'confirmation-lock.json').read_bytes()).hexdigest():raise ValueError('Lock mismatch')
lines=['# Native戦闘の実測結果','','本表は新たに再計測した固定SHAパネル256行の観測。失われた旧データは使用していない。有限探索の最良既知候補であり、真の全最適・普遍的支配の証明ではない。主F1/F4は現在入手不可のXRを含む全所持仮定。','','|条件|腕|勝利/256|失敗cap込みround|薬|4人生還勝利/256|','|---|---|---:|---:|---:|---:|'];casejudgments=[];partial=[];gemcounts=collections.Counter()
for c in lock['cases']:
 d=read(DATA/'confirmation'/f"{c['id']}.json.gz")
 for name,a in d['arms'].items():lines.append(f"|{c['id']}|{name}|{a['wins']}|{a['meanCappedRounds']:.3f}|{a['meanPotions']:.3f}|{a['allSurvive']}|")
 comp=lookup[f"{c['id']}:C-A"];lo=comp['endpoints']['win']['differenceCI'][0];wlo=absolute[c['id']]['simultaneousCI'][0]
 casejudgments.append({'id':c['id'],'tier':c['tier'],'winLower':wlo,'differenceLower':lo,'absolute75Verified':wlo>=.75,'noninferiorityMinus5ppVerified':lo>=-.05,'scope':'this frozen case only'})
 for g in c['arms']['C']['config']['gems']:
  if g:gemcounts[g['defId']]+=1
for comp in analysis['comparisons']+growth['comparisons']:
 for endpoint,v in comp['endpoints'].items():
  for k in ['directionVerified','frequencyBenefitVerified','meanBenefitVerified']:
   if v.get(k):partial.append({'comparison':comp['id'],'endpoint':endpoint,'claim':k,'scope':'only frozen case/policy/seed-model and this endpoint'})
lines+=['','## 探索予算','','全17ヒーラーに各64候補×4train、6候補×100selectionを同条件で配分。T6のみ同じ24石mutation×4trainと3新候補×100selectionを追加し既存winnerも保持する。Aは24team×4=96初期global候補からの選抜と、両coreの全ヒーラー選抜候補の合法union。これは有限探索のbestKnownである。','','## 解釈','','平均値は観測パネル上の記述。sign検定は改善回数と悪化回数の比較であり、母平均round減少の証明に読み替えない。同時区間は全516本、主要288仮説と育成48仮説は別Holm族。勝率75%下限・最強既知との差−5pt下限はcase別に判定する。','','|条件|C勝率同時下限|C-A差同時下限|75%|−5pt非劣性|','|---|---:|---:|---|---|']
for j in casejudgments:lines.append(f"|{j['id']}|{j['winLower']:.4f}|{j['differenceLower']:.4f}|{'確認'if j['absolute75Verified']else'未確立'}|{'確認'if j['noninferiorityMinus5ppVerified']else'未確立'}|")
lines+=['','個々の検定・区間・反例は `artifacts/this-girl-01/research/analysis/main.json` と `growth.json` を参照。C-Eは同じ費用を維持した追加変換の因果対照。単一勝利映像を勝率や固有性の証明には使わない。']
text('combat-results.md','\n'.join(lines)+'\n')
judgment={'status':'researching','display':'研究中','buildName':'花守の返礼','skillName':'桜の返礼','lockSha':analysis['lockSha'],'overallVerified':False,'globalMissionVerified':False,'caseViability':casejudgments,'verifiedPartialClaims':partial,'reasons':['All75 equal-budget four-seed screen cannot establish preservation of every character relative adoption value.','Future stat stress uses frozen builds, not reoptimization under each future condition.','Partial evidence is limited to corresponding endpoint and frozen conditions; all cases remain visible.']}
text('character-judgment.json',json.dumps(judgment,ensure_ascii=False,indent=2)+'\n')
roster=read(DATA/'roster-screen.json.gz');audit=['# 全75姿の影響監査','','各姿は合法な共通コアの最大2組、既存2戦場で同じ8config×4開発seedを前後測定した。全所持・T6の小規模screenであり、旧戦術の採用価値維持・上位互換・不要キャラの証明ではない。前後の固定構成性能不変と、競合追加後の相対採用価値は別問題。','','|ID|測定context数|判定|','|---|---:|---|']
for r in roster['results']:audit.append(f"|{r['id']}|{len(r['contexts'])}|未認定・探索screenのみ|")
text('roster-audit.md','\n'.join(audit)+'\n')
mining=['# 石の育成目標と実入手先','','以下は実装定義と最終C編成での採用石から生成。T3/T4/T6は同じT6テンプレートのdownroll比較も行った。高Tierが必ず勝率や効率を改善するとは限らない。','','T3最大power100=2.5倍、T4最大139=3.085倍、T6最大239=4.585倍は石のスキル倍率。恒久的なキャラ能力値倍率ではない。庇護は石使用後の一時障壁、慈雨は実HPダメージからの回復。','','|石|Cでの装備枠数(12case合計)|T6を狙える塔の先頭候補|','|---|---:|---|']
for did,count in gemcounts.most_common():
 s=next(s for s in facts['stones']if s['definition']['id']==did);routes=sorted([r for r in s['routes']if r.get('towerFloor')and(r['profile'].get('tier6Chance')or 0)>0],key=lambda r:r['towerFloor']);route=routes[0]if routes else None
 label=f"{route['name']} ({route['id']})"if route else'固定製作/他経路を実装facts参照'
 mining.append(f"|{s['definition']['name']}|{count}|{label}|")
mining+=['','各石の全入手候補、注目石、正確なTier昇格率は `implementation-facts.json` のroutes/profileを参照。profileのTier率は最終Waveで石を得た後の各既存roll属性に対する条件付き率。特定石・異形・特性・両roll最大を含む完成品の排出率や必要周回数ではない。ここから必要周回数を捏造しない。固定roll石はTier6へ昇格しない。']
text('stone-goals.md','\n'.join(mining)+'\n')
print('Saved measured report, explicit researching judgment, all75 audit, mining routes')
