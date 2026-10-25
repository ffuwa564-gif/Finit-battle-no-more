import type { CharacterDef, DungeonDef } from '../domain/types';

export const trialDialogues: Record<string, NonNullable<CharacterDef['dialogue']>> = {
  selene: { intro: '月の静けさの中で、あなたの歩みを見せて。', threshold: 'まだ、夜は終わりません。', defeat: 'どうぞ、そのまま次の光へ。' },
  athena: { intro: 'その作戦が、私の盾を越えられるかしら。', threshold: '見事ね。では、ここからは私も本気で。', defeat: '知恵と勇気、その両方を認めましょう。' },
  evelyn: { intro: '黄泉の境を越える覚悟、見せていただくわ。', threshold: 'ふふ……まだ帰すわけにはいかないの。', defeat: 'あなたの絆は、黄泉にもほどけなかった。' },
  asteria: { intro: '最後は私！ あなたの光を、見せて！', threshold: 'もっと輝けるよね。私も負けない！', defeat: 'まぶしいね……その強さ、確かに届いたよ！' },
};
export const goddessTrial: DungeonDef = {
  id: 'goddess-procession', kind: 'trial', name: '女神の試練', subtitle: '月、知恵、黄泉、暁。四柱の女神を越えて。',
  description: 'SSR女神との4連戦。セレネ、アテナ、イザナミ、アマテラスに順番に挑みます。HPは次のWaveへ引き継ぎ。素材・ゴールド・祈願石は獲得せず、踏破記録のみが残ります。使用した回復薬は消費されます。',
  artId: 'asteria-art', published: true, previousDungeonId: 'silent-cathedral',
  bossScale: { hp: 300, attack: 120 },
  waves: ['selene', 'athena', 'evelyn', 'asteria'].map(characterId => [{ characterId, boss: true }]),
};

/** Deliberate long-term ceiling; calibrated through dungeonDifficulty, never a display override. */
export const ultimateGoddessTrial: DungeonDef = {
  ...goddessTrial,
  id: 'goddess-procession-ultimate', name: '女神の試練・終極', subtitle: 'その祈りが、神域に届くまで。',
  description: '四柱の女神が本領を解き放つ最上位の4連戦。HPを引き継ぎ、セレネ、アテナ、イザナミ、アマテラスに挑みます。素材・ゴールド・祈願石は獲得せず、踏破記録のみが残ります。使用した回復薬は消費されます。',
  previousDungeonId: goddessTrial.id,
  bossScale: { hp: 1830, attack: 300 },
};

/** Intentionally out of reach today. The shared formula computes 100.0 from these real stats. */
export const impossibleGoddessTrial: DungeonDef = {
  ...goddessTrial,
  id: 'goddess-procession-impossible', name: '女神の試練・不可侵', subtitle: '定数100。今は、届かなくてもいい。',
  description: '定数100.0の超高難度4連戦。現時点での攻略を前提に調整していません。HP61倍・攻撃10倍のSSR女神、セレネ、アテナ、イザナミ、アマテラスに挑みます。HPは次のWaveへ引き継ぎ。素材・ゴールド・祈願石は獲得せず、踏破記録のみが残ります。使用した回復薬は消費されます。',
  previousDungeonId: 'silent-cathedral',
  bossScale: { hp: 6100, attack: 1000 },
};
