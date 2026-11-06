import english from '../locales/en.json' with { type: 'json' };
import type { Content, GameSave } from './types';
import { activeWorldIncident, storyChapter, storyNext, type StoryText } from './world-story';
import { industryItem } from './industry';
export interface WorldObjective { kind: 'start' | 'talk' | 'dungeon' | 'craft' | 'done'; action: StoryText; reason: StoryText; goal: StoryText; chapter?: number; locationId?: string; nodeId?: string; dungeonId?: string; recipeId?: string; completed: number; total: number }
export function currentWorldObjective(save: GameSave, content: Content): WorldObjective {
  const s = save.worldStory, def = content.worldStory;
  const empty = { completed: 0, total: 0, goal: { ja: '少女たちとの旅', en: 'A journey with the girls' } };
  if (!s || !def) return { ...empty, kind: 'start', action: { ja: '最初の依頼を受ける', en: 'Accept your first request' }, reason: { ja: '主人公の名前を決め、リオラから聖堂の巡回を引き受ける。', en: 'Choose your name and accept Liora’s cathedral patrol.' } };
  const ch = storyChapter(s, def), next = storyNext(save, def);
  const continuation = Boolean(next?.node?.continuation);
  const nodes = def.nodes.filter(n => continuation ? n.continuation : n.chapter === ch?.number && !n.optional);
  const base = { goal: continuation ? {ja:'七管理者編',en:'The Seven Administrators'} : activeWorldIncident(save, def)?.title ?? ch?.objective ?? empty.goal, chapter: continuation ? undefined : ch?.number, completed: nodes.filter(n => s.completed.includes(n.id)).length, total: nodes.length };
  if (next?.recipeId) return { ...base, kind: 'craft', nodeId: next.node?.id, recipeId: next.recipeId, locationId: 'world-workshop', action: { ja: industryItem(next.recipeId).name.ja + 'を作る', en: 'Craft ' + industryItem(next.recipeId).name.en }, reason: next.node?.purpose ?? ch!.objective };
  if (next?.node) return { ...base, kind: 'talk', locationId: 'actor:' + next.node.actorId, nodeId: next.node.id, action: next.node.task ?? next.node.title, reason: next.node.purpose ?? ch!.objective };
  if (next?.dungeonId) { const d = content.dungeons.find(d => d.id === next.dungeonId)!; return { ...base, kind: 'dungeon', dungeonId: d.id, locationId: d.id, action: { ja: d.name + 'を踏破する', en: 'Clear ' + ((english as Record<string,string>)[d.name] ?? d.name) }, reason: ch!.explorationPurpose ?? ch!.objective }; }
  return { ...base, kind: 'done', action: { ja: '仲間たちのところへ帰る', en: 'Return to your companions' }, reason: { ja: '物語の続きを待つあいだ、会話や工房で日々を過ごせる。', en: 'Visit your companions and develop the workshop while awaiting the next chapter.' } };
}
