import { test, expect, type Locator } from '@playwright/test';
import { enterGame } from './boot';

async function matchingLayout(root: Locator, expected: { path: string; width: number; height: number }) {
  const image = root.locator('img'), video = root.locator('video');
  await expect(image).toHaveAttribute('src', `/${expected.path}`);
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])).toEqual([expected.width, expected.height]);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => [v.videoWidth, v.videoHeight])).toEqual([expected.width, expected.height]);
  const layouts = await root.evaluate(element => ['img', 'video'].map(tag => {
    const node = element.querySelector(tag)!; const rect = node.getBoundingClientRect(); const style = getComputedStyle(node);
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, fit: style.objectFit, position: style.objectPosition, transform: style.transform };
  }));
  expect(layouts[0]).toEqual(layouts[1]);
}

test('all animated characters use their matching full and independently cropped portrait posters', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#preview'); await enterGame(page);
  const animated = await page.evaluate(async () => {
    const { content } = await import('/src/content/index.ts');
    return content.characters.flatMap((character, index) => {
      if (!character.motionId) return [];
      const full = content.assets.find(asset => asset.id === character.motionId)!;
      const portrait = content.assets.find(asset => asset.id === character.portraitMotionId)!;
      return [{ index, full: content.assets.find(asset => asset.id === full.posterId)!, portrait: content.assets.find(asset => asset.id === portrait.posterId)! }];
    });
  });
  for (const character of animated) {
    const card = page.locator('.character-card').nth(character.index);
    await card.scrollIntoViewIfNeeded();
    await matchingLayout(card.locator('.animated-illustration'), character.portrait);
    await card.getByRole('button').click();
    await matchingLayout(page.getByRole('dialog').locator('.animated-illustration'), character.full);
    await page.getByRole('dialog').getByRole('button', { name: '閉じる', exact: true }).click();
  }
});

test('default home retains matching framing when reduced motion turns the video off', async ({ page }) => {
  await page.goto('/'); await enterGame(page);
  const expected = await page.evaluate(async () => {
    const { content } = await import('/src/content/index.ts');
    const motion = content.assets.find(asset => asset.id === 'home-portrait-motion')!;
    return content.assets.find(asset => asset.id === motion.posterId)!;
  });
  const root = page.locator('.home-artwork .animated-illustration');
  await matchingLayout(root, expected);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(root).toHaveAttribute('data-animation-state', 'static');
  await expect(root.locator('img')).toHaveAttribute('src', `/${expected.path}`);
  await expect(root.locator('video')).not.toHaveAttribute('src');
});
