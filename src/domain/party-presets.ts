import type {Content, GameSave} from './types';
import {duplicateFamily} from './events';
export const PARTY_PRESET_LIMIT=10;
export interface PartyPreset {slot:number;name:string;partyIds:string[];leaderId:string;equipped:Record<string,string>}
export function validPartyPresets(value:unknown):value is PartyPreset[]{
 if(!Array.isArray(value)||value.length>PARTY_PRESET_LIMIT)return false;
 const slots=new Set<number>();
 return value.every(p=>{if(!p||typeof p!=='object'||!Number.isInteger(p.slot)||p.slot<0||p.slot>=PARTY_PRESET_LIMIT||slots.has(p.slot)||typeof p.name!=='string'||!p.name.trim()||p.name.length>32||!Array.isArray(p.partyIds)||p.partyIds.length<1||p.partyIds.length>4||p.partyIds.some((id:unknown)=>typeof id!=='string'||!id)||new Set(p.partyIds).size!==p.partyIds.length||!p.partyIds.includes(p.leaderId)||!p.equipped||typeof p.equipped!=='object'||Array.isArray(p.equipped))return false;slots.add(p.slot);const entries=Object.entries(p.equipped);return entries.every(([id,gem])=>p.partyIds.includes(id)&&typeof gem==='string'&&gem.length>0)&&new Set(Object.values(p.equipped)).size===entries.length;});
}
export function presetProblem(preset:PartyPreset,save:GameSave,content:Content):string|null{
 if(preset.partyIds.some(id=>!save.ownedIds.includes(id)||!content.characters.some(c=>c.id===id)))return '保存した仲間が見つかりません。';
 if(duplicateFamily(preset.partyIds,content))return '同じ仲間の異なる姿は同時に編成できません。';
 if(Object.values(preset.equipped).some(id=>!save.memoryGems?.items.some(g=>g.id===id)))return '保存した記憶石がありません。装備を確認してください。';
 return null;
}
