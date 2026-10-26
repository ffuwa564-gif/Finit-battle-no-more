import { describe, expect, it } from 'vitest';
import { advanceFairyStep, fairyLessons, finishFairyTopic, moveFairyStep, newFairyProgress, openFairyTopic, parseFairyProgress, switchFairyTopic } from '../src/ui/fairy-tutorial-data';

describe('fairy tutorial preferences', () => {
  it('recovers corrupt preferences without touching game progress', () => {
    for (const raw of [null, '', 'broken', 'null', '{}', JSON.stringify({ ...newFairyProgress(), version: 3 }), JSON.stringify({ ...newFairyProgress(), topic: 'missing' }), JSON.stringify({ ...newFairyProgress(), step: 99 }), JSON.stringify({ ...newFairyProgress(), seen: ['home', 'home'] }), JSON.stringify({ ...newFairyProgress(), checkpoints: { battle: 100 } }), 'x'.repeat(5000)]) expect(parseFairyProgress(raw)).toEqual(newFairyProgress());
  });
  it('migrates existing players without offering the tutorial again or losing their saved lesson', () => {
    const migrated = parseFairyProgress(JSON.stringify({ version: 1, enrolled: true, dismissed: false, topic: 'home', step: 1, seen: ['party'] }));
    expect(migrated.offered).toBe(true); expect(migrated.step).toBe(1); expect(migrated.checkpoints).toEqual({ home: 1 }); expect(migrated.seen).toEqual(['party']);
    expect(parseFairyProgress(JSON.stringify(migrated))).toEqual(migrated);
  });
  it('remembers each screen independently when navigating away and back', () => {
    const home = advanceFairyStep(openFairyTopic(newFairyProgress(), 'home'));
    const party = advanceFairyStep(switchFairyTopic(home, 'party'));
    const returned = switchFairyTopic(party, 'home');
    expect(returned.step).toBe(1);
    expect(switchFairyTopic(parseFairyProgress(JSON.stringify(returned)), 'party').step).toBe(1);
    expect(parseFairyProgress(JSON.stringify(returned)).offered).toBe(true);
  });
  it('reopens unfinished help at its saved step and restarts only an explicitly requested completed topic', () => {
    let progress = advanceFairyStep(openFairyTopic(newFairyProgress(), 'home'));
    progress = moveFairyStep(switchFairyTopic(progress, 'battle'), 3);
    progress = finishFairyTopic(progress);
    expect(finishFairyTopic(progress)).toEqual(progress);
    const home = openFairyTopic(progress, 'home'); expect(home.step).toBe(1);
    expect(home.seen).toEqual(['battle']);
    const battle = openFairyTopic(home, 'battle'); expect(battle.step).toBe(0);
    expect(battle.checkpoints.home).toBe(1); expect(battle.seen).not.toContain('battle');
    const skipped = { ...battle, enrolled: false, dismissed: true };
    expect(parseFairyProgress(JSON.stringify(skipped))).toEqual(skipped);
  });
  it('completes a topic once without resetting the last displayed step', () => {
    const last = moveFairyStep(newFairyProgress(), 2);
    const done = advanceFairyStep(last);
    expect(done.seen).toEqual(['home']); expect(done.step).toBe(2);
    expect(advanceFairyStep(done)).toEqual(done);
    for (const lessons of Object.values(fairyLessons)) for (const lesson of lessons) { expect(lesson.target).toMatch(/^[a-z-]+$/); expect(lesson.text.length).toBeLessThan(180); }
  });
});
