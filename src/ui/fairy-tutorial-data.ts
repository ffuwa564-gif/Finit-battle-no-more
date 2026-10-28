/** Stable anchors bind guidance to real controls without invoking game commands. */
export const fairyLessons = {
  general: [{ target: 'guide-launch', title: 'いつでも、私を呼んでね', text: '妖精のマークを押せば、今いる画面の案内を見直せるよ。ホームや設定からも呼べるから、迷ったときは声をかけてね！' }],
  'trial-reward': [{ target: 'trial-result', title: '試練、おつかれさま！', text: '腕試しには戦利品がないの。「踏破を記録して戻る」を押して、挑戦の記録を残しておこうね！' }],
  home: [
    { target: 'home-party', title: '旅は、仲間選びから', text: 'ここはパーティの入り口だよ！ 仲間は4人まで。リーダーにした子の力で、みんなを後押しできるの。' },
    { target: 'home-gacha', title: '新しい縁を結びたいときは', text: '女神の祈願では、集めた石で仲間を迎えられるよ。石は探索で集めようね。今すぐ引かなくても大丈夫！' },
    { target: 'home-dungeons', title: '準備ができたら、ここ！', text: 'このボタンからダンジョンへ出発できるよ。まずは第1章の、開いている探索を選んでみよう！' },
  ],
  dungeons: [
    { target: 'chapters', title: '少しずつ、先の章へ', text: '探索は順番に開いていくよ。各章のいちばん奥には手強いボスがいるの。まずは今行ける場所からで大丈夫！' },
    { target: 'prepare', title: '出発前に、ひと呼吸', text: '「探索の準備」を押すと、連れていく仲間と持ち込む回復薬を確認できるよ。押しただけでは、まだ出発しないから安心してね。' },
  ],
  preparation: [
    { target: 'supplies', title: 'お薬、持っていく？', text: 'ここで持ち込む回復薬の数を決められるよ。上限は5個。持ち込んだだけでは減らないけれど、使った分は戻らないの。' },
    { target: 'depart', title: 'さあ、いってみよう！', text: 'このボタンで本当に出発するよ！ 仲間のHPは全回復するの。探索中の素材は仮取得だから、最後の報酬確定まで気をつけてね。' },
  ],
  party: [
    { target: 'party-leader', title: 'この子が、みんなの先頭！', text: 'リーダーの追加効果をここで確認できるよ。好きな子の役割と得意なことを見ながら、組み合わせてみよう！' },
    { target: 'party-members', title: '仲間のこと、もっと知ろう', text: '仲間の絵を押すと、能力やスキルを読めるよ。「編成する」で入れ替え、「リーダーにする」で先頭を変えられるの。' },
  ],
  gacha: [
    { target: 'gacha-series', title: 'どんな出会いにしよう？', text: 'シリーズによって登場する仲間が違うよ。仲間や排出率を見てから、引きたい祈願を選んでね。' },
    { target: 'gacha-draw', title: '大切な石を使う前に', text: '1回なら石5個、10連なら50個が必要だよ。ボタンを押すと石を使うから、じっくり決めてね。私は勝手に引かないよ！' },
  ],
  bag: [
    { target: 'bag-potions', title: '備えは、街にいるうちに', text: 'ここではゴールドで回復薬を補充できるよ。探索で拾った素材も、カバンで確認してみてね。' },
  ],
  settings: [
    { target: 'settings-backup', title: '旅の記録を、大切に', text: '冒険はこのブラウザーに自動保存されるよ。別の端末へ移る前や、データを消す前には、バックアップを保存しておこうね！' },
    { target: 'settings-motion', title: '遊びやすさも、お好みで', text: '音の大きさや演出速度、動きを控えめにする設定を変えられるよ。無理なく楽しめる速さで進もう！' },
  ],
  battle: [
    { target: 'battle-advance', title: 'いくよ、ATTACK！', text: 'ATTACKを1回押すと、1ラウンド進むよ。仲間は状況に合わせて自分でスキルを選ぶの。NEXTは演出を先へ送るボタンだよ！' },
    { target: 'battle-strategy', title: '次の一手は、どんな気持ち？', text: '均衡・攻撃重視・生存重視を選ぶと、仲間の動き方針が変わるよ。作戦だけではラウンドは進まないから、選んでからATTACKね！' },
    { target: 'battle-potion', title: '困ったときは、ITEM！', text: 'ラウンドの合間にITEMを押して、回復させたい仲間を選んでね。1ラウンドに1回だけ。倒れた子は回復薬では起こせないの。' },
    { target: 'battle-party', title: '必殺ゲージにも注目！', text: 'ゲージが100%になった仲間の枠を押すと、必殺技を予約できるよ。次の行動で発動するの！ もう一度押すと予約を取り消せるよ。 枠の縁に小さな妖精が来たら、3ターン以内にタップしてね。生きている仲間全員の必殺ゲージが15%増えるよ！' },
  ],
  reward: [
    { target: 'claim', title: 'おかえり！ 最後に、これ！', text: '探索できたね、おつかれさま！ 「獲得を確定」を押して、素材と踏破報酬を持ち帰ろう。ここまでが、ひとつの冒険だよ！' },
  ],
  failure: [
    { target: 'return-town', title: 'また、いっしょに行こう', text: '今回の仮取得素材は失うけれど、次はHPを全回復して出発できるよ。仲間や作戦を見直して、もう一度挑戦してみようね。' },
  ],
} as const;
export type FairyTopic = keyof typeof fairyLessons;
export interface FairyProgress { version: 2; offered: boolean; enrolled: boolean; dismissed: boolean; topic: FairyTopic; step: number; seen: FairyTopic[]; checkpoints: Partial<Record<FairyTopic, number>> }
// Keep the existing storage key so returning players are migrated instead of invited again.
export const fairyStorageKey = 'stillveil-fairy-tutorial-v1';
export const newFairyProgress = (): FairyProgress => ({ version: 2, offered: false, enrolled: false, dismissed: false, topic: 'home', step: 0, seen: [], checkpoints: {} });
const validStep = (topic: string, step: unknown): step is number => Object.hasOwn(fairyLessons, topic) && Number.isInteger(step) && Number(step) >= 0 && Number(step) < fairyLessons[topic as FairyTopic].length;
export function parseFairyProgress(raw: string | null): FairyProgress {
  try {
    if (!raw || raw.length > 4096) return newFairyProgress();
    const p = JSON.parse(raw);
    if (!p || ![1, 2].includes(p.version) || typeof p.enrolled !== 'boolean' || typeof p.dismissed !== 'boolean' || !validStep(p.topic, p.step) || !Array.isArray(p.seen) || p.seen.length > Object.keys(fairyLessons).length || new Set(p.seen).size !== p.seen.length || p.seen.some((topic: string) => !Object.hasOwn(fairyLessons, topic))) return newFairyProgress();
    if (p.version === 1) return { version: 2, offered: true, enrolled: p.enrolled, dismissed: p.dismissed, topic: p.topic, step: p.step, seen: p.seen, checkpoints: { [p.topic]: p.step } };
    if (typeof p.offered !== 'boolean' || !p.checkpoints || typeof p.checkpoints !== 'object' || Array.isArray(p.checkpoints) || Object.entries(p.checkpoints).some(([topic, step]) => !validStep(topic, step))) return newFairyProgress();
    return { version: 2, offered: p.offered, enrolled: p.enrolled, dismissed: p.dismissed, topic: p.topic, step: p.step, seen: p.seen, checkpoints: { ...p.checkpoints, [p.topic]: p.step } };
  } catch { return newFairyProgress(); }
}
export function moveFairyStep(p: FairyProgress, step: number): FairyProgress {
  return { ...p, step, checkpoints: { ...p.checkpoints, [p.topic]: step } };
}
export function switchFairyTopic(p: FairyProgress, topic: FairyTopic): FairyProgress {
  if (p.topic === topic) return p;
  return { ...p, topic, step: p.checkpoints[topic] ?? 0, checkpoints: { ...p.checkpoints, [p.topic]: p.step } };
}
export function finishFairyTopic(p: FairyProgress): FairyProgress {
  return { ...p, seen: [...new Set([...p.seen, p.topic])], checkpoints: { ...p.checkpoints, [p.topic]: p.step } };
}
export function advanceFairyStep(p: FairyProgress): FairyProgress {
  return p.step + 1 < fairyLessons[p.topic].length ? moveFairyStep(p, p.step + 1) : finishFairyTopic(p);
}
export function openFairyTopic(p: FairyProgress, topic: FairyTopic): FairyProgress {
  const resumed = switchFairyTopic(p, topic);
  const current = p.seen.includes(topic) ? moveFairyStep(resumed, 0) : resumed;
  return { ...current, offered: true, enrolled: true, dismissed: false, seen: current.seen.filter(id => id !== topic) };
}
