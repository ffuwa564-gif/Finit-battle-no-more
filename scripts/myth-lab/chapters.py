"""Reviewed proposal meeting script. Effects shown here are unimplemented concepts."""
FINAL = True
CHAPTERS = []
def phase(kind,title,bullets,nodes=(),note=''):
 return dict(kind=kind,title=title,bullets=bullets,nodes=[dict(title=a,value=b)for a,b in nodes],note=note)
def chapter(ident,title,char,source,labels,phases,body,source_ids=()):
 lines=[]
 for row in body.strip().splitlines():
  who,state,text=row.split('|',2);lines.append(dict(speaker=who,phase=int(state),text=text,mood='firm'if who=='m!'else'normal'))
 CHAPTERS.append(dict(id=ident,title=title,character_id=char,source_short=source,source_ids=list(source_ids),label=labels,phases=phases,lines=lines))

chapter('opening','回復していないのに、HPが増えた？','benzaiten','原作と神話を手がかりにした、未実装の企画会議','OPENING',[
 phase('proposal','傷を消す代わりに、引き受ける人を選ぶ',['合計HPは340のまま','片方が助かると、もう片方は危なくなる'],[('アテナ','320 → 227'),('合計HP','340 → 340'),('エレイン','20 → 113')]),
 phase('lore','神話・物語・ゲームへの翻案を分ける',['原典や資料に書かれたこと','STILLVEILの既存の人物像','ここから二人が考える新しい効果'],[('資料のモチーフ','由来'),('ゲームの人物像','解釈'),('新しい効果','創作案')]),
 phase('critique','強そう、だけでは終わらない会議',['現在の仕組みとの違い','面白い選択と、本当の弱点','悪用・操作負担・実装費用も考える'],[('ひらめき','まず出す'),('反論','盤面で試す'),('改稿','よい核を残す')]),
 phase('verdict','会議の推しは、実装決定ではありません',['図の数値は調整前の例','一度に全部を入れる提案ではない','覚醒後の人物描写に一部触れます'],[('今日','企画と比較'),('次の段階','小さく試作'),('その後','実戦と調整')]),
],'''
z|0|回復していないのに、エレインの体力が増えたのだ！　これ、次の更新で欲しいのだ。
m|0|その分、アテナから分けてもらったの。合計は増えていないわ。助けた人も見てあげて。
z|0|数字を大きくするだけじゃなく、誰を助けるかで、戦い方が変わるのだ。
m|1|今日は、ずんだもんと私で、次のスキル、リーダー効果、記憶石を考える企画会議よ。
z|1|元の神話や、このゲームの物語から、思い切った能力を考えてみたいのだ。
m|1|資料に書いてある話と、ゲームの既存設定と、私たちが今から創作する効果は分けるわ。
z|2|面白そうな案なら、どんどん出すのだ。でも、強すぎる穴があったら止めてほしいのだ。
m|2|止めるだけでは終わらせないわ。どこを直せば、選びたくなる能力になるか、一緒に考えましょう。
z|2|調査担当と、かなり厳しい批評担当で、反論と修正を重ねた内容なのだ。
m|3|画面は未実装の説明図。数字も仮の例よ。動画で推しても、開発や採用が決まった意味ではないわ。
z|3|覚醒した仲間の言葉にも、少し触れるのだ。気になる章から見られるようにしておくのだ。
m|3|では、まず一つ。ユニークって、どこが変わればそう呼べるのかしら。
''')

chapter('rules','ユニークさは、何を選び直すか','seris-awakened','現行Ver1.0：先頭一人の指示・仲間AI・リーダー一枠','DESIGN RULES',[
 phase('proposal','同じ攻撃に、違う名前を付けるだけ？',['倍率を上げるだけでは、操作は変わりにくい','誰に・いつ・何を渡すかを変えたい','他作品に似た技があることも正直に認める'],[('対象','誰を選ぶ？'),('順番','いつ動く？'),('資源','何を残す？')]),
 phase('critique','現行の約束を、勝手に増やさない',['手動で指示するのは先頭の一人','他の仲間はAI・リーダーは一人','今ある演出と、新しい効果は別'],[('先頭','操作役'),('リーダー','編成のルール'),('石','一人に一個')]),
 phase('revision','派手さと、選ぶ理由を両方残す',['弱点が名目だけなら見直す','制限を盛りすぎて、使わない技にもさせない','確かめる前に、最強や安定とは言わない'],[('魅力','使いたい'),('代償','迷う理由'),('表示','理解できる')]),
],'''
z|0|炎の剣、氷の剣、雷の剣！　名前を変えれば、三種類なのだ。
m!|0|同じ敵を同じように殴るだけなら、選ぶ理由は数字に戻ってしまうわよ。
z|0|じゃあ、殴るか、味方へ順番を渡すか。今の体力を守るか、後の回復を残すか、なのだ。
m|0|そういう選択の違いを探したいわ。他のゲームにもある仕組みを、この作品に合わせる案も含めましょう。
z|1|今は、先頭の一人へ指示して、ほかの仲間は自分で技を選ぶのだ。
m|1|リーダーも一人。違うリーダー効果を三つ同時に使う想定にはしないわ。先頭とリーダーは別の役目よ。
z|1|今のルネットに、うさぎの必殺演出があるのと、普段から味方のうさぎを配る仕組みは別なのだ。
m|2|新しい対象選択や表示が要る案は、そこも費用として数える。画面へ説明を詰めれば解決、とはしないわ。
z|2|でも、全部に一回だけって付けたら、窮屈にならないのだ？
m|2|上限は暴走を止めるため。面白さまで制限の数で作らないこと。まず、小さくても選択が変わる案から始めましょう。
''')

# Each module owns its draft; the final ordering is editorial, not a count of
# supposedly independent mechanics. Related proposals are compared together.
from pathlib import Path
import importlib.util
for name in ['story_cases','greek_cases','japan_cases','editorial_cases','root_cases']:
 path=Path(__file__).with_name(name+'.py')
 if path.exists():
  spec=importlib.util.spec_from_file_location('myth_'+name,path)
  module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  module.add_cases(chapter,phase)
ORDER=['opening','rules','liora','hecate','uzume','elaine','toyotama','hp_transfer','selene','lunette','nox','garden','uka','myth_limits','immortality','deer','gauge_lab','future_control','retreat_economy','party_lab','shortlist','closing']
assert len({c['id']for c in CHAPTERS})==len(CHAPTERS),'Duplicate chapter id'
CHAPTERS.sort(key=lambda c:ORDER.index(c['id']))
for index,c in enumerate(CHAPTERS):
 c['eyebrow']=f'{index:02} / '+c['label']
 if c['id']=='garden':c['show_portrait']=False
 for line in c['lines']:
  assert line['speaker']in ['z','m','m!']
  assert 0<=line['phase']<len(c['phases'])
