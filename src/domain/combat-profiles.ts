import type {CharacterDef,Content,Stats} from './types';

/** Rule 4: rarity buys leadership, never a larger personal stat budget. */
export const COMBAT_REFERENCE = 24;
export const COMBAT_STYLES = {
 balanced:{name:'均衡',hp:100,attack:100,defense:100,speed:0},
 swift:{name:'機敏',hp:90,attack:100,defense:90,speed:2},
 precise:{name:'鋭撃',hp:95,attack:110,defense:95,speed:0},
 bruiser:{name:'重撃',hp:105,attack:110,defense:105,speed:-2},
 bastion:{name:'堅守',hp:110,attack:90,defense:110,speed:-1},
 enduring:{name:'持久',hp:115,attack:90,defense:105,speed:-1},
} as const;
export type CombatStyle=keyof typeof COMBAT_STYLES;
export interface CombatProfile {style:CombatStyle;stones:readonly string[]}
const p=(style:CombatStyle,...stones:string[]):CombatProfile=>({style,stones});
/** Authored by identity, not a rarity hash. Forms share their person's identity. */
export const COMBAT_PROFILES:Record<string,CombatProfile>={
 elaine:p('swift','clear-tear','camp-lantern'),liora:p('bastion','pale-ward','disrupt-sigil'),
 seris:p('swift','concord-mark','dawn-crown'),noelle:p('precise','sweep-prism','concord-mark'),
 'pale-wolf':p('precise','overflow-ember','night-dew'),'stone-drake':p('bruiser','shield-break','pale-ward'),
 'hollow-keeper':p('balanced','disrupt-sigil','hollow-lantern'),'moon-moth':p('swift','dream-lace','sweep-prism'),
 'veil-priestess':p('enduring','camp-lantern','twin-tide'),'thorn-witch':p('swift','dream-lace','concord-mark'),
 iris:p('precise','star-furnace','concord-mark'),mireille:p('balanced','pale-ward','camp-lantern'),
 asteria:p('bruiser','sweep-prism','boss-reserve'),evelyn:p('swift','shield-break','night-dew'),
 selene:p('enduring','twin-tide','boss-reserve'),athena:p('balanced','disrupt-sigil','pale-ward'),
 flora:p('balanced','clear-tear','twin-tide'),'rainbow-iris':p('swift','hollow-lantern','rewind-thread'),
 eos:p('swift','star-furnace','boss-reserve'),nike:p('bruiser','shield-break','overflow-ember'),
 vespera:p('precise','star-furnace','boss-reserve'),miette:p('enduring','pale-ward','camp-lantern'),
 tikka:p('swift','rewind-thread','disrupt-sigil'),nox:p('bruiser','disrupt-sigil','dawn-crown'),
 kuzuha:p('precise','dream-lace','night-dew'),artemis:p('precise','overflow-ember','dawn-crown'),
 persephone:p('enduring','dream-lace','concord-mark'),hestia:p('enduring','pale-ward','camp-lantern'),
 hebe:p('precise','twin-tide','camp-lantern'),seoritsu:p('enduring','clear-tear','dream-lace'),
 ukanomitama:p('enduring','camp-lantern','boss-reserve'),mizuhanome:p('balanced','disrupt-sigil','concord-mark'),
 haniyasu:p('balanced','shield-break','boss-reserve'),toyotama:p('balanced','twin-tide','clear-tear'),
 wakahirume:p('precise','pale-ward','star-furnace'),iwanagahime:p('precise','shield-break','disrupt-sigil'),
 kukurihime:p('enduring','hollow-lantern','camp-lantern'),lisette:p('precise','hollow-lantern','disrupt-sigil'),
 lunette:p('swift','sweep-prism','star-furnace'),lucielle:p('balanced','pale-ward','boss-reserve'),
 nemuria:p('precise','dream-lace','rewind-thread'),chrona:p('balanced','rewind-thread','sweep-prism'),
 fortuna:p('enduring','boss-reserve','camp-lantern'),hecate:p('balanced','hollow-lantern','concord-mark'),
 freyja:p('enduring','night-dew','overflow-ember'),benzaiten:p('enduring','twin-tide','boss-reserve'),
 astraea:p('balanced','boss-reserve','dawn-crown'),zakuro:p('enduring','sweep-prism','camp-lantern'),
 ione:p('balanced','concord-mark','clear-tear'),neri:p('swift','disrupt-sigil','camp-lantern'),
 fio:p('bruiser','camp-lantern','clear-tear'),ruka:p('bastion','boss-reserve','overflow-ember'),
};
export function combatProfile(c:CharacterDef):CombatProfile{return COMBAT_PROFILES[c.familyId??c.id]??{style:'balanced',stones:[]};}
export function profileStats(c:CharacterDef,base:Stats):Stats{
 const s=COMBAT_STYLES[combatProfile(c).style];
 return{hp:Math.round(base.hp*COMBAT_REFERENCE/10*s.hp/100),attack:Math.round(base.attack*COMBAT_REFERENCE/10*s.attack/100),defense:Math.round(base.defense*COMBAT_REFERENCE/10*s.defense/100),speed:Math.max(1,base.speed+s.speed)};
}
/** Explicit awakenings retain the earlier attunement; costumes do not inherit it. */
export function stoneMastery(c:CharacterDef,content?:Content):number{
 const rarities:Record<CharacterDef['rarity'],number>={R:1.25,SR:1.15,SSR:1.05,XR:1};
 let result=rarities[c.rarity];const seen=new Set([c.id]);
 if(content){const links=[...(content.awakenings??[]).map(a=>[a.baseId,a.awakenedId]),...(content.events??[]).map(a=>[a.normalId,a.awakenedId])];
  for(let i=0;i<links.length;i++)for(const [before,after] of links)if(seen.has(after)&&!seen.has(before)){seen.add(before);const origin=content.characters.find(v=>v.id===before);if(origin)result=Math.max(result,rarities[origin.rarity]);}}
 return result;
}
export function stoneAffinity(c:CharacterDef,defId:string,content?:Content):number{return stoneMastery(c,content)*(combatProfile(c).stones.includes(defId)?1.12:1);}
