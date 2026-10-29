"""Pack the Runway alpha cutout into iPhone-compatible H.264 (no paid calls).
Usage: python scripts/prepare-title-character.py path/to/alpha.webm
RGB is the left half; alpha is the right half. The GPU reconstructs transparency.
"""
from pathlib import Path
import subprocess
import sys

source = str(Path(sys.argv[1]).resolve())
# Reject an incorrectly selected, completely opaque cutout before creating game assets.
mask = subprocess.run(['ffmpeg', '-v', 'error', '-c:v', 'libvpx-vp9', '-i', source,
    '-vf', 'fps=1,alphaextract', '-frames:v', '5', '-pix_fmt', 'gray', '-f', 'rawvideo', 'pipe:1'],
    check=True, capture_output=True).stdout
frame_size = 720 * 1280
if len(mask) != frame_size * 5:
    raise ValueError('Expected a five-second 720×1280 alpha video')
for offset in range(0, len(mask), frame_size):
    frame = mask[offset:offset + frame_size]
    if frame[0] > 8 or frame[215 * 720 + 360] < 240 or frame[750 * 720 + 360] < 240:
        raise ValueError('Cutout must have a transparent background and an opaque face/dress')
output = Path('public/video/title-character-packed.mp4')
output.parent.mkdir(parents=True, exist_ok=True)
# An idle-only forward/back loop avoids a visible pose reset without double-image fades.
# The source is 120 frames; omit duplicated turnaround frames: 0..119,118..1.
filters = (
    '[0:v]fps=24,trim=end_frame=120,scale=504:896:flags=lanczos,format=rgba,split=2[f][r];'
    '[r]reverse,trim=start_frame=1:end_frame=119,setpts=PTS-STARTPTS[back];'
    '[f][back]concat=n=2:v=1:a=0,split=2[color][mask];'
    '[color]format=rgb24[rgb];[mask]alphaextract,format=rgb24[alpha];'
    '[rgb][alpha]hstack,format=yuv420p[out]'
)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-c:v', 'libvpx-vp9', '-i', source,
    '-filter_complex', filters, '-map', '[out]', '-an', '-c:v', 'libx264',
    '-profile:v', 'baseline', '-level:v', '3.1', '-crf', '16', '-maxrate', '3500k',
    '-bufsize', '7000k', '-g', '48', '-refs', '1', '-bf', '0', '-movflags', '+faststart', str(output)], check=True)
print(output)
