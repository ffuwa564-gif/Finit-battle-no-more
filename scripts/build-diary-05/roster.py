"""Silent all-girl roster. Full source art, stable IDs, auditable gem status.

No avatars/subtitles are burned in: the episode renderer owns the foreground.
"""
from pathlib import Path
from functools import lru_cache
import argparse,hashlib,json,math,subprocess
from PIL import Image,ImageDraw,ImageFilter,ImageColor
import visuals as v
ROOT=v.ROOT;O=v.O;OUT=O/'render';FPS=30;W=1920;H=1080
CARD=250;PITCH=270;ROW_H=365;VX=320;VY=125;VW=1280;VH=770
STRIP=35*PITCH+CARD;TRAVEL=STRIP-VW;HOLD=3.0

def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def entries():
 r=json.loads((O/'registry.json').read_text());assert r['finalized']and r.get('episode')=='BRD-005';es=r['entries'];assert len(es)==72 and len({e['seriesId']for e in es})==72
 for e in es:
  p=ROOT/'public'/e['artPath'];assert sha(p)==e['artSha256'],str(p)
 return r,es

@lru_cache(None)
def entries_cached():return entries()

def rounded_duration(duration):return round(float(duration)*FPS)/FPS

def offset(t,duration):
 assert duration>2*HOLD+3
 return TRAVEL*min(1,max(0,(t-HOLD)/(duration-2*HOLD)))

def build_name_layout(entry):
 build=entry.get('researchBuild')
 if not build:return None
 assert build.get('provisional')is True and build.get('recognitionScope')=='name-only','A provisional name never grants certification'
 label='仮：'+build['name'];bounds=ImageDraw.Draw(Image.new('RGB',(CARD,ROW_H))).textbbox((39,335),label,font=v.font(20,True))
 assert bounds[0]>=36 and bounds[2]<=CARD-9 and bounds[1]>=340 and bounds[3]<=ROW_H-3,('Build name does not fit; do not invent a shortened name',build['name'],bounds)
 return {'researchBuild':{'id':build['id'],'name':build['name'],'provisional':True},'fontSize':20,'actualText':label,'cardLocalBBox':list(bounds),'gemLocalRect':[14,341,32,359]}

