# Native capture and final-media QA

Status: development preflights and native/application proof have been executed. The OS-native short preflight passed; full reference/Sakuya sources and the final movie still need their own QA. Never infer a pass from a script's existence. Earlier sections describe the development sequence; the current approved capture path is below.

## Current OS-native path

`prepare-selected.mts` freezes the prospective first candidate from the reviewed
study, then creates both actual application/native proofs. `record-native.mjs`
uses headful Chromium in the Xvfb viewport and records actual X11 pixels and
PulseAudio monitor output together with one shared Unix-PTS baseline. The final
path is `native-clean.py` → `normalize_capture.py` → `native-buffer-qa.py`.
The old CDP/WebM/clock-warp scripts remain diagnostic history, not movie inputs.

Keep one executor connection actively awaited for the entire recording: call
`exec_command` with a30-second wait and continuously await `write_stdin` in the
same orchestration loop until exit. In the observed development comparison,
disconnected/background acquisition had six audio packet gaps over100ms and a
5.326-second maximum gap. Connected acquisition had zero such gaps and a2.48ms
maximum gap. This is an observed environment mitigation, not a universal claim
about all hosts. Do not repair a failed acquisition by stretching native sound.

The connected partial `preflight-native2` passed all11 calibration labels with
maximum23.333ms residual,830 CFR frames, unchanged PCM, full decode and all-frame
comparison. Its seven actual-buffer measurements passed with raw-context lag
about6ms and OS-wall lag47.8–50.1ms. It has no ultimate and remains explicitly a
partial development source, never a substitute for the two final recordings.

Raw capture uses lossless `libx264rgb` CRF0/ultrafast/RGB24/no B frames/one thread
to retain exact RGB game pixels while reducing storage. Same-input verification
matched all60 decoded RGB24 frame hashes and PTS exactly, and preserved every
copied PCM prefix byte. This raw High444 source is distinct from the final
viewing MP4, which uses8-bit H264 yuv420p and AAC-LC. The helper records its own
SHA and full command. Original rawMKV/PCM/actual native-buffer references remain
available for reproduction. No reference buffer is replayed as replacement SE.

The current normalizer subtracts exactly the same first-video PTS from both
streams. Its timestamp-aware audio stage may pad/trim to that shared window;
it does not use `atempo` or a dense audio time warp. Verify raw/canonical PCM
identity before the diagnostic notch, full calibration-label coverage, every
eligible buffer measurement and early/middle/late/ultimate coverage. Cancelled
before-start or observed playback shorter than200ms is excluded only with the
actual start/stop evidence. Keep every exclusion and failure in the report.

