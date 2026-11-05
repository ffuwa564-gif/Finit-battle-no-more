import type { Content, GameSave } from './types';
import { WORLD_START, parseWorldTravel, routePosition, travelSeconds, worldLocations, type MapPosition, type WorldJourney } from './world-map';
export type StoryText = {
    ja: string;
    en: string;
};
/** Narrative-only speakers are distinct from recruitable party characters. */
export const worldStorySupportingSpeakers: Record<string, string> = {
    guest: '旅の少女',
    'garden-woman': '庭園の女',
    admirer: '宝石を集める少女',
    beloved: '人気の少女',
    'lover-one': '恋人の少女',
    'lover-two': 'もう一人の恋人',
    'new-girl': '生まれた少女',
    'garden-girl': '庭園の少女',
    'garden-observer': '別の庭園の管理者',
};
export type HeroVoice = 'soft' | 'honest' | 'dreamy';
export type HeroFavorite = 'tea' | 'flowers' | 'animals';
export interface HeroProfile {
    name: string;
    voice: HeroVoice;
    favorite: HeroFavorite;
}
export interface WorldStoryLine {
    speaker: string;
    text: StoryText;
    voices?: Partial<Record<HeroVoice, StoryText>>;
    favorites?: Partial<Record<HeroFavorite, StoryText>>;
}
export interface WorldStoryChoice {
    id: string;
    label: StoryText;
    response: WorldStoryLine[];
}
export interface WorldStoryNode {
    id: string;
    chapter: number;
    actorId: string;
    hubId: string;
    bubble: StoryText;
    title: StoryText;
    requiresNodes: string[];
    requiresDungeons: string[];
    lines: WorldStoryLine[];
    choices?: WorldStoryChoice[];
    emergency?: {
        bubble: StoryText;
        lines: WorldStoryLine[];
    };
    daily?: WorldStoryLine[][];
    variants?: {
        requiresNodes: string[];
        hubId: string;
        bubble: StoryText;
        lines: WorldStoryLine[];
    }[];
    optional?: boolean;
    ambient?: boolean;
    ending?: boolean;
    leadDungeonId?: string;
}
export interface WorldStoryChapter {
    number: number;
    chapterId: string;
    objective: StoryText;
    endingNodeId: string;
    dungeonIds: string[];
    gates: Record<string, string[]>;
}
export interface WorldStoryHub extends MapPosition {
    id: string;
    name: StoryText;
}
export interface WorldIncident {
    id: string;
    chapter: number;
    title: StoryText;
    message: StoryText;
    requiresNodes: string[];
    requiresDungeons: string[];
    resolvedBy: string;
    hubId: string;
}
export interface WorldStoryDefinition {
    incidents: WorldIncident[];
    version: 1;
    hubs: WorldStoryHub[];
    chapters: WorldStoryChapter[];
    nodes: WorldStoryNode[];
}
export interface WorldStoryState {
    version: 1;
    profile: HeroProfile;
    carriedChapters: number[];
    completed: string[];
    notified?: string[];
    visits?: Record<string, number>;
    choices: Record<string, string>;
    position: MapPosition;
    journey?: WorldJourney;
    active?: {
        nodeId: string;
        line: number;
        choiceId?: string;
        emergency?: boolean;
        replay: boolean;
    };
}
export const defaultHero: HeroProfile = { name: 'ユイ', voice: 'soft', favorite: 'tea' };
export function storyText(text: StoryText, profile: HeroProfile, language: 'ja' | 'en' = 'ja'): string { return text[language].replaceAll('{name}', profile.name); }
export function resolvedStoryNode(node: WorldStoryNode, s: WorldStoryState): WorldStoryNode { const variant = node.variants?.filter(v => v.requiresNodes.every(id => s.completed.includes(id))).at(-1); return variant ? { ...node, ...variant } : node; }
export function nodeLines(node: WorldStoryNode, state: WorldStoryState): WorldStoryLine[] { const resolved = resolvedStoryNode(node, state); const cycles = [resolved.lines, ...(resolved.daily ?? [])]; const base = state.active?.emergency && node.emergency ? node.emergency.lines : cycles[(state.visits?.[node.id] ?? 0) % cycles.length]; return [...base, ...(state.active?.choiceId ? node.choices?.find(c => c.id === state.active!.choiceId)?.response ?? [] : [])]; }
export function activeWorldIncident(save: Pick<GameSave, 'worldStory' | 'completedDungeonIds'>, def: WorldStoryDefinition): WorldIncident | undefined { const s = save.worldStory; if (!s)
    return; const c = storyChapter(s, def); return def.incidents.find(i => i.chapter === c?.number && !s.completed.includes(i.resolvedBy) && i.requiresNodes.every(id => s.completed.includes(id)) && i.requiresDungeons.every(id => save.completedDungeonIds.includes(id))); }
