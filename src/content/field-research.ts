import type { Content, DungeonDef } from '../domain/types';
export function withFieldResearch(base: Content): Content {
    const fieldSkills: NonNullable<Content['fieldSkills']> = {
        ruka: { skillId: 'scout-ruka-shear', name: '留め縫い', effect: 'stitch', description: '残り糸を1個使い、狙った敵のHP回復を次ラウンド終了まで止める。ルカがリーダーなら、味方の障壁が自然失効したラウンドに残り糸を1個保存（上限2）。通常1行動を使う。' },
        neri: { skillId: 'scout-neri-lantern', name: '休番の札', effect: 'rest', description: '味方1人を次ラウンドの全行動から休ませ、その後に復帰させる。休番は回復や無敵ではなく、防御・かばうも行わない。研究護衛では連続当番をリセットする。' },
        ione: { skillId: 'scout-ione-mark', name: '宛先の控え', effect: 'receipt', description: '別の味方1人へ狙った敵の宛先を控える。次ラウンド終了まで、魅了・混乱で味方を狙った通常攻撃1回だけをその敵へ差し戻す。状態異常・威力・手番は変えない。' },
        fio: { skillId: 'scout-fio-overflow', name: '預かり箱', effect: 'supply', description: '味方1人を回復し、実際の余剰回復の75%を薬布として最大60保存。3ラウンド先まで、敵の通常行動で傷ついた生存者へ1ラウンド1回、最大30を支払う。在庫の継ぎ足し・期限延長はしない。' },
        elaine: { skillId: 'cleanse-14', name: '帰還の鉢皿', effect: 'capacity', description: '特殊ルールで失われた最大HP容量を、元の最大HPの25%まで戻す。現在HPは増えない。最大HP容量が減っていなければ効果はない。研究護衛向けの技能。' },
    };
    const stage = (id: string, name: string, fieldLesson: NonNullable<DungeonDef['fieldLesson']>, description: string, requiresOwnedId: string): DungeonDef => ({ id, name, kind: 'trial', published: true, artId: 'cathedral', subtitle: '研究護衛・報酬なし', description, requiresOwnedId, fieldLesson, enemyScale: { hp: 100, attack: .05, defense: .2 }, waves: [[{ characterId: 'hollow-keeper', boss: true }]] });
    return { ...base, fieldSkills, dungeons: [...base.dungeons,
            stage('research-rewinding-hall', '霧綴じの回廊', 'rewind', '敵が1ラウンドに失うHPは最大HPの20%まで。3ラウンドごとに全回復する。ルカの留め縫いなどで回復を止め、継続して削る研究試練。', 'ruka'),
            stage('research-duty-ferry', '夜番の渡し舟', 'duty', '12ラウンドを3人以上で生還する護衛。12ラウンド連続で当番を務めると離脱する。休番で連続当番をリセットできる。休んだ仲間はそのラウンドの全行動を失う。', 'neri'),
            stage('research-whiteflower-return', '白花の帰還便', 'capacity', '先頭の仲間を守り、12ラウンド生還する護衛。毎ラウンド、先頭の最大HP容量を元の20%減らす。防御・かばう・休番で各25%軽減し、最低減少量は元の10%。帰還の鉢皿は容量だけを復元する。', 'elaine')
        ] };
}
