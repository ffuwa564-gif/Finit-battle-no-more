import type { AssetDef } from '../domain/types';

/** User-approved three-piece composition; old full-frame bloom footage is intentionally excluded. */
const rights = 'Original AI-generated project art and Runway animation for STILLVEIL. Fixed original frame geometry with a newly generated light pass; separately generated bud-to-bloom flower and crystal. See docs/living-garden.md.';
const fairyRights = 'Original AI-generated white-haired fairy art and Runway animation for STILLVEIL. See docs/battle-fairies.md.';
const roleRights = 'Original AI-generated STILLVEIL crystal emblems and white-to-black bloom, animated with Runway. See docs/crystal-resonance.md and docs/role-crystal-assets.json.';
export const livingGardenArt: AssetDef[] = [
  { id: 'living-garden-frame', path: 'art/living-garden/frame-poster.png', kind: 'illustration', width: 720, height: 960, anchor: '50% 50%', rights },
  { id: 'living-garden-idle-motion', path: 'art/living-garden/frame-circulating-light.webp', kind: 'illustration', width: 720, height: 960, anchor: '50% 50%', rights },
  { id: 'living-garden-bud', path: 'art/living-garden/flower-bud-poster.png', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights },
  { id: 'living-garden-bloom-motion', path: 'art/living-garden/flower-bud-bloom.webp', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights },
  { id: 'living-garden-bloom-poster', path: 'art/living-garden/flower-open-poster.png', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights },
  { id: 'living-garden-crystal', path: 'art/living-garden/crystal-poster.png', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights },
  { id: 'living-garden-crystal-motion', path: 'art/living-garden/crystal-motion.webp', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights },
  { id: 'living-garden-fairy-right-motion', path: 'art/living-garden/fairy-facing-right.webp', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: fairyRights },
  { id: 'living-garden-fairy-right-poster', path: 'art/living-garden/fairy-facing-right-poster.png', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: fairyRights },
  { id: 'living-garden-fairy-left-motion', path: 'art/living-garden/fairy-facing-left.webp', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: fairyRights },
  { id: 'living-garden-fairy-left-poster', path: 'art/living-garden/fairy-facing-left-poster.png', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: fairyRights },
  { id: 'living-garden-role-healer-motion', path: 'art/living-garden/crystal-healer-motion.webp', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: roleRights },
  { id: 'living-garden-role-healer-poster', path: 'art/living-garden/crystal-healer-poster.png', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: roleRights },
  { id: 'living-garden-role-tank-motion', path: 'art/living-garden/crystal-tank-motion.webp', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: roleRights },
  { id: 'living-garden-role-tank-poster', path: 'art/living-garden/crystal-tank-poster.png', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: roleRights },
  { id: 'living-garden-role-attacker-motion', path: 'art/living-garden/crystal-attacker-motion.webp', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: roleRights },
  { id: 'living-garden-role-attacker-poster', path: 'art/living-garden/crystal-attacker-poster.png', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: roleRights },
  { id: 'living-garden-role-area-attacker-motion', path: 'art/living-garden/crystal-area_attacker-motion.webp', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: roleRights },
  { id: 'living-garden-role-area-attacker-poster', path: 'art/living-garden/crystal-area_attacker-poster.png', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: roleRights },
  { id: 'living-garden-role-supporter-motion', path: 'art/living-garden/crystal-supporter-motion.webp', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: roleRights },
  { id: 'living-garden-role-supporter-poster', path: 'art/living-garden/crystal-supporter-poster.png', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: roleRights },
  { id: 'living-garden-role-debuffer-motion', path: 'art/living-garden/crystal-debuffer-motion.webp', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: roleRights },
  { id: 'living-garden-role-debuffer-poster', path: 'art/living-garden/crystal-debuffer-poster.png', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: roleRights },
  { id: 'living-garden-black-bloom-motion', path: 'art/living-garden/black-flower-bloom.webp', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: roleRights },
  { id: 'living-garden-black-bloom-poster', path: 'art/living-garden/black-flower-open.png', kind: 'illustration', width: 512, height: 512, anchor: '50% 50%', rights: roleRights },
];