export function acknowledgeWorldIncident(save: GameSave, def: WorldStoryDefinition, id: string): void { if (activeWorldIncident(save, def)?.id !== id)
    throw new Error('その事件は現在発生していません。'); save.worldStory!.notified = [...new Set([...(save.worldStory!.notified ?? []), id])]; }
export function storyChapter(state: WorldStoryState, def: WorldStoryDefinition) { return def.chapters.find(c => !state.carriedChapters.includes(c.number) && !state.completed.includes(c.endingNodeId)); }
export function storyNodeAvailable(node: WorldStoryNode, save: Pick<GameSave, 'worldStory' | 'completedDungeonIds'>, def: WorldStoryDefinition): boolean {
    const s = save.worldStory;
    if (!s || s.completed.includes(node.id) || (!node.ambient && storyChapter(s, def)?.number !== node.chapter))
        return false;
    return node.requiresNodes.every(id => s.completed.includes(id) || s.carriedChapters.includes(def.nodes.find(n => n.id === id)?.chapter ?? -1)) && (node.ambient && s.carriedChapters.includes(node.chapter) || node.requiresDungeons.every(id => save.completedDungeonIds.includes(id)));
}
export function storyActors(save: GameSave, def: WorldStoryDefinition) {
    const s = save.worldStory;
    if (!s)
        return [];
    const incident = activeWorldIncident(save, def);
    const nodes = def.nodes.map(n => { const resolved = resolvedStoryNode(n, s); return incident && resolved.ambient && resolved.emergency ? { ...resolved, bubble: resolved.emergency.bubble } : resolved; }).filter(n => storyNodeAvailable(n, save, def) || n.ambient && s.completed.includes(n.id)).sort((a, b) => Number(Boolean(a.optional)) - Number(Boolean(b.optional)) || b.chapter - a.chapter);
    const actors = [...new Set(nodes.map(n => n.actorId))];
    return actors.map(actorId => { const choices = nodes.filter(n => n.actorId === actorId); return { actorId, node: choices[0], nodes: choices, hub: def.hubs.find(h => h.id === (actorId === 'guest' && s.choices['c5-address'] === 'infirmary' ? 'hub-infirmary' : choices[0].hubId))! }; });
}
function contentChapterDungeons(def: WorldStoryDefinition, number: number) { return def.chapters.find(c => c.number === number)?.dungeonIds ?? []; }
export function storyNext(save: GameSave, def: WorldStoryDefinition): {
    node?: WorldStoryNode;
    dungeonId?: string;
} | undefined {
    const s = save.worldStory;
    if (!s)
        return;
    const chapter = storyChapter(s, def);
    if (!chapter)
        return;
    const available = def.nodes.find(n => !n.optional && storyNodeAvailable(n, save, def));
    if (available)
        return { node: available };
    const pending = def.nodes.filter(n => n.chapter === chapter.number && !n.optional && !s.completed.includes(n.id) && n.requiresNodes.every(id => s.completed.includes(id) || s.carriedChapters.includes(def.nodes.find(n => n.id === id)?.chapter ?? -1)));
    const required = pending.flatMap(n => n.requiresDungeons).find(id => !save.completedDungeonIds.includes(id));
    if (required) {
        const route = contentChapterDungeons(def, chapter.number);
        return { dungeonId: route.find(id => !save.completedDungeonIds.includes(id)) ?? required };
    }
    return undefined;
}
export function worldStoryLock(dungeonId: string, save: Pick<GameSave, 'worldStory' | 'completedDungeonIds'>, content: Content): string | null {
    const s = save.worldStory, def = content.worldStory;
    if (!s || !def || save.completedDungeonIds.includes(dungeonId))
        return null;
    const chapter = def.chapters.find(c => content.chapters?.find(ch => ch.id === c.chapterId)?.dungeonIds.includes(dungeonId));
    if (!chapter || s.carriedChapters.includes(chapter.number))
        return null;
    const current = storyChapter(s, def);
    if (!current)
        return null;
    if (chapter.number > current.number)
        return '地図の仲間と話して、次の旅へ進みましょう。';
    if ((chapter.gates[dungeonId] ?? []).some(id => !s.completed.includes(id)))
        return '出発する前に、地図の仲間と相談しましょう。';
    return null;
}
export function startWorldStory(save: GameSave, content: Content, profile: HeroProfile, from: 'current' | 'beginning'): WorldStoryState {
    const def = content.worldStory;
    if (!def || !validHero(profile))
        throw new Error('主人公の設定が正しくありません。');
    const carriedChapters: number[] = [];
    if (from === 'current')
        for (const c of def.chapters.slice(0, -1)) {
            const ch = content.chapters!.find(ch => ch.id === c.chapterId)!;
            if (!save.completedDungeonIds.includes(ch.dungeonIds.at(-1)!))
                break;
            carriedChapters.push(c.number);
        }
    return { version: 1, profile: { ...profile, name: profile.name.trim() }, carriedChapters, completed: [], choices: {}, position: { ...WORLD_START } };
}
export function settleStoryArrival(s: WorldStoryState, now: number): void { if (s.journey && now >= s.journey.arrivesAt) {
    s.position = s.journey.to;
    delete s.journey;
} }
export function storyDestinations(content: Content, save: GameSave) { return [...worldLocations(content, save.completedDungeonIds), ...(content.worldStory?.hubs ?? [])]; }
export function startStoryTravel(save: GameSave, content: Content, destinationId: string, now: number): void {
    const s = save.worldStory;
    if (!s || s.active)
        throw new Error('今は移動できません。');
    settleStoryArrival(s, now);
    if (s.journey)
        throw new Error('先に移動を終えるか、中止してください。');
    const target = storyDestinations(content, save).find(p => p.id === destinationId);
    if (!target)
        throw new Error('目的地が見つかりません。');
    const to = { x: target.x, y: target.y };
    s.journey = { from: { ...s.position }, to, destinationId, startedAt: now, arrivesAt: now + travelSeconds(s.position, to) * 1000 };
}
export function cancelStoryTravel(s: WorldStoryState, now: number): void { const j = s.journey; if (!j)
    return; s.position = routePosition(j.from, j.to, (now - j.startedAt) / (j.arrivesAt - j.startedAt)); delete s.journey; }
