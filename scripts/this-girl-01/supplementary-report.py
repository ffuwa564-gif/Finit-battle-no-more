"""Descriptive reports for preregistered supplementary data. No new tests/claims."""
import pathlib,json,gzip,collections
ROOT=pathlib.Path(__file__).resolve().parents[2];D=ROOT/'artifacts/this-girl-01/research';P=ROOT/'docs/media/this-girl/episodes/01/reports'
def read(p):
 with(gzip.open(p,'rt')if str(p).endswith('.gz')else open(p))as f:return json.load(f)
def save(name,lines):(P/name).write_text('\n'.join(lines)+'\n')
def line(case,name,a):return f"|{case}|{name}|{a['wins']}/{a['n']}|{a['meanCappedRounds']:.3f}|{a['meanPotions']:.3f}|{a['allSurvive']}/{a['n']}|"
lock=read(D/'confirmation-lock.json');main=read(D/'analysis/main.json');judgment=read(P/'character-summary.json');mechanisms=[];dominated=[]
for c in lock['cases']:
 d=read(D/'confirmation'/f"{c['id']}.json.gz");C=d['arms']['C'];rows=C['rows']
 mechanism={'id':c['id'],'captureTrials':sum(r['telemetry']['petalsStored']>0 for r in rows),'consumeTrials':sum(r['telemetry']['petalsSpent']>0 for r in rows),'positiveReturnTrials':sum(r['telemetry']['returnDamage']>0 for r in rows),'n':len(rows),'meanReturnDamage':sum(r['telemetry']['returnDamage']for r in rows)/len(rows)};mechanisms.append(mechanism)
 for name in ['Dfast','Dsafe','Dfrugal']:
  A=d['arms'][name];weak=A['wins']>=C['wins']and A['meanCappedRounds']<=C['meanCappedRounds']and A['meanPotions']<=C['meanPotions']and A['allSurvive']>=C['allSurvive'];strict=A['wins']>C['wins']or A['meanCappedRounds']<C['meanCappedRounds']or A['meanPotions']<C['meanPotions']or A['allSurvive']>C['allSurvive']
  if weak and strict:dominated.append({'caseId':c['id'],'arm':name,'scope':'observed four-endpoint dominance of this one frozen C, not all Sakuya builds or true universal character dominance'})
judgment['mechanismObservations']=mechanisms;judgment['observedFrozenCDominatedBy']=dominated;judgment['unestablishedPrimaryT6Cases']=[j['id']for j in judgment['caseViability']if j['tier']==6 and not(j['absolute75Verified']and j['noninferiorityMinus5ppVerified'])]
judgment['reasons']=['Primary T6 Tower F4 noninferiority is not established: its simultaneous C-A lower bound is below -5pp.','Some equally optimized replacement candidates observationally dominate this one fast-selected C on four endpoints in specified cases. This is not proof against every Sakuya configuration.','Safe/frugal Sakuya variants were included in development but are not separately confirmed here.']+judgment['reasons'];(P/'character-summary.json').write_text(json.dumps(judgment,ensure_ascii=False,indent=2)+'\n')
noel=['# ノエルの号令：補助実験','','同じ号令側編成・石・先頭・操作方針を固定し、号令だけを禁止/複数敵時/可能時へ変更。サクヤリーダー案は同じ探索予算内で別選抜し、号令と同時利用していない。以下は補助パネルの観測値で、主familyの検証済み利益認定ではない。','','|戦場|方針|勝利|失敗cap込みR|薬|4人生還勝利|','|---|---|---:|---:|---:|---:|'];commandrows=[]
for n in lock['noel']:
 d=read(D/'noel'/f"{n['stage']}.json.gz")
 for name,a in d['arms'].items():
  noel.append(line(n['stage'],name,a));commandrows.append({'stage':n['stage'],'arm':name,'issued':sum(r['telemetry']['issuedCommands']for r in a['rows']),'commandedActions':sum(r['telemetry']['commandedActions']for r in a['rows']),'selectedTargetChanged':sum((r['telemetry']['actualRedirects']or 0)for r in a['rows']),'unknownRedirectTrials':sum(r['telemetry']['actualRedirects']is None for r in a['rows'])})
