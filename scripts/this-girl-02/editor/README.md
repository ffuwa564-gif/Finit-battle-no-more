# THIS-GIRL-002 — quiet notebook editor

This episode follows the user's quiet solo research-monologue specification. The
older noisy opening, fixed Part2 timestamps, results and speaker roles are not
used. The only narrator is `VOICEVOX:春日部つむぎ` (style8, engine0.26.0), using
「私」. The research's final judgment is independent of whether a video finishes.

## State and gates

`story-draft.json` is a non-final narrative outline. Its missing results must be
filled from the newly generated, physics-frozen confirmation data and the critic's
finalized judgment. A lost earlier run, provisional data, a successful replay or
an attractive generated notebook are not measurements. No final render should be
reported while these inputs or final-file QA are missing.

The editorial plan is a separate reviewed JSON with `episode: THIS-GIRL-002`,
`finalized: true`, `music: {file: ...}`, and `pages`. Each page supplies:

- `id`, `spec`: an actual art API scene spec. Metrics require evidence path/SHA.
- `lines`: exact IDs from the final narration; each occurs once. A reference can
  be `{lineId,offsetFrames}` to anchor commentary to actual native events.
- Optional `chapter`, `leadSeconds`, `tailSeconds`, `lineGapSeconds`.
- `durationFrames` when a scene has a fixed actual duration.
- For a battle page only, `gameCut:{file,sourceStartFrame,sourceEndFrame}`. The
  page length must equal that exact source interval; the common frame mapping
  drives both image and sound. Application speed is the recorded native app
  setting, not a separate editorial audio-speed modification.
- For the roster, `spec:{kind:'roster',judgment:...}` and at least26 seconds.

Native sources are canonical30fps/48kHz; every frame is1600 samples. All footage
must be the new engine, trace-verified, real app capture. Starting seed, budget,
unavailable XR assumptions and unreleased mechanics are explicitly disclosed.
The source's diagnostic strip and probe tones are removed before use.

## Rebuild after evidence and asset review

The checked generated original desk and thumbnail, actual character art, input
hashes and art provenance are required; the image model is not expected to
reproduce identical pixels. Read `../art/README.md` for the renderer API.

1. Prepare `artifacts/this-girl-02/render` and `speech` as symlinks to adequate
   temporary storage. Keep code, small reports, text and official-source hashes
   in the persistent workspace. Re-fetch any missing licensed raw music from its
   recorded official URL and require the recorded SHA. Do not package standalone
   voice/music waves or official-library data in a public source bundle.
2. Finish and review `story.json`, retaining source/evidence references, factual
   scope, and honest judgment. Only then set `finalized:true`. Ask the parent
   scheduler before heavy Docker, TTS or rendering; do not run them concurrently
   with native optimization workers in a small environment.
3. Use the already cached VOICEVOX0.26.0 container, respecting the managed proxy
   and CA instructions. No multi-gigabyte image pulls are needed. Then:

   ```sh
   python scripts/this-girl-02/editor/synth.py scripts/this-girl-02/editor/story.json
   python scripts/this-girl-02/editor/voice_qa.py
   python scripts/this-girl-02/editor/plan.py artifacts/this-girl-02/editorial.json
   python scripts/this-girl-02/editor/mixer.py
   python scripts/this-girl-02/editor/render.py
   ```

4. `plan.py` emits the integer-frame timeline, complete script, SRT and chapters.
   Captions are at most two lines at46px. Their within-line pages are reading
   timing proportional to text length, not claimed phoneme alignment. Event
   commentary uses explicit actual frame offsets and enough reading time.
   If the final50 utterances are exactly those already synthesized in the reviewed
   draft, `finalize_narration.py` can promote their existing metadata after final
   story approval. It verifies every word/reading, parameters, engine binding,
   code, cache key, query and audio SHA; any changed utterance is rejected and
   must first pass through `synth.py`. This saves a container restart for zero
   new audio and never claims a fresh synthesis.
5. `mixer.py` constructs all components once at48kHz, with mild voice ducking,
   a quiet piano loop, final fade and a single linear master gain. It saves a
   lossless master; only the finished MP4 encode produces AAC. Its exported
   `reconstruct_components(timeline)` independently rebuilds voice/game/music
   from original sources and frozen gains for final QA. `test_mixer.py` checks
   synthetic frame/sample mapping and source corruption refusal; it is not an
   episode sync test or evidence of a game result.
6. `render.py` uses the native game rectangle `(40,28,576,1024)`. Battle captions
   stay in the right panel; they never cover the game. Character originals use
   contain framing. Every cached output binds input/code/font/art/evidence hashes.
   The roster's historical gems remain historical; the new award follows only
   the critic's current scoped judgment. End with the unverified next girl and
   「……つぎは、あの子かな。」, then a quiet fade without an ED logo.
7. Run the capture agent's independent finished-file QA against the final MP4:
   native game picture/SE at beginning, middle and end of every major cut;
   changing9-frame runs; at least3 voice and3 music anchors reconstructed from
   independent source components. Require≤80ms, adequate correlation and every
   planned anchor. Decode the whole movie, test Chromium/WebKit at three seeks
   each, and visually inspect heads, captions, diagrams and narration matching.
   Bind the report to the finished movie SHA. Any re-encode invalidates prior QA.

`render-manifest.json` deliberately starts with `finalQaComplete:false` and is
not a publication approval. Parent publication must include the matching QA and
read back the delivered file SHA. Rights/credits, actual measured research and
the game's implementation PR remain separate deliverables.
