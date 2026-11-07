# Source after prepare.py. This file only exports process-local variables.
export STILLVEIL_NATIVE_ROOT=/tmp/stillveil-native-runtime/root
export STILLVEIL_NATIVE_STATE=/tmp/stillveil-native-runtime/state
export STILLVEIL_PULSE_MODULES="$STILLVEIL_NATIVE_ROOT/usr/lib/pulse-17.0+dfsg1/modules"
export LD_LIBRARY_PATH="$STILLVEIL_NATIVE_ROOT/usr/lib/x86_64-linux-gnu:$STILLVEIL_NATIVE_ROOT/usr/lib/x86_64-linux-gnu/pulseaudio:$STILLVEIL_PULSE_MODULES${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export PATH="$STILLVEIL_NATIVE_ROOT/usr/bin:$PATH"
export DISPLAY=:93
export PULSE_SERVER="unix:$STILLVEIL_NATIVE_STATE/native"
export PULSE_SINK=stillveil
