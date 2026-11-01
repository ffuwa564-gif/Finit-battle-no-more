"""Publishable production inputs: lossless speech, owned notes, metadata and small native SE.
External source HTML, isolated music and official standing PNGs are excluded.
"""
import concurrent.futures,hashlib,json,pathlib,subprocess,zipfile,wave
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/command-lab';D=OUT/'delivery'
def package():
 data=json.loads((OUT/'narration.json').read_text());paths=sorted({ROOT/line['wav']for ch in data['chapters']for line in ch['lines']});cache=OUT/'flac';cache.mkdir(exist_ok=True)
 def convert(p):
  f=cache/(p.stem+'.flac')
  if not f.exists():subprocess.run(['ffmpeg','-v','error','-y','-threads','1','-i',str(p),'-c:a','flac','-compression_level','8',str(f)],check=True)
  return p,f
 with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:pairs=list(pool.map(convert,paths))
 manifest=[]
 with zipfile.ZipFile(D/'Production-Inputs.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=6)as z:
  for p,f in pairs:
   z.write(f,'artifacts/command-lab/speech/'+f.name)
   with wave.open(str(p))as stream:pcm_sha=hashlib.sha256(stream.readframes(stream.getnframes())).hexdigest()
   manifest.append({'wav':str(p.relative_to(ROOT)),'originalWavFileSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'pcmFramesSha256':pcm_sha,'losslessFlacSha256':hashlib.sha256(f.read_bytes()).hexdigest()})
  for name in ['narration.json','content.json','script-final.json']:
   z.write(OUT/name,'artifacts/command-lab/'+name)
  for p in (OUT/'research').glob('*'):
   if p.is_file():z.write(p,'artifacts/command-lab/research/'+p.name)
  for name in ['ui-native.wav','guard-native.wav','editorial-se.json']:z.write(OUT/'assets'/name,'artifacts/command-lab/assets/'+name)

  for name in ['Allocation-Comparison.png','Allocation-Comparison.svg','Model-Results.json','Model-Sweep.csv']:
   z.write(D/name,'artifacts/command-lab/delivery/'+name)
  z.write(D/'Credits.md','CREDITS.md');z.write(D/'Sources.md','SOURCES.md');z.write(ROOT/'docs/command-doctrine.md','REPRODUCTION.md')
  z.writestr('Speech-Manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2))
  z.writestr('RESTORE.txt','Unzip at repository root. Run python scripts/command-lab/bootstrap.py, then restore_audio.py. See docs/command-doctrine.md. No external academic HTML or isolated music/official sprites are included.\n')
 assert(D/'Production-Inputs.zip').stat().st_size<100*1024**2
 (D/'Checksums.sha256').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n'for p in sorted(D.iterdir())if p.is_file()and p.name!='Checksums.sha256'))
 print('Speech files',len(paths),'archive bytes',(D/'Production-Inputs.zip').stat().st_size)
if __name__=='__main__':package()
