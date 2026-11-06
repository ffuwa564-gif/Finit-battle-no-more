import { test, expect } from '@playwright/test';
import { enterGame } from './boot';
async function openObjective(page: import('@playwright/test').Page) {
    await expect(page.locator('.world-story-objective, .home-world-story')).toHaveCount(0);
    await page.locator('.world-objective-dock__trigger').click();
    return page.getByRole('dialog', { name: /旅の大目標|Journey Objective/ });
}
async function checkObjective(page: import('@playwright/test').Page, text: string) {
    const panel = await openObjective(page);
    await expect(panel).toContainText(text);
    await panel.getByRole('button', { name: /^(閉じる|Close)$/ }).click();
    await expect(panel).toHaveCount(0);
}
async function start(page: import('@playwright/test').Page, name = 'ミオ', afterIntroduction = true) { await page.goto('/#dungeons'); await enterGame(page); await openObjective(page); await page.getByRole('dialog', { name: '旅の大目標', exact: true }).getByRole('button', { name: /最初の依頼を受ける/ }).click(); const form = page.getByRole('dialog', { name: '主人公の設定' }); await form.getByRole('textbox', { name: '名前', exact: true }).fill(name); await form.getByRole('combobox', { name: '話し方' }).selectOption('honest'); await form.getByRole('button', { name: '今の旅から始める' }).click(); await expect(form).toHaveCount(0);
    // Historical 1.22 saves had already read these scenes before accepting the first patrol.
    // Keep that explicit compatibility fixture; fresh progression is exercised separately below.
    if (afterIntroduction) {
        await page.evaluate(async () => {
            const { loadSave, persistSave } = await import('/src/platform/save.ts');
            const s = (await loadSave())!, revision = s.revision;
            s.worldStory!.completed = ['c1-hill', 'c1-offerings', 'c1-generation', 'c1-garden-rounds', 'c1-garden-night'];
            s.revision++; await persistSave(s, revision);
        });
        await page.reload(); await enterGame(page);
    }
}
async function finish(page: import('@playwright/test').Page) { const modal = page.locator('.world-conversation'); for (let i = 0; i < 30 && await modal.count(); i++) {
    const done = modal.getByRole('button', { name: '地図へ戻る', exact: true });
    if (await done.count()) {
        await done.click();
        await expect(modal).toHaveCount(0);
        return;
    }
    const line = await modal.locator('.world-conversation__line').getAttribute('data-world-line');
    await modal.getByRole('button', { name: '次の台詞', exact: true }).click();
    await expect(modal.locator('.world-conversation__line')).not.toHaveAttribute('data-world-line', line!);
} throw Error('Dialogue did not finish'); }
test('quiet days personalize and resume conversations, then rotate ordinary visits without rewards', async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await start(page);
    await page.clock.install();
    await checkObjective(page, 'リオラと巡回し、聖域へ続く道を開く');
    const dock = await page.locator('.world-objective-dock__trigger').boundingBox();
    expect(dock!.width).toBeGreaterThanOrEqual(44);
    expect(dock!.x + dock!.width).toBeLessThanOrEqual(390);
    await page.screenshot({ path: info.outputPath('compact-world-map.png') });
    await page.getByRole('button', { name: '自動移動', exact: true }).click();
    await page.clock.fastForward(46000);
    await page.getByRole('button', { name: '声をかける', exact: true }).click();
    await expect(page.locator('.world-conversation__line')).toContainText('ミオ');
    await page.getByRole('button', { name: '次の台詞', exact: true }).click();
    await expect(page.locator('.world-conversation__line')).toContainText('拾ったもの');
    const stage = page.locator('.world-conversation');
    const bounds = (await stage.boundingBox())!;
    expect(bounds.x).toBe(0); expect(bounds.y).toBe(0);
    expect(bounds.width).toBe(390); expect(bounds.height).toBe(844);
    await expect(stage.locator('.novel-backgrounds img.is-current')).toBeVisible();
    await page.getByRole('button', { name: '前の台詞', exact: true }).click();
    await expect(stage.locator('.world-conversation__line')).toContainText('ミオ');
    await page.getByRole('button', { name: '次の台詞', exact: true }).click();
    await expect(stage.locator('.world-conversation__line')).toContainText('拾ったもの');
    await page.screenshot({ path: info.outputPath('protagonist-conversation.png') });
    await page.reload();
    await enterGame(page);
    await expect(page.locator('.world-conversation__line')).toContainText('拾ったもの');
    await finish(page);
    await page.getByRole('button', { name: 'リオラ：支度はできたか', exact: true }).click();
    const line = await page.locator('.world-conversation__line').innerText();
    await finish(page);
    await page.getByRole('button', { name: 'リオラ：支度はできたか', exact: true }).click();
    await expect(page.locator('.world-conversation__line')).not.toHaveText(line);
    await finish(page);
    const s = await page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!);
    expect(s.worldStory!.profile.name).toBe('ミオ');
    expect(s.worldStory!.visits!['home-liora']).toBe(2);
    expect(s.gold).toBe(100);
    expect(s.stones).toBe(0);
    expect(s.worldStory!.completed).not.toContain('c1-return');
    for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    }
});
test('a real story trigger raises an alert, persists on the home screen, and returns to everyday life after resolution', async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await start(page);
    await page.evaluate(async () => {
        const { content } = await import('/src/content/index.ts');
        const { applyCommand } = await import('/src/application/game.ts');
        const { nodeLines } = await import('/src/domain/world-story.ts');
        const { loadSave, persistSave } = await import('/src/platform/save.ts');
        let s = (await loadSave())!;
        const revision = s.revision;
        for (const id of ['c1-job', 'c1-chart']) {
            const n = content.worldStory!.nodes.find(n => n.id === id)!;
            if (id === 'c1-chart')
                s.completedDungeonIds = content.chapters![0].dungeonIds.slice(0, 3);
            s = applyCommand(s, { type: 'worldTravel', destinationId: n.hubId }, content, { now: 1000 });
            s = applyCommand(s, { type: 'worldTalk', nodeId: id }, content, { now: 47000 });
            while (s.worldStory!.active!.line < nodeLines(n, s.worldStory!).length - 1)
                s = applyCommand(s, { type: 'worldTalkNext' }, content);
            s = applyCommand(s, { type: 'worldTalkFinish' }, content);
        }
        s.revision = revision + 1;
        await persistSave(s, revision);
    });
    await page.reload();
    await enterGame(page);
    const alert = page.getByRole('dialog', { name: '事件発生', exact: true });
    await expect(alert).toContainText('聖域から応答がない');
    await page.screenshot({ path: info.outputPath('incident-alert.png') });
    await alert.getByRole('button', { name: 'あとで向かう' }).click();
    await page.getByRole('navigation', { name: 'モバイルメニュー', exact: true }).getByRole('button', { name: 'ホーム', exact: true }).click();
    await expect(page.locator('.world-objective-dock--home')).toHaveClass(/is-incident/);
    const goalIcon = await page.locator('.world-objective-dock__trigger').boundingBox();
    const playback = await page.locator('.animated-illustration__toggle').boundingBox();
    expect(goalIcon!.y).toBeGreaterThanOrEqual(playback!.y + playback!.height + 4);
    expect(Math.abs(goalIcon!.x - playback!.x)).toBeLessThan(2);
    await page.screenshot({ path: info.outputPath('home-compact-objective.png') });
    await checkObjective(page, '事件発生');
    await page.screenshot({ path: info.outputPath('home-incident.png') });
    await page.reload();
    await enterGame(page);
    await expect(alert).toHaveCount(0);
    await checkObjective(page, '聖域から応答がない');
    await page.evaluate(async () => { const { content } = await import('/src/content/index.ts'); const { loadSave, persistSave } = await import('/src/platform/save.ts'); const s = (await loadSave())!, r = s.revision; s.completedDungeonIds = content.chapters![0].dungeonIds; s.worldStory!.completed = content.worldStory!.nodes.filter(n => n.chapter === 1 && !n.optional).map(n => n.id); s.revision++; await persistSave(s, r); });
    await page.reload();
    await enterGame(page);
    await checkObjective(page, '温室の研究を手伝う');
    await expect(page.locator('.world-objective-dock--home')).not.toHaveClass(/is-incident/);
});

