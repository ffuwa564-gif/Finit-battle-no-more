from pathlib import Path
import json,hashlib,zipfile,subprocess
from PIL import Image
B=Path(__file__).resolve().parent;ROOT=B.parents[1];sysroot=ROOT
T=json.loads((B/'timeline.json').read_text());C=json.loads((B/'catalogue.json').read_text());R=json.loads((B/'reference/source-contract.json').read_text())
def sha(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  while x:=f.read(1048576):h.update(x)
 return h.hexdigest()
assets=[];archives={}
for path in (B/'reference').glob('Production-Materials-*.zip'):
 digest=sha(path)
 with zipfile.ZipFile(path)as z:
  for name in z.namelist():archives[name]=(path.name,digest)
for p in sorted((B/'assets').glob('*.png')):
 im=Image.open(p);item={'file':'assets/'+p.name,'sha256':sha(p),'width':im.width,'height':im.height,'mode':im.mode}
 member='artifacts/build-diary-05/assets/'+p.name
 if member in archives:
  name,digest=archives[member];item['source']={'url':'https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/'+R['sourceEpisode05']+'/'+name,'archiveSha256':digest,'member':member}
 else:item['source']={'kind':'actual game UI capture','gameCommit':R['gameSource'],'record':'reference/ui-capture.json'}
 if im.mode=='RGBA':item['strongAlphaBounds']=im.getchannel('A').point(lambda a:255 if a>128 else 0).getbbox()
 assets.append(item)
(B/'Assets.json').write_text(json.dumps(assets,ensure_ascii=False,indent=2))
source=Path('/workspace/STILLVEIL-part0-source');art=[]
for path in sorted(set(c['art']for c in C['characters'])):
 p=source/'public'/path;im=Image.open(p);art.append({'path':path,'sha256':sha(p),'width':im.width,'height':im.height,'url':'https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/'+R['gameSource']+'/public/'+path})
(B/'External-Game-Assets.json').write_text(json.dumps({'source':R['gameSource'],'assets':art},ensure_ascii=False,indent=2))
reproduce='''# 再現手順

1. ソース用ブランチ `video/build-research-diary-00` を取得します。
2. Production-Materials.zip をリポジトリのルートへ展開します。`artifacts/build-diary-00`へ既存素材・合成済みの各発話・台本・制作コードが復元されます。VOICEVOXモデルと原曲MP3は含みません。
3. PythonのPillow/numpy/scipy、ffmpeg/ffprobe、Node依存とNoto Sans CJKフォントを用意してください。`tools/media-sync/`はソースブランチにあります。
4. `git worktree add --detach /workspace/STILLVEIL-part0-source GAME_SHA` でver1.10を取り出します。別の場所なら `STILLVEIL_SOURCE` を指定してください。原画を外部リンクで取り出す場合はExternal-Game-Assets.jsonのSHAを必ず照合します。
5. BGM「フィヨルドの澄んだ風」は公式配布元と利用条件を確認して取得し、プロジェクトの `public/audio/fjordnosundakaze.mp3`へ置きます。既存ゲームチェックアウトにも同じ音源が入っています。
6. `python artifacts/build-diary-00/rebase-inputs.py` で展開先の発話パスを付け直します。
7. `python artifacts/build-diary-00/prepare.py` → `mix.py` → `render.py` → `fit-github.py` → `audit.py` → `write-documents.py` の順で実行します。各コマンドには同じディレクトリの接頭辞を付けます。
8. `python artifacts/build-diary-00/finalize-quality.py` で完成動画の同期・全資料カード・Chromium/WebKit再生・全体デコード・音量を検査します。Playwrightの両ブラウザとWebKit依存ライブラリが必要です。スクリプト内の依存ライブラリ位置を環境へ合わせ、最後に完成ファイルそのものを目視検査してください。再書き出し前の検査結果を再利用しません。

物語を変更して再合成する場合は、VOICEVOX CoreのPython環境・OpenJTalk辞書・モデルが別途必要です。`synth.py`のローカルランタイム位置を環境に合わせ、話者3/2/8とライセンスを確認してください。発話キャッシュはテキスト・コード・条件のハッシュで判定します。

`export-data.ts`は作成時の固定1.10チェックアウトを使う参照コードです。別環境では冒頭の絶対importをその固定チェックアウトへ合わせるか、同封のcatalogue.jsonとゲームソースを照合してください。現在のmainから効果を再採取して1.10のデータと混ぜないでください。

この回は戦闘検証・バランス改修を実施していません。新しい勝率・認定データはありません。UI画像は固定1.10の初期セーブの実画面です。既存回の資料・コード・素材を参照しましたが、全動画を視聴分析したという主張ではありません。
'''.replace('GAME_SHA',R['gameSource']);(B/'Reproduce.md').write_text(reproduce)
readme=f'''# ビルド研究日誌 #00 — はじめての方へ

**本編8分55秒でいったん解散。資料編込み32分44秒。**

- [全編・720p MP4](STILLVEIL-BuildResearchDiary-00-720p.mp4)
- [全編・1080p MP4](STILLVEIL-BuildResearchDiary-00-1080p.mp4)
- [サムネイルPNG](Thumbnail-BuildResearchDiary-00.png) / [画面プレビュー](Preview.jpg)
- [台本](Script.md) / [字幕](Subtitles-ja.srt) / [チャプター](Chapters.txt) / [YouTube投稿文](YouTube-Description.txt)
- [全キャラ・全石・指揮の読み物](Complete-Catalogue.md) / [各カードの開始位置](Catalogue-Index.csv)
- [#06以降の研究方針と出典](Research-Direction.md)
- [再現用素材](Production-Materials.zip) / [制作コード](https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/video/build-research-diary-00/scripts/build-diary-00) / [再現手順](Reproduce.md)
- [完成動画の同期検査](Finished-Movie-Sync.json) / [ブラウザ](Validation.json) / [デコード](Decode-Validation.json) / [クレジット](Credits.md)

ゲーム未プレイの人向けに、スキル・リーダースキル・記憶石・指揮を図で説明します。指揮で回復や障壁を自由に操作できるとは説明しません。資料編はBGMのみで、全75登録形態・記憶石13種類20変種・特性・Tier・必殺技の役割契約・指揮仕様を掲載しています。75は姿違いとクリーチャーを含む登録形態数であり、全員が通常加入できるという意味ではありません。

実装説明の基準は **ver1.10.0 / {R['gameSource']}**。#06以降の方針は数理研究文書と今回の制作指示に基づく紹介です。#01〜05を新基準で認定し直した結果ではなく、今回は新しい能力の実装、対照実験、勝率の測定、認定を行っていません。ゲーム本体・itch.ioの配信は変更していません。

静かな本編の後、見たい人だけ一時停止・チャプターで資料をご覧ください。1080p版・720p版とも配布ブランチの通常MP4です。ソフトウェアの新バージョン公開ではありません。
''';(B/'README.md').write_text(readme)
# A relocatable extraction of already-generated speech; no source music in ZIP.
(B/'rebase-inputs.py').write_text("from pathlib import Path\nimport json\nB=Path(__file__).resolve().parent\np=B/'narration.json';n=json.loads(p.read_text())\nfor v in n['lines']:v['source']=str(B/'speech'/Path(v['source']).name)\np.write_text(json.dumps(n,ensure_ascii=False,indent=2))\nprint('Paths restored; regenerate timeline and all final-media audits.')\n")
# Export subtitles with the same at-most-two-line wrap as the burned captions.
from visuals import wrap
srt=[]
def st(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
for i,v in enumerate(T['voices']):srt +=[str(i+1),st(v['at'])+' --> '+st(v['at']+v['duration']),*wrap(v['text'],48,1530),'']
(B/'Subtitles-ja.srt').write_text('\n'.join(srt))
# Exact original speech is redistributable generated VOICEVOX output; music and model files are omitted.
files=[]
files+=list(B.glob('*.py'))+[B/'export-data.ts',B/'capture-ui.ts',B/'verify.ts']
files+=[B/name for name in ['story.json','narration.json','catalogue.json','Assets.json','External-Game-Assets.json','Reproduce.md','Credits.md']]
files+=list((B/'assets').glob('*.png'))+list((B/'speech').glob('*.wav'))
files+=list((B/'reference').glob('*.md'))+[B/'reference/source-contract.json',B/'reference/ui-capture.json',B/'reference/previous-series.json']
with zipfile.ZipFile(B/'Production-Materials.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6)as z:
 for p in files:z.write(p,Path('artifacts/build-diary-00')/p.relative_to(B))
assert(B/'Production-Materials.zip').stat().st_size<95*1024*1024
print('Packaged',len(files),'files',round((B/'Production-Materials.zip').stat().st_size/1024/1024,1),'MiB')