1. Freeze and commit the actual game source. Get paired `reference` / `sakuya` specifications from the locked study. Each has `id`, `stageId`, `applicationSeed` (before the game's departure LCG), `logicalSeed`, `config`, `sourceGameCommit`, and `model: "after"`. A currently unobtainable XR is a hypothetical endgame ownership condition, not naturally acquired progress.
2. `npx tsx scripts/this-girl-02-preview/capture/prepare-proof.mts <spec.json>` rebuilds the policy's decisions through real application commands, retaining normal enemies/stages, family/gear/potion rules and Wave treasure RNG. It must pass every state check. Preflight inputs must use development seeds and `preflight: true`.
3. Use an isolated origin: `VITE_SAKUYA_RESEARCH=1 npm run dev -- --port 4356`. Start with a fresh browser context; never overwrite a real player's save. Create `artifacts/this-girl-02-preview/capture` as a symlink to `/tmp/this-girl-02-preview-capture` for large regenerateable screen frames/video. Keep `proofs` and compact `research` records in `/workspace` and checkpoint them to GitHub.
4. `node scripts/this-girl-02-preview/capture/record.mjs reference 2` (then `sakuya`) records actual native app video and game SE. It measures start/interior/end diagnostics, removes the diagnostic strip/tone, produces a 30fps/48kHz PCM source, and verifies CFR normalization. No cache may be accepted by existence alone. Existing captures are refused until explicitly reviewed/renamed.
5. Deliver `capture/{id}.mov` plus JSON with `sourceFrame` on native events. The editor uses `gameCuts[{id,file,startFrame,sourceStartFrame,sourceEndFrame,sourceApplicationSpeed}]`; the same frame interval must select audio and video. Keep `gameBox` in the timeline. The agreed initial box is `[40,28,576,1024]`, with captions/diagrams to its right. Mark unreleased rules and omitted footage clearly.
6. Final verification is a separate required gate: exact final MP4 SHA, every major game cut at start/interior/end (9 changing frames plus real SE), three narration points, three music points using independently reconstructed original components; <=80ms and adequate correlations. Decode the whole file and test Chromium/WebKit at three seek/play points each. `browser-qa.mjs` tests only playback, not A/V synchronization.

Any source/output modification after verification invalidates the related report. Keep failed/missing checks visible, and never grant an award from one illustrative victory.

## Executed development checks (not final footage)

`check-no-sakuya.mts` was executed against the restored tree:48 paired fixed-composition traces (96 simulations) passed. Persistent report: `artifacts/this-girl-02-preview/research/non-s-invariance.json`. This does not certify unchanged adoption value after adding a new competitor.

`preflight.mts` was executed with development application seed910021, Kuzuha Awakening and a provisional Sakuya composition. The real application command replay matched native final units, phase, RNG, potion budget, treasure checks and gem finds (13 rounds, victory). This is not a held-out study or the locked final recording configuration.

`record.mjs` and `browser-qa.mjs` passed `node --check`. `finished-qa.py` was AST parsed only. No browser recording, calibration, complete movie playback, or final-movie sync check has run yet.

## Final source comparison

After the editor freezes the timeline and original-source mix:

```sh
python scripts/this-girl-02-preview/capture/finished-qa.py /absolute/path/to/final.mp4
node scripts/this-girl-02-preview/capture/browser-qa.mjs /absolute/path/to/final.mp4 artifacts/this-girl-02-preview/research/final-browser-qa.json
```

Both reports must pass and reference the same final SHA256. The source comparator requires explicit `gameBox`, at least2 distinct actual native sources, dynamic9-frame samples in every cut's first/middle/final third, native sound in each third, and narration/music at3 points each. Source-audio references and background cancellation come exclusively from frozen independent raw files through the editor mixer, never reconstructed from the completed movie. Thresholds are fixed before final execution:80ms, game NCC0.65, voice/music NCC0.72, frame RMSE12. Browser seek/play and full decode cannot substitute for these sync measurements.

## Capture diagnostics discovered after the first preflight

The initial WebM calibration and CFR checks passed, but that source was subsequently **rejected for publication**: calibration anchors alone did not establish local native SE timing. Its success must not be interpreted as an approved movie source.

The capture code now taps the actual native output through an AudioWorklet, retains continuous native PCM plus context/wall/output-clock observations, and transparently observes the actual `AudioBufferSourceNode.start` buffers. These buffers are comparison references only; they are never replayed into a replacement soundtrack. Native graph PCM uses the actual context sample rate (currently44.1kHz), then an explicit160/147 conversion for48kHz processing. The startup graph warmup is discarded before sample0; any subsequent sample gap remains a hard failure.

Development preflight-pcm3 original-buffer versus raw-clock comparisons passed (seven starts,5.94–9.69ms, correlations0.853–0.993). This proves native PCM acquisition only. Source audio/video synchronization remains unapproved: PCM4 exposed CDP/JPEG delivery delays of108–230ms; later in-frame barcodes exposed a diagnostic screenshot viewport override, queued frames after screencast stop, and independently advancing compositor/RAF clocks. These failures are preserved and are not offset-fitted into a pass.

The current recorder separates a white calibration strip from a56-cell frame clock (6-bit prefix,42-bit UTC milliseconds,8-bit XOR checksum) outside the450×800 game viewport. It captures source pixels and clock together, then removes all48 diagnostic rows. Barcode confidence, checksum, ordering and capture latency are checked explicitly. Final source approval additionally requires `native-buffer-qa.py`: actual raw buffer versus raw context PCM and actual raw buffer (independently transformed through recorded output-clock observations) versus the calibrated source at a separately observed native wall-time deadline. Every final source needs early/middle/late and ultimate checks; partial development footage is never acceptable as final.
