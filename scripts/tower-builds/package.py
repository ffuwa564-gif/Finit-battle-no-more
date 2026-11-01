import hashlib,json,pathlib,shutil,subprocess,zipfile
from render import OUT,ROOT,RENDER,duration
from finish import TARGET
branch='downloads/tower1-19-builds';repo='https://github.com/ffuwa564-gif/Finit-battle-no-more';final=OUT/'STILLVEIL-Tower1-19Builds-720p.mp4'
validation=json.loads((TARGET/'Validation.json').read_text());assert validation['passed'] and validation['final']['fullyDecoded'] and validation['final']['bytes']==final.stat().st_size
credits='''音声：VOICEVOX:ずんだもん / VOICEVOX:四国めたん（ノーマル、ID 3 / 2）
VOICEVOX ENGINE 0.26.0
https://voicevox.hiroshiba.jp/term/
https://zunko.jp/con_ongen_kiyaku.html
立ち絵：東北ずん子・ずんだもんプロジェクト 公式配布素材 zunmon003 / met012
https://zunko.jp/con_illust.html
https://zunko.jp/guideline.html
音楽：甘茶の音楽工房（作曲：甘茶）「フィヨルドの澄んだ風」
https://amachamusic.chagasi.com/music_fjordnosundakaze.html
ゲーム映像・SE：STILLVEIL
一部のゲーム内イラスト・文章・プログラミング支援には生成AIを使用しています。
一部のキャラクターアニメーションにはRunwayを使用しています。
今回の動画は、仲間と装備を用意した検証用データで実アプリを収録しています。
戦闘の途中を省略し、操作待ち・報酬画面を保持して解説する場面があります。
'''
(TARGET/'Credits.txt').write_text(credits)
description='''【STILLVEIL】白亜の塔1階を19編成で攻略・解説！【ずんだもん・四国めたん】

連鎖、障壁の砲撃、吸収、睡眠・混乱・麻痺・魅了、再生、巻戻し、必殺ゲージ供給など。同じ白亜の塔第1層を、ずんだもんと四国めたんが19編成で攻略します。

ゲームはこちら（無料・ブラウザで遊べます）
https://fluffy3546.itch.io/stillveil

仲間と装備を用意した検証用データによる実アプリ収録です。入手までのプレイ記録ではありません。共通する支援役・記憶石を使う編成もあります。
画面の「成功数 / 60」は、固定した装備・操作方針で別の乱数60通りを試した結果です。誰でも同じ勝率になる保証や、最適な操作の確率を表すものではありません。
装備はT3〜T6。高いティアの装備が必要な構成は、準備難度も含めて紹介しています。
戦闘はゲーム内2倍速と抜粋。解説に合わせて操作待ちや結果画面を保持する場面があります。

■チャプター
'''+(TARGET/'Chapters.txt').read_text()+f'\n■編成・装備表、字幕、検証記録\n{repo}/tree/{branch}\n\n■クレジット\n'+credits+'\n#STILLVEIL #ずんだもん #四国めたん #VOICEVOX\n'
(TARGET/'Description.txt').write_text(description)
rawlink=f'{repo}/raw/refs/heads/{branch}/'+final.name
readme=f'''# STILLVEIL 白亜の塔・第1層 19編成攻略

[完成動画を再生・ダウンロード]({rawlink})

約{duration(final)/60:.1f}分、1280×720 / 30fps / H.264・AAC。ずんだもんと四国めたんの実況、実アプリの戦闘SE、日本語字幕付き。

- `Subtitles-ja.srt`：投稿用字幕
- `Chapters.txt`：チャプター
- `Description.txt`：投稿用の説明文とクレジット
- `Thumbnail.png`：1280×720のサムネイル
- `Builds.csv`：編成順・リーダー・石・ティア・roll・別乱数の成功数
- `Results.json` / `Native-Proofs.json.gz`：検証条件・全操作・戦闘記録
- `Validation.json` / `Review-Contact.png`：出力確認記録と画面一覧
- `Production-Inputs.zip`：台本・音声・制作スクリプト・検証記録
- `Gameplay-Excerpts.zip`：実アプリの収録映像・SE・収録時刻

制作コード：[{repo}/tree/video/tower1-build-showcase/scripts/tower-builds]({repo}/tree/video/tower1-build-showcase/scripts/tower-builds)

ゲームの基準コミット：`616a0747c4118a991770226d37347f34b31e2ec6`。
準備した検証用編成で、通常のルールによる全19編成の突破を確認しています。成功数は、決めた装備・操作方針による別乱数60通りの結果です。
一部の構成には共通の支援役・石があり、T3〜T6の育成後の装備を使います。

制作入力には公式立ち絵・音楽の単体ファイルを含めていません。立ち絵は `bootstrap.py` で公式配布先から取得し、音楽はゲームリポジトリに同梱されたものを使います。利用条件と表記は `Credits.txt` を参照してください。
'''
(TARGET/'README.md').write_text(readme)
def archive(name,paths):
 with zipfile.ZipFile(TARGET/name,'w',zipfile.ZIP_DEFLATED,compresslevel=6)as z:
  for path in paths:z.write(path,path.relative_to(ROOT))
 assert (TARGET/name).stat().st_size<99*1024**2,name+' exceeds GitHub file budget'
 print(name,(TARGET/name).stat().st_size,flush=True)
inputs=[*list((ROOT/'scripts/tower-builds').glob('*.py')),*list((ROOT/'scripts/tower-builds').glob('*.ts')),*list((ROOT/'scripts/tower-builds').glob('*.mjs')),*list((ROOT/'scripts/tower-builds').glob('*.txt')),ROOT/'docs/video-tower1-builds.md',OUT/'narration.json',OUT/'content.json',OUT/'Runtime.json',OUT/'search.json',*list((OUT/'proofs').glob('*.json')),*list((OUT/'speech').glob('*.wav'))]
inputs +=[TARGET/n for n in ['Builds.csv','Results.json','Native-Proofs.json.gz','Subtitles-ja.srt','Chapters.txt','Timeline.json','Credits.txt','Description.txt','Validation.json']]
archive('Production-Inputs.zip',inputs)
ids=[c['id']for c in json.loads((OUT/'narration.json').read_text())['chapters']if c['id']not in ['intro','outro']]
films=[]
for ident in ids:
 films +=[OUT/'capture'/(ident+suffix)for suffix in ['.mp4','.json','-start.png','-result.png']]
archive('Gameplay-Excerpts.zip',films)
shutil.copy2(final,TARGET/final.name)
shutil.copy2(OUT/'Runtime.json',TARGET/'Runtime.json')
hashes={p.name:{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size}for p in TARGET.iterdir()if p.is_file()and p.name!='Manifest.json'}
(TARGET/'Manifest.json').write_text(json.dumps({'sourceCommit':'616a0747c4118a991770226d37347f34b31e2ec6','videoSeconds':duration(final),'files':hashes},ensure_ascii=False,indent=2))
print('PACKAGED',len(hashes),'files',flush=True)
