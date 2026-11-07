from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import subprocess,json,math,hashlib,wave,sys
import numpy as np
O=Path('artifacts/loot-diary-01');R=O/'render';R.mkdir(exist_ok=True);W,H=1920,1080;FPS=30;SR=48000
C={'bg':'#f9e8ef','paper':'#fffaf4','ink':'#642c4e','edge':'#dca9c0','pink':'#b84b82','mint':'#568e83'}
FONT='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
def f(n):return ImageFont.truetype(FONT,n)
def txt(d,xy,s,n=38,fill=None):d.text(xy,s,font=f(n),fill=fill or C['ink'],spacing=12)
def contain(im,path,box):
 a=Image.open(path).convert('RGBA');a.thumbnail((box[2],box[3]),Image.Resampling.LANCZOS);im.alpha_composite(a,(box[0]+(box[2]-a.width)//2,box[1]+(box[3]-a.height)//2))
def plate(title):
 im=Image.new('RGBA',(W,H),C['bg']);d=ImageDraw.Draw(im)
 for x in range(-1080,1920,100):d.polygon([(x,0),(x+45,0),(x+1125,1080),(x+1080,1080)],fill='#f4dfe9')
 d.rounded_rectangle((296,65,1624,925),28,fill=C['paper'],outline=C['edge'],width=3);d.rectangle((0,935,W,H),fill='#fff8f2');txt(d,(35,17),'つむぎのハクスラ日記',30);txt(d,(1120,20),'#01  好きなSRと、最後の壁へ',28);txt(d,(335,90),title,38);return im
paths={'nox':'public/art/nox.png','mireille':'public/art/mireille.png','liora':'public/art/liora.png','noelle':'public/art/noelle.png'}
# Resolve real artwork paths from the retained current-content registry if needed.
registry=json.loads(Path('docs/media/loot-diary/01/art-map.json').read_text())
for id in paths:
 if not Path(paths[id]).exists():paths[id]='public/'+registry[id]['path']
notes={
'hook':['サクヤヒメと、転生裏ルートへ。','準備した終盤セーブ／公開版1.30','結果を見ながら、次の一手を考える。'],
'party':['ノクス：主攻撃／暁冠','サクヤヒメ：守りの支援／白灯石','リオラ：耐える／双潮','ノエル：複数を削る／残響石'],
'before':['予告を見て、集中する。','崩せないときは、先頭を守る。','T6 × 4 ／ リーダー：リオラ'],
'target':['T7 暁冠の記憶 × 慈雨','殻９ ＋ 核３ ＋ 同系統欠片270','金貨10,000 ／ 固定製作品は対象外'],
'farm':['狙うのは、製作素材。','殻と核を、確実に持ち帰る。','一周の手応えを、次の周回へ。'],
'loot':['今日拾った原石：７個','未研磨：技効力・特性は未判定','見た目だけで、当たり認定しない。'],
'nine':['入口９周 → 殻９・核９','４人生還 × ９ ／ 薬の消費０','繰り返し部分は省略しています。'],
'after':['T7の更新は、ノクスの１個。','メンバー・リーダーは維持。','別探索のため乱数は継続。'],
'leader':['リーダーをノクスへ変更。','他の３人と、石の配置は維持。','強化だけでなく、失った守りも見る。'],
'end':['次の候補：残響石と予告への対処','今回は攻略未達／能力認定なし','それでも、この４人で帰りたい。']}
summary=json.loads((O/'session-summary.json').read_text());gem=next(x['gem']for x in summary['runs']if x['id']=='forge')
for id,title,values in [('before','初戦の記録',['44ラウンド／全滅','ボス残りHP 8,346','薬５本を消費']),('after','再挑戦の記録',['55ラウンド／全滅','ボス残りHP 2,938','石１個更新／勝率の証明ではない']),('leader','配置変更の記録',['49ラウンド／全滅','ボス残りHP 4,104','今回の１戦では改善せず']),('farm','持ち帰れたもの',['16ラウンド／４人生還','殻１・核１／薬０','同じセーブで、この後９周まで継続']),('nine','今回できた暁冠',['T7 技効力 '+str(gem['roll']['power']),'慈雨 特性値 '+str(gem['roll']['value']),'ノクスへ装備／完成品は保護'])]:
 im=plate(title);d=ImageDraw.Draw(im);txt(d,(430,255),values[0],62);txt(d,(430,380),values[1],54);txt(d,(430,530),values[2],35);im.crop((296,65,1624,925)).save(R/(id+'-result.png'))
for ch in json.loads((O/'story.json').read_text()):
 im=plate(ch['title']);d=ImageDraw.Draw(im);isgame=ch['clip']is not None
 if isgame:
  d.rounded_rectangle((304,60,802,936),20,fill='#233140',outline=C['mint'],width=3)
  for j,t in enumerate(notes[ch['id']]):txt(d,(845,250+j*122),t,32)
  txt(d,(845,780),'公開版1.30・実ゲーム映像',27,C['mint']);txt(d,(845,825),'WAVE 2から／途中を省略・振り返り実況',24)
 else:
  if ch['id'] in ['party','hook','end']:
   for j,id in enumerate(paths):
    x=350+j*305;d.rounded_rectangle((x,190,x+270,675),20,fill='#f8eef2',outline=C['edge'],width=2);contain(im,paths[id],(x+14,205,242,370));txt(d,(x+20,590),{'nox':'ノクス','mireille':'サクヤヒメ','liora':'リオラ','noelle':'ノエル'}[id],28)
   txt(d,(355,725),'主攻撃  ←  守りの支援  ←  受け持ち  ＋  複数攻撃',34)
   if ch['id']=='party':txt(d,(355,835),'XR所持を含む比較用データ／自然進行の記録ではありません',24)
  else:
   for j,t in enumerate(notes[ch['id']]):
    d.rounded_rectangle((380,220+j*160,1540,340+j*160),20,fill='#f8eef2',outline=C['edge'],width=2);txt(d,(425,250+j*160),t,38)
 im.save(R/(ch['id']+'-plate.png'))
# Contain-only thumbnail: no character painting or image cropping.
im=Image.new('RGBA',(1280,720),C['bg']);d=ImageDraw.Draw(im);d.rounded_rectangle((22,22,1258,698),30,fill=C['paper'],outline=C['edge'],width=4);contain(im,paths['mireille'],(850,55,350,600));contain(im,O/'t-research-happy-avatar.png',(25,290,290,390));txt(d,(60,60),'つむぎのハクスラ日記 #01',33);txt(d,(315,205),'このSRと、',78);txt(d,(315,315),'最後の壁へ。',78);txt(d,(340,520),'T7を作って、再挑戦',38,C['pink']);im.convert('RGB').save(O/'Thumbnail.png')

def run(args):subprocess.run(['ffmpeg','-v','error','-y','-filter_complex_threads','1','-filter_threads','1',*map(str,args)],check=True)
def frames(sec):return math.ceil(sec*30)
def wt(p):
 with wave.open(str(p))as a:
  x=np.frombuffer(a.readframes(a.getnframes()),dtype='<i2').astype(np.float32)/32768
  return np.repeat(x[:,None],2,axis=1) if a.getnchannels()==1 else x.reshape(-1,2)
def ass_time(fr):
 n=round(fr*100/30);return f'{n//360000}:{n//6000%60:02d}:{n//100%60:02d}.{n%100:02d}'
def srt_time(fr):
 t=ass_time(fr);h,rest=t.split(':',1);return h.zfill(2)+':'+rest.replace('.',',')+'0'
def wrap(s,width=1510,size=46):
 out=[];v=''
 for c in s:
  if f(size).getlength(v+c)>width:out.append(v);v=c
  else:v+=c
 if v:out.append(v)
 return out
HEADER='''[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Noto Sans CJK JP,46,&H004E2C64,&H004E2C64,&H00F2F8FF,&H00000000,0,0,0,0,100,100,0,0,1,3,0,2,160,160,22,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'''
story=json.loads((O/'narration.json').read_text());timeline=[];voices=[];gamecuts=[];chapterfiles=[];cursor=180;srt=[]
# 6s common OP, same video/audio source interval.
op=R/'op.mp4';run(['-ss','0','-i',O/'common-op-original.mp4','-t','6','-vf','fps=30,setsar=1','-an','-c:v','libx264','-preset','veryfast','-crf','24','-threads','2','-pix_fmt','yuv420p',op]);chapterfiles.append(op)
for ch in story:
 at=10
 for l in ch['lines']:
  l['frame']=at;l['frames']=frames(l['duration']);voices.append({'file':l['path'],'startFrame':cursor+at,'frames':l['frames'],'speaker':l['speaker']});at+=l['frames']+6
 count=at+9;secs=count/30;ch['startFrame']=cursor;ch['durationFrames']=count
 ass=[]
 for l in ch['lines']:
  pages=wrap(l['text']);pages=['\\N'.join(pages[i:i+2])for i in range(0,len(pages),2)]
  for i,t in enumerate(pages):
   st=l['frame']+round(l['frames']*i/len(pages));en=l['frame']+round(l['frames']*(i+1)/len(pages));colors={'t':'106198','z':'43753E','m':'743F8B'};text='{\\c&H'+colors[l['speaker']]+'&}'+t
   ass.append(f'Dialogue: 0,{ass_time(st)},{ass_time(en)},Default,,0,0,0,,{text}');srt.append((cursor+st,cursor+en,t.replace('\\N','\n')))
 assfile=R/(ch['id']+'.ass');assfile.write_text(HEADER+'\n'.join(ass)+'\n')
 clip=ch['clip'];game_start=0;game_end=0;inputs=['-loop','1','-framerate','30','-i',R/(ch['id']+'-plate.png')];filter='[0:v]format=yuv420p[base]';base='base';nextidx=1
 if clip:
  tags=['start','middle','end'] if clip in ['attempt-before','attempt-after'] else ['end'] if clip=='attempt-leader' else ['start'] if clip=='farm-1' else ['']
  # Use actual game windows, and show a separate factual result after the decisive footage.
  split={'before':6,'after':4,'farm':2,'leader':2}.get(ch['id'],len(ch['lines']))
  game_start=ch['lines'][3]['frame'] if clip=='forge' else 0
  desired=(ch['lines'][split]['frame'] if split<len(ch['lines']) else count)-game_start
  if clip=='forge':desired=min(desired,240)
  pieces=[];piece_cursor=game_start
  for j,tag in enumerate(tags):
   ident=clip+('-'+tag if tag else'');meta=json.loads((O/'capture'/f'{ident}.json').read_text());raw=O/'capture'/f'{ident}-raw.mkv';available=math.floor((meta['gameEnd']-meta['gameStart'])*30);length=min(available,desired//len(tags)+(1 if j<desired%len(tags) else 0));length=max(1,length)
   offset=max(0,(available-length)/30) if tag=='end' else max(0,(available-length)/60) if tag=='middle' else 0
   start=meta['gameStart']-meta['wallEpoch']+offset;end=start+length/30;piece=R/(ident+'-piece.mov')
   run(['-copyts','-i',raw,'-i',raw.with_suffix('.sync.wav'),'-filter_complex',f'[0:v]trim=start={start}:end={end},setpts=PTS-{start}/TB,fps=30,crop=540:960:0:0,scale=486:864,setsar=1[v];[1:a]atrim=start={start}:end={end},asetpts=PTS-{start}/TB,aresample=48000:first_pts=0,lowpass=f=14000,apad,atrim=end_sample={length*1600}[a]','-map','[v]','-map','[a]','-frames:v',length,'-c:v','libx264','-preset','ultrafast','-crf','18','-threads','1','-pix_fmt','yuv420p','-c:a','pcm_s16le',piece]);pieces.append(piece);gamecuts.append({'id':ident,'piece':str(piece),'startFrame':cursor+piece_cursor,'frames':length,'source':str(raw),'sourceStartPTS':start,'box':[310,66,486,864]});piece_cursor+=length
  joined=R/(ch['id']+'-game.mov');li=R/(ch['id']+'-game.txt');li.write_text('\n'.join("file '"+str(p.resolve())+"'" for p in pieces));run(['-f','concat','-safe','0','-i',li,'-c','copy',joined]);game_end=piece_cursor
  inputs+=['-i',joined];filter+=f';[1:v]setpts=PTS-STARTPTS+{game_start}/30/TB,tpad=stop_mode=clone:stop_duration={secs}[g];[{base}][g]overlay=310:66:enable=\'gte(t,{game_start/30})\'[withgame]';base='withgame';nextidx=2
  if (R/(ch['id']+'-result.png')).exists():
   inputs+=['-loop','1','-framerate','30','-i',R/(ch['id']+'-result.png')];filter+=f';[{base}][{nextidx}:v]overlay=296:65:enable=\'gte(t,{game_end/30})\'[result]';base='result';nextidx+=1
 inputs+=['-loop','1','-framerate','30','-i',O/'t-research-happy-avatar.png','-loop','1','-framerate','30','-i',O/'z-happy-avatar.png','-loop','1','-framerate','30','-i',O/'m-deadpan-avatar.png'];tidx,zidx,midx=nextidx,nextidx+1,nextidx+2
 zexpr='+'.join(f'between(t,{l["frame"]/30},{(l["frame"]+l["frames"])/30})'for l in ch['lines']if l['speaker']=='z')or'0';texpr='+'.join(f'between(t,{l["frame"]/30},{(l["frame"]+l["frames"])/30})'for l in ch['lines']if l['speaker']=='t')or'0'
 filter+=f';[{base}][{tidx}:v]overlay=0:y=\'470+2*sin(t*9)*({texpr})\'[t];[t][{zidx}:v]overlay=1600:470:enable=\'{zexpr}\'[z];[z][{midx}:v]overlay=1600:470:enable=\'not({zexpr})\'[m];[m]subtitles={assfile}[out]'
 dst=R/(ch['id']+'.mp4');run([*inputs,'-filter_complex',filter,'-map','[out]','-frames:v',count,'-an','-c:v','libx264','-preset','veryfast','-crf','24','-threads','2','-pix_fmt','yuv420p',dst]);chapterfiles.append(dst);timeline.append(ch);cursor+=count;print('RENDER',ch['id'],secs,flush=True)
# One common 48kHz sample clock; no separate AAC intermediates.
N=cursor*1600;mix=np.zeros((N,2),np.float32);voicebus=np.zeros_like(mix);gamebus=np.zeros_like(mix)
for v in voices:
 x=wt(v['file']);st=v['startFrame']*1600;voicebus[st:st+len(x)]+=x*.92
for cut in gamecuts:
 x=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',cut['piece'],'-vn','-f','f32le','-ar','48000','-ac','2','pipe:1']),dtype='<f4').reshape(-1,2);st=cut['startFrame']*1600;end=min(N,st+len(x));gamebus[st:end]+=x[:end-st]*.27
bgm=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-stream_loop','-1','-i','public/audio/tanoshiibouken.mp3','-t',str(N/SR),'-f','f32le','-ar','48000','-ac','2','pipe:1']),dtype='<f4').reshape(-1,2)[:N]*.045
mix=voicebus+gamebus+bgm
op_audio=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',O/'common-op-original.mp4','-t','6','-f','f32le','-ar','48000','-ac','2','pipe:1']),dtype='<f4').reshape(-1,2);mix[:min(len(op_audio),288000)]=op_audio[:288000]*.45
fade=min(3*SR,N);mix[-fade:]*=np.linspace(1,0,fade)[:,None];master=min(1,.91/max(.0001,float(np.max(abs(mix)))));mix*=master
pcm=R/'mix.wav'
with wave.open(str(pcm),'wb')as a:a.setparams((2,2,SR,0,'NONE','not compressed'));a.writeframes((np.clip(mix,-1,1)*32767).astype('<i2').tobytes())
run(['-i',pcm,'-c:a','flac',R/'mix.flac']);concat=R/'chapters.txt';concat.write_text('\n'.join("file '"+str(p.resolve())+"'"for p in chapterfiles));final=O/'STILLVEIL-LootDiary-01.mp4';run(['-f','concat','-safe','0','-i',concat,'-i',R/'mix.flac','-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',final])
(O/'Subtitles.srt').write_text('\n\n'.join(f'{i+1}\n{srt_time(a)} --> {srt_time(b)}\n{t}'for i,(a,b,t) in enumerate(srt))+'\n')
(O/'timeline.json').write_text(json.dumps({'fps':30,'sampleRate':SR,'frames':cursor,'masterGain':master,'chapters':timeline,'voices':voices,'gameCuts':gamecuts,'finalSha256':hashlib.sha256(final.read_bytes()).hexdigest()},ensure_ascii=False,indent=2));print('FINAL',cursor/30,final.stat().st_size,flush=True)
