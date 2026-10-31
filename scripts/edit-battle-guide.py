from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import subprocess,json
root=Path(__file__).resolve().parents[1]/'artifacts'/'battle-guide-reading-v2'
sans='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
bold='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
labels=[('01-read','仕草とHPから、一手を読む','仲間を読む'),('02-command','自分の一手を決める','任意の指示'),('03-reveal','確定後に、仲間の行動を確認','答え合わせ')]
def run(args):
 p=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*map(str,args)],capture_output=True,text=True)
 if p.returncode:raise RuntimeError(p.stderr)
for i,(name,title,short) in enumerate(labels):
 im=Image.new('RGB',(450,1000),'#0d1625');d=ImageDraw.Draw(im)
 for y in range(1000):
  t=y/999;d.line((0,y,450,y),fill=(int(22-10*t),int(34-12*t),int(51-17*t)))
 d.text((30,16),'STILLVEIL  /  BATTLE GUIDE',font=ImageFont.truetype(sans,12),fill='#a9bccd')
 d.rounded_rectangle((28,45,56,73),8,fill='#233a50',outline='#809bad',width=1)
 d.text((37,47),str(i+1),font=ImageFont.truetype(bold,17),fill='#e9f1f6')
 d.text((68,45),title,font=ImageFont.truetype(bold,22),fill='#ecf1f6')
 d.line((30,86,420,86),fill='#4b6075',width=1)
 d.rounded_rectangle((25,94,425,946),26,fill='#09111d',outline='#536b83',width=1)
 for k in range(3):d.rounded_rectangle((30+k*23,963,46+k*23,966),2,fill='#c8dce9' if k==i else '#42566b')
 d.text((113,955),'技と対象は、ATTACKの後に公開',font=ImageFont.truetype(sans,13),fill='#b4c6d6')
 layout=root/(name+'-layout.png');im.save(layout)
 mp4=root/(name+'.mp4')
 run(['-f','concat','-safe','0','-i',root/name/'frames.ffconcat','-loop','1','-i',layout,'-filter_complex_threads','1','-filter_complex','[1:v][0:v]overlay=30:98:shortest=1,fps=12,format=yuv420p','-an','-c:v','libx264','-crf','18','-preset','fast','-movflags','+faststart',mp4])
 print('Rendered',name,flush=True)
concat=root/'clips.ffconcat';concat.write_text('ffconcat version 1.0\n'+''.join("file '"+n+".mp4'\n" for n,_,_ in labels))
master=root/'stillveil-battle-guide.mp4';run(['-f','concat','-safe','0','-i',concat,'-c','copy','-movflags','+faststart',master])
for name in ['stillveil-battle-guide',*[n for n,_,_ in labels]]:
 gif=root/(name+'.gif')
 run(['-i',root/(name+'.mp4'),'-filter_complex_threads','1','-filter_complex','fps=7,scale=360:800:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle','-loop','0',gif])
 print(gif.name,round(gif.stat().st_size/1024/1024,2),'MiB',flush=True)
run(['-i',master,'-frames:v','1',root/'stillveil-battle-guide-poster.png'])

# A compact single-file version for itch.io's image uploader.
light=root/'stillveil-battle-guide-light.gif'
for fps,colors in [(6,96),(5,80),(5,64)]:
    graph=f'fps={fps},scale=320:712:flags=lanczos,split[a][b];[a]palettegen=max_colors={colors}:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle'
    run(['-i',master,'-filter_complex_threads','1','-filter_complex',graph,'-loop','0',light])
    if light.stat().st_size<3_000_000:break
else:raise RuntimeError('Guide GIF is still too large for the upload budget')
print(light.name,round(light.stat().st_size/1_000_000,2),'MB',flush=True)
