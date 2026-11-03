from pathlib import Path
import json,hashlib,csv
B=Path(__file__).resolve().parent;T=json.loads((B/'timeline.json').read_text());C=json.loads((B/'catalogue.json').read_text());R=json.loads((B/'reference/source-contract.json').read_text())
def clock(t):
 n=int(t);return f'{n//3600:02}:{n//60%60:02}:{n%60:02}'if n>=3600 else f'{n//60:02}:{n%60:02}'
def srttime(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
script=['# ビルド研究日誌 #00 — はじめての方へ','',f"実装基準：ver1.10.0 / {C['gameCommit']}",'本編の後に解散し、以降はBGMのみの全資料一覧。研究独白の制作依頼そのものを実行した回ではありません。','']
last=None;srt=[]
for i,v in enumerate(T['voices']):
 if last!=v['chapter']:script+=['','## '+v['chapterTitle'],''];last=v['chapter']
 script.append({'t':'つむぎ','z':'ずんだもん','m':'めたん'}[v['speaker']]+'：'+v['text']);srt +=[str(i+1),srttime(v['at'])+' --> '+srttime(v['at']+v['duration']),v['text'],'']
(B/'Script.md').write_text('\n'.join(script));(B/'Subtitles-ja.srt').write_text('\n'.join(srt));chapters='\n'.join(clock(c['atFrame']/30)+' '+c['title']for c in T['chapters']);(B/'Chapters.txt').write_text(chapters+'\n')
lines=['# ver1.10 全キャラ・記憶石・指揮資料','',f"固定ソース：{C['gameCommit']}",'全75登録形態。通常加入できるという意味ではなく、姿違い・クリーチャーを含みます。','']
for c in C['characters']:
 lines+=['## '+c['name']+' / '+c['id'],f"{c['rarity']}・{c['role']}・定数{c['strength']:.1f}・指揮負荷{c['commandCost']}"]
 for s in c['skills']:lines+=['- '+s['name']+'：'+s['description']]
 lines+=['- リーダー：'+c['leader'],'- 必殺技：'+c['ultimate']['name']+'：'+c['ultimate']['description'],'']
lines+=['# 全記憶石13種類・20変種','通常品は強度80、追加特性なしの表示例。固定品は元の固定値。','']
for g in C['gems']:lines+=['## '+g['name'],g['description'],g['rollDescription'],'付与可能特性：'+' / '.join(g['supportedTraits']),'']
lines+=['# 追加特性','']+[f"- {v['name']}：{v['description']}"for v in C['gemTraits'].values()]+['','# 指揮',C['commandDescription']]
(B/'Complete-Catalogue.md').write_text('\n'.join(lines))
with (B/'Catalogue-Index.csv').open('w')as f:
 w=csv.writer(f);w.writerow(['kind','id','name','start','duration'])
 for item in T['pictures']:
  if item['kind']in ['character','gem','ultimate','reference']:w.writerow([item['kind'],item['id'],item['id'],clock(item['atFrame']/30),item['frames']/30])
policy='''# #06以降の方針 — 今回は説明のみ

#01〜05は旧基準の試作条件に関する研究記録であり、今回の統一モデルで全員を再審した結果ではありません。個別の証拠や失敗例はそのまま保存し、過去の試作認定を新基準の「検証済み」に自動変換しません。

今後は、その子がいなければ勝てない専用ステージの存在を認定目標とせず、共通の既存ステージで、全所持・最高級石の環境にも採用価値を残せるかを評価する予定です。新しい敵の専用接待条件を足して補うことはしません。

提供された制作指示を踏まえた基本目的：

\\[
\\min_{\\theta}^{\\mathrm{lex}}(N_{\\mathrm{obsolete}},N_{\\mathrm{dominated}},D_{\\mathrm{dependency}},-N_{\\mathrm{viable\\ builds}},-C_{\\mathrm{synergy}})
\\]

先に用済み・上位互換・固定依存を減らし、そのうえで有効なビルドと相乗効果を増やす辞書式の設計目標です。この動画では最適化を実行しておらず、値や成功結果を記載していません。

- 内側では本人と代替側の双方について、同じ予算で石・LS・合法操作を探索する。
- 同じ3人コアへの差し替え、固有効果の中立化、高レアとの連携、他キャラへの影響を区別する。
- T3/T4/T6の育成価値を実測し、高Tierの必勝を仮定しない。
- 研究用・選抜用・未使用確認用の乱数を分け、原則200以上の確認条件、統計的不確実性、多重比較に配慮する。
- 勝率だけで認定しない。ラウンド・薬・全員生還と固有の利益を評価する。
- 探索の最良既知値は数学的な全体最適値の証明ではない。有限試験から真の全状態上位互換を断定しない。
- 未検証・不合格・研究中を区別し、未達成を成功として演出しない。
- 公開版の実装、LABの試作、設計候補を区別する。

サクヤヒメの桜の返礼・花宴の循環、軍議の栞などは今回実装していません。今回はver1.10の入口と、今後の研究独白「この子で、勝ちたい。」の方針紹介です。新しい勝率・比較実験・認定はありません。

参照する原典：
'''
for name in ['combat-portfolio-research.md','portfolio-optimization-v02.md','endgame-invariance-v03.md']:policy+='\n- https://github.com/ffuwa564-gif/Finit-battle-no-more/blob/'+R['researchDocumentsSource']+'/docs/'+name
(B/'Research-Direction.md').write_text(policy+'\n')
credits='''# クレジット

- ゲーム：STILLVEIL — 静謐の残響。実装紹介基準ver1.10.0。
- 音声：VOICEVOX:春日部つむぎ / VOICEVOX:ずんだもん / VOICEVOX:四国めたん（style 8 / 3 / 2）。ローカルVOICEVOX Coreと0.vvmで合成。実際の版とモデルSHAはnarration.jsonに記録。
- https://voicevox.hiroshiba.jp/
- 東北ずん子・ずんだもんプロジェクト：https://zunko.jp/ / https://zunko.jp/guideline.html
- 春日部つむぎ：https://tsumugi-official.studio.site/
- 立ち絵・研究室：ビルド研究日誌#05から既存のAI生成素材を再利用。メガネの研究者つむぎは架空の役割であり、音声提供者本人の出演・発言ではありません。
- BGM：甘茶の音楽工房「フィヨルドの澄んだ風」（作曲：甘茶） https://amachamusic.chagasi.com/music_fjordnosundakaze.html
- ゲーム原画：既存のプロジェクト生成素材。新しい原画・Runway動画・音楽の生成は行っていません。
- 書体：Noto Sans CJK（SIL Open Font License）。
- 台本・図表・編集コード：AI支援。

音楽原曲・VOICEVOXモデル・公式立ち絵原本を単体で再配布しません。再現時は各公式配布元と利用条件を確認してください。派生素材の出典とハッシュはAssets.jsonに記録します。
''';(B/'Credits.md').write_text(credits)
intro='''【ビルド研究日誌 #00】はじめての方へ｜スキル・リーダー・記憶石・指揮を知る

ゲーム未プレイでも研究日誌についていけるよう、STILLVEIL ver1.10の4要素を図で整理しました。
本編の終わりでいったん解散。その後はBGMのみで全75形態、記憶石13種類・20変種、特性と指揮仕様の資料が流れます。一時停止やチャプターでどうぞ。

#06以降は研究独白「この子で、勝ちたい。」の方針へ合わせる予定です。過去回を新基準で認定し直した結果ではなく、今回は新しい能力の実装・実戦比較・勝率の発表はありません。

STILLVEILを遊ぶ： https://fluffy3546.itch.io/stillveil

【チャプター】
''';intro+=chapters+'\n\nVOICEVOX:春日部つむぎ / VOICEVOX:ずんだもん / VOICEVOX:四国めたん\nBGM：甘茶の音楽工房「フィヨルドの澄んだ風」（作曲：甘茶）\nhttps://amachamusic.chagasi.com/music_fjordnosundakaze.html\nキャラクター：https://zunko.jp/ / https://tsumugi-official.studio.site/\nゲーム原画・研究室等には既存の生成AI素材を使用しています。\n\n#STILLVEIL #ビルド研究日誌 #ずんだもん #春日部つむぎ\n';(B/'YouTube-Description.txt').write_text(intro)
print('Documents and catalogue written; total',T['duration'],'body',T['bodyEnd'])
