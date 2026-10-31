# Lunette: rabbit-bit summon ultimate

Lunette and awakened Lunette use the dedicated `rabbit-bits` presentation. Four illustrated mechanical rabbits materialize through small clock gates, aim at the target, fire sixteen short converging shots, pause briefly, then release a combined finishing blast, recoil, and fade away. An animated segmented seal connects the summon gates; spiraling charge sparks, broad muzzle blooms, a white-core burst, a dispersing shock ring and plasma fragments emphasize the volley. The current soundtrack repeats the familiar ascending buff motif in a brighter register at summon, deployment, volley groups and the final charge. It does not grant additional gameplay buffs. A single finishing whiteout covers the battle layout, rises into white, briefly holds and reveals the battlefield before the next replay action. It follows the ultimate clock through speed changes, disappears on skip, and is omitted in reduced-motion/data-saving modes. The volley and finisher use the shared `RABBIT_VOLLEY` visual/audio deadlines. The dedicated synthesized `ultimate-rabbits` voice has sixteen plasma transients followed by a final low blast and two discrete delay echoes (+180 ms, +360 ms), without bell-like metallic ringing. The Pixi canvas owns the final fade so the generic tail transition cannot hide the finisher.

This is the presentation of Lunette's existing single area-attack ultimate. Damage, target resolution, charge, and cooldown rules are unchanged. The transient visual rabbits do not add repeated battle actions or the persistent enemy-only automatic bits.

The source artwork is the project's four transparent mechanical rabbits, generated for the Lunette PV from `public/art/event-lunette-awakened.png`. The accepted sheet was `/workspace/generated_images/exec-c28bdba1-4014-45f5-890f-58ce002beb5b.png`; separate alpha PNG exports were originally delivered in the `downloads/lunette-pv` media branch, `Lunette-v5/rabbits/`. Copies now live in `public/art/lunette-bit-{1,2,3,4}.png` and are registered as original project illustrations in `src/content/lunette-ultimate.ts`. No third-party character art, PV footage, or additional generation is used.

Pixi loads these textures only for the rabbit presentation and keeps them in the asset cache. The SVG fallback also uses the four rabbit images rather than a star-burst substitute. Reduced-motion and data-saving modes keep the readable static cut-in without loading the rabbit effect textures. Existing enemy target routing is retained.

## Weapon audio revision

`rabbit-volley-audio.ts` separates each shot into a falling-pitch plasma core with harmonics, a low-mid pressure burst, and a restrained high-frequency attack. The finisher has a separate low detonation and two darker delay returns. No metallic bell or UI note layers are used. In PV edits, only shot deadlines are retimed; individual transients are synthesized at their original duration instead of stretching the entire gun recording. This avoids smearing the repeated attacks.

Research consulted (methods only; no source audio reused):

- David Dumais, [How to create laser gun sound effect layers](https://www.daviddumaisaudio.com/how-to-create-laser-gun-sound-effect-layers/): independent transient shaping and falling pitch contours.
- Mark Kilborn / Pro Sound Effects, [FPS gunshot design](https://blog.prosoundeffects.com/how-to-sound-design-first-person-shooter-gunshot-sound-effects-with-mark-kilborn): separate transient, body, sub, mechanical and tail layers. We deliberately omit the metallic mechanical layer for this character.

The filming source consists of JPEG screencast frames with no audio stream. The PV audio is assembled explicitly from the selected BGM, a non-melodic opening sweep and this original volley. V12 contains no added buff, confirm, select or tap cues. The BGM retains its own percussion. An isolated SFX-only gameplay clip is supplied separately for review.

## Five-second reaction study

Lunette has a separate five-second presentation timeline: command/cut-in, deploy at 1000 ms, first shot at 1750 ms, combined finisher and HP/total number at 3200 ms, aftermath/tail at 4200 ms, end at 5000 ms. Other ultimates retain their existing timeline. The single combat result is unchanged; the HP presentation waits for the finisher.

`rabbitTargetFrame` and the four rabbit mounts share all sixteen shot deadlines with the beams and audio. Every shot adds a bounded art-only recoil/brief brightness response, followed by a quiet gap and heavier held finishing recoil. Only the enemy illustration zooms/moves; commands and HUD remain fixed. The implementation uses current recipients and restores the original inline translate/scale/filter/origin when skipped, hidden or unmounted. Motion/data preferences suppress this layer.

The awakened form's command uses the project's exact-pixel `Lunette_body_only.png` and `Lunette_winding_key.png` cutouts from `artifacts/lunette-cutout`, now registered as `lunette-command-body` and `lunette-command-key`. The key stays still; the earlier key-turn animation has been removed. The normal form retains its own original portrait; it does not borrow the awakened costume.

Audio separates discharge, short flight, contact and the larger finishing blast. The game uses the electric flavor; a pressure flavor is provided for the isolated five-second A/B study. Native speed changes choose a buffer with retimed shot deadlines and crossfade from the current logical offset, preserving pitch and avoiding a restart of the volley. The latest study contains the repeated buff motifs and no BGM or confirmation/tap cue. Delivery is matched to -16 LUFS / -1.5 dBTP.

## Buff-led soundtrack revision

`rabbit-ultimate-audio.ts` now owns the entire five-second score. Eight ascending buff phrases are placed before deployment and across volley groups, with one brighter bloom at the finisher. The motif follows the existing combat buff's F4/C5/F5/A5 phrase (transposed down five semitones by CombatSynth), then raises it an octave using rounded harmonics. Low weapon layers are retained at a lower mix level. This is cosmetic sound design; no buff status is applied.

The native voice starts at the cut-in instead of the first shot. The existing retiming/cancellation handle now covers the complete score, so switching speed preserves the current offset and skipping stops every accent together. This prevents multiple timer-based buff sounds from overlapping or replaying after a speed change. The latest study is a single buff-led version; the earlier v1 electric/pressure comparison remains available separately.