export function beginStoryTalk(save: GameSave, content: Content, nodeId: string, now: number): void {
    const s = save.worldStory, def = content.worldStory, node = def?.nodes.find(n => n.id === nodeId);
    if (!s || !def || !node || s.active)
        throw new Error('今はこの会話を始められません。');
    const replay = s.completed.includes(nodeId);
    if (!replay && !storyNodeAvailable(node, save, def))
        throw new Error('まだこの会話は聞けません。');
    settleStoryArrival(s, now);
    const hub = def.hubs.find(h => h.id === (node.actorId === 'guest' && s.choices['c5-address'] === 'infirmary' ? 'hub-infirmary' : resolvedStoryNode(node, s).hubId))!;
    if (!replay && (s.journey || Math.hypot(s.position.x - hub.x, s.position.y - hub.y) > .008))
        throw new Error('人物のいる場所へ移動してください。');
    s.active = { nodeId, line: 0, replay, ...(node.ambient && activeWorldIncident(save, def) ? { emergency: true } : {}), ...(replay && s.choices[nodeId] ? { choiceId: s.choices[nodeId] } : {}) };
}
export function advanceStoryTalk(save: GameSave, content: Content, action: 'next' | 'finish' | 'close' | 'choice', choiceId?: string): void {
    const s = save.worldStory, active = s?.active, node = content.worldStory?.nodes.find(n => n.id === active?.nodeId);
    if (!s || !active || !node)
        throw new Error('会話を再開できません。');
    if (action === 'close') {
        delete s.active;
        return;
    }
    const lines = nodeLines(node, s);
    if (action === 'next') {
        if (active.line >= lines.length - 1)
            throw new Error('最後の会話です。');
        active.line++;
        return;
    }
    if (action === 'choice') {
        if (active.replay || active.choiceId || active.line !== node.lines.length - 1 || !node.choices?.some(c => c.id === choiceId))
            throw new Error('その返答は選べません。');
        active.choiceId = choiceId;
        active.line++;
        return;
    }
    if (active.line !== lines.length - 1 || node.choices?.length && !active.choiceId)
        throw new Error('会話の続きを聞いてください。');
    if (node.ambient) {
        s.visits ??= {};
        s.visits[node.id] = (s.visits[node.id] ?? 0) + 1;
    }
    if (!active.replay) {
        s.completed.push(node.id);
        if (active.choiceId)
            s.choices[node.id] = active.choiceId;
    }
    delete s.active;
}
const record = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v));
export function validHero(v: unknown): v is HeroProfile { return record(v) && typeof v.name === 'string' && v.name.trim().length > 0 && [...v.name.trim()].length <= 12 && !/[{}<>\r\n]/.test(v.name) && ['soft', 'honest', 'dreamy'].includes(String(v.voice)) && ['tea', 'flowers', 'animals'].includes(String(v.favorite)); }
export function validWorldStory(v: unknown): v is WorldStoryState {
    if (!record(v) || v.version !== 1 || !validHero(v.profile) || !Array.isArray(v.carriedChapters) || !v.carriedChapters.every(n => Number.isSafeInteger(n) && n >= 1 && n <= 6) || new Set(v.carriedChapters).size !== v.carriedChapters.length || !Array.isArray(v.completed) || !v.completed.every(id => typeof id === 'string') || new Set(v.completed).size !== v.completed.length || !record(v.choices) || !Object.values(v.choices).every(id => typeof id === 'string'))
        return false;
    if (v.notified !== undefined && (!Array.isArray(v.notified) || !v.notified.every(id => typeof id === 'string') || new Set(v.notified).size !== v.notified.length))
        return false;
    if (v.visits !== undefined && (!record(v.visits) || !Object.values(v.visits).every(n => Number.isSafeInteger(n) && Number(n) >= 0 && Number(n) <= 1e6)))
        return false;
    const t = parseWorldTravel({ position: v.position, journey: v.journey });
    if (JSON.stringify(t.position) !== JSON.stringify(v.position) || v.journey && JSON.stringify(t.journey) !== JSON.stringify(v.journey))
        return false;
    if (v.active !== undefined && (!record(v.active) || typeof v.active.nodeId !== 'string' || !Number.isSafeInteger(v.active.line) || Number(v.active.line) < 0 || typeof v.active.replay !== 'boolean' || v.active.emergency !== undefined && typeof v.active.emergency !== 'boolean' || v.active.choiceId !== undefined && typeof v.active.choiceId !== 'string'))
        return false;
    return true;
}
export function validateWorldStorySave(save: GameSave, content: Content): void {
    const s = save.worldStory;
    if (!s)
        return;
    const def = content.worldStory;
    if (!validWorldStory(s) || !def)
        throw new Error('旅の記録を読み込めません。');
    if (s.carriedChapters.some((n, i) => n !== i + 1 || !save.completedDungeonIds.includes(def.chapters.find(c => c.number === n)!.dungeonIds.at(-1)!)))
        throw new Error('旅の引き継ぎ記録が正しくありません。');
    if (s.notified?.some(id => !def.incidents.some(i => i.id === id)) || Object.keys(s.visits ?? {}).some(id => !s.completed.includes(id) || !def.nodes.find(n => n.id === id)?.ambient))
        throw new Error('日常の会話記録が正しくありません。');
    for (const id of s.completed) {
        const node = def.nodes.find(n => n.id === id);
        if (!node || node.requiresNodes.some(r => !s.completed.includes(r) && !s.carriedChapters.includes(def.nodes.find(n => n.id === r)!.chapter)) || !s.carriedChapters.includes(node.chapter) && node.requiresDungeons.some(d => !save.completedDungeonIds.includes(d)))
            throw new Error('会話の進行記録が正しくありません。');
    }
    for (const [id, choice] of Object.entries(s.choices))
        if (!s.completed.includes(id) || !def.nodes.find(n => n.id === id)?.choices?.some(c => c.id === choice))
            throw new Error('返答の記録が正しくありません。');
    if (s.journey && !storyDestinations(content, save).some(p => p.id === s.journey!.destinationId && p.x === s.journey!.to.x && p.y === s.journey!.to.y))
        throw new Error('旅の目的地が正しくありません。');
    if (s.active) {
        const a = s.active, n = def.nodes.find(n => n.id === a.nodeId);
        if (!n || a.emergency && !n.ambient || save.battle || save.novels?.active || a.replay !== s.completed.includes(a.nodeId) || a.choiceId && !n.choices?.some(c => c.id === a.choiceId) || a.line >= nodeLines(n, s).length || !a.replay && !storyNodeAvailable(n, save, def))
            throw new Error('会話の再開位置が正しくありません。');
    }
}
