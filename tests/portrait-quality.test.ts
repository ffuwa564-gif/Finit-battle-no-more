import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../src/content';

describe('enlarged animated face media', () => {
  it('retains lightweight collection movies and supplies double-resolution matching faces', () => {
    expect(validateContent(content)).toEqual([]);
    for (const character of content.characters.filter(character => character.portraitMotionId)) {
      const low = content.assets.find(asset => asset.id === character.portraitMotionId)!;
      const high = content.assets.find(asset => asset.id === low.highResolutionId)!;
      expect([low.width,low.height]).toEqual([320,480]);
      expect([high.width,high.height]).toEqual([640,960]);
      expect(high.path).not.toBe(low.path);
      const poster = content.assets.find(asset => asset.id === high.posterId)!;
      expect([poster.width,poster.height]).toEqual([640,960]);
    }
  });
  it('rejects missing and mismatched quality variants instead of silently returning to low resolution', () => {
    for (const mutation of ['missing','small','aspect'] as const) {
      const changed = structuredClone(content);
      const low = changed.assets.find(asset => asset.id === 'asteria-portrait-motion')!;
      if (mutation === 'missing') delete low.highResolutionId;
      else {
        const high = changed.assets.find(asset => asset.id === low.highResolutionId)!;
        if (mutation === 'small') high.width = 320;
        else high.height = 1000;
      }
      expect(validateContent(changed).some(error => /high-resolution/.test(error))).toBe(true);
    }
  });
});
