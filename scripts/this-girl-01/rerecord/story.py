from pathlib import Path
import json,shutil
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-01';R=O/'rerecord';S=ROOT/'scripts/this-girl-01/editor/story.json'
if not(R/'reference/narration.json').exists():shutil.copy2(O/'narration.json',R/'reference/narration.json')
if not(R/'reference/editorial.json').exists():shutil.copy2(O/'editorial.json',R/'reference/editorial.json')
story=json.loads(S.read_text());story['chapters'] +=[{'id':'recapture','title':'映像を止めて、一緒に見る','lines':[{'text':t}for t in [
'実戦は、描画を最適化した版で撮り直しました。研究能力は、未公開のままです。',
'統計の表は、前回の固定データです。今日は映像を少し止めて、どこが変わるか、一緒に見ていきます。',
'まず、ここで止めます。下の四つの枠が味方です。今回は、右端の回復役を入れ替えて比べます。',
'勝ったかどうかに加えて、誰が残ったか、薬をいくつ使ったかも見ます。派手な一撃だけで決めません。',
'次はサクヤヒメ側です。左から三人目のアストライアに、注目してください。ここでは、守られる側です。',
'いま、障壁が実際に攻撃を受け止めました。守られたアストライアの枠を、拡大します。',
'この一撃で吸収したのは七十。花びらはゼロから八十二パーセントになりました。障壁を張っただけでは、増えません。',
'次は、同じアストライアの主攻撃です。途中を省略して、その一撃へ進みます。',
'ここで、もう一度止めます。表示された千四百四十三には、返礼の六百五十も含まれています。',
'主攻撃の七百九十三と、返礼の六百五十。その合計です。さらに六百五十を足す、という意味ではありません。',
'守った相手と、力を使う相手を、同じ枠で追う。こうすると、何が起きたか見やすくなりますね。'
]]}];(R/'story.json').write_text(json.dumps(story,ensure_ascii=False,indent=2));print('Prepared',sum(len(c['lines'])for c in story['chapters']),'lines')
