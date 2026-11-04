#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/environment.sh"
mkdir -p "$STILLVEIL_NATIVE_STATE"
chmod 700 "$STILLVEIL_NATIVE_STATE"
case "${1:-status}" in
start)
  if [[ -e /tmp/.X93-lock || -e "$STILLVEIL_NATIVE_STATE/native" ]]; then
    echo 'Refusing startup: existing display lock or Pulse socket' >&2; exit 1
  fi
  cat > "$STILLVEIL_NATIVE_STATE/default.pa" <<EOF_PA
load-module module-native-protocol-unix socket=$STILLVEIL_NATIVE_STATE/native auth-anonymous=1
load-module module-null-sink sink_name=stillveil rate=48000 channels=2
set-default-sink stillveil
set-default-source stillveil.monitor
EOF_PA
  OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 nohup pulseaudio -n \
    --file="$STILLVEIL_NATIVE_STATE/default.pa" \
    --dl-search-path="$STILLVEIL_PULSE_MODULES" --daemonize=no \
    --use-pid-file=no --exit-idle-time=-1 --disable-shm=yes \
    --log-target="file:$STILLVEIL_NATIVE_STATE/pulse.log" \
    > "$STILLVEIL_NATIVE_STATE/pulse-stdio.log" 2>&1 < /dev/null &
  echo "$!" > "$STILLVEIL_NATIVE_STATE/pulse.pid"
  OMP_NUM_THREADS=1 nohup Xvfb "$DISPLAY" -screen 0 450x848x24 \
    -nolisten tcp -ac > "$STILLVEIL_NATIVE_STATE/xvfb.log" 2>&1 < /dev/null &
  echo "$!" > "$STILLVEIL_NATIVE_STATE/xvfb.pid"
  for attempt in {1..50}; do
    if pactl info > "$STILLVEIL_NATIVE_STATE/pactl-info.txt" 2>/dev/null && [[ -S /tmp/.X11-unix/X93 ]]; then break; fi
    sleep 0.1
  done
  pactl info
  pactl list short sinks
  pactl list short sources
  if [[ "${2:-}" == "--foreground" ]]; then wait; fi
  ;;
stop)
  for service in xvfb pulse; do
    pidfile="$STILLVEIL_NATIVE_STATE/$service.pid"
    if [[ -f "$pidfile" ]]; then
      pid=$(cat "$pidfile")
      if [[ -r "/proc/$pid/cmdline" ]] && readlink "/proc/$pid/exe" | rg -q "^$STILLVEIL_NATIVE_ROOT/usr/bin/"; then kill "$pid"; fi
      rm -f "$pidfile"
    fi
  done
  ;;
status)
  cat "$STILLVEIL_NATIVE_STATE/"*.pid
  pactl info
  pactl list short sinks
  pactl list short sources
  ;;
*) echo 'Usage: services.sh start|stop|status' >&2; exit 2 ;;
esac
