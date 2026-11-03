# Native capture and final-media QA

Status: preparation code only. No new proof, recording, source calibration, or final-file QA has been executed yet. Do not interpret a script's existence as a passing result.

1. Freeze and commit the actual game source. Get paired `reference` / `sakuya` specifications from the locked study. Each has `id`, `stageId`, `applicationSeed` (before the game's departure LCG), `logicalSeed`, `config`, `sourceGameCommit`, and `model: "after"`. A currently unobtainable XR is a hypothetical endgame ownership condition, not naturally acquired progress.
2. `npx tsx scripts/this-girl-01/capture/prepare-proof.mts <spec.json>` rebuilds the policy's decisions through real application commands, retaining normal enemies/stages, family/gear/potion rules and Wave treasure RNG. It must pass every state check. Preflight inputs must use development seeds and `preflight: true`.
3. Use an isolated origin: `VITE_SAKUYA_RESEARCH=1 npm run dev -- --port 4356`. Start with a fresh browser context; never overwrite a real player's save. Create `artifacts/this-girl-01/capture` as a symlink to `/tmp/this-girl-01-capture` for large regenerateable screen frames/video. Keep `proofs` and compact `research` records in `/workspace` and checkpoint them to GitHub.
4. `node scripts/this-girl-01/capture/record.mjs reference 2` (then `sakuya`) records actual native app video and game SE. It measures start/interior/end diagnostics, removes the diagnostic strip/tone, produces a 30fps/48kHz PCM source, and verifies CFR normalization. No cache may be accepted by existence alone. Existing captures are refused until explicitly reviewed/renamed.
5. Deliver `capture/{id}.mov` plus JSON with `sourceFrame` on native events. The editor uses `gameCuts[{id,file,startFrame,sourceStartFrame,sourceEndFrame,sourceApplicationSpeed}]`; the same frame interval must select audio and video. Keep `gameBox` in the timeline. The agreed initial box is `[40,28,576,1024]`, with captions/diagrams to its right. Mark unreleased rules and omitted footage clearly.
6. Final verification is a separate required gate: exact final MP4 SHA, every major game cut at start/interior/end (9 changing frames plus real SE), three narration points, three music points using independently reconstructed original components; <=80ms and adequate correlations. Decode the whole file and test Chromium/WebKit at three seek/play points each. `browser-qa.mjs` tests only playback, not A/V synchronization.

Any source/output modification after verification invalidates the related report. Keep failed/missing checks visible, and never grant an award from one illustrative victory.

## Executed development checks (not final footage)

`check-no-sakuya.mts` was executed against the restored tree:48 paired fixed-composition traces (96 simulations) passed. Persistent report: `artifacts/this-girl-01/research/non-s-invariance.json`. This does not certify unchanged adoption value after adding a new competitor.

`preflight.mts` was executed with development application seed910021, Kuzuha Awakening and a provisional Sakuya composition. The real application command replay matched native final units, phase, RNG, potion budget, treasure checks and gem finds (13 rounds, victory). This is not a held-out study or the locked final recording configuration.

`record.mjs` and `browser-qa.mjs` passed `node --check`. `finished-qa.py` was AST parsed only. No browser recording, calibration, complete movie playback, or final-movie sync check has run yet.

## Final source comparison

After the editor freezes the timeline and original-source mix:

```sh
python scripts/this-girl-01/capture/finished-qa.py /absolute/path/to/final.mp4
node scripts/this-girl-01/capture/browser-qa.mjs /absolute/path/to/final.mp4 artifacts/this-girl-01/research/final-browser-qa.json
```

Both reports must pass and reference the same final SHA256. The source comparator requires explicit `gameBox`, at least2 distinct actual native sources, dynamic9-frame samples in every cut's first/middle/final third, native sound in each third, and narration/music at3 points each. Source-audio references and background cancellation come exclusively from frozen independent raw files through the editor mixer, never reconstructed from the completed movie. Thresholds are fixed before final execution:80ms, game NCC0.65, voice/music NCC0.72, frame RMSE12. Browser seek/play and full decode cannot substitute for these sync measurements.
