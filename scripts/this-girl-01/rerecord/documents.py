from pathlib import Path
import json,hashlib,shutil
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-01';R=O/'rerecord';D=O/'delivery';D.mkdir(exist_ok=True);t=json.loads((O/'render/timeline.json').read_text());repo='https://github.com/ffuwa564-gif/Finit-battle-no-more';branch='downloads/this-girl-01-v112'
rows=[]
for p in t['pages']:
 if p.get('chapter') and p['id']!='preview':rows.append((p['startFrame']/30,p['chapter']))
 if p['spec']['kind']=='battle-pause' and p['id']!='pause-target':rows.append((p['startFrame']/30,'停止解説：'+p['spec']['title']))
def tm(s):return f'{int(s)//60:02}:{int(s)%60:02}'
chap='\n'.join(tm(s)+' '+label for s,label in sorted(rows));(D/'Chapters.txt').write_text(chap+'\n')
(D/'README.md').write_text(f'''# この子で、勝ちたい。 #01 — ver1.12描画版・停止解説付き

[完成動画MP4](ThisGirl-01-v112.mp4) / [サムネイル](Thumbnail-ThisGirl-01.png) / [画面例](Preview.jpg)

- [台本](Script.md) / [字幕](Subtitles-ja.srt) / [投稿文](YouTube-Description.txt) / [チャプター](Chapters.txt)
- [変更内容と使用区間](Revision-Notes.md) / [研究報告（元の固定データ）](ResearchReport.md) / [クレジット](Credits.md)
- [再現手順](Reproduce.md) / [制作コード]({repo}/tree/video/this-girl-01-rerecord/scripts/this-girl-01/rerecord)
- [完成ファイルの映像・SE同期検査](Final-Media-QA.json) / [全61発話と停止画面の検査](Freeze-Voice-QA.json) / [ブラウザ再生検査](Browser-QA.json)

約{tm(t['durationFrames']/30)}。リケジョつむぎの静かな独白です。通常表示・ゲーム設定×1でA/Cの両編成を新規収録し、4か所で停止・枠囲み・実画面の拡大を入れました。

研究能力は **研究版・未公開仕様**。XRを含む全所持・最高級石を仮定した比較セーブです。通常の入手進行を紹介する映像ではありません。元の固定256シード研究データと「研究中」の結論を継承し、新しい統計的認定をしていません。公開版のバランス変更・mainのマージ・itch.ioへの配信は行っていません。

制作素材ZIPは番号付きpartを順に連結して展開します。原曲・生の合成音声・VOICEVOXモデルは同梱しません。同期を検査したPCM付き正規化MOVと独立のグラフ参照、台本・query・コード・出典を収録しています。SHA256SUMS.txtで照合してください。
''')
(D/'Revision-Notes.md').write_text('''# ver1.12再収録・解説強化

- 公開側の描画・音声準備の最適化を、隔離したサクヤ研究版へ統合。戦闘規則のsrc/domain・src/applicationは元研究ブランチと同一。
- 元と同じA/Cの編成・石・操作・シードを実アプリで再構成し、全イベント・最終HP・薬・乱数が一致した。256シードの研究全体を新たに実施したとは主張しない。
- 動きを抑える旧録画設定では数字がほぼ表示されないため、その素材は採用せず、OS設定をno-preference・ゲーム設定×1へ直して両方を収録。
- 回復役の差替え枠、守られるアストライア、実吸収と花びら、返礼を含む合計ダメージを止めて説明。枠と拡大像は実録画の該当frameへ束縛する。
- 70吸収→82%蓄積、主攻撃793＋返礼650＝表示合計1443。数字は同じ一戦のイベント記録で、追加の650を二重加算しない。トドメとも勝率上昇の証明とも説明しない。

## 音声同期の範囲

フル演出のサクヤ素材は、元録画全域の白黒マーカー検査で最大81.667msとなり、80ms基準に不合格。元の不合格を保持し、合格へ書き換えていない。録画を共通時刻・物理48kHzの順序で正規化したことと、使用可の認定は別。

実際に使う区間は先に固定し、独立した実グラフPCMと全eligible cue・境界tailを照合した。初版の返礼カットは16msの小さな音の末尾から始まり、相関0.52で不合格。開始位置を24frame前へ広げて音の途中で切らない構成に修正し、全区間を再測定した。除外による合格にはしていない。

各ショットに一つの固定整数sample補正を用いる。音程・テンポ・波形間隔・順番は変えず、cueごとの補正や音の再演はしない。使用区間の全残差は約6.7ms以内・最低相関0.83以上。これは使用区間に限る認定であり、元録画全域を合格としたものではない。

さらに、配布する完成MP4そのものの主要カット始中末の連続9frameと実SE、全61発話、4つの停止箇所と拡大像、全編デコード、Chromium/WebKit再生を別々に検査する。未達なら配布しない。
''')
old=(R/'reference/Credits.md').read_text();(D/'Credits.md').write_text(old+'\n\n## 今回の再収録版\n\n音声はVOICEVOX Coreによる春日部つむぎ(style8)の再合成。実バージョン・モデルSHA・query・条件は制作ZIPのnarration.json / research/rights/voice-engine.jsonに記録。旧版のEngine0.26.0合成という記載は今回の音声に適用しません。慈雨の発音はジ・ウのmoraを明示しています。停止解説の小さな研究者画像は既存ビルド研究日誌#00の生成素材を再利用し、本人の出演を意味しません。追加のRunway・原画・音楽生成はしていません。\n')
(D/'ResearchReport.md').write_text((R/'reference/ResearchReport.md').read_text()+'\n\n本再収録はこの固定研究の再認定ではありません。描画版の実アプリ同一性はEngine-Invariance.json、映像は別の完成ファイル検査で確認します。\n')
(D/'Reproduce.md').write_text('''# 再現

1. video/this-girl-01-rerecordの制作コードを取得。素材partを番号順に連結し、manifestのSHAを照合してrepoのルートへ展開する。原曲、VOICEVOXモデル・生音声は含まない。
2. 元の固定研究はresearch/sakuya-this-girl-01の2e200b4。ゲームの収録用srcは264ef08。公開側ver1.12最適化と隔離した研究能力を統合している。VITE_SAKUYA_RESEARCH=1で起動し、通常セーブとは分ける。
3. prepare.mts→full-proofs.mtsで同じ条件を再構成。record-native.mjs reference-full 1 / sakuya-full 1はX11/Pulseを同時収録する。通常表示・ja-JP。capture/README.mdの常時接続と時刻検査を守る。
4. 一般の合格素材はnative-clean.py。失敗素材のnative-clean-used.pyは失敗を保存した未承認正規化だけで、使用の合格ではない。used-intervals.json→measure-used-shots.py→plan_audio_offsets.pyで全対象音を測定する。相関不足・80ms超過を隠さない。今回の元の区間失敗もrerecord/interval-v1へ保存。
5. narrationの元はrerecord/story.json。ローカルVOICEVOX Core、0.vvm、辞書、ONNX Runtimeを別途用意してsynth-core.pyを実行。runtimeの場所は環境に合わせる。queryを参照し慈雨はジ・ウを維持する。
6. 曲は甘茶の音楽工房「夢」。editor/fetch_music.pyで公式から取得し、保存済みSHAを確認する。原曲を単体で配布しない。
7. 同梱のeditorial.jsonは最終条件。差し戻し前の区間を誤って使わない。plan.py→mixer.py→render.py。すべて30fps・48kHz、一つの共通sample0へ混合し最終AACは一度だけ。
8. 完成MP4へcapture/finished-qa.pyとrerecord/extra-qa.pyを実行。rerecord/browser.mjsでChromium/WebKitをfresh playerで検査し、全体デコード・図・字幕・頭の目視も行う。再encode後は以前の報告を流用しない。

今回の制作は実装済み能力と既存研究の説明です。元の256シードデータ、今回の同一実戦再生、動画QAを混同しない。認定は研究中のまま。
''')
(D/'YouTube-Description.txt').write_text('【この子で、勝ちたい。#01】サクヤヒメの「守った力」を追う｜停止解説つき・ver1.12再収録\n\n好きな子を、最後まで選べるRPGを。\nリケジョつむぎがコノハナサクヤヒメの働きを研究します。\n今回は最適化後の描画で実戦を撮り直し、大切な所では一時停止。枠と拡大で、何が起きたかを追えるようにしました。\n\n研究版・未公開仕様。XRを含む全所持・最高級の石を仮定した比較です。前回の固定研究データと「研究中」の判定を継承し、今回1戦だけで採用価値や勝率上昇を証明したとは扱いません。\n\nゲーム：https://fluffy3546.itch.io/stillveil\n動画・台本・研究資料：'+repo+'/tree/'+branch+'\n\n【チャプター】\n'+chap+'\n\nVOICEVOX:春日部つむぎ\nBGM：甘茶の音楽工房「夢」（作曲：甘茶）\nhttps://amachamusic.chagasi.com/music_yume.html\n春日部つむぎ：https://tsumugi-official.studio.site/\nイラスト・研究室等に既存の生成AI素材を使用。数学・研究結果の詳細はGitHubの資料へ。\n\n#STILLVEIL #春日部つむぎ #この子で勝ちたい\n')
print('Documents written',t['durationFrames']/30,'seconds')
