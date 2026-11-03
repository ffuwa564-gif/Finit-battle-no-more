from pathlib import Path
import subprocess,json,hashlib,os,sys
B=Path(__file__).resolve().parent;ROOT=B.parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def run(cmd,log,env=None):
 with(B/log).open('w')as f:subprocess.run(cmd,cwd=ROOT,stdout=f,stderr=subprocess.STDOUT,check=True,env=env)
if '--finish-only' not in sys.argv:
 run(['python',str(B/'audit.py')],'final-audit.log')
 env={**os.environ,'LD_LIBRARY_PATH':str(ROOT/'artifacts/v1.10/webkit-libs/root/usr/lib/x86_64-linux-gnu'),'PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS':'1'}
 run(['npx','tsx',str(B/'verify.ts')],'final-browser.log',env)
 validation=json.loads((B/'Validation.json').read_text())
 for row in validation:row['finishedSha256']=sha(B/f"STILLVEIL-BuildResearchDiary-00-{row['label']}.mp4")
 (B/'Validation.json').write_text(json.dumps(validation,indent=2))
else:
 for row in json.loads((B/'Finished-Movie-Sync.json').read_text()):assert row['passed'] and row['finishedSha256']==sha(B/row['finishedFile'])
 for row in json.loads((B/'Validation.json').read_text()):assert row['passed'] and row['finishedSha256']==sha(B/f"STILLVEIL-BuildResearchDiary-00-{row['label']}.mp4")
checks=[]
for label in ['1080p','720p']:
 p=B/f'STILLVEIL-BuildResearchDiary-00-{label}.mp4'
 run(['ffmpeg','-v','error','-threads','2','-i',str(p),'-f','null','-'],f'decode-{label}.log')
 assert not(B/f'decode-{label}.log').read_text().strip()
 run(['ffmpeg','-hide_banner','-i',str(p),'-t','535.0333333333333','-af','loudnorm=I=-16:TP=-1:LRA=11:print_format=json','-f','null','-'],f'loudness-{label}.log')
 text=(B/f'loudness-{label}.log').read_text();metrics=json.JSONDecoder().raw_decode(text[text.rfind('{'):])[0];assert -18<float(metrics['input_i'])<-14 and float(metrics['input_tp'])<-.5
 checks.append({'label':label,'sha256':sha(p),'fullDecode':'passed with no diagnostics','bodyLoudness':metrics,'passed':True})
(B/'Decode-Validation.json').write_text(json.dumps(checks,indent=2))
for i,at in enumerate([72.73,560,1555]):run(['ffmpeg','-v','error','-ss',str(at),'-i',str(B/'STILLVEIL-BuildResearchDiary-00-1080p.mp4'),'-frames:v','1','-y',str(B/f'final-compressed-{i}.jpg')],f'extract-final-{i}.log')
print('Finished-file sync, all catalogue frames, both browsers, full decode and loudness PASS',flush=True)
