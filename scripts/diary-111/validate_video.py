import json,pathlib,subprocess,re,sys
P=pathlib.Path('artifacts/diary-111');D=P/'delivery';movie=D/'STILLVEIL-TowerDiary-Part1.1.1.mp4';m=json.loads((P/'narration.json').read_text())
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
q=probe(movie);duration=float(q['format']['duration']);assert abs(duration-m['duration'])<.3,(duration,m['duration'])
for ident in ['rewind','flower']:
 c=json.loads((D/f'AV-Sync-{ident}.json').read_text());assert c['passed'];assert max(abs(x['residual'])for x in c['endpoints'])<.075
for p in [movie,*D.glob('FullReplay-*.mp4')]:subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(p),'-map','0:v','-map','0:a','-f','null','-'],check=True)
res=subprocess.run(['ffmpeg','-hide_banner','-i',str(movie),'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
match=re.search(r'\{\s*"input_i"[\s\S]*?\}',res.stderr);assert match;levels=json.loads(match[0]);assert -17.5<float(levels['input_i'])<-14.5 and float(levels['input_tp'])<-.5,levels
lines=[l for c in m['chapters']for l in c['lines']];gaps=[b['start']-a['end']for a,b in zip(lines,lines[1:])];assert max(gaps)<1.6,max(gaps)
for l in lines:assert len(l['text'])<=84
# Native proof is an independent prerequisite; production does not modify engine stats.
assert json.loads((D/'Data-Validation.json').read_text())['flowerObserved']['totalActualHealing']==125
report={'passed':True,'fullVideoAndBothReplaysDecoded':True,'duration':duration,'expectedDuration':m['duration'],'resolution':[q['streams'][0]['width'],q['streams'][0]['height']],'audio':levels,'maximumNarrationGapSeconds':max(gaps),'nativeProofVerified':True,'sourceCommit':'dec20ebbfb8d139713ffe847ebc48eefe8ff54ca','gameModified':False,'episode':'1.1.1','gameVersion':'1.10.0'}
(D/'Validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(report)
