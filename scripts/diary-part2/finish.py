import pathlib,json,subprocess,hashlib,shutil,sys
from PIL import Image,ImageDraw,ImageOps,ImageFont
from visuals import font,sprite
from package import pack,stamp
ROOT=pathlib.Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-part2';D=O/'delivery';movie=D/'STILLVEIL-TowerDiary-Part2.mp4'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def finish():
 actual=digest(movie)
 for name in['Finished-Movie-Sync.json','Validation.json']:
  r=json.loads((D/name).read_text());assert r['passed']and r['finishedSha256']==actual,name
 pack();n=json.loads((O/'timeline-narration.json').read_text());contact=Image.new('RGB',(1600,900))
 for i,id in enumerate(['series-op','opening','ultimate','battle3']):
  ch=next(c for c in n['chapters']if c['id']==id);t=18.2 if id=='series-op'else ch['start']+(3 if id=='ultimate'else min(13,ch['duration']/2));p=O/f'research/preview-{id}.png';subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(movie),'-frames:v','1',str(p)],check=True);contact.paste(Image.open(p).resize((800,450)),(i%2*800,i//2*450))
 contact.save(D/'Preview.jpg',quality=91)
 # Associated video thumbnail. Official sprites are only distributed as part of this composition.
 im=Image.new('RGBA',(1280,720),'#0a1320');d=ImageDraw.Draw(im)
 serif=lambda size:ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc',size)
 for radius in[215,255,295,335]:d.ellipse((640-radius,375-radius,640+radius,375+radius),outline='#27394a',width=1)
 d.polygon([(640,80),(563,640),(718,640)],fill='#142132')
 import random
 rng=random.Random(23)
 for _ in range(43):
  x=rng.randrange(25,1255);y=rng.randrange(25,665);r=rng.choice([1,1,2]);d.ellipse((x-r,y-r,x+r,y+r),fill='#a89d7b')
 d.text((535,98),'S T I L L V E I L',font=font(23,True),fill='#b3cede');d.line((399,153,881,153),fill='#a5926e',width=1)
 d.text((436,171),'白亜の塔',font=serif(91),fill='#f4f2e5');d.text((434,282),'攻略日記',font=serif(91),fill='#e5d2a3');d.line((399,404,881,404),fill='#a5926e',width=1)
 d.text((518,429),'T O W E R  D I A R Y',font=font(18,True),fill='#b3cede');d.text((475,486),'第二層へ',font=serif(49),fill='#f4f2e5');d.text((391,558),'ルネットの必殺、見せます。',font=font(31,True),fill='#e5d2a3')
 d.rounded_rectangle((46,40,263,118),radius=14,fill='#142132',outline='#ccb78c',width=2);d.text((69,51),'PART 2',font=font(43,True),fill='#e5d2a3')
 d.rounded_rectangle((971,108,1254,180),radius=22,fill='#eef1d9',outline='#b9ca91',width=3);d.text((992,120),'つむぎ参戦！',font=font(34,True),fill='#324832')
 for who,x,y,w,h in[('z',25,250,220,402),('m',219,335,175,321),('t',986,215,255,450)]:
  sp=sprite(who,w,h);im.alpha_composite(sp,(x+(w-sp.width)//2,y+h-sp.height))
 d.text((365,675),'VOICEVOX:ずんだもん / 四国めたん / 春日部つむぎ',font=font(18,True),fill='#aab9c7');im.convert('RGB').save(D/'Thumbnail.png')
 (D/'README.md').write_text(f'''# 白亜の塔 攻略日記 Part2 — 第二層とルネットの必殺技\n\n![Part2 サムネイル](Thumbnail.png)\n\n共通OP v4（23秒）を冒頭に収録。サムネイルもOPの星空・軌道線・金とアイボリーの文字に合わせています。\n\n完成動画 **{stamp(n['duration'])} / 1920×1080 / 30fps / 48kHz**。\nずんだもん・四国めたん・春日部つむぎの三人で、第二層「旅立ちの残響」に挑戦します。Part1.1の敵調査→準備→試行→成功→振り返りの構成を参考に制作。\n\n[動画をダウンロード](https://github.com/ffuwa564-gif/Finit-battle-no-more/raw/refs/heads/downloads/tower-diary-part2/STILLVEIL-TowerDiary-Part2.mp4) / [字幕](Subtitles-ja.srt) / [台本](Script.md) / [章一覧](Chapters.txt) / [サムネイル](Thumbnail.png)\n\n[ゲームを無料で遊ぶ](https://fluffy3546.itch.io/stillveil)\n\n## 内容\n\n通常ルネットを迎えた最初の挑戦は40Rで時間切れ。覚醒に加え、ノクスを残してフィオと交代し、先頭への予約操作を見直して再挑戦。25R、薬3個、4人生存でクリアしました。妖精4回・戦場の花11回も利用しています。ルネットの必殺技は実機映像を再掲し、連射・着弾・最後の一撃にリアクションを合わせています。\n\n開始データはPart1.1.1で明示した比較用の所持条件を継続したもので、新規プレイやPart1.1そのものの実終了セーブではありません。既存T4装備を引き継ぎ、今回の素材・加入・覚醒・T1巻戻し製作は通常のゲーム処理で実施。9戦の入力を再実行して結果一致を検証しました。最適編成・完全放置・アテナ依存解消・覚醒単独の効果を主張するものではありません。\n\n## 同梱資料\n\n- [開始条件・素材・音声同期の方法](Methods.md)\n- [9戦のネイティブ再実行検証](Native-Verification.json)\n- [配布完成動画の実フレーム・実SE・3話者の照合](Finished-Movie-Sync.json)\n- [全体デコードとChromium/WebKit再生・シーク](Validation.json)\n- [制作入力集](Production-Inputs.zip)：台本・制作コード・実戦証跡・音声FLAC\n- [録画元](Recording-Sources.zip)：H.264＋可逆FLACのMKV、録画時刻・同期データ\n- [動画説明文](YouTube-Description.txt)、[クレジット](Credits.md)、[元ゲーム版](Source-Version.txt)\n\n## 再編集\n\n制作ソース：[`video/tower-diary-part2`](https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/video/tower-diary-part2)。そのリポジトリのルートへ2つのZIPを展開し、Node依存・Pythonのnumpy/Pillow/scipy・FFmpegを用意。VOICEVOX0.26.0をlocalhost:50021へ起動して`python scripts/diary-part2/bootstrap.py`を実行すると、公式立ち絵の取得と音声・録画元の可逆復元を行えます。その後`python scripts/diary-part2/render.py`、`python scripts/diary-part2/audit.py`、`node scripts/diary-part2/validate.mjs`で再制作・照合できます。ブラウザ検査用にViteをport4328で起動してください。立ち絵や楽曲の単体再配布は含みません。各権利元の利用規約はCredits.mdを確認してください。\n''')
 for p in D.iterdir():
  if p.is_file():assert p.stat().st_size<100*1024**2,(p.name,p.stat().st_size)
 (D/'Checksums.sha256').write_text(''.join(digest(p)+'  '+p.name+'\n'for p in sorted(D.iterdir())if p.is_file()and p.name!='Checksums.sha256'))
 print('DELIVERY READY',stamp(n['duration']),len(list(D.iterdir())),'files',flush=True)
if __name__=='__main__':finish()
