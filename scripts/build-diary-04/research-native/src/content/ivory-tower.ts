import type { CharacterDef, DungeonDef, EnemyDef, Role } from '../domain/types';
import { IVORY_TOWER_VERSION, ivoryTowerId } from '../domain/ivory-tower';

export const IVORY_TOWER_CURVE = {
  hpBase: 12, hpGrowthDivisor: 78,
  attackBase: 4.8, attackGrowthDivisor: 70,
  defensePerFloor: .006,
  targetBase: 35, targetGrowthDivisor: 58,
} as const;

/** Baseline budget, before encounter-size caps. No playable character's base stats are changed. */
export function towerEnemyScale(floor: number): NonNullable<DungeonDef['enemyScale']> {
  const step = floor - 1;
  return {
    hp: Number((IVORY_TOWER_CURVE.hpBase * Math.exp(step / IVORY_TOWER_CURVE.hpGrowthDivisor)).toFixed(4)),
    attack: Number((IVORY_TOWER_CURVE.attackBase * Math.exp(step / IVORY_TOWER_CURVE.attackGrowthDivisor)).toFixed(4)),
    defense: Number((1 + step * IVORY_TOWER_CURVE.defensePerFloor).toFixed(4)),
  };
}

const themes = ['旅立ちの残響', '素顔の神々', '黒衣の花宴', '和の試練', '無慈悲な機巧', '覚醒の記憶', '宵宮の契り', '凍暁の時計', '柘榴と星冠', '終天の回廊'];
const anchors: Record<number, string> = { 1:'seris',5:'liora',10:'noelle',15:'lisette',20:'athena-standard',25:'iris',30:'evelyn',35:'selene',40:'athena',45:'nox',50:'lunette',55:'elaine-awakened',60:'lunette-awakened',65:'kuzuha',70:'kuzuha-awakened',75:'seris-awakened',80:'chrona',85:'zakuro',90:'vespera',95:'seris-awakened',100:'astraea' };
const ordinaryIds = new Set(['pale-wolf','stone-drake','hollow-keeper','moon-moth','veil-priestess','thorn-witch','lisette']);
const kimonoIds = new Set(['selene','athena','flora','rainbow-iris','eos','nike','artemis','persephone','hestia','hebe','seoritsu','ukanomitama','mizuhanome','haniyasu','toyotama','wakahirume','iwanagahime','kukurihime']);
type TowerCombatant = Pick<CharacterDef,'id'|'familyId'|'name'|'role'|'strength'|'artId'|'origin'|'skillIds'|'published'>;
const originBand = (c: TowerCombatant): number => c.origin.includes('initial') || ordinaryIds.has(c.id) ? 0 : c.id.endsWith('-standard') ? 1 : ['mireille','asteria','evelyn','iris'].includes(c.id) ? 2 : kimonoIds.has(c.id) ? 3 : c.id.includes('awakened') ? 5 : ['lunette','tikka','miette','nox','vespera','nemuria'].includes(c.id) ? 4 : c.id==='chrona' ? 7 : ['astraea','zakuro','fortuna','hecate','freyja','benzaiten'].includes(c.id) ? 8 : 6;
const escortRoles: Record<Role, Role[]> = {
  healer:['tank','attacker','debuffer'], tank:['attacker','healer','supporter'],
  attacker:['supporter','tank','area_attacker'], area_attacker:['debuffer','tank','healer'],
  debuffer:['attacker','supporter','tank'], supporter:['attacker','healer','debuffer'],
};

export type TowerEncounterShape = 'duel' | 'pair' | 'trio' | 'quartet' | 'relay';
export function towerEncounterShape(stage: Pick<DungeonDef,'waves'>): TowerEncounterShape {
  if(stage.waves.length>1) return 'relay';
  return (['duel','pair','trio','quartet'] as const)[stage.waves[0]!.length-1]!;
}

