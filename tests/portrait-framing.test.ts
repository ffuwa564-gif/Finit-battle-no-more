import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../src/content';
import { FACE_FRAME_ASPECTS, portraitHeadFits } from '../src/content/portrait-framing';
import { scoutRecruitments } from '../src/content/scout-maidens';

const portraits = scoutRecruitments.map(({characterId}) => content.assets.find(a=>a.id===`${characterId}-portrait`)!);
describe('reviewed face framing', () => {
  it('keeps every scout head inside all supported face-window shapes', () => {
    expect(portraits).toHaveLength(4);
    for (const asset of portraits) for (const aspect of FACE_FRAME_ASPECTS) expect(portraitHeadFits(asset,aspect),`${asset.id} at ${aspect}`).toBe(true);
  });
  it('rejects the previous crop which showed the torso instead of the head', () => {
    const changed = structuredClone(content);
    for (const asset of changed.assets.filter(a=>portraits.some(p=>p.id===a.id))) Object.assign(asset,{anchor:'50% 16%',portraitZoom:2.8,portraitOrigin:'50% 16%'});
    const errors = validateContent(changed);
    for (const asset of portraits) expect(errors).toContain(`assets/${asset.id}: portrait head clipped by face framing`);
  });
  it('requires reviewed bounds for new scouts and rejects invalid/out-of-image bounds', () => {
    for (const bounds of [undefined,{x:NaN,y:0,width:.2,height:.2},{x:.9,y:0,width:.2,height:.2},{x:.4,y:0,width:-.2,height:.2}]) {
      const changed=structuredClone(content),asset=changed.assets.find(a=>a.id==='ione-portrait')!;
      asset.portraitHead=bounds;
      expect(validateContent(changed).some(e=>e.startsWith('assets/ione-portrait:')&&e.includes('head'))).toBe(true);
    }
  });
});
