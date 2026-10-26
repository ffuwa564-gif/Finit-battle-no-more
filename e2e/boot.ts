import { expect, type Page } from '@playwright/test';

/** Start through the real audio-unlocking title gesture after a document load. */
export async function enterGame(page: Page) {
  await page.locator('.title-screen__start, .app-shell').first().waitFor();
  if (!await page.locator('.title-screen').count()) { await skipStory(page); return; }
  await page.getByRole('button', { name: 'タップしてはじめる', exact: true }).click();
  await expect(page.locator('.title-screen')).toHaveCount(0);
  await skipStory(page);
}

/** Non-story regression tests explicitly skip the opening through the real UI. */
export async function skipStory(target: Page | import('@playwright/test').FrameLocator) {
  await expect(target.locator('.title-screen')).toHaveCount(0);
  if (!await target.locator('.visual-novel').count()) return;
  await target.getByRole('button', { name: /^(物語をスキップ|Skip Story)$/ }).click();
  await target.getByRole('button', { name: /^(スキップして進む|Skip and Continue)$/ }).click();
  await expect(target.locator('.visual-novel')).toHaveCount(0);
}
