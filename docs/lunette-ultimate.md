# Lunette: rabbit-bit summon ultimate

Lunette and awakened Lunette use the dedicated `rabbit-bits` presentation. Four illustrated mechanical rabbits materialize through small clock gates, aim at the target, fire sixteen short converging shots, pause briefly, then release a combined finishing blast, recoil, and fade away. An animated segmented seal connects the summon gates; spiraling charge sparks, broad muzzle blooms, a white-core burst, a dispersing shock ring and plasma fragments emphasize the volley. The supplementary summon buff arpeggio has been removed: it was the remaining short melodic cue after the PV's confirmation pops were removed. A single finishing whiteout covers the battle layout, rises into white, briefly holds and reveals the battlefield before the next replay action. It follows the ultimate clock through speed changes, disappears on skip, and is omitted in reduced-motion/data-saving modes. The volley and finisher use the shared `RABBIT_VOLLEY` visual/audio deadlines. The dedicated synthesized `ultimate-rabbits` voice has sixteen plasma transients followed by a final low blast and two discrete delay echoes (+170 ms, +340 ms), without bell-like metallic ringing. The Pixi canvas owns the final fade so the generic tail transition cannot hide the finisher.

This is the presentation of Lunette's existing single area-attack ultimate. Damage, target resolution, charge, and cooldown rules are unchanged. The transient visual rabbits do not add repeated battle actions or the persistent enemy-only automatic bits.

The source artwork is the project's four transparent mechanical rabbits, generated for the Lunette PV from `public/art/event-lunette-awakened.png`. The accepted sheet was `/workspace/generated_images/exec-c28bdba1-4014-45f5-890f-58ce002beb5b.png`; separate alpha PNG exports were originally delivered in the `downloads/lunette-pv` media branch, `Lunette-v5/rabbits/`. Copies now live in `public/art/lunette-bit-{1,2,3,4}.png` and are registered as original project illustrations in `src/content/lunette-ultimate.ts`. No third-party character art, PV footage, or additional generation is used.

Pixi loads these textures only for the rabbit presentation and keeps them in the asset cache. The SVG fallback also uses the four rabbit images rather than a star-burst substitute. Reduced-motion and data-saving modes keep the readable static cut-in without loading the rabbit effect textures. Existing enemy target routing is retained.

## Weapon audio revision

`rabbit-volley-audio.ts` separates each shot into a falling-pitch plasma core with harmonics, a low-mid pressure burst, and a restrained high-frequency attack. The finisher has a separate low detonation and two darker delay returns. No metallic bell or UI note layers are used. In PV edits, only shot deadlines are retimed; individual transients are synthesized at their original duration instead of stretching the entire gun recording. This avoids smearing the repeated attacks.

Research consulted (methods only; no source audio reused):

- David Dumais, [How to create laser gun sound effect layers](https://www.daviddumaisaudio.com/how-to-create-laser-gun-sound-effect-layers/): independent transient shaping and falling pitch contours.
- Mark Kilborn / Pro Sound Effects, [FPS gunshot design](https://blog.prosoundeffects.com/how-to-sound-design-first-person-shooter-gunshot-sound-effects-with-mark-kilborn): separate transient, body, sub, mechanical and tail layers. We deliberately omit the metallic mechanical layer for this character.

The filming source consists of JPEG screencast frames with no audio stream. The PV audio is assembled explicitly from the selected BGM, a non-melodic opening sweep and this original volley. V12 contains no added buff, confirm, select or tap cues. The BGM retains its own percussion. An isolated SFX-only gameplay clip is supplied separately for review.
