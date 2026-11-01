from PIL import Image,ImageDraw,ImageEnhance,ImageFilter
from render import OUT,ROOT,CHARS,ASSETS,font,paste_fit,GOLD
wolf=CHARS['pale-wolf'];path=ROOT/'public'/ASSETS[wolf['artId']]['path'];bg=Image.open(path).convert('RGB');scale=max(1280/bg.width,720/bg.height);bg=bg.resize((round(bg.width*scale),round(bg.height*scale)));bg=bg.crop(((bg.width-1280)//2,0,(bg.width+1280)//2,720)).filter(ImageFilter.GaussianBlur(2));bg=ImageEnhance.Brightness(bg).enhance(.38).convert('RGBA')
paste_fit(bg,Image.open(OUT/'assets/zunmon003.png'),(0,188,360,532));paste_fit(bg,Image.open(OUT/'assets/met012.png'),(934,188,346,532));d=ImageDraw.Draw(bg)
def text_center(y,text,size,color):
 f=font(size,True);x=(1280-f.getlength(text))/2;d.text((x+4,y+5),text,font=f,fill='#020710',stroke_width=7,stroke_fill='#020710');d.text((x,y),text,font=f,fill=color,stroke_width=1,stroke_fill='#151a23')
d.text((32,18),'STILLVEIL',font=font(26,True),fill=GOLD);d.line((32,61,1248,61),fill=GOLD,width=2)
text_center(83,'白亜の塔 1F',90,'#fbf3e3');text_center(303,'19編成で突破',81,'#e9c98c');text_center(447,'ずんだもん × 四国めたん',32,'#f1e9f4')
text_center(560,'連鎖・障壁・状態異常・必殺供給',27,'#f1f4f5')
(OUT/'delivery').mkdir(exist_ok=True);bg.convert('RGB').save(OUT/'delivery/Thumbnail.png')
