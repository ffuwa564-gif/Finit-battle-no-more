"""Fetch official cast assets; restore own speech FLAC and lossless recording MKVs."""
import pathlib,urllib.request,json,base64,subprocess,gzip
ROOT=pathlib.Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-part2';A=O/'assets';A.mkdir(parents=True,exist_ok=True)
for folder,name in[('zundamon','zunmon003'),('methane','met002_cr')]:
 p=ROOT/'artifacts/athena-council/assets'/(name+'.png');p.parent.mkdir(parents=True,exist_ok=True)
 if not p.exists():urllib.request.urlretrieve(f'https://zunko.jp/sozai/{folder}/{name}.png',p)
api='http://127.0.0.1:50021'
if not(A/'tsumugi.png').exists():
 speakers=json.load(urllib.request.urlopen(api+'/speakers'));s=next(s for s in speakers if s['name']=='春日部つむぎ');info=json.load(urllib.request.urlopen(api+'/speaker_info?speaker_uuid='+s['speaker_uuid']));(A/'tsumugi.png').write_bytes(base64.b64decode(info['portrait']));(O/'research').mkdir(exist_ok=True);(O/'research/tsumugi-policy.txt').write_text(info['policy'])
for p in(O/'speech').glob('*.flac'):
 q=p.with_suffix('.wav')
 if not q.exists():subprocess.run(['ffmpeg','-v','error','-i',str(p),str(q)],check=True)
for p in(O/'capture').glob('*.mkv'):
 q=p.with_suffix('.mov')
 if not q.exists():subprocess.run(['ffmpeg','-v','error','-i',str(p),'-c:v','copy','-c:a','pcm_s16le',str(q)],check=True)
print('Terms: https://zunko.jp/guideline.html / https://tsumugi-official.studio.site/rule')

for p in(O/'capture').glob('*.json.gz'):
 p.with_suffix('').write_bytes(gzip.decompress(p.read_bytes()))
# User-supplied common OP, pinned to the exact media commit used for Part2.
op=O/'assets/STILLVEIL-TowerDiary-Opening-v4-1080p.mp4'
if not op.exists():urllib.request.urlretrieve('https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/017a0ccca241d1ec6a72b8a73f63188fc1043875/STILLVEIL-TowerDiary-Opening-v4-1080p.mp4',op)
