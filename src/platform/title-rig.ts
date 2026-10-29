const smooth = (a: number, b: number, value: number) => {
  const x = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

/** Authored offsets in scene pixels for a 500px-tall character. The entire head is pinned. */
export function titleRigOffset(u: number, v: number, seconds: number) {
  if (v <= .22) return { x: 0, y: 0 };
  const edge = smooth(.12, .39, Math.abs(u - .5));
  const hair = edge * smooth(.22, .42, v) * (1 - smooth(.63, .83, v));
  const hem = smooth(.58, .96, v);
  const torso = (1 - edge) * smooth(.22, .29, v) * (1 - smooth(.42, .57, v));
  const breathing = Math.sin(seconds * Math.PI * 2 / 5.8);
  return {
    x: 2.8 * hair * Math.sin(seconds * .83 + v * 3.2) + 1.65 * hem * Math.sin(seconds * .61 + u * 2.1),
    y: -.9 * torso * breathing + .25 * hair * Math.sin(seconds * .83 + v * 2) + .4 * hem * Math.sin(seconds * .61 + u * 2.1),
  };
}
