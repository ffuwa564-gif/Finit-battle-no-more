"""Compose final text deliverables from reviewed measurements and actual chapters.

Does not finalize a movie, grant a gem, create data or upload anything.
"""
from pathlib import Path
import hashlib, json, shutil

ROOT = Path(__file__).resolve().parents[2]
O = ROOT / 'artifacts/this-girl-01'
D = O / 'delivery'
DOC = ROOT / 'docs/media/this-girl/episodes/01'
TEMPLATES = Path(__file__).parent / 'delivery-templates'

judgment_path = O / 'research/reports/judgment.json'
judgment = json.loads(judgment_path.read_text())
assert judgment['finalized']
timeline = json.loads((O / 'render/timeline.json').read_text())
assert timeline['finalized'] and timeline['episode'] == 'THIS-GIRL-001'
chapters = (D / 'Chapters.txt').read_text()
assert chapters.strip() and (D / 'Script.md').is_file() and (D / 'Subtitles-ja.srt').is_file()
D.mkdir(exist_ok=True)
for name in ['Credits.md', 'Reproduce.md']:
    shutil.copy2(TEMPLATES / name, D / name)
for source, name in [
    (judgment_path, 'Character-Judgment.json'),
    (DOC / 'reports/design-decisions.md', 'Design-Decisions.md'),
    (DOC / 'reports/roster-audit.md', 'Roster-Audit.md'),
    (DOC / 'reports/stone-goals.md', 'Stone-Goals.md'),
]:
    shutil.copy2(source, D / name)
report = ['# この子で、勝ちたい。 — 研究報告', '',
          '**総合判定：' + judgment['overall']['label'] + '**', '',
          judgment['overall']['reason'], '',
          '研究版・未公開仕様。全所持・同Tier最高roll・薬5個を仮定し、現在入手できないXRを含みます。', '',
          '確認前に固定した主12条件は各256共通seed。有限探索の最良既知候補であり、全能力設計の大域最適解ではありません。', '',
          '正確な範囲・個別認定・未検証は同梱Character-Judgment.jsonに保存しています。', '']
for name in ['methodology-scope.md', 'combat-results.md', 'growth-observations.md',
             'mechanism-observations.md', 'noel-observations.md', 'stress-observations.md',
             'hidden-transfer-observations.md']:
    p = DOC / 'reports' / name
    assert p.is_file(), ('Missing completed research report', name)
    report += ['---', '', p.read_text(), '']
(D / 'ResearchReport.md').write_text('\n'.join(report))
duration = timeline['durationFrames'] / 30
description = f'''この子で、勝ちたい。
みんなが輝くRPGをつくる研究独白 #01 【STILLVEIL】

SRのコノハナサクヤヒメと、リケジョつむぎの静かな研究日誌。
強い少女や最高級の石が揃ったあとも、好きな子を選ぶ理由を残せるでしょうか。

今回の判定：{judgment['overall']['label']}
{judgment['overall']['reason']}

この映像は「研究版・未公開仕様」です。
同じ既存ステージ・乱数・装備/アイテム予算で、改修前後・代替ヒーラー・追加効果を外した対照を比較しました。
主12条件を各256共通シードで検証。1戦の映像を勝率の証明として扱っていません。
現在入手できないXRも所持した仮想最終盤の比較です。通常の入手状況とは区別しています。

■ チャプター
{chapters.strip()}

■ ゲーム
https://fluffy3546.itch.io/stillveil

■ 台本・字幕・原データ・研究資料・制作コード
https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/research/sakuya-this-girl-01/docs/media/this-girl/episodes/01

■ 動画・サムネイル・再現パッケージ
https://github.com/ffuwa564-gif/Finit-battle-no-more/tree/downloads/this-girl-01

■ クレジット
音声：VOICEVOX:春日部つむぎ
音楽：甘茶の音楽工房（作曲：甘茶）「夢」
https://amachamusic.chagasi.com/music_yume.html
春日部つむぎの非公式二次創作を含みます。
背景・サムネイルの制作に生成AIを使用しています。

次回の研究候補はミエット。次回の成果・認定はまだ未検証です。
'''
(D / 'YouTube-Description.txt').write_text(description)
assert hashlib.sha256((D / 'Character-Judgment.json').read_bytes()).digest() == hashlib.sha256(judgment_path.read_bytes()).digest()
print('Final text delivery assembled from measured judgment and actual chapters.', round(duration, 3), 'seconds')
