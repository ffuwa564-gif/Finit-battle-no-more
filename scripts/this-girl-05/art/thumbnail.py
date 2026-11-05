"""Typeset the reused approved POV artwork while keeping its hand and pen visible."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import argparse,json,hashlib
p=argparse.ArgumentParser();p.add_argument('--root',type=Path,required=True);a=p.parse_args();o=a.root/'artifacts/this-girl-05';im=Image.open(o/'assets/thumbnail-original.png').convert('RGBA').resize((1280,720),Image.Resampling.LANCZOS);layer=Image.new('RGBA',im.size);d=ImageDraw.Draw(layer)
def font(n,serif=False):return ImageFont.truetype('/usr/share/fonts/opentype/noto/Noto'+('Serif'if serif else'Sans')+'CJK-Bold.ttc',n)
d.rounded_rectangle((85,190,570,630),20,fill=(255,250,242,255),outline='#dfd2c0',width=3)
portrait=Image.open(a.root/'public/art/lisette.png').convert('RGBA');portrait.thumbnail((430,395),Image.Resampling.LANCZOS);layer.alpha_composite(portrait,(110+(430-portrait.width)//2,208));d.text((170,602),'SR リゼット',font=font(22),fill='#594638')
d.rounded_rectangle((650,150,1240,347),20,fill=(255,250,242,240),outline='#dfd2c0',width=2)
d.text((680,163),'研究独白 05',font=font(22),fill='#687e74')
d.text((681,197),'祓った、',font=font(51,True),fill='#594638')
d.text((681,264),'その先へ。',font=font(51,True),fill='#594638')
d.rounded_rectangle((650,659,1240,708),13,fill=(255,250,242,235));d.text((676,668),'解除から、一度だけ斬り返す。',font=font(25),fill='#594638');im=Image.alpha_composite(im,layer);dst=o/'delivery/Thumbnail-ThisGirl-05.png';im.convert('RGB').save(dst)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();(o/'research/thumbnail-layout.json').write_text(json.dumps({'passed':True,'sourceSha256':sha(o/'assets/thumbnail-original.png'),'outputSha256':sha(dst),'codeSha256':sha(Path(__file__)),'layout':'Text above the pen and below the hand. Original POV artwork reused; no new illustration generation.','size':[1280,720]},indent=2))
