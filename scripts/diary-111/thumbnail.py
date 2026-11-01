import pathlib,json,sys
from PIL import Image,ImageDraw,ImageFont
P=pathlib.Path('artifacts/diary-111');sys.path.insert(0,'scripts/diary-111');from render import font,sprite
im=Image.new('RGBA',(1600,900),'#0b1424');d=ImageDraw.Draw(im)
d.rectangle((20,20,1580,880),outline='#d9c195',width=4)
d.text((65,55),'STILLVEIL  白亜の塔 攻略日記',font=font(43,True),fill='#d9c195')
d.text((65,135),'Part1.1.1',font=font(65,True),fill='white')
d.rounded_rectangle((300,295,1300,665),radius=24,fill='#1a3045',outline='#7a9cb0',width=3)
d.text((355,325),'低レアに、仕事を。',font=font(70,True),fill='#d5f2af')
d.text((355,435),'白花を、実戦へ。',font=font(70,True),fill='#f5d6e8')
d.text((355,565),'巻戻し × フィオ／選んだ理由まで解説',font=font(34,True),fill='#e9e6dd')
sprite(im,P/'assets/zunmon003.png',(20,345,285,485));sprite(im,P/'assets/met002_cr.png',(1300,345,285,485))
d.text((340,740),'第一層・別ビルド攻略／実アプリ収録',font=font(36,True),fill='#d9c195');d.text((340,800),'固定条件で比較・新要素の実回復も検証',font=font(30),fill='#bdcddd')
im.convert('RGB').save(P/'delivery/Thumbnail.png')