noel+=['','|戦場|方針|発令数|追従行動数|選択対象の実変更数|変更観測不明の試合|','|---|---|---:|---:|---:|---:|']
for r in commandrows:noel.append(f"|{r['stage']}|{r['arm']}|{r['issued']}|{r['commandedActions']}|{r['selectedTargetChanged']}|{r['unknownRedirectTrials']}|")
noel+=['','無条件で連携が強くなる結果ではない。指揮官の1手、対象が最初から同じ場合、ゲージ100時の必殺、敵数を含む費用がある。選択対象が変わっても、かばう後の最終被弾者まで変わった保証ではない。回復/障壁を号令で直接操作することはない。'];save('noel-observations.md',noel)
stress=['# 高レア能力と敵能力の感度分析','','全て凍結したbuildを用い、各条件で再最適化していない。SSR/XRのHP/攻撃/防御を+25/+50%（速度とLS補正は変更しない）、敵HP/攻撃を±10%とした研究摂動。各scenarioに同じ950パネル256行、0%も測定済み。D代替の再最適化比較はないため、将来の永久採用価値や相乗効果の統計認定をしない。','','|条件|scenario|C勝利|E勝利|C観測R|E観測R|C-E観測R差|','|---|---|---:|---:|---:|---:|---:|']
for c in lock['cases']:
 if c['tier']!=6:continue
 d=read(D/'stress'/f"{c['id']}.json.gz");zero=next(r for r in d['results']if r['scenario']['id']=='zero');base=zero['arms']['C']['meanCappedRounds']-zero['arms']['E']['meanCappedRounds']
 for r in d['results']:
  C=r['arms']['C'];E=r['arms']['E'];diff=C['meanCappedRounds']-E['meanCappedRounds'];stress.append(f"|{c['id']}|{r['scenario']['id']}|{C['wins']}|{E['wins']}|{C['meanCappedRounds']:.3f}|{E['meanCappedRounds']:.3f}|{diff:.3f}|")
stress+=['','差の差を述べる場合は同一950パネルの0%との差を使う。930パネルの主比較と950高レア摂動を直接paired差として扱わない。観測C-E差は高レア出力増で縮小する条件もあり、無限の補完性は保証できない。'];save('stress-observations.md',stress)
hidden=['# 未選抜戦場への凍結転送','','3つの既存hidden戦場へT6 buildをそのまま転送。結果を見て石/方針/ステージを選び直していない。全960パネル各256行。これは補助観測であり、主検定の成功条件へ事後追加しない。','','|戦場/core|腕|勝利|失敗cap込みR|薬|4人生還勝利|','|---|---|---:|---:|---:|---:|']
for p in sorted((D/'hidden').glob('*.gz')):
 d=read(p)
 for name,a in d['arms'].items():hidden.append(line(d['stage']+'/'+d['coreId'],name,a))
save('hidden-transfer-observations.md',hidden)
growth=['# 同じT6テンプレートの石Tierを変える','','編成・リーダー・先頭・操作方針はT6選抜時のまま、各石のrollを合法なT3/T4/T6へ置換。固定roll石は固定のまま。Tier別に再最適化したmainのCとは別の育成対照。各対照は同じ930パネル256行。','','|条件|低→高Tier|低勝利|高勝利|低観測R|高観測R|低薬|高薬|','|---|---|---:|---:|---:|---:|---:|---:|']
for g in lock['growth']:
 d=read(D/'growth'/f"{g['id'].replace(':','_')}.json.gz");L=d['low'];H=d['high'];growth.append(f"|{g['id']}|{g['lowTier']}→{g['highTier']}|{L['wins']}|{H['wins']}|{L['meanCappedRounds']:.3f}|{H['meanCappedRounds']:.3f}|{L['meanPotions']:.3f}|{H['meanPotions']:.3f}|")
growth+=['','同時区間と独立growth48仮説familyの補正済み判定は `analysis/growth.json` とcritic判定を参照。表の平均差をsign検定で母平均差と証明したとは述べない。石特性の有無を振った因子実験は未実施なので、庇護/慈雨の固有相乗効果を検証済みにはしない。'];save('growth-observations.md',growth)
mechanismdoc=['# 返礼の機構が実際に働いた頻度','','各256行で、実際に蓄積/消費/正の返礼ダメージがあった試合数。技能IDがあることや1本の勝利映像だけを因果・採用価値の証明としない。','','|条件|実蓄積あり|消費あり|正の返礼HPダメージあり|返礼ダメージ観測平均|','|---|---:|---:|---:|---:|']
for m in mechanisms:mechanismdoc.append(f"|{m['id']}|{m['captureTrials']}/256|{m['consumeTrials']}/256|{m['positiveReturnTrials']}/256|{m['meanReturnDamage']:.3f}|")
mechanismdoc+=['','absorbedDamageは味方の他の障壁も含む総量なので、サクヤが守ったHP量とは呼ばない。petalsStoredは花びらの百分率ポイントの累計であり、HPダメージ量ではない。C-Eは費用を維持した有効化対照、単なるイベント発生数ではない。'];save('mechanism-observations.md',mechanismdoc)
print('Saved5supplementary/mechanism docs and concrete unresolved judgment reasons')