/** No content-index import: new published forms participate without a dependency cycle. */
export function buildIvoryTowerDungeons(characters: readonly TowerCombatant[]): DungeonDef[] {
  const pool = characters.filter(c=>c.published);
  if(!pool.length) return [];
  const byId = new Map(pool.map(c=>[c.id,c]));
  const queue = pool.filter(c=>!Object.values(anchors).includes(c.id)).sort((a,b)=>originBand(a)-originBand(b)||a.strength-b.strength||a.id.localeCompare(b.id));
  const signatures = new Set<string>();
  const pick = (main: TowerCombatant, chosen: string[], role: Role, floor: number): string | undefined => {
    const families = new Set([main.id,...chosen].map(id=>byId.get(id)?.familyId??id));
    return pool.filter(c=>c.id!=='astraea' && (floor>=65 || !['chrona','zakuro'].includes(c.id)) && c.role===role && !families.has(c.familyId??c.id))
      .sort((a,b)=>Number(originBand(a)!==Math.floor((floor-1)/10))-Number(originBand(b)!==Math.floor((floor-1)/10))||((pool.indexOf(a)+floor*7)%pool.length)-((pool.indexOf(b)+floor*7)%pool.length))[0]?.id;
  };
  return Array.from({length:100},(_,index)=> {
    const floor=index+1;
    let main = byId.get(anchors[floor]!);
    if(!main && queue.length) {
      const preferred = queue.findIndex(c=>originBand(c)===Math.floor(index/10));
      main=queue.splice(preferred<0?0:preferred,1)[0];
    }
    main ??= pool[(floor*13)%pool.length]!;
    const shape: TowerEncounterShape = floor%10===0?'relay':floor%7===0?'duel':floor%3===0?'pair':floor%4===0?'quartet':'trio';
    const escorts:string[]=[];
    const count=shape==='duel'?0:shape==='pair'?1:shape==='quartet'?3:2;
    if(floor===1){escorts.push('moon-moth','thorn-witch');}
    else for(let i=0;i<count;i++) {
      const next=pick(main,escorts,escortRoles[main.role][i]!,floor+i);
      if(next) escorts.push(next);
    }
    const final:EnemyDef[]=[{characterId:main.id,boss:true},...escorts.map(characterId=>({characterId}))];
    let signature=final.map(e=>e.characterId).join('|');
    if(signatures.has(signature)) {
      // A repeated main has different escorts; do not merely change the displayed name.
      for(const role of ['area_attacker','supporter','debuffer','attacker','tank','healer'] as Role[]) {
        if(role==='healer'&&final.some(e=>byId.get(e.characterId)?.role==='healer'))continue;
        const other=pick(main,escorts,role,floor+17);
        if(other){if(final.length<4)final.push({characterId:other});else final[final.length-1]={characterId:other};signature=final.map(e=>e.characterId).join('|');if(!signatures.has(signature))break;}
      }
    }
    signatures.add(signature);
    const rabbit=main.id==='lunette'||main.id==='lunette-awakened';
    const clock=main.id==='chrona';
    const pressure=!clock&&(floor%5===0||shape==='duel');
    const strikeName = rabbit?'うさぎ隊・予告射撃':main.role==='tank'?'守護者の裁定':main.role==='healer'?'白亜の返礼':main.role==='debuffer'?'記憶を縛る夜':main.role==='supporter'?'星灯の号令':'白亜の断罪';
    const bossScale = {hp:shape==='duel'?280:300,attack:shape==='duel'?130:120};
    const firstEscort=pick(main,[],'area_attacker',floor+2)??'moon-moth';
    const secondEscort=pick(main,[firstEscort],'supporter',floor+4)??'iris';
    const waves:EnemyDef[][] = shape==='relay' ? [[{characterId:firstEscort},{characterId:secondEscort}],final] : [final];
    const d:DungeonDef = {
      id:ivoryTowerId(floor),towerFloor:floor,kind:'normal',published:true,
      name:`白亜の塔・第${floor}層`,subtitle:themes[Math.floor(index/10)]!,artId:main.artId,
      description:'塔が映す記憶の幻影に挑む。敵の役割、限られた回復、予告の隙を読み、各ウェーブ40ラウンド以内に突破しよう。',
      previousDungeonId:floor===1?'silent-cathedral':ivoryTowerId(floor-1),
      bossScale,waves,towerBattle:{healLimit:3,barrierLimit:2},
      ...((pressure||clock)?{tacticalCommands:true}:{}),
      ...(pressure?{bossStrike:{every:rabbit?4:floor<50?4:3,power:190+Math.floor(floor/20)*8,name:strikeName,target:'pilot',windup:{breakPercent:floor<30?8:5,weakenedPower:65,recoveryPercent:50}}}:{}),
      ...(rabbit?{bossBits:{every:4,count:2,duration:1,power:45}}:{}),
      ...(clock?{bossClock:{shield:170,brokenDefensePercent:45,deadline:19,finalePower:2400,shieldName:'凍暁の時計',finaleName:'終鐘'},bossMusic:'clock' as const}:{}),
      bossDialogue:{intro:'この幻影を越えて、何を持ち帰る。',threshold:'その技も、その祈りも、白亜は覚えている。',defeat:'今のあなたの記憶で、次の扉を開いて。'},
    };
    const strike=d.bossStrike?.windup?(d.bossStrike.every-1+d.bossStrike.power/100)/d.bossStrike.every:1;
    const weights=waves.map(w=>w.reduce((sum,e)=>sum+(byId.get(e.characterId)?.strength??10)/10*(e.boss?Math.sqrt(bossScale.hp*bossScale.attack*strike/10000):1),0));
    const maximum=Math.max(...weights),raw=maximum+.25*(weights.reduce((a,b)=>a+b,0)-maximum);
    const target=IVORY_TOWER_CURVE.targetBase*Math.exp(index/IVORY_TOWER_CURVE.targetGrowthDivisor);
    const baseline=towerEnemyScale(floor),defense=baseline.defense,q=target/raw,ratio=baseline.hp/baseline.attack;
    // A solo support does not receive a full party's budget compressed into a huge renewable HP pool.
    // Let the actual difficulty number vary with encounter shape instead of forcing equal numbers.
    const hpCap=baseline.hp*(shape==='duel'?.85:shape==='pair'?1.1:shape==='quartet'?.90:1.15);
    const attackCap=baseline.attack*(shape==='duel'?1.25:shape==='pair'?1.25:1.20);
    d.enemyScale={hp:Number(Math.min(hpCap,q*Math.sqrt(ratio/defense)).toFixed(6)),attack:Number(Math.min(attackCap,q/Math.sqrt(ratio*defense)).toFixed(6)),defense};
    return d;
  });
}

export { IVORY_TOWER_VERSION };
