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
async function start(page: import('@playwright/test').Page, name = 'ミオ', afterIntroduction = true) { await page.goto('/#dungeons'); await enterGame(page); await openObjective(page); await page.getByRole('button', { name: /少女たちと旅を始める/ }).click(); const form = page.getByRole('dialog', { name: '主人公の設定' }); await form.getByRole('textbox', { name: '名前', exact: true }).fill(name); await form.getByRole('combobox', { name: '話し方' }).selectOption('honest'); await form.getByRole('button', { name: '今の旅から始める' }).click(); await expect(form).toHaveCount(0);
    // Existing regressions begin at the first job; the introduction has its own real-UI traversal below.
    if (afterIntroduction) {
        await page.evaluate(async () => {
            const { content } = await import('/src/content/index.ts');
            const { applyCommand } = await import('/src/application/game.ts');
            const { nodeLines } = await import('/src/domain/world-story.ts');
            const { loadSave, persistSave } = await import('/src/platform/save.ts');
            let s = (await loadSave())!; const revision = s.revision;
            for (const id of ['c1-hill', 'c1-offerings', 'c1-generation', 'c1-garden-rounds', 'c1-garden-night']) {
                const n = content.worldStory!.nodes.find(n => n.id === id)!;
                s = applyCommand(s, { type: 'worldTravel', destinationId: n.hubId }, content, { now: 1000 });
                s = applyCommand(s, { type: 'worldTalk', nodeId: id }, content, { now: 47000 });
                while (s.worldStory!.active!.line < nodeLines(n, s.worldStory!).length - 1)
                    s = applyCommand(s, { type: 'worldTalkNext' }, content);
                s = applyCommand(s, { type: 'worldTalkFinish' }, content);
            }
            s.revision = revision + 1; await persistSave(s, revision);
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
    await checkObjective(page, '街の日常');
    const dock = await page.locator('.world-objective-dock__trigger').boundingBox();
    expect(dock!.width).toBeGreaterThanOrEqual(44);
    expect(dock!.x + dock!.width).toBeLessThanOrEqual(390);
    await page.screenshot({ path: info.outputPath('compact-world-map.png') });
    await page.getByRole('button', { name: '自動移動', exact: true }).click();
    await page.clock.fastForward(46000);
    await page.getByRole('button', { name: '声をかける', exact: true }).click();
    await expect(page.locator('.world-conversation__line')).toContainText('ミオ');
    await page.getByRole('button', { name: '次の台詞', exact: true }).click();
    await expect(page.locator('.world-conversation__line')).toContainText('地図が逆');
    const stage = page.locator('.world-conversation');
    const bounds = (await stage.boundingBox())!;
    expect(bounds.x).toBe(0); expect(bounds.y).toBe(0);
    expect(bounds.width).toBe(390); expect(bounds.height).toBe(844);
    await expect(stage.locator('.novel-backgrounds img.is-current')).toBeVisible();
    await page.getByRole('button', { name: '前の台詞', exact: true }).click();
    await expect(stage.locator('.world-conversation__line')).toContainText('ミオ');
    await page.getByRole('button', { name: '次の台詞', exact: true }).click();
    await expect(stage.locator('.world-conversation__line')).toContainText('地図が逆');
    await page.screenshot({ path: info.outputPath('protagonist-conversation.png') });
    await page.reload();
    await enterGame(page);
    await expect(page.locator('.world-conversation__line')).toContainText('地図が逆');
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
    await checkObjective(page, '街の日常');
    await expect(page.locator('.world-objective-dock--home')).not.toHaveClass(/is-incident/);
});

test('language settings translate actor hints and the personalized conversation',async({page})=>{
 await page.setViewportSize({width:320,height:740});await start(page,'Mio');
 await page.goto('/#settings');await page.getByRole('button',{name:'English',exact:true}).click();await page.goto('/#dungeons');
 await checkObjective(page, 'Everyday Life');
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
        s.worldStory!.completed.push('c1-job', 'c1-chart', 'c1-wolf', 'c1-flowers', 'c1-care');
        s.worldStory!.notified = ['sanctuary-silence'];
        s = applyCommand(s, { type: 'worldTravel', destinationId: 'hub-garden' }, content, { now: 1000 });
        s = applyCommand(s, { type: 'worldTalk', nodeId: 'c1-oath' }, content, { now: 47000 });
        for (let i = 0; i < 3; i++) s = applyCommand(s, { type: 'worldTalkNext' }, content);
        s.revision = revision + 1;
        await persistSave(s, revision);
    });
    await page.reload();
    await enterGame(page);
    const modal = page.locator('.world-conversation');
    await expect(modal.locator('.world-conversation__line')).toContainText('どうか、お命じください');
    await finish(page);
    await checkObjective(page, 'リオラの様子を見たい');
    await page.getByRole('button', { name: '声をかける', exact: true }).click();
    await expect(modal).toContainText('寝台から起き上がれなかった');
    for (let i = 0; i < 5; i++) await modal.getByRole('button', { name: '次の台詞', exact: true }).click();
    await expect(modal.locator('.world-conversation__line strong')).toHaveText('庭園の女');
    await expect(modal.locator('.world-conversation__line')).toContainText('こっちを向いて');
    for (let i = 0; i < 4; i++) await modal.getByRole('button', { name: '次の台詞', exact: true }).click();
    await expect(modal.locator('.world-conversation__line')).toContainText('抱き上げられても離さず');
    await finish(page);
    const s = await page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!);
    expect(s.worldStory!.completed).toContain('c1-held');
    expect(s.worldStory!.completed).not.toContain('c1-return');
    await checkObjective(page, '朝、寝台を訪ねる');
});

