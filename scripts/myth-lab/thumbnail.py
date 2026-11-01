"""Compose a clearly labeled proposal thumbnail with existing project art."""
from PIL import Image,ImageDraw,ImageEnhance,ImageFilter,ImageOps
from visuals import ROOT,ARTIFACTS,font,content_maps
OUT=ARTIFACTS;chars,assets=content_maps()
a=assets['novel-awakening-garden'];p=ROOT/'public'/a['path']
bg=ImageOps.fit(Image.open(p).convert('RGB'),(1280,720)).filter(ImageFilter.GaussianBlur(2));bg=ImageEnhance.Brightness(bg).enhance(.32).convert('RGBA')
for name,box in [('zunmon003',(0,200,340,710)),('met012',(940,200,1280,710))]:
 im=Image.open(OUT/'assets'/(name+'.png')).convert('RGBA');im.thumbnail((box[2]-box[0],box[3]-box[1]),Image.Resampling.LANCZOS);bg.alpha_composite(im,(box[0]+(box[2]-box[0]-im.width)//2,box[3]-im.height))
d=ImageDraw.Draw(bg)
def center(y,text,size,color):
 f=font(size,True);x=(1280-f.getlength(text))/2;d.text((x,y),text,font=f,fill=color,stroke_width=5,stroke_fill='#101723')
d.text((30,20),'STILLVEIL',font=font(30,True),fill='#e4ca98');d.rounded_rectangle((960,15,1250,75),16,fill='#633b35');d.text((987,23),'企画案・未実装',font=font(31,True),fill='#fff0da')
center(120,'神話と物語から',75,'#faf1dc');center(267,'次のスキル会議',91,'#e5ce98');center(420,'ずんだもん × 四国めたん',34,'#f5f4ed');center(526,'反論して、直して、遊びを変える。',34,'#bfe4e2')
(OUT/'delivery').mkdir(exist_ok=True);bg.convert('RGB').save(OUT/'delivery/Thumbnail.png')
