# Native capture runtime (services smoke tested; A/V integration pending)

Prepared 2026-11-03 on Debian 13 amd64. This is a contingency for the existing
Chromium capture investigation. Initial package preparation started no services. After coordinating an exclusive
capture allocation, Xvfb and PulseAudio were started and checked with `pactl`
from a second executor call. No browser or recording process was started by the
runtime support agent. It does not demonstrate
synchronization or supersede the final-file checks in `docs/media-sync.md`.

## Observed feasibility

- Six packages from Debian trixie, pinned by package version and SHA-256 in
  `packages.json`, were downloaded and extracted under `/tmp` without installing
  packages globally. Total downloaded debs: approximately 7 MB; extracted tree
  plus package index and debs: 30 MB.
- `ldd` reports no unresolved dependencies for Xvfb, pulseaudio, pactl,
  module-null-sink, or module-native-protocol-unix when all three library paths
  from `environment.sh` are supplied. The modules directory is required because
  it contains `libprotocol-native.so`.
- Host `/usr/bin/xkbcomp` and `/usr/share/X11/xkb` are already available.
- Installed FFmpeg advertises both `x11grab` and `pulse` input devices.
- Existing host libpulse is exactly 17.0+dfsg1-2+b1, matching the extracted server.
- Package maintainer scripts have not run. Hardware discovery, systemd, dbus,
  ALSA plugins, and a window manager should not be needed by the minimal config.

## Recreate the runtime (download/extraction only)

Run from the repository root:

```bash
python3 scripts/this-girl-04/verify/native-runtime/prepare.py
source scripts/this-girl-04/verify/native-runtime/environment.sh
```

The preparation helper has been syntax checked. Its equivalent download,
SHA-256 verification, extraction, and dependency inspection were executed.
The manual examples below were superseded by `services.sh`. Service startup and
`pactl` checks passed; recording examples remain unexecuted by runtime support.
Use `bash scripts/this-girl-04/verify/native-runtime/services.sh start --foreground`
in a persistent executor session: detached grandchildren are killed when an
ordinary executor call exits. `status` and `stop` are separate subcommands.
The tested display is 450x848x24 on :93; Pulse sink and monitor are both 48 kHz.

## Candidate service setup (unexecuted)

After sourcing the environment, create a private state directory and minimal
PulseAudio configuration:

```bash
mkdir -p "$STILLVEIL_NATIVE_STATE"
chmod 700 "$STILLVEIL_NATIVE_STATE"
cat > "$STILLVEIL_NATIVE_STATE/default.pa" <<EOF_PA
load-module module-native-protocol-unix socket=$STILLVEIL_NATIVE_STATE/native auth-anonymous=1
load-module module-null-sink sink_name=stillveil rate=48000 channels=2
set-default-sink stillveil
set-default-source stillveil.monitor
EOF_PA
pulseaudio -n --file="$STILLVEIL_NATIVE_STATE/default.pa" \
  --dl-search-path="$STILLVEIL_PULSE_MODULES" --daemonize=no \
  --use-pid-file=no --exit-idle-time=-1 --disable-shm=yes \
  --log-target="file:$STILLVEIL_NATIVE_STATE/pulse.log" &
STILLVEIL_PULSE_PID=$!
Xvfb "$DISPLAY" -screen 0 1280x720x24 -nolisten tcp -ac \
  > "$STILLVEIL_NATIVE_STATE/xvfb.log" 2>&1 &
STILLVEIL_XVFB_PID=$!
pactl info
pactl list short sinks
pactl list short sources
```

Start Playwright Chromium with `headless: false` and inherit DISPLAY,
PULSE_SERVER, PULSE_SINK, and LD_LIBRARY_PATH. Use an actual window matching the
capture frame (or discover its screen geometry); a 1280x720 page viewport can
produce a larger browser window with chrome. Hide or crop that chrome only after
measuring it. Disable Chromium's default `--mute-audio` argument if present.
Route all browser audio to the `stillveil` sink and record `stillveil.monitor`.
Do not start the application timeline until the recorder is ready.

## Candidate common-clock recording (unexecuted)

Record losslessly to `/tmp`; validate actual FFmpeg timestamps and audiovisual
onsets before trusting this configuration. This avoids the CDP screencast
transport but does not inherently prove compositor/audio alignment:

```bash
ffmpeg -hide_banner -y \
  -thread_queue_size 1024 \
  -f x11grab -framerate 30 -video_size 1280x720 -i "$DISPLAY.0+0,0" \
  -thread_queue_size 1024 \
  -f pulse -sample_rate 48000 -channels 2 -i stillveil.monitor \
  -map 0:v:0 -map 1:a:0 -c:v ffv1 -level 3 -threads 2 \
  -c:a pcm_s16le /tmp/stillveil-native-runtime/native-test.mkv
```

Audio input buffering and Xvfb presentation delays must be measured using the
same marker/source checks as production, including beginning/middle/end points.
Use the same trims and speed changes for both streams. Avoid independently
zeroing PTS on each stream, which can erase the measured input-start offset.
Stop only the saved child PIDs after testing:

```bash
kill "$STILLVEIL_XVFB_PID" "$STILLVEIL_PULSE_PID"
```

## Capture module and timestamp provenance

`capture.mjs` exports `startNativeCapture({file,width,height,fps,rate})` returning
`{process,wallEpoch,log,metadataFile,done,stop()}`. It starts only FFmpeg; browser
and timeline ownership stay with the capture driver. `stop()` sends q and waits
for finalized output. Debug timestamps go to `.ffmpeg-debug.log`; `.clock.json`
records exact FFmpeg arguments and the shared integer Unix epoch subtracted at
the output muxer. Check `ffprobe` PTS against debug input timestamps before
trusting the mapping. No audio resynthesis or sample changes are performed.

FFmpeg n7.1.3 upstream source was inspected on 2026-11-03:
`libavdevice/pulse_audio_dec.c` reads `av_gettime()` and subtracts measured
Pulse stream latency, with `wallclock` enabled by default; `xcbgrab.c` assigns
`av_gettime()` to each screen packet. Therefore both native inputs already
share Unix wall time. Overriding Pulse with `-use_wallclock_as_timestamps 1`
would replace its latency-adjusted packet timestamp with packet arrival time.
The capture module deliberately preserves native timestamps (`-copyts`) and
subtracts one shared epoch using `-output_ts_offset`; it does not use
`-start_at_zero` or per-stream `setpts/asetpts`.
