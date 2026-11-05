import { describe, it, expect } from 'vitest';
import { content, validateContent } from '../src/content';
import { createInitialSave, applyCommand } from '../src/application/game';
import { activeWorldIncident, defaultHero, nodeLines, storyActors, storyChapter, storyNext, storyText, worldStoryLock, type WorldStoryNode } from '../src/domain/world-story';
import { dungeonLock } from '../src/domain/events';
import { assertSaveCompatibility, assertValidSave } from '../src/platform/save';
import { encodeBackup, decodeBackup } from '../src/platform/save-backup';
import type { GameSave } from '../src/domain/types';
const def = content.worldStory!;
function begin(from: 'current' | 'beginning' = 'beginning', s = createInitialSave(content, 42)) { return applyCommand(s, { type: 'worldStoryBegin', profile: { ...defaultHero, name: 'ミオ' }, from }, content, { now: 1000 }); }
function arrive(s: GameSave, node: WorldStoryNode) { const actor = storyActors(s, def).find(a => a.actorId === node.actorId); const hub = actor?.node.id === node.id ? actor.hub.id : node.hubId; return applyCommand(applyCommand(s, { type: 'worldTravel', destinationId: hub }, content, { now: 1000 }), { type: 'worldTalk', nodeId: node.id }, content, { now: 47000 }); }
function finish(s: GameSave, node: WorldStoryNode, choice?: string) { s = arrive(s, node); for (let i = 0; i < 30; i++) {
    const a = s.worldStory!.active!, last = a.line === nodeLines(node, s.worldStory!).length - 1;
    if (last && node.choices && !a.choiceId) {
        s = applyCommand(s, { type: 'worldTalkChoice', choiceId: choice ?? node.choices[0].id }, content);
        continue;
    }
    if (last)
        return applyCommand(s, { type: 'worldTalkFinish' }, content);
    s = applyCommand(s, { type: 'worldTalkNext' }, content);
} throw Error('unbounded dialogue'); }
describe('living world story and quiet days', () => {
    it('validates every chapter, bilingual conversation and scene link', () => { expect(validateContent(content)).toEqual([]); expect(def.chapters).toHaveLength(7); expect(def.chapters.map(c => c.chapterId)).toEqual(content.chapters!.map(c => c.id)); expect(def.incidents).toHaveLength(7); expect(def.nodes.length).toBeGreaterThanOrEqual(60); });
    it('waits for real arrival and refuses future, early-finish and invalid reply commands', () => { let s = begin(); const n = def.nodes[0]; expect(() => applyCommand(s, { type: 'worldTalk', nodeId: n.id }, content, { now: 1000 })).toThrow(); s = applyCommand(s, { type: 'worldTravel', destinationId: n.hubId }, content, { now: 1000 }); expect(() => applyCommand(s, { type: 'worldTalk', nodeId: n.id }, content, { now: 1001 })).toThrow(); s = applyCommand(s, { type: 'worldTalk', nodeId: n.id }, content, { now: 47000 }); expect(() => applyCommand(s, { type: 'worldTalkFinish' }, content)).toThrow(); expect(() => applyCommand(s, { type: 'worldTalkChoice', choiceId: 'invented' }, content)).toThrow(); expect(() => applyCommand(s, { type: 'worldProfile', profile: defaultHero }, content)).toThrow(); expect(() => applyCommand(s, { type: 'worldTalk', nodeId: 'c7-together' }, content)).toThrow(); });
    it('completes the full seven-chapter graph without gate deadlocks and detects all seven incidents', () => {
        let s = begin();
        const incidents = new Set<string>();
        const before = { gold: s.gold, stones: s.stones, seed: s.seed };
        for (let step = 0; step < 180 && storyChapter(s.worldStory!, def); step++) {
            const incident = activeWorldIncident(s, def);
            if (incident) {
                incidents.add(incident.id);
                s = applyCommand(s, { type: 'worldIncidentNotice', incidentId: incident.id }, content);
            }
            const next = storyNext(s, def);
            expect(next).toBeDefined();
            if (next!.node)
                s = finish(s, next!.node, next!.node.id === 'c5-address' ? 'infirmary' : undefined);
            else {
                const dungeon = content.dungeons.find(d => d.id === next!.dungeonId)!;
                expect(dungeonLock(dungeon, s, content), dungeon.id).toBeNull();
                s = { ...s, completedDungeonIds: [...s.completedDungeonIds, dungeon.id] };
            }
            expect(() => assertSaveCompatibility(s, content)).not.toThrow();
        }
        expect(storyChapter(s.worldStory!, def)).toBeUndefined();
        expect(incidents.size).toBe(7);
        expect(activeWorldIncident(s, def)).toBeUndefined();
        expect(s.gold).toBe(before.gold);
        expect(s.stones).toBe(before.stones);
        expect(s.seed).toBe(before.seed);
        expect(storyActors(s, def).find(a => a.actorId === 'guest')!.hub.id).toBe('hub-infirmary');
    });
    it('keeps quiet visits repeatable, rotates daily lines, and never grants resources or advances chapter goals', () => { let s = begin(); s = finish(s, def.nodes[0]); const home = def.nodes.find(n => n.id === 'home-liora')!; s = finish(s, home); const original = structuredClone(s), line = nodeLines(home, s.worldStory!)[0].text.ja; s = finish(s, home); expect(nodeLines(home, s.worldStory!)[0].text.ja).not.toBe(line); expect(s.worldStory!.completed).toEqual(original.worldStory!.completed); expect(s.gold).toBe(original.gold); expect(s.stones).toBe(original.stones); expect(storyChapter(s.worldStory!, def)?.number).toBe(1); });
    it('persists a conversation mid-line and a notification acknowledgement in backups', () => { let s = begin(); s = arrive(s, def.nodes[0]); s = applyCommand(s, { type: 'worldTalkNext' }, content); const restored = decodeBackup(encodeBackup(s, content), content).save; expect(restored.worldStory).toEqual(s.worldStory); expect(storyText({ ja: '{name}、待ってる。', en: 'Waiting, {name}.' }, s.worldStory!.profile, 'en')).toBe('Waiting, ミオ.'); });
    it('never resets an old save or pretends prior conversations were read when joining a later chapter', () => { const old = createInitialSave(content, 55); old.completedDungeonIds = content.chapters!.slice(0, 2).flatMap(c => c.dungeonIds); old.gold = 12345; const s = begin('current', old); expect(s.worldStory!.carriedChapters).toEqual([1, 2]); expect(s.worldStory!.completed).toEqual([]); expect(storyChapter(s.worldStory!, def)?.number).toBe(3); expect(s.gold).toBe(old.gold); expect(old.worldStory).toBeUndefined(); expect(() => assertSaveCompatibility(s, content)).not.toThrow(); });
    it('keeps legacy sparse chapter records playable and familiar companions available', () => { const old = createInitialSave(content); old.completedDungeonIds = ['stone-fountain', 'hollow-gate']; let s = begin('current', old); expect(worldStoryLock('silent-cathedral', s, content)).toBeNull(); const ambient = def.nodes.find(n => n.id === 'home-seris')!; s = finish(s, ambient); expect(() => assertSaveCompatibility(s, content)).not.toThrow(); });
    it('does not let a dismissed incident resolve itself or acknowledge a future incident', () => { let s = begin(); expect(() => applyCommand(s, { type: 'worldIncidentNotice', incidentId: def.incidents[0].id }, content)).toThrow(); s = finish(s, def.nodes[0]); s.completedDungeonIds = content.chapters![0].dungeonIds.slice(0, 3); s = finish(s, def.nodes.find(n => n.id === 'c1-chart')!); const incident = activeWorldIncident(s, def)!; s = applyCommand(s, { type: 'worldIncidentNotice', incidentId: incident.id }, content); expect(s.worldStory!.notified).toContain(incident.id); expect(activeWorldIncident(s, def)?.id).toBe(incident.id); const home = def.nodes.find(n => n.id === 'home-liora')!; s = arrive(s, home); expect(s.worldStory!.active!.emergency).toBe(true); expect(nodeLines(home, s.worldStory!)[0].text.ja).toContain('足元'); s = applyCommand(s, { type: 'worldTalkClose' }, content); expect(activeWorldIncident(s, def)?.id).toBe(incident.id); });
    it('rejects corrupt state and unknown conversation references', () => { const s = begin(); for (const value of [{ ...s, worldStory: { ...s.worldStory, visits: { x: Infinity } } }, { ...s, worldStory: { ...s.worldStory, completed: ['fake-node'] } }]) {
        expect(() => assertSaveCompatibility(value as GameSave, content)).toThrow();
    } expect(() => assertValidSave({ ...s, worldStory: { ...s.worldStory, profile: { name: '', voice: 'invented' } } })).toThrow(); });
});
