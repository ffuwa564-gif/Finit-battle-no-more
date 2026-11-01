from pathlib import Path
from PIL import Image,ImageDraw
from visuals import font,paste
O=Path('artifacts/athena-council');im=Image.new('RGBA',(1920,1080),'#101925');d=ImageDraw.Draw(im)
d.polygon([(0,0),(1920,0),(1920,1080),(1250,1080),(1150,0)],fill='#38202b')
d.rectangle((22,22,1898,1058),outline='#dac395',width=4)
d.text((70,60),'STILLVEIL  ／  一強対策・設計会議',font=font(50,True),fill='#dac395')
d.text((70,190),'またアテナ？',font=font(143,True),fill='#ffd0c4')
d.text((80,395),'その強化、',font=font(85,True),fill='white');d.text((80,510),'誰が得するのだ？',font=font(85,True),fill='white')
paste(im,'zunmon003.png',(75,665,210,320));paste(im,'met002_cr.png',(330,665,210,320));paste(im,'usagi_s005.png',(1300,200,540,800))
d.rounded_rectangle((640,745,1260,902),radius=20,fill='#293846',outline='#d6b786',width=2)
d.text((675,772),'中国うさぎ、お怒りです。',font=font(41,True),fill='#ffb6ae');d.text((675,833),'分担 × 猶予 ／ 未実装案を検討',font=font(30,True),fill='#d6e3e6')
d.text((80,1008),'ずんだもん × 四国めたん × 中国うさぎ',font=font(35,True),fill='#dac395')
im.convert('RGB').save(O/'delivery/Thumbnail.png')
