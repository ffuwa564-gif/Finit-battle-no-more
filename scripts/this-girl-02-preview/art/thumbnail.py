from pathlib import Path
from PIL import Image,ImageDraw
import visuals as v
O=v.O;im=Image.open(O/'assets/thumbnail-original.png').convert('RGBA');im.thumbnail((1280,720),Image.Resampling.LANCZOS);out=Image.new('RGBA',(1280,720),v.PAPER);out.alpha_composite(im,((1280-im.width)//2,(720-im.height)//2));d=ImageDraw.Draw(out)
# Keep hair, pen, original notebook and Miette reference visible; clean typesetting stays on the blank page.
d.rounded_rectangle((675,200,1230,585),22,fill=(255,250,242,237),outline=v.EDGE,width=2)
v.text(d,(710,225),'研究独白 02',25,v.SAGE,True)
v.text(d,(710,290),'その盾を、',58,v.INK,True,serif=True)
v.text(d,(710,377),'ほどいても',58,v.INK,True,serif=True)
v.text(d,(710,464),'いいのかな。',58,v.ROSE,True,serif=True)
v.text(d,(725,550),'ミエットと、守りの使い道。',24,v.INK)
p=O/'delivery/Thumbnail-ThisGirl-02-Preview.png';out.convert('RGB').save(p)
print(p)