test('chapter one begins with the tower, offerings, a birth, and the garden keeper’s private night', async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await start(page, 'ミオ', false);
    await page.clock.install();
    const readScene = async (id: string) => {
        await openObjective(page);
        await page.locator('.world-story-objective__main').click();
        const travel = page.getByRole('button', { name: '自動移動', exact: true });
        if (await travel.count()) {
            await travel.click();
            await page.clock.fastForward(46000);
        }
        await page.getByRole('button', { name: '声をかける', exact: true }).click();
        const modal = page.locator('.world-conversation');
        await expect(modal.locator('.world-conversation__line')).toHaveAttribute('data-world-node', id);
        const lines: string[] = [];
        for (let i = 0; i < 30; i++) {
            await expect(modal.locator('.world-conversation__line')).toHaveAttribute('data-world-line', String(i));
            lines.push(await modal.locator('.world-conversation__line').innerText());
            const done = modal.getByRole('button', { name: '地図へ戻る', exact: true });
            if (await done.count()) {
                if (id === 'c1-garden-night') await page.screenshot({ path: info.outputPath('garden-night.png') });
                await done.click(); await expect(modal).toHaveCount(0);
                return lines.join('\n');
            }
            await modal.getByRole('button', { name: '次の台詞', exact: true }).click();
        }
        throw Error('Introduction scene did not finish: ' + id);
    };
    const hill = await readScene('c1-hill');
    expect(hill).toContain('ミオ');
    expect(hill).toContain('白亜の塔');
    expect(hill).toContain('女の子しかいない');
    const offerings = await readScene('c1-offerings');
    expect(offerings).toContain('宝石を集める少女');
    expect(offerings).toContain('擦りむいた指');
    const birth = await readScene('c1-generation');
    expect(birth).toContain('生まれてくれて、ありがとう');
    expect(birth).toContain('三人は手をつないだ');
    expect(birth).toContain('欲望の扉');
    const rounds = await readScene('c1-garden-rounds');
    expect(rounds).toContain('今日は、こんなにお花を集めたんだね');
    const night = await readScene('c1-garden-night');
    expect(night).toContain('別の庭園の管理者');
    expect(night).toContain('かわいそうなひと');
    expect(night).toContain('自分が誰よりも愛されている');
    await checkObjective(page, '初仕事の話をしよう');
    const save = await page.evaluate(async () => (await (await import('/src/platform/save.ts')).loadSave())!);
    expect(save.gold).toBe(100); expect(save.stones).toBe(0);
    expect(save.worldStory!.completed).not.toContain('c1-job');
});
