import type { Content } from '../domain/types';
import { worldStorySupportingSpeakers } from '../domain/world-story';
/** Reject unknown links and cycles before the map can offer an impossible conversation. */
export function validateWorldStoryContent(content: Content): string[] {
    const def = content.worldStory;
    if (!def)
        return [];
    const errors: string[] = [];
    const bad = (v: boolean, s: string) => { if (v)
        errors.push('world-story: ' + s); };
    const ids = new Set(def.nodes.map(n => n.id)), hubs = new Set(def.hubs.map(h => h.id)), chars = new Set([...content.characters.map(c => c.id), 'hero', ...Object.keys(worldStorySupportingSpeakers), 'narration']);
    const text = (t: unknown) => !!t && typeof t === 'object' && ['ja', 'en'].every(k => typeof (t as Record<string, unknown>)[k] === 'string' && String((t as Record<string, unknown>)[k]).trim().length > 0);
    bad(def.version !== 1 || ids.size !== def.nodes.length || hubs.size !== def.hubs.length, 'unique versioned nodes and hubs required');
    bad(!def.chapters.length || def.chapters.some((c, i) => c.number !== i + 1), 'story chapters must form a contiguous campaign prefix');
    if (def.onboarding) {
        const o = def.onboarding;
        bad(!Number.isSafeInteger(o.travelSeconds) || o.travelSeconds < 1 || o.travelSeconds > 15 || !o.dungeonIds.length || o.dungeonIds.some(id => !def.chapters[0].dungeonIds.includes(id)) || o.destinationIds.some(id => !hubs.has(id) && !o.dungeonIds.includes(id)), 'invalid early patrol route');
    }
    for (const [id, n] of Object.entries(def.legacyFirstChapter ?? {}))
        bad(!def.nodes.some(node => node.id === id && node.chapter === 1) || n.requiresNodes.some(r => !ids.has(r)) || n.requiresDungeons.some(d => !def.chapters[0].dungeonIds.includes(d)), 'invalid historical prerequisite ' + id);
    for (const h of def.hubs)
        bad(!text(h.name) || ![h.x, h.y].every(v => Number.isFinite(v) && v >= 0 && v <= 1), 'invalid hub ' + h.id);
    for (const c of def.chapters) {
        const original = content.chapters?.find(ch => ch.id === c.chapterId);
        bad(!original || c.number !== original.number || JSON.stringify(c.dungeonIds) !== JSON.stringify(original.dungeonIds) || !text(c.objective), 'invalid chapter ' + c.number);
        bad(!def.nodes.some(n => n.id === c.endingNodeId && n.chapter === c.number && n.ending), 'missing chapter ending');
        for (const [d, required] of Object.entries(c.gates))
            bad(!c.dungeonIds.includes(d) || required.some(id => !ids.has(id)), 'invalid departure gate ' + d);
    }
    for (const chapter of def.chapters) {
        const ancestors = new Set<string>();
        const trace = (id: string) => { if (ancestors.has(id))
            return; ancestors.add(id); for (const r of def.nodes.find(n => n.id === id)?.requiresNodes ?? [])
            trace(r); };
        trace(chapter.endingNodeId);
        bad(def.nodes.some(n => n.chapter === chapter.number && !n.optional && !ancestors.has(n.id)), 'chapter ending skips a main conversation ' + chapter.number);
    }
    const visiting = new Set<string>(), done = new Set<string>();
    function visit(id: string) { if (visiting.has(id)) {
        errors.push('world-story: cyclic node ' + id);
        return;
    } if (done.has(id))
        return; visiting.add(id); for (const r of content.worldStory!.nodes.find(n => n.id === id)?.requiresNodes ?? [])
        if (ids.has(r))
            visit(r); visiting.delete(id); done.add(id); }
    for (const n of def.nodes) {
        bad(n.continuation !== undefined && (typeof n.continuation !== 'boolean' || n.continuation && (!n.optional || !n.ambient || Boolean(n.daily) || Boolean(n.variants))), 'continuations must be optional, persistent authored scenes ' + n.id);
        bad(!n.optional && (!text(n.task) || !text(n.purpose)), 'main conversations need clear tasks and reasons ' + n.id);
        bad(Boolean(n.backgroundId && !content.assets.some(a => a.id === n.backgroundId)), 'unknown scene background ' + n.id);
        bad(!chars.has(n.actorId) || ['hero', 'narration'].includes(n.actorId) || !hubs.has(n.hubId) || !def.chapters.some(c => c.number === n.chapter) || !text(n.bubble) || !text(n.title) || n.lines.length < 2, 'invalid node ' + n.id);
        bad(n.requiresNodes.some(id => !ids.has(id)) || n.requiresDungeons.some(id => !content.dungeons.some(d => d.id === id)) || Boolean(n.leadDungeonId && !content.dungeons.some(d => d.id === n.leadDungeonId)), 'unknown prerequisite ' + n.id);
        bad(Boolean(n.firstVisitLines && (n.firstVisitLines.length < 2 || n.firstVisitLines.length > 5 || n.choices || n.daily || n.variants)), 'short first visits require 2..5 lines without branching ' + n.id);
        const lines = [...n.lines, ...(n.firstVisitLines ?? []), ...(n.choices ?? []).flatMap(c => c.response), ...(n.daily ?? []).flat(), ...(n.emergency?.lines ?? []), ...(n.variants ?? []).flatMap(v => v.lines)];
        for (const v of n.variants ?? [])
            bad(!hubs.has(v.hubId) || !text(v.bubble) || v.requiresNodes.some(id => !ids.has(id)), 'invalid daily variant ' + n.id);
        for (const line of lines)
            bad(Boolean(line.backgroundId && !content.assets.some(a => a.id === line.backgroundId)) || Boolean(line.shade && !['normal', 'dark', 'black'].includes(line.shade)) || !chars.has(line.speaker) || !text(line.text) || Object.values({ ...line.voices, ...line.favorites }).some(t => !text(t)), 'invalid dialogue ' + n.id);
        if (n.choices)
            bad(new Set(n.choices.map(c => c.id)).size !== n.choices.length || n.choices.some(c => !text(c.label) || !c.response.length), 'invalid choice ' + n.id);
        visit(n.id);
    }
    for (const i of def.incidents ?? [])
        bad(!def.chapters.some(c => c.number === i.chapter) || !text(i.title) || !text(i.message) || !hubs.has(i.hubId) || !ids.has(i.resolvedBy) || i.requiresNodes.some(id => !ids.has(id)) || i.requiresDungeons.some(id => !content.dungeons.some(d => d.id === id)), 'invalid incident ' + i.id);
    return errors;
}