test('language settings translate actor hints and the personalized conversation',async({page})=>{
 await page.setViewportSize({width:320,height:740});await start(page,'Mio');
 await page.goto('/#settings');await page.getByRole('button',{name:'English',exact:true}).click();await page.goto('/#dungeons');
 await checkObjective(page, 'Accept your first request from Liora');
 expect(await page.locator('.world-map__hint').innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
 await page.clock.install();await page.locator('.world-map__travel').click();await page.clock.fastForward(46000);await page.locator('.world-map__travel').click();
 await expect(page.locator('.world-conversation__line')).toContainText('Mio');
 expect(await page.locator('.world-conversation').innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('Liora offers an unbidden oath, then rests in the garden woman’s arms before chapter one can end', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await start(page);
    await page.evaluate(async () => {
        const { content } = await import('/src/content/index.ts');
        const { applyCommand } = await import('/src/application/game.ts');
        const { loadSave, persistSave } = await import('/src/platform/save.ts');
        let s = (await loadSave())!;
        const revision = s.revision;
        s.completedDungeonIds = content.chapters![0].dungeonIds;
        s.worldStory!.completed.push('c1-job', 'c1-chart', 'c1-wolf', 'c1-water-report', 'c1-lantern-report', 'c1-flowers', 'c1-care');
        s.worldStory!.notified = ['sanctuary-silence'];
        s = applyCommand(s, { type: 'worldTravel', destinationId: 'hub-garden' }, content, { now: 1000 });
        s = applyCommand(s, { type: 'worldTalk', nodeId: 'c1-oath' }, content, { now: 47000 });
        // Old active dialogue keeps its full text and original page position.
        delete s.worldStory!.active!.briefing;
        for (let i = 0; i < 3; i++) s = applyCommand(s, { type: 'worldTalkNext' }, content);
        s.revision = revision + 1;
        await persistSave(s, revision);
    });
    await page.reload();
    await enterGame(page);
    const modal = page.locator('.world-conversation');
    await expect(modal.locator('.world-conversation__line')).toContainText('どうか、お命じください');
    await finish(page);
    await checkObjective(page, '寝込んだリオラ');
    await page.getByRole('button', { name: '声をかける', exact: true }).click();
    await expect(modal).toContainText('寝台');
    for (let i = 0; i < 2; i++) await modal.getByRole('button', { name: '次の台詞', exact: true }).click();
    await expect(modal.locator('.world-conversation__line')).toContainText('抱き上げ');
    await finish(page);
    const s = await page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!);
    expect(s.worldStory!.completed).toContain('c1-held');
    expect(s.worldStory!.completed).not.toContain('c1-return');
    await checkObjective(page, '翌朝のリオラ');
});

test('a fresh journey accepts a short request and reaches its first exploration without the garden tour', async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await start(page, 'ミオ', false);
    await page.clock.install();
    await checkObjective(page, 'リオラから最初の依頼を受ける');
    await page.getByRole('button', { name: '自動移動', exact: true }).click();
    const journey = await page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!.worldStory!.journey!);
    expect(journey.arrivesAt - journey.startedAt).toBeLessThanOrEqual(8000);
    await page.clock.fastForward(9000);
    await page.getByRole('button', { name: '声をかける', exact: true }).click();
    const modal = page.locator('.world-conversation');
    for (let line = 0; line < 3; line++) {
        await expect(modal.locator('.world-conversation__line')).toHaveAttribute('data-world-node', 'c1-job');
        await expect(modal.locator('.world-conversation__line')).toHaveAttribute('data-world-line', String(line));
        if (line < 2) await modal.getByRole('button', { name: '次の台詞', exact: true }).click();
    }
    await modal.getByRole('button', { name: '地図へ戻る', exact: true }).click();
    await checkObjective(page, '聖堂');
    await openObjective(page);
    await page.locator('.world-story-objective__main').click();
    await page.screenshot({ path: info.outputPath('first-patrol-request.png') });
    const save = await page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!);
    expect(save.worldStory!.completed).toEqual(['c1-job']);
    expect(save.completedDungeonIds).toEqual([]);
    expect(save.gold).toBe(100);
    await page.getByRole('button', { name: '自動移動', exact: true }).click();
    await page.clock.fastForward(9000);
    await page.getByRole('button', { name: '探索の準備', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('聖堂');
});

test('the optional garden night remains readable in full from the journal', async ({ page }, info) => {
    await start(page);
    // Explicit historical record: this optional scene used to precede the first patrol.
    const before = await page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!);
    await openObjective(page);
    await page.getByRole('button', { name: '旅の記録', exact: true }).click();
    await page.getByRole('dialog', { name: '旅の記録', exact: true }).getByRole('button', { name: '庭園の夜', exact: true }).click();
    const modal = page.locator('.world-conversation');
    const text: string[] = [];
    for (let i = 0; i < 17; i++) {
        await expect(modal.locator('.world-conversation__line')).toHaveAttribute('data-world-line', String(i));
        text.push(await modal.locator('.world-conversation__line').innerText());
        if (i < 16) await modal.getByRole('button', { name: '次の台詞', exact: true }).click();
    }
    expect(text.join('\n')).toContain('自分が誰よりも愛されている');
    expect(text.join('\n')).toContain('かわいそうなひと');
    await page.screenshot({ path: info.outputPath('optional-garden-night.png') });
    await modal.getByRole('button', { name: '地図へ戻る', exact: true }).click();
    const after = await page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!);
    expect(after.worldStory!.completed).toEqual(before.worldStory!.completed);
    expect(after.gold).toBe(before.gold);
    expect(after.materials).toEqual(before.materials);
});
