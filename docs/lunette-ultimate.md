# Lunette: rabbit-bit summon ultimate

## Direction and user preference

Summoning and shooting are distinct scenes. Do not pad an arbitrary short clip by repeating charge sounds. The user calls the existing pre-ultimate ブオーン “buff”; this is `renderUltimateCharge`, never `CombatSynth.play('buff')` or a new arpeggio. Preserve its timbre, avoid excessive metallic ringing, and give every sound a visual cause. The previous five-second soundtrack with four repeated charges is superseded.

## Authored sequence (normal speed: 8.4 seconds)

| Time | Picture | Sound |
| --- | --- | --- |
| 0–1.2 s | Lunette command portrait; original body/key artwork, no key rotation | Brief opening space, then existing charge rises into gate opening |
| 1.2–3.2 s | Four rabbits materialize successively, 360 ms apart, through local clock gates; each settles over 540 ms | A soft air/pressure arrival for each robot, no musical notes |
| 3.2–4.2 s | All four remain readable; thin aiming lines converge and the reticle locks | Silence from this soundtrack: a deliberate contrast before firing |
| 4.2–6.0 s | Four crossfire passes, sixteen distinct attacks, muzzle light and art-only target reactions | Individual electric shots, short flight and contact; no charge layered over the barrage |
| 6.0–6.8 s | The guns gather light inward together; a pause separates this from crossfire | One familiar charge rises into the finishing shot |
| 6.8–7.8 s | Combined blast, held recoil, total damage and whiteout; reveal the battlefield | Heavy detonation, two discrete delay returns (+180 / +360 ms) |
| 7.8–8.4 s | Clear aftermath before replay continues | Let the tail end |

`RABBIT_SEQUENCE` owns the scene beats; `RABBIT_TIMING`, sound placement, Pixi, whiteout, damage presentation and replay duration derive from them. `rabbitStage` exposes command/summon/aim/volley/charge/finish/reveal for inspection without adding battle UI text. The SVG fallback uses the same clock for materialization and shots; it must not run an independent CSS firing loop. Other characters retain their normal ultimate timing.

The two existing 0.68-second charge waveforms end at gate opening and the finishing shot. Their gain is strengthened without new pitches or notes. Arrival audio is original filtered-noise/pressure synthesis, distinct from the weapon. The full mix uses a common peak scalar. Normal combat buff sounds are unchanged. Both native speed buffers and preview export use the same renderer. Speed changes crossfade at the current logical offset with pitch intact; skip cancels the complete soundtrack.

## Assets and rendering

Both Lunette forms use `rabbit-bits`. The four original project illustrations are `public/art/lunette-bit-{1,2,3,4}.png`, registered in `src/content/lunette-ultimate.ts`; they originated in the approved Lunette PV. No new Runway generation, third-party character footage or extra credits are used.

The awakened command portrait uses exact-pixel original cutouts `lunette-command-body` and `lunette-command-key`. The normal form keeps its own portrait and costume. Pixi caches the robot textures. Failure uses the same robot images in SVG. Reduced-motion/data-saving modes retain the readable static cut-in. The finishing whiteout and art motion are suppressed in those modes.

Reactions affect only actual recipient art; HUD and commands stay fixed. All sixteen shot deadlines, flashes and sounds share `RABBIT_VOLLEY`. Hidden/unmounted/skipped playback restores inline transforms. Enemy offensive effects remain on the party recipients. No new battle actions, repeated damage, cooldown, charge or persistent enemy-bit rules are introduced; the single existing result is displayed at the finishing hit.

Weapon synthesis separates discharge, flight, contact, final detonation and delay returns without metallic bells. Research consulted for methods only: [laser layers](https://www.daviddumaisaudio.com/how-to-create-laser-gun-sound-effect-layers/) and [gunshot layers](https://blog.prosoundeffects.com/how-to-sound-design-first-person-shooter-gunshot-sound-effects-with-mark-kilborn). No external sound recordings are reused.
