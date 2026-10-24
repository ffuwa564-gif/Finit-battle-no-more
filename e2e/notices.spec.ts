import { test, expect } from '@playwright/test';

test('toast dismisses with its text intact and a new notice survives dismissal', async ({ page }) => {
  await page.goto('/#bag');
  const buy = page.getByRole('button', { name: '10 G で購入', exact: true });
  await buy.click();
  const toast = page.locator('.toast.notice-surface');
  await expect(toast).toContainText('回復薬を購入しました。');
  await expect(toast).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: '通知を閉じる', exact: true }).click();
  // Dismissal keeps readable content while the surface fades.
  await expect(toast).toHaveAttribute('aria-hidden', 'true');
  await expect(toast).toContainText('回復薬を購入しました。');
  await buy.click();
  await expect(toast).not.toHaveAttribute('aria-hidden');
  await expect(toast).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: '通知を閉じる', exact: true }).click();
  await expect(toast).toHaveCount(0);
});

test('reduced motion uses opacity without moving the notice', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#bag');
  await page.getByRole('button', { name: '10 G で購入', exact: true }).click();
  const toast = page.locator('.toast.notice-surface');
  await expect(toast).toHaveCSS('animation-name', 'notice-fade-in');
  await expect(toast).toHaveCSS('translate', 'none');
  await page.getByRole('button', { name: '通知を閉じる', exact: true }).click();
  await expect(toast).toHaveCount(0);
});
