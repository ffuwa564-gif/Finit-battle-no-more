export type Role = 'healer' | 'tank' | 'attacker' | 'area_attacker' | 'supporter' | 'debuffer';
export type SkillTemplate = 'attack' | 'area' | 'heal' | 'guard' | 'buff' | 'debuff';
export type Strategy = 'balanced' | 'aggressive' | 'survival';
export type Rarity = 'common' | 'rare' | 'epic';
export type LeaderStat = 'hp' | 'attack' | 'defense';
export type Side = 'party' | 'enemy';
export interface CharacterDef { id: string; name: string; epithet: string; flavor: string; speciesId: string; role: Role; strength: number; leaderStat: LeaderStat; skillIds: string[]; portraitId: string; artId: string; motionId?: string; encounterArtId?: string; origin: ('initial' | 'recruit' | 'gacha')[]; rarity: 'R' | 'SR' | 'SSR'; published: boolean; soundProfile: string; dialogue?: { intro: string; threshold: string; defeat: string } }
export interface SkillDef { id: string; name: string; template: SkillTemplate; strength: number; soundProfile: string }
export interface AssetDef { id: string; path: string; kind: 'portrait' | 'illustration' | 'background' | 'icon' | 'video'; width: number; height: number; anchor: string; rights: string; portraitZoom?: number; portraitOrigin?: string }
export interface SpeciesDef { id: string; name: string }
export interface EnemyDef { characterId: string; boss?: boolean }
export interface DungeonDef { id: string; name: string; subtitle: string; description: string; artId: string; published: boolean; waves: EnemyDef[][] }
export interface Content { appVersion: string; contentVersion: string; rulesVersion: string; schemaVersion: number; characters: CharacterDef[]; skills: SkillDef[]; species: SpeciesDef[]; assets: AssetDef[]; dungeons: DungeonDef[] }
export interface Unit { uid: string; characterId: string; side: Side; boss: boolean; hp: number; maxHp: number; attack: number; defense: number; speed: number; tie: number; cooldowns: Record<string, number>; guardTarget?: string; guardUntil?: number; guardStrength?: number; buffUntil?: number; buffStrength?: number; debuffUntil?: number; debuffStrength?: number }
export type Phase = 'ready' | 'playing' | 'reward' | 'failed';
export type NextPhase = 'ready' | 'wave' | 'reward' | 'failed';
export interface BattleEvent { id: string; kind: 'attack' | 'area' | 'heal' | 'guard' | 'buff' | 'debuff' | 'drop' | 'dialogue' | 'wave' | 'defeat'; text: string; actorId?: string; targetIds?: string[]; skillId?: string; amount?: number; materialId?: string; rarity?: Rarity; unitsAfter?: Unit[] }
export interface Battle { id: string; dungeonId: string; contentVersion: string; rulesVersion: string; wave: number; round: number; units: Unit[]; initialUnits: Unit[]; partyIds: string[]; leaderId: string; strategy: Strategy; potionsRemaining: number; potionUsed: boolean; pendingMaterials: Record<string, number>; seed: number; talkFlags: string[]; phase: Phase; nextPhase: NextPhase; events: BattleEvent[]; cursor: number; failureReason?: string; goldEarned: number }
export interface RoundResult { battle: Battle; goldEarned: number; discoveredIds: string[] }
export interface GameSettings { bgmVolume: number; seVolume: number; reducedMotion: boolean; speed: 1 | 2 }
export interface GameSave { schemaVersion: number; appVersion: string; contentVersion: string; rulesVersion: string; revision: number; gold: number; potions: number; stones: number; ownedIds: string[]; partyIds: string[]; leaderId: string; materials: Record<string, number>; discoveredIds: string[]; completedDungeonIds: string[]; claimedExplorationIds: string[]; drawCount: number; seed: number; battle: Battle | null; history: { id: string; text: string }[]; settings: GameSettings }
export interface Stats { hp: number; attack: number; defense: number; speed: number }
export interface MaterialCost { materialId: string; count: number }
export type GameCommand = { type: 'depart'; dungeonId: string; potions: number } | { type: 'strategy'; strategy: Strategy } | { type: 'round' } | { type: 'replay' } | { type: 'potion'; unitId: string } | { type: 'retreat' } | { type: 'claim' } | { type: 'leaveFailure' } | { type: 'buyPotion'; count: number } | { type: 'recruit'; characterId: string } | { type: 'exchange'; speciesId: string; rarity: Rarity; direction: 'up' | 'down' } | { type: 'party'; partyIds: string[]; leaderId: string } | { type: 'draw' } | { type: 'settings'; settings: Partial<GameSettings> };
