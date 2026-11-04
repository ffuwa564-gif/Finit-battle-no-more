# Quiet notebook art API — THIS-GIRL-002

`python scripts/this-girl-02/art/prepare.py` verifies the fixed art inputs and all72 original-art hashes, then exports the1280×720 thumbnail. When the former `/workspace/generated_images` files are absent, `prepare.py` loads both originals and their provenance from `docs/media/this-girl/episodes/01/assets/`. It restores the old roster with `git show a5573e67d9ceb29de8de6c9166a6524ad41548b5:docs/media/build-research-diary/episodes/05/registry.json` and verifies its fixed SHA. A shallow clone can fetch the exact source object with `git fetch origin a5573e67d9ceb29de8de6c9166a6524ad41548b5`; the script never substitutes the current roster. All original portraits under `public/` must also be present.

The generated originals are inputs, not a promise that an image model can regenerate identical pixels. The previous exact generation prompts were lost; they are not invented here. Reproduction packages must supply the originals and `Artwork-Provenance.json`.

The old roster is fixed to source commit `a5573e67d9ceb29de8de6c9166a6524ad41548b5`, `docs/media/build-research-diary/episodes/05/registry.json`, SHA256 `4fd1c99e1866b5c1e3e6554c2d806e624247967a220b1ec07972110fe76a00ee`. Its72 girl forms/49 canonical girls and stable BD IDs are retained. Three other game entities are not silently turned into registered girl forms.

## Plate interface

Add this directory to `sys.path`, then import `visuals`.

- `scene(spec)` returns a1920×1080 RGBA Pillow image.
- `render_scene(spec,path)` writes a PNG plus `.png.json` binding the spec, code, fonts, evidence and art-map inputs to its SHA256. Existing outputs are reused only when all hashes match.
- `character(base,id,box,pad=24)` uses the whole real original with contain framing.

Scene kinds: `desk`, `subject`, `party`, `conditions`, `delta`, `concept`, `choice`, `metrics`, `goal`, `battle`, `summary`, `preview`.

`party` accepts one to four `characters` with real `characterId`, the alias `id` is also accepted, optional `subject:true` rose outline, optional `leader:true`, and optional short `role` override. Actual name, stable BD ID, rarity and game role come from the verified art map. Use it for the fixed-three-companions comparison; it does not assert that a pictured party is optimal.

The header is a short single line. Body text remains large; overflow raises an error instead of shrinking into an unreadable panel. A metric scene requires a real `evidence` file and its frozen `evidenceSha256` in the spec, at most3 rows, and optional precomputed CIs. Missing or changed evidence hashes are rejected before cache reuse or new rendering. The renderer does not compute or certify statistics. Numeric labels and the evidence bindings must be reviewed against the actual research report. Never put fabricated placeholder results into a final plate.

The only formula provided by the vocabulary is `Δ = Pサクヤ入り − P最強候補`. Other concepts use simple shield/petal/attack diagrams. The title thumbnail's fictional notebook marks are never reused as an evidence/math slide.

Native game video is editor-owned at `(40,28,576,1024)`. Battle plates leave that rectangle clear, use the right panel `(650,85,1190,785)`, and reserve the right-only caption rectangle `(650,910,1190,150)`. Normal plates reserve the lower caption band from y930. The editor owns all subtitle timing and fades.

Mechanics wording: the mark does not stack; reserve power may accumulate from multiple actual hostile primary absorptions up to its cap. The deadline is through2 rounds after application. Other allies' or stones' barriers can supply absorption to the marked recipient. The bonus belongs to the next offensive primary action's first actual recipient, including a guardian. Do not say that a barrier merely being present blooms petals, that only Sakuya's shield counts, or that every separate hit spends a new free attack.

## Closing ledger

`roster.frame(t,duration,judgment)` returns a silent ledger frame; `roster.render(judgment,duration=40,path=...)` streams a30fps CRF20 H.264 source and creates `research/roster-visibility.json`.

The input is the critic's finalized `research/reports/judgment.json` or its parsed dict. `overall.certified` must agree with `overall.status`. Unmet research remains outline `研究中`. A new solid gem means only `限定検証済み` under the report's explicit scope. Old amber remains labeled `旧LAB／限定検証`; it never counts as a new current endgame award. Historical build names keep `（仮）`; the new Sakuya provisional name is read directly from `judgment.subject.buildName` (the current design record uses `花守の返礼`); it is not hard-coded by the renderer.

The ledger holds its first/last positions4 seconds. A40-second pan gives every card at least3 seconds fully within the viewport; duration below26 seconds is rejected. Metadata records each card's full-visibility interval. Actual final encoding/legibility/head/subtitle QA is still required after the editor composes the MP4.

The first ending proposal is ledger~40 seconds, then the real Miette original in a~7-second `preview` plate, next-candidate/unverified label, Tsumugi's「……つぎは、あの子かな。」and a quiet final fade. No ending logo.
