import { expect, type Page } from '@playwright/test';

/** Start through the real audio-unlocking title gesture after a document load. */
export async function enterGame(page: Page) {
  await page.locator('.title-screen__start, .app-shell').first().waitFor();
  if (!await page.locator('.title-screen').count()) return;
  await page.getByRole('button', { name: 'タップしてはじめる', exact: true }).click();
  await expect(page.locator('.title-screen')).toHaveCount(0);
}
