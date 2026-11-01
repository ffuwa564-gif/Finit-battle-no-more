"""Editorial index of unimplemented proposals, including comparative alternatives."""
import csv,json,pathlib,runpy
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/myth-lab';DELIVERY=OUT/'delivery';DELIVERY.mkdir(exist_ok=True)
ROWS=[
 ('liora','固有技能','リオラ','開門・先へ行け','自分の一手で遅い味方の一手を直後へ運ぶ','自分の攻撃・かばう等を失う','最初の模型','S02;S11'),
 ('liora','記憶石','フレイヤ由来','鷹羽の借衣','次Rの味方二人の行動順の席を交換','準備一手・速い側は遅くなる','リオラ案との代替比較','O02;O03'),
 ('hecate','リーダー効果','ヘカテ','帰り道の灯','先頭の予約済み一手をR末へ送る','待つ間の被弾・行動不能','次に比較試作','PG-HH2'),
 ('uzume','固有技能','アメノウズメ','舞台への招待','適合する敵単体ダメージ一件を本人へ誘導','本人の耐久・一手・期限','次に比較試作','JP01'),
 ('elaine','記憶石','エレイン由来','摘まない白花','先頭へ種を置き、防御の一手で開花','準備と防御の二手・期限','最初の模型','S04'),
 ('toyotama','リーダー効果','トヨタマヒメ','海坂の便り','予定回復量を出発時の先頭と末尾へ分配','単独への緊急回復も半減','最初の模型','JP02'),
 ('hp_transfer','固有技能','弁財天','水鏡の調律','生存二人の総HPを保存して再配分','本人の一手・渡す側の危険','HP移転系で一方を比較','O04'),
 ('hp_transfer','記憶石','ヘスティア由来','炉辺の分け杯','装備者の実HPを弱った生存味方へ渡す','本人の一手と実HP・石一枠','HP移転系で一方を比較','PG-HH29'),
 ('selene','固有技能','セレネ','満ちるまでの一手','今の一手を次R操作待ちの回復へ預ける','今は回復0・期限・異常時不可','次に比較試作','PG-HH32'),
 ('lunette','固有技能','ルネット','うさぎ隊、持ち場交代！','有限二機を攻撃と護衛へ配属','準備一手・再帰なし・有限消費','修正条件付きで試作','S06;S09'),
 ('nox','固有技能','ノクス','零式・執行予告','一手で標的を宣告し、次の一手を拘束','標的死亡で不発・必殺へ切替時は予告破棄','修正条件付きで試作','S07'),
 ('garden','記憶石','庭園の観測由来','観測の栞','他の味方の次の適合技能の宛先選好を予約','準備一手・不成立でも費用を返さない','操作域拡張の比較','S08;S10'),
 ('uka','リーダー効果','ウカノミタマ','蔵開き','所持予備石一個をWave間に一度交換','他LSの機会費用・待ち時間・保存拡張','中期の基盤研究','JP03'),
 ('myth_limits','固有技能','アマテラス','朝を閉ざす岩戸','敵味方の通常技能CD自然進行を一時停止','味方も遅延・敵CD非公開・jamに近い','情報設計から保留','JP06'),
 ('myth_limits','固有技能','コノハナサクヤヒメ','火中の産屋','孤立して耐えた後の通常技能予約を検討','火属性分類なし・AI/救命への問題','原案を見直す保留','JP05'),
 ('myth_limits','固有技能','イザナミ','千引の帰還門','生存味方を探索から帰し、有限の門を残す','一行の人数減・退場/保存の新設計','独立した離脱設計として保留','JP07'),
 ('immortality','リーダー効果','イワナガヒメ','朽ちぬ器','致死分を固定HP債務へ繰り延べる','返済優先・勝利前精算の不快さ','UI/清算の検証まで保留','JP04;JP05'),
 ('immortality','記憶石','エオス由来','朽ちぬ命の欠片','致死保留と行動停止の老い、介助による復帰案','薬二個/別R・最大HP減は仮','費用過大も含め保留','PG-HH5'),
 ('immortality','記憶石','ペルセポネ由来','柘榴の帰還門','一時不在と帰還の周期を検討','大技完全回避・不在処理の問題','原案のままは保留','PG-HH2'),
 ('deer','記憶石','アルテミス由来','祭壇の置き鹿','必殺資源と一手で自分への単体処理一件を置換','弱い攻撃で消費・費用100は仮','費用を盛り過ぎない比較試作','PG-CYPRIA'),
 ('future_control','リーダー効果','セリス','今日は、道を教えて','一巡後に先頭交代を一度解放する案','編成/操作/保存の拡張','長期の操作域研究','S01'),
 ('future_control','固有技能','ノエル','余白の観測','敵一体の次行動の分類と標的を観測','一手・敵予定保存/無効化処理','敵情報基盤から保留','S03'),
 ('retreat_economy','リーダー効果','リゼット','帰路の確保','途中で確保した通常素材の一部を手動撤退時へ','短い撤退周回が最適になる恐れ','素材経済の検証まで保留','S05'),
 ('retreat_economy','記憶石','黄泉の桃由来','三つ桃の路標','明示された敵の追撃だけを有限回防ぐ','多段と追撃の区別・対応敵が必要','敵分類を整えてから','JP08'),
]
def export():
 with(DELIVERY/'Idea-Catalog.csv').open('w',encoding='utf-8-sig',newline='')as f:
  w=csv.writer(f,lineterminator='\n');w.writerow(['動画章ID','種別','人物/由来','案の名前','何を選び直すか','代償/未決点','会議内の評価（実装決定ではない）','出典ID'])
  w.writerows(ROWS)
 (DELIVERY/'Idea-Catalog.json').write_text(json.dumps({'allUnimplemented':True,'numbersAreIllustrative':True,'note':'Related alternatives are compared together; this is not a count of independent systems or a release plan. Full draft reports contain additional research-only alternatives.','proposals':[dict(zip(['chapter','type','subject','name','choice','costOrUnknown','meetingVerdict','sources'],row))for row in ROWS]},ensure_ascii=False,indent=2))
if __name__=='__main__':export();print('Catalog entries',len(ROWS))
