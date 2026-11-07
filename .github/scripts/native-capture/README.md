# Draft isolated native capture runner

This is an optional GitHub Actions scaffold, prepared without execution,
commit, upload, deployment, or creation of a capture approval. `workflow.yml`
is outside `.github/workflows`, so GitHub does not run it. It has no manual or
workflow-file-change trigger. Activation would require an explicit approved
capture plan, copying the reviewed workflow into `.github/workflows`, and a
future change to the currently nonexistent
`docs/media/this-girl/episodes/01/capture-approval.json` on the research branch.
These steps have not been performed.

The two isolated Ubuntu 24.04 jobs capture A/reference and C/sakuya at speed2,
using the same locked ivory-tower-010 T6 F1 case, logical seed930001 and
application seed3503471766. They install Node24, npm-ci dependencies,
Playwright Chromium, Xvfb/Pulse/FFmpeg, restore immutable public baseline
f6595da6c5f4bd3950e412d92e3e08f3529e0706, and validate the existing exact lock.
The existing `prepare-selected.mts` reconstructs real-application proofs; the
existing `record-native.mjs` performs actual application commands and captures
native OS pixels/audio, graph PCM and original native buffer references. Its
existing golden, calibration, source-normalization and native-buffer checks
remain mandatory. A runner success is not final-movie verification.

## Activation inputs still required

Do not generate approval from a template implicitly. Future concrete approval
must explicitly specify:

- `schemaVersion: 1`, `approved: true`,
  `purpose: "native-capture-only-no-deployment"`, `applicationSpeed: 2`.
- `selection` exactly
  `{ "caseId": "ivory-tower-010-T6-F1", "logicalSeed": 930001,
  "applicationSeed": 3503471766, "stageId": "ivory-tower-010" }`.
- `arms: {"A":"reference","C":"sakuya"}`.
- Full frozen `sourceGameCommit`, existing `researchLockCommit`, and exact
  `lockSha256`. Approval may be committed later than frozen source: the gate
  compares Git tree IDs for src and public, plus every locked source hash.
- `recordingCandidates: {"path": "<committed repo-relative input>",
  "sha256": "<exact SHA-256>"}`. This must be the preserved selected-candidate
  input used locally, including both full reviewed configs/specs, with the
  required case first. The scaffold does not invent, rank or substitute configs.
- `captureSourceSha256`: path-to-SHA-256 map including every required capture
  source/helper listed in `gate.py`. Freeze driver changes only after local
  integration checks. All referenced inputs must be committed for checkout.

The current driver uses Python scientific/media packages from the existing
requirements file. Future activation must verify their availability on the
runner and finalize script hashes after the ongoing driver investigation.
The scaffold has passed Python AST and shell/JS syntax checks only. Neither
runner apt installation nor the Actions integration has been executed.

## Artifact integrity and portability

No original media or metadata is modified for upload. Preserve the entire
capture/proofs/research/native-runner directories, including raw ffv1+PCM MKV,
its raw-clock JSON/debug log, graph PCM, native .f32 references, MOV and
normalization backups, original JSON, proof gzip, screenshots and QA records.
`manifest.py` streams SHA-256 hashes for every artifact with repo-relative file
paths and writes a separate manifest checksum. Original JSON containing runner
absolute paths retains its original bytes and hash; portable references are
provided separately as JSON-pointer-to-repo-relative-path maps. Failure logs
and partial raw evidence are retained even if any check fails; such artifacts
are not approved source captures. Artifacts remain GitHub research outputs;
there is no public hosting or publishing step.

`run.sh` keeps native services, Vite and browser capture in one runner lifecycle
and cleans up only saved child PIDs. It uses a private Pulse UNIX socket,
TCP-disabled Xvfb, a loopback research origin and one browser per job. Avoid
sourcing the local extracted-Debian runtime environment on Ubuntu: these jobs
use runner-native packages instead.
