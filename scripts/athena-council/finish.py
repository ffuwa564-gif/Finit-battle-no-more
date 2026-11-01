import pathlib,subprocess,json,shutil,hashlib
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[2];O=ROOT/'artifacts/athena-council';D=O/'delivery'
def run(name):subprocess.run(['python','scripts/athena-council/'+name],cwd=ROOT,check=True)
def finish():
 run('package.py');shutil.copy2(O/'STILLVEIL-Athena-Council-1080p.mp4',D/'STILLVEIL-Athena-Council-1080p.mp4');run('describe.py');run('validate.py')
 m=json.loads((O/'narration.json').read_text());contact=Image.new('RGB',(1600,900));ids=['opening','diagnosis','bell-stone','debt-timing']
 for i,ident in enumerate(ids):
  ch=next(c for c in m['chapters']if c['id']==ident);t=ch['lines'][next(j for j,l in enumerate(ch['lines'])if l['phase']==1)]['start']+1 if ident in ['opening','diagnosis','bell-stone']else ch['start']+10;p=O/'research'/f'preview-{ident}.png';subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(D/'STILLVEIL-Athena-Council-1080p.mp4'),'-frames:v','1',str(p)],check=True);contact.paste(Image.open(p).resize((800,450)),((i%2)*800,(i//2)*450))
 contact.save(D/'Preview.jpg',quality=90)
 (D/'Visual-Timelines.json').write_text(json.dumps([json.loads((O/'render'/f"{c['id']}-visual-timeline.json").read_text())for c in m['chapters']],ensure_ascii=False,indent=2))
 for file in D.iterdir():
  if file.is_file():assert file.stat().st_size<100*1024**2,(file.name,file.stat().st_size)
 (D/'Checksums.sha256').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n'for p in sorted(D.iterdir())if p.is_file()and p.name!='Checksums.sha256'))
 print('COMPLETE',D,flush=True)
if __name__=='__main__':finish()
