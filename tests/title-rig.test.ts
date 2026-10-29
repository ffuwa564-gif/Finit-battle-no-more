import { describe, expect, it } from 'vitest';
import { titleRigOffset } from '../src/platform/title-rig';

describe('the title character keeps its drawn anatomy', () => {
  it('pins the entire head and face at every phase', () => {
    for (const seconds of [0, 1, 3.1, 5.8, 12, 26])
      for (const u of [0, .2, .5, .8, 1])
        for (const v of [0, .08, .15, .22])
          expect(titleRigOffset(u, v, seconds)).toEqual({ x: 0, y: 0 });
  });
  it('keeps hair and cloth within 4.5 scene pixels while retaining visible movement', () => {
    let moving = 0;
    for (let time = 0; time < 30; time += .37)
      for (let u = 0; u <= 1; u += .1)
        for (let v = .23; v <= 1; v += .07) {
          const { x, y } = titleRigOffset(u, v, time);
          expect(Math.abs(x)).toBeLessThan(4.46);
          expect(Math.abs(y)).toBeLessThan(1.56);
          if (Math.abs(x) > .4) moving++;
        }
    expect(moving).toBeGreaterThan(100);
  });
});
