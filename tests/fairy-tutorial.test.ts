import { describe, expect, it } from 'vitest';
import { fairyLessons, finishFairyTopic, newFairyProgress, parseFairyProgress } from '../src/ui/fairy-tutorial-data';

describe('fairy tutorial preferences', () => {
  it('recovers from corrupt or outdated preferences without touching game progress', () => {
    for (const raw of [null, '', 'broken', 'null', '{}', JSON.stringify({ ...newFairyProgress(), version: 2 }), JSON.stringify({ ...newFairyProgress(), topic: 'missing' }), JSON.stringify({ ...newFairyProgress(), step: 99 }), JSON.stringify({ ...newFairyProgress(), seen: ['home', 'home'] }), 'x'.repeat(5000)]) expect(parseFairyProgress(raw)).toEqual(newFairyProgress());
  });
  it('preserves paused lessons and skipped preferences and records a topic only once', () => {
    const current = { ...newFairyProgress(), enrolled: true, topic: 'battle' as const, step: 2 };
    expect(parseFairyProgress(JSON.stringify(current))).toEqual(current);
    const done = finishFairyTopic(current);
    expect(done.seen).toEqual(['battle']); expect(done.step).toBe(0);
    expect(finishFairyTopic(done)).toEqual(done);
    const skipped = { ...current, enrolled: false, dismissed: true };
    expect(parseFairyProgress(JSON.stringify(skipped))).toEqual(skipped);
  });
  it('anchors every lesson and keeps the initial introduction short', () => {
    expect(fairyLessons.home).toHaveLength(3);
    for (const lessons of Object.values(fairyLessons)) {
      expect(lessons.length).toBeGreaterThan(0);
      for (const lesson of lessons) { expect(lesson.target).toMatch(/^[a-z-]+$/); expect(lesson.title.length).toBeGreaterThan(0); expect(lesson.text.length).toBeLessThan(180); }
    }
  });
});
