"""Create the title ambience from the preserved eight-second source (no AI calls)."""
from pathlib import Path
import argparse, subprocess

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path, help='The original eight-second Runway MP4')
args = parser.parse_args()
target = ROOT / 'public/video/title-birth-loop.mp4'
poster = ROOT / 'public/art/motion-posters/title-birth-motion.png'
# Last second dissolves into source 0–1, then playback resumes at source 1.
# There is no backwards playback of the birth. Character drawings are held in threes.
subprocess.run([
    'ffmpeg', '-hide_banner', '-v', 'error', '-y', '-i', str(args.source),
    '-filter_complex',
    '[0:v]split[a][b];[a]trim=start=1:end=8,setpts=PTS-STARTPTS,fps=24,format=yuv420p[a0];'
    '[b]trim=start=0:end=1,setpts=PTS-STARTPTS,fps=24,format=yuv420p[b0];'
    '[a0][b0]xfade=transition=fade:duration=1:offset=6,fps=8,fps=24,format=yuv420p[v]',
    '-map', '[v]', '-an', '-frames:v', '168', '-c:v', 'libx264', '-profile:v', 'baseline',
    '-level:v', '3.1', '-preset', 'slow', '-crf', '20', '-maxrate', '4000k', '-bufsize', '8000k',
    '-g', '48', '-refs', '1', '-bf', '0', '-threads', '3', '-pix_fmt', 'yuv420p',
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_trc', 'bt709', '-color_primaries', 'bt709',
    '-movflags', '+faststart', '-video_track_timescale', '24000', str(target),
], check=True)
# Use the same bundled decoder as the content gate, so the poster matches exactly.
decoder = subprocess.check_output([
    'node', '--input-type=module', '-e',
    "import ffmpeg from '@ffmpeg-installer/ffmpeg';process.stdout.write(ffmpeg.path)",
], cwd=ROOT, text=True)
subprocess.run([
    decoder, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(target),
    '-frames:v', '1', '-threads', '1', '-pix_fmt', 'rgb24', str(poster),
], check=True)
print('Prepared seven-second title loop and matching poster.')
