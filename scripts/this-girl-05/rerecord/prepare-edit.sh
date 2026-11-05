#!/usr/bin/env bash
set -euo pipefail
python scripts/this-girl-05/verify-implementation.py
python scripts/this-girl-05/capture/native-buffer-qa.py lisette > artifacts/this-girl-05/research/native-buffer-lisette.log
python scripts/this-girl-05/extract-mechanism.py
python scripts/this-girl-05/rerecord/editorial.py
python scripts/this-girl-05/editor/plan.py artifacts/this-girl-05/editorial.json --pending-calibration
python scripts/this-girl-05/rerecord/setup-intervals.py
python scripts/this-girl-05/rerecord/source-motion.py
python scripts/this-girl-05/capture/measure-used-shots.py
python scripts/this-girl-05/media/plan_audio_offsets.py
python scripts/this-girl-05/rerecord/apply-offsets.py
python scripts/this-girl-05/editor/plan.py artifacts/this-girl-05/editorial.json
python scripts/this-girl-05/rerecord/preflight-plates.py
python scripts/this-girl-05/rerecord/documents.py