def visibility(duration,es):
 n=round(duration*FPS);out=[]
 for i,e in enumerate(es):
  j=i%36;valid=[f for f in range(n)if -1e-6<=j*PITCH-offset(f/FPS,duration)<=VW-CARD+1e-6]
  assert valid and len(valid)>=FPS*3,(e['seriesId'],len(valid))
  out.append({'seriesId':e['seriesId'],'characterId':e['characterId'],'row':i//36,'firstFullFrame':valid[0],'lastFullFrame':valid[-1],'fullFrames':len(valid),'fullSeconds':len(valid)/FPS,'fullyVisibleStart':valid[0]/FPS,'fullyVisibleEnd':(valid[-1]+1)/FPS,'sampleFrame':valid[len(valid)//2],'sampleTime':valid[len(valid)//2]/FPS,'cardRect':[VX+round(j*PITCH-offset(valid[len(valid)//2]/FPS,duration)),VY+(i//36)*385,CARD,ROW_H],'artPath':e['artPath'],'artSha256':e['artSha256'],'badge':e['gems']['badge']})
 for item,e in zip(out,es):
  layout=build_name_layout(e);item['researchBuild']=layout['researchBuild']if layout else None;item['buildNameRect']=None;item['gemRect']=None
  if layout:
   bx,by,_,_=item['cardRect'];local=layout['cardLocalBBox'];item['buildNameRect']={k:val for k,val in layout.items()if k not in ['researchBuild','gemLocalRect']};item['buildNameRect']['bbox']=[local[0]+bx,local[1]+by,local[2]+bx,local[3]+by]
   if e['gems']['badge']in ['solid-amber','outline-weak','outline-amber']:
    gx1,gy1,gx2,gy2=layout['gemLocalRect'];item['gemRect']=[bx+gx1,by+gy1,bx+gx2,by+gy2]
 return out

def strips(es):
 result=[]
 for row in range(2):
  im=Image.new('RGBA',(STRIP,ROW_H));d=ImageDraw.Draw(im)
  for j,e in enumerate(es[row*36:row*36+36]):
   x=j*PITCH;g=e['gems'];strong=g['badge']=='solid-amber';weak=g['badge']in ['outline-weak','outline-amber'];edge=v.GOLD if strong or g['badge']=='outline-amber'else v.MINT if weak else v.EDGE;build=build_name_layout(e)
   d.rounded_rectangle((x+1,1,x+CARD-2,ROW_H-2),20,fill='#fff5dc'if strong else '#f8fff9'if weak else v.CREAM)
   if strong or weak:
    # Soft light stays around the frame; the original art and footer are added afterwards.
    halo=Image.new('RGBA',(CARD+24,ROW_H+24));hd=ImageDraw.Draw(halo);color=ImageColor.getrgb(g['glow']['color']);strength=g['glow']['strength'];hd.rounded_rectangle((14,14,CARD+9,ROW_H+9),18,outline=(*color,round(105*strength)),width=14);halo=halo.filter(ImageFilter.GaussianBlur(5));im.alpha_composite(halo,(x-12,-12))
   d.rounded_rectangle((x+1,1,x+CARD-2,ROW_H-2),20,outline=edge,width=4 if strong else 2)
   art=Image.open(ROOT/'public'/e['artPath']).convert('RGBA');v.contained(im,art,(x+8,5,234,280),15)
   # The complete original remains within the art box; badges are in its footer.
   v.text(d,x+14,285,e['seriesId'],20,v.MINT)
   name=e.get('displayName',e['name']);v.fit_text(d,x+14,307,name,24,222,v.PLUM,minimum=16)
   if strong or weak:
    v.gem(d,x+23 if build else x+220,350 if build else 299,9 if build else 14,edge,strong)
    if strong:v.text(d,x+145,282,'試作',18,v.GOLD)
   if build:v.text(d,x+39,335,build['actualText'],20,v.PLUM)
  result.append(im)
 return result

def frame(t,duration,ss):
 r,es=entries_cached();summary=r['summary'];plan=v.episode()
 im=v.backdrop().copy();d=ImageDraw.Draw(im)
 v.text(d,27,13,'ビルド研究日誌',28,v.PLUM);v.text(d,1280,17,f"{summary['canonicalGirls']}名・{len(es)}の姿 ／ 研究対象一覧",25,v.GOLD)
 if t<10:v.fit_text(d,370,65,plan.get('rosterHook','少女の新しい仕事を、一緒に探してみよう。'),35,1180,v.PLUM)
 else:v.text(d,370,67,'みんなが輝くRPGを！　少女たちの研究ノート',31,v.PINK)
 d.rounded_rectangle((296,113,1624,923),25,fill='#fdf9f5',outline=v.EDGE,width=2)
 view=Image.new('RGBA',(VW,VH),'#fdf9f5');s=round(offset(t,duration))
 for row,strip in enumerate(ss):view.alpha_composite(strip.crop((s,0,s+VW,ROW_H)),(0,row*385))
 im.alpha_composite(view,(VX,VY));d=ImageDraw.Draw(im)
 v.gem(d,348,905,12,v.MINT,False);v.text(d,370,885,'◇ 案あり：未証明',23,v.MINT)
 v.gem(d,702,905,12,v.GOLD,True);v.text(d,724,885,f"◆ 試作認定：{summary['prototypeCertifiedGirls']}名",23,v.GOLD)
 v.text(d,1180,885,f"現行の本認定：{summary['liveCertifiedGirls']}",23,v.MUTED)
 return im.convert('RGB')

def fingerprint(duration,es):
 files=[Path(__file__),Path(v.__file__),O/'render-plan.json',O/'registry.json',Path('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'),Path('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc')]
 data={'duration':duration,'fps':FPS,'size':[W,H],'viewport':[VX,VY,VW,VH],'card':[CARD,ROW_H,PITCH],'holds':HOLD,'hookSeconds':10,'files':{str(p.relative_to(ROOT))if p.is_relative_to(ROOT)else str(p):sha(p)for p in files},'art':{e['artPath']:sha(ROOT/'public'/e['artPath'])for e in es}}
 return hashlib.sha256(json.dumps(data,sort_keys=True).encode()).hexdigest(),data

def render_roster(duration):
 duration=rounded_duration(duration);r,es=entries();proof=visibility(duration,es);key,inputs=fingerprint(duration,es);OUT.mkdir(parents=True,exist_ok=True);out=OUT/'roster-background.mp4';meta=OUT/'roster-background.json'
 if out.exists()and meta.exists():
  old=json.loads(meta.read_text())
  if old.get('cacheKey')==key and old.get('outputSha256')==sha(out):return out
 ss=strips(es);tmp=OUT/'roster-background.rendering.mp4';cmd=['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-r','30','-i','pipe:0','-an','-c:v','libx264','-threads','2','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(tmp)];p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
 try:
  for f in range(round(duration*FPS)):p.stdin.write(frame(f/FPS,duration,ss).tobytes())
  p.stdin.close();assert p.wait()==0
 except BaseException:
  p.kill();p.wait();raise
 tmp.replace(out);data={'cacheKey':key,'inputs':inputs,'outputSha256':sha(out),'duration':duration,'frames':round(duration*FPS),'minimumFullVisibilitySeconds':min(e['fullSeconds']for e in proof),'visibility':proof,'registryFinalized':r['finalized'],'liveCertified':r['summary']['liveCertifiedGirls'],'prototypeCertified':r['summary']['prototypeCertifiedGirls'],'passed':True};meta.write_text(json.dumps(data,ensure_ascii=False,indent=2));return out

def preview(duration=55):
 duration=rounded_duration(duration);r,es=entries();proof=visibility(duration,es);ss=strips(es);p=OUT/'roster-previews';p.mkdir(parents=True,exist_ok=True)
 for t in[0,duration/2,duration-1/FPS]:frame(t,duration,ss).save(p/f'{t:.2f}.jpg')
 (p/'visibility.json').write_text(json.dumps({'duration':duration,'minimumFullSeconds':min(x['fullSeconds']for x in proof),'entries':proof},ensure_ascii=False,indent=2))
 return p
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--duration',type=float,default=55);a.add_argument('--preview',action='store_true');args=a.parse_args();print(preview(args.duration)if args.preview else render_roster(args.duration))
