"""Prepare the three Runway source clips for mobile screen-blended playback.

Sources stay untouched in artifacts/ultimate-fx-source. Measured impact times are
mapped to 0.75s in each 2.4s delivery clip, matching ULTIMATE_TIMING in the game.
"""
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCES = ROOT / 'artifacts/ultimate-fx-source'
OUTPUT = ROOT / 'public/video'
CLIPS = {'slash': 2.75, 'arcane': 5.0, 'sanctuary': 4.75}
FFMPEG = subprocess.check_output(['node', '--input-type=module', '-e', "import tool from '@ffmpeg-installer/ffmpeg'; console.log(tool.path)"], cwd=ROOT, text=True).strip()
OUTPUT.mkdir(parents=True, exist_ok=True)
for name, peak in CLIPS.items():
    source = SOURCES / f'{name}.mp4'
    if not source.exists():
        raise SystemExit(f'Missing original Runway clip: {source}')
    filters = (
        '[0:v]split=2[a][b];'
        f'[a]trim=start=0:end={peak},setpts=(PTS-STARTPTS)*{0.75 / peak},fps=24[a0];'
        f'[b]trim=start={peak}:end=10,setpts=(PTS-STARTPTS)*{1.65 / (10 - peak)},fps=24[b0];'
        '[a0][b0]concat=n=2:v=1:a=0,'
        'crop=iw-56:ih-56:28:28,scale=540:540:flags=lanczos,'
        "lutrgb=r='max(0,(val-8)*255/247)':g='max(0,(val-8)*255/247)':b='max(0,(val-8)*255/247)',"
        'fade=t=in:st=0:d=0.1,fade=t=out:st=2.1:d=0.3,format=yuv420p[v]'
    )
    target = OUTPUT / f'ultimate-fx-{name}.mp4'
    subprocess.run([FFMPEG, '-y', '-hide_banner', '-loglevel', 'error', '-i', str(source), '-filter_complex', filters,
                    '-map', '[v]', '-an', '-t', '2.4', '-r', '24', '-c:v', 'libx264', '-profile:v', 'baseline',
                    '-level', '3.0', '-preset', 'slow', '-crf', '22', '-threads', '2', '-movflags', '+faststart', str(target)], check=True)
    print(json.dumps({'clip': name, 'bytes': target.stat().st_size, 'sourceImpact': peak, 'deliveryImpact': 0.75}))
