# Lunette: rabbit-bit summon ultimate

## Direction and user preference

Summoning and shooting are distinct scenes. Do not pad an arbitrary short clip by repeating charge sounds. The user calls the existing pre-ultimate ブオーン “buff”; this is `renderUltimateCharge`, never `CombatSynth.play('buff')` or a new arpeggio. Preserve its timbre, avoid excessive metallic ringing, and give every sound a visual cause. The previous five-second soundtrack with four repeated charges is superseded.

## Authored sequence (normal speed: 8.4 seconds)

| Time | Picture | Sound |
| --- | --- | --- |
| 0–1.2 s | Lunette original full illustration, using the same portrait/title cut-in as other characters | Brief opening space, then existing charge rises into gate opening |
| 1.2–3.2 s | Four rabbits materialize successively, 360 ms apart, through local clock gates; each settles over 540 ms | A soft air/pressure arrival for each robot, no musical notes |
| 3.2–4.2 s | All four remain readable; thin aiming lines converge and the reticle locks | Silence from this soundtrack: a deliberate contrast before firing |
| 4.2–6.0 s | Four crossfire passes, sixteen distinct attacks, muzzle light and art-only target reactions | Individual electric shots, short flight and contact; no charge layered over the barrage |
| 6.0–6.62 s | Clock emitters gather light inward together | One familiar charge rises into heavy launch |
| 6.62–6.8 s | Four heavy plasma bodies fly inward together | Departure pressure and a short air trail |
| 6.8–7.8 s | Combined blast, held recoil, finishing damage and whiteout; reveal the battlefield | Heavy detonation, two discrete delay returns (+180 / +360 ms) |
| 7.8–8.4 s | Clear aftermath before replay continues | Let the tail end |

`RABBIT_SEQUENCE` owns the scene beats; `RABBIT_TIMING`, sound placement, Pixi, whiteout, per-shot HP presentation and replay duration derive from them. `rabbitStage` exposes command/summon/aim/volley/charge/finish/reveal for inspection without adding battle UI text. The SVG fallback uses the same clock for materialization and shots; it must not run an independent CSS firing loop. Other characters retain their normal ultimate timing.

The two existing 0.68-second charge waveforms end at gate opening and heavy projectile launch. Their gain is strengthened without new pitches or notes. Arrival audio is original filtered-noise/pressure synthesis, distinct from the weapon. The full mix uses a common peak scalar. Normal combat buff sounds are unchanged. Both native speed buffers and preview export use the same renderer. Speed changes crossfade at the current logical offset with pitch intact; skip cancels the complete soundtrack.

## Assets and rendering

Both Lunette forms use `rabbit-bits`. The four original project illustrations are `public/art/lunette-bit-{1,2,3,4}.png`, registered in `src/content/lunette-ultimate.ts`; they originated in the approved Lunette PV. No new Runway generation, third-party character footage or extra credits are used.

Both forms use their own original `character.artId` illustration in the shared `ultimate-cinematic__portrait` layout, including its background, diagonal mask and title. The special small transparent body/key cut-in is removed; those cutouts remain available for PV design. No key rotation. Pixi caches the robot textures. Failure uses the same robot images in SVG. Reduced-motion/data-saving modes retain the readable static cut-in. The finishing whiteout and art motion are suppressed in those modes.

Reactions affect only actual recipient art; HUD and commands stay fixed. All sixteen shot deadlines, flashes and sounds share `RABBIT_VOLLEY`. Hidden/unmounted/skipped playback restores inline transforms. Enemy offensive effects remain on the party recipients. The saved combat result is conserved. `rabbitDamageSteps` splits each actual, capped recipient HP loss across the sixteen shots (60%) and finishing blast (40%), using cumulative integer rounding so the pieces sum exactly to the saved result, even at low HP or overkill. Each shot updates the displayed HP snapshot and emits its own small damage number. The final snapshot applies all remaining event properties. This adds no new damage procs, cooldowns or combat actions. Skipping advances to the actual full result; speed changes cannot repeat an already presented hit.

All damaging combat feedback now creates a short translucent red overlay on the actual hurt enemy illustration or party card, never the HUD/controls. Healing, off-screen recipients and reduced-motion mode do not flash. Overlays replace rather than stack and are removed on event change/cleanup.

`rabbitCameraZoom` authors eased framing: settle into summon, accelerate toward the firing cue, advance through crossfire, pull back for the final wind-up, then punch into the finisher (maximum 1.24×) and ease back to neutral. The enemy artwork and friendly rabbit effect scene share the zoom curve; party-target effects do not scale their whole UI. HUD/controls stay fixed. Reduced-motion/data-saving gates suppress camera motion. Native hidden/unmount cleanup restores the original artwork transforms.

