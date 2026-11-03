#!/usr/bin/env bash
# DRAFT / UNEXECUTED. Entire capture lifecycle stays in one runner step.
set -euo pipefail
[[ "${CAPTURE_ARM:?}" == A && "${CAPTURE_ID:?}" == reference || "$CAPTURE_ARM" == C && "$CAPTURE_ID" == sakuya ]]
export DISPLAY=:93
export PULSE_SINK=stillveil
export STILLVEIL_RUNNER_STATE="$RUNNER_TEMP/stillveil-native-$GITHUB_RUN_ID-$CAPTURE_ARM"
export PULSE_SERVER="unix:$STILLVEIL_RUNNER_STATE/native"
mkdir -p "$STILLVEIL_RUNNER_STATE" artifacts/this-girl-01/native-runner
chmod 700 "$STILLVEIL_RUNNER_STATE"
LOGS="$PWD/artifacts/this-girl-01/native-runner"
cleanup() {
  result=$?
  trap - EXIT
  for child in "${VITE_PID:-}" "${XVFB_PID:-}" "${PULSE_PID:-}"; do
    if [[ -n "$child" ]]; then kill "$child" 2>/dev/null || true; fi
  done
  printf '%s\n' "$result" > "$LOGS/runner-exit-code.txt"
  exit "$result"
}
trap cleanup EXIT
node --version > "$LOGS/node-version.txt"
npm --version > "$LOGS/npm-version.txt"
ffmpeg -version > "$LOGS/ffmpeg-version.txt"
ffmpeg -hide_banner -devices > "$LOGS/ffmpeg-devices.txt" 2>&1
npx playwright --version > "$LOGS/playwright-version.txt"
git rev-parse HEAD > "$LOGS/checkout-commit.txt"
git status --porcelain > "$LOGS/checkout-status.txt"
cat > "$STILLVEIL_RUNNER_STATE/default.pa" <<EOF_PA
load-module module-native-protocol-unix socket=$STILLVEIL_RUNNER_STATE/native auth-anonymous=1
load-module module-null-sink sink_name=stillveil rate=48000 channels=2
set-default-sink stillveil
set-default-source stillveil.monitor
EOF_PA
pulseaudio -n --file="$STILLVEIL_RUNNER_STATE/default.pa" --daemonize=no \
  --use-pid-file=no --exit-idle-time=-1 --disable-shm=yes \
  --log-target="file:$LOGS/pulse.log" > "$LOGS/pulse-stdio.log" 2>&1 &
PULSE_PID=$!
Xvfb "$DISPLAY" -screen 0 450x848x24 -nolisten tcp -ac > "$LOGS/xvfb.log" 2>&1 &
XVFB_PID=$!
VITE_SAKUYA_RESEARCH=1 node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4356 --strictPort \
  > "$LOGS/vite.log" 2>&1 &
VITE_PID=$!
ready=0
for attempt in {1..100}; do
  kill -0 "$PULSE_PID" "$XVFB_PID" "$VITE_PID"
  if pactl info > "$LOGS/pactl-info.txt" 2>/dev/null \
    && xdpyinfo -display "$DISPLAY" > "$LOGS/xdpyinfo.txt" 2>/dev/null \
    && curl -fLsS "$CAPTURE_BASE_URL/" -o "$LOGS/origin-index.html"; then ready=1; break; fi
  sleep 0.1
done
[[ "$ready" == 1 ]]
pactl list short sinks > "$LOGS/pulse-sinks.txt"
pactl list short sources > "$LOGS/pulse-sources.txt"
node scripts/this-girl-01/capture/record-native.mjs "$CAPTURE_ID" 2 \
  > "$LOGS/record-$CAPTURE_ID.log" 2>&1
python3 scripts/this-girl-01/capture/native-buffer-qa.py "$CAPTURE_ID" \
  > "$LOGS/native-buffer-$CAPTURE_ID.log" 2>&1
