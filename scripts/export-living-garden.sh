#!/usr/bin/env bash
# Runway alpha WebM -> transparent, native-browser animation. Requires ffmpeg + Pillow.
set -euo pipefail
garden_source="${1:-artifacts/living-garden}"
garden_destination="${2:-public/art}"
mkdir -p "$garden_destination"
for garden_clip in idle bloom; do
  garden_loop=0
  garden_filter='fps=15,scale=384:512'
  if [ "$garden_clip" = bloom ]; then
    garden_loop=1
    # The segmentation loses its flower track after 2.5s. Retain the intact
    # opening and hold the fully open frame instead of showing disappearing flowers.
    garden_filter='trim=end=2.4,setpts=PTS-STARTPTS,fps=15,scale=384:512'
  fi
  # libvpx is explicit: FFmpeg's default VP9 decoder can silently discard alpha.
  ffmpeg -v error -c:v libvpx-vp9 -i "$garden_source/$garden_clip-alpha.webm" \
    -an -t 5 -vf "$garden_filter" -c:v libwebp_anim -quality 65 \
    -compression_level 4 -loop "$garden_loop" -y "$garden_destination/living-garden-$garden_clip-motion.webp"
done
ffmpeg -v error -c:v libvpx-vp9 -i "$garden_source/idle-alpha.webm" \
  -vf 'scale=384:512' -frames:v 1 -c:v libwebp -quality 86 -y "$garden_destination/living-garden-frame.webp"
ffmpeg -v error -c:v libvpx-vp9 -ss 2.35 -i "$garden_source/bloom-alpha.webm" \
  -vf 'scale=384:512' -frames:v 1 -c:v libwebp -quality 86 -y "$garden_destination/living-garden-bloom-poster.webp"
python - "$garden_destination" <<'PY'
from pathlib import Path
import sys
from PIL import Image, ImageChops
for clip in ['idle', 'bloom']:
    image = Image.open(Path(sys.argv[1]) / f'living-garden-{clip}-motion.webp')
    assert image.size == (384, 512) and image.n_frames == (75 if clip == 'idle' else 36)
    assert image.info['loop'] == (0 if clip == 'idle' else 1)
    first = image.convert('RGBA').copy()
    for frame in range(image.n_frames):
        image.seek(frame)
        assert image.convert('RGBA').getpixel((192, 180))[3] == 0, 'Opening must remain transparent'
    image.seek(image.n_frames // 2)
    assert ImageChops.difference(first, image.convert('RGBA')).convert('RGB').getbbox(), 'Footage must move'
    if clip == 'bloom':
        image.seek(image.n_frames - 1)
        assert image.convert('RGBA').getpixel((50, 410))[3] > 200, 'Open rose must remain visible'
        assert image.convert('RGBA').getpixel((330, 420))[3] > 200, 'Open lotus must remain visible'
    print(f'{clip}: {image.n_frames} animated frames; central opening transparent')
PY