Weapon synthesis separates discharge, flight, contact, final detonation and delay returns without metallic bells. Research consulted for methods only: [laser layers](https://www.daviddumaisaudio.com/how-to-create-laser-gun-sound-effect-layers/) and [gunshot layers](https://blog.prosoundeffects.com/how-to-sound-design-first-person-shooter-gunshot-sound-effects-with-mark-kilborn). No external sound recordings are reused.


## Projectile revision for PV v16

The four illustrations have clock faces rather than literal gun barrels. `RABBIT_MUZZLES` anchors the energy discharge to each original clock face and rotates/translates it with that rabbit. Pixi light renders above the robots so the emitter is visible. Regular attacks are short white-core/mint bolts: compact muzzle discharge, 75 ms of travel, then directional contact fragments. There is no permanent full muzzle-to-target line or generic first-shot particle bloom. The SVG fallback also moves short segments.

`RABBIT_FLIGHT` is shared by the visual state, HP deadlines, enemy recoil and synthesized contact sound. Normal HP loss is applied 75 ms after each launch. The four heavy finishing bodies launch 180 ms before the existing 6800 ms landing, crush into a narrow core, bloom outward and white out; the final HP deadline remains 6800 ms. The familiar charge ends on heavy launch. The native audio keeps weapon attacks at their original pitch and separately schedules departure pressure, landing and echoes. Gameplay calculations, total damage and cooldowns are unchanged.

Rabbit effects draw at up to 60 fps and repaint on the combat-number event so an HP update cannot leave the previous flying-projectile image waiting for the next ticker beat. Hidden/skip/unmount cleanup removes that listener and restores artwork transforms. Motion/data-saving gates remain intact.

The PV is re-recorded from the actual game with the shared full illustration cut-in. Its non-firing setup is retimed, crossfire stays at native speed, and final-flight and landing are edited separately. Native departure/charge/contact waveforms are placed separately; the finishing detonation and delays are positioned at landing and continue through the white-to-Lunette transition. No external VFX footage or new generated assets are used.


## Ornate cut-in / embedded skill presentation (PV v17)

The full original portrait stays in the shared layout. `UltimateIntroFx` adds fine clock arcs, rotating chapter marks, six small glints and one diagonal light pass behind the existing title. Its opacity and transforms use the same normalized presentation clock and do not restart at speed changes. It starts on the next animation frame so the parent clock has been initialized. Reduced-motion/data-saving gates omit the entire ornament. It disappears with the intro and cleans up its frame callback on skip/unmount. There is no new battle explanatory text.

The rabbit weapon is revoiced: shorter electrical crack, reduced long laser pitch glide, a 95/190/380 Hz pressure body, a stronger 132/264/528 Hz landing, a short early pressure return and a larger harmonic finishing blast. There are no metallic bells, musical notes or UI cues. Flight/contact timing and total damage are unchanged. Normal attacks for other characters are unchanged.

PV v17 frames the actual game as an inset on original cream/navy/lilac/mint editorial fields. Its upper header gives the actual ultimate name and a short summon/crossfire/finishing-shot description. The existing original alpha Lunette cutout sits at lower right, with her face outside the battlefield's focal area. These labels are PV graphics only. The recorded ornate intro replaces the first 35 source frames; the already recorded projectile gameplay remains valid. A fresh soundtrack comes from the revised game renderer. The entire composition follows the final whiteout into the existing animated Lunette scene. The 23-second timeline, count-in and music license credit stay intact; no generated image/video or Runway credits are added.


## Rounded crossfire preference (PV v18)

The user prefers “ぽぽぽ” for the rabbit volley. This supersedes the dry crack from v17. Each ordinary shot is a short rounded 270→155 Hz pressure pop with restrained second/third harmonics, little air and a softer contact body. Its attack/decay leaves the 65 ms inter-robot spacing readable. Hard high-frequency crack, gritty slap and metallic top are removed from the ordinary volley. The final blast, familiar charge, projectile timing, HP, inset composition and intro ornaments are unchanged. Both game playback and PV export use the revised renderer; no new generated assets or credits are needed.


## Loop-ending rising bells (PV v19)

The latest user direction restores the v17 pre-pop weapon exactly and adds one soft three-note clock-bell flourish after each four-hit pass. This supersedes the v18 “ぽぽぽ” preference. The four cues follow the fourth contact by 15 ms, at .285/.685/1.085/1.485 seconds relative to first fire. Each 210 ms motif uses E5/F#5/G#5/B5 as its successive base, with the same three-note shape and restrained harmonic overtones. Bell pitch rises by loop; weapon pitch does not. The flourish belongs to the finished volley pass rather than being arbitrary buff/UI audio. Native speed variants retime cue positions while preserving bell pitch and attack lengths. The PV's native-speed crossfire includes all four motifs and their tails within the existing picture edit. No new visuals or generation are needed.
