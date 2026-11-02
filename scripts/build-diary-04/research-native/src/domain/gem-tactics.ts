/** Describes an action's job, rather than ranking stones by their tier badge. */
export type GemPurpose = 'offense' | 'survival' | 'support' | 'control';
export interface GemTactic { purpose: GemPurpose; use: string; timing: string; cost: string }
export const GEM_PURPOSE_NAMES: Record<GemPurpose, string> = {
  offense: '攻撃と追撃', survival: '守りと回復', support: '味方への支援', control: '敵への妨害',
};
const tactics: Record<string, GemTactic> = {
  'white-flower-seed': { purpose:'survival', use:'出発時の先頭に小回復と種を預け、防御の一手で後段の回復を得ます。', timing:'先頭が防御する予定の前に種を置きます。防御の予約だけでは回復しません。', cost:'種を預ける行動と防御にそれぞれ一手が必要です。種は重ねず、死亡・期限・次のウェーブで失われます。回復量は固定です。' },
  'wick-stone': { purpose:'offense', use:'攻撃が通りにくい仲間の一撃と、次の追撃を支えます。', timing:'序盤や、攻撃役の装備が揃うまでの選択肢です。覚醒後も装備できます。', cost:'性能固定のT3製作品です。高い攻撃力には補助が小さくなり、全ての仲間の最適装備ではありません。' },
  'echo-shard': { purpose:'offense', use:'単体の敵を削り、次のラウンドの追撃につなぎます。', timing:'次のラウンドにも残りそうな敵へ。通常技と使い分けます。', cost:'攻撃力に依存します。追撃から新しい追撃は生まれません。' },
  'shield-break': { purpose:'offense', use:'味方の障壁を、一発の砲撃に使います。', timing:'障壁を作った後。敵の大技前は守りに残すか考えます。', cost:'味方の最も大きい障壁を1つ消費します。固定ダメージではなく、使用者の攻撃力にも依存します。' },
  'dawn-crown': { purpose:'offense', use:'防御の高い相手へ、貫く一撃を狙います。', timing:'敵に防御低下がある時は威力も上がります。', cost:'踏破宝箱で探す石です。高いTierだけで、どの相手にも最適になるわけではありません。' },
  'night-dew': { purpose:'survival', use:'攻撃しながら、使用者自身のHPを戻します。', timing:'自分のHPが減り、攻撃も通せる相手へ。', cost:'味方を直接回復する技ではありません。与えたダメージが小さいと、吸収も小さくなります。' },
  'clear-tear': { purpose:'survival', use:'状態異常や防御低下を解除し、小回復します。', timing:'味方が次の行動を失う前や、防御低下で倒れる前に。', cost:'大きな回復を置き換える石ではありません。異常がない時は別の行動も選べます。' },
  'pale-ward': { purpose:'survival', use:'次の被弾に備え、味方1人へ障壁を張ります。', timing:'敵の予告を見て、受ける仲間を守ります。', cost:'障壁を重ねて無限に増やすことはできません。砕盾石で消費すると、その守りを失います。' },
  'twin-tide': { purpose:'survival', use:'傷ついた味方2人を同時に立て直します。', timing:'複数の仲間が削られた時。単体回復との使い分けが大切です。', cost:'1人ずつの回復量は控えめです。踏破宝箱で探します。' },
  'rewind-thread': { purpose:'support', use:'仲間の通常スキルを、もう一度使う準備を早めます。', timing:'使いたい通常技が再使用待ちの仲間へ。', cost:'自分以外が対象です。記憶石の技や必殺技は短縮しません。' },
  'star-furnace': { purpose:'support', use:'自分の攻撃力に頼らず、仲間の必殺ゲージを送ります。', timing:'自分以外でゲージ65以下の、攻撃力が最も高い仲間へ送ります。', cost:'最大HPの10%を消費します。自分のHP20%以下では使えず、回復と守りも必要です。' },
  'hollow-lantern': { purpose:'control', use:'敵の攻撃強化と再生を奪い、攻撃力の高い味方へ渡します。', timing:'敵が強化や再生を使った後に。', cost:'障壁は奪えません。敵に対象の強化がない場面では、別の行動を選びます。' },
  'dream-lace': { purpose:'control', use:'眠らせて、敵の行動を遅らせる機会を作ります。', timing:'すぐ攻撃しない相手へ。仲間が攻撃する順番にも注意します。', cost:'ダメージで目覚め、ボスには効きにくい技です。全ての予告大技を止める保証はありません。' },
};
export function gemTactic(defId: string): GemTactic | undefined { return tactics[defId]; }
export function gemMatchesPurpose(defId: string, purpose: GemPurpose | 'all'): boolean {
  return purpose === 'all' || gemTactic(defId)?.purpose === purpose;
}
