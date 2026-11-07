"""Extract exact-final review sheets. This never writes a passing visual verdict."""
from pathlib import Path
from io import BytesIO
import argparse, hashlib, json, subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
O = ROOT / 'artifacts/this-girl-01'


def sha(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda: f.read(1048576), b''):
            h.update(b)
    return h.hexdigest()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('movie', type=Path)
    a = p.parse_args()
    movie = a.movie.resolve()
    timeline_path = O / 'render/timeline.json'
    timeline = json.loads(timeline_path.read_text())
    assert timeline['finalized'] and timeline['episode'] == 'THIS-GIRL-001'
    duration = timeline['durationFrames']
    frames = {0, duration - 1}
    for page in timeline['pages']:
        frames.add(page['startFrame'] + page['durationFrames'] // 2)
        if page['spec']['kind'] in ['roster', 'preview']:
            frames.update(page['startFrame'] + min(page['durationFrames'] - 1, round(page['durationFrames'] * x))
                          for x in [.1, .5, .9])
    for cut in timeline['gameCuts']:
        count = cut['sourceEndFrame'] - cut['sourceStartFrame']
        frames.update(cut['startFrame'] + round(count * x) for x in [.1, .35, .6, .9])
    folder = O / 'previews/final-review'
    folder.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 22)
    images = []
    for frame in sorted(frames):
        raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-threads', '1', '-ss', f'{frame / 30:.9f}',
                                       '-i', str(movie), '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'])
        image = Image.open(BytesIO(raw)).convert('RGB')
        image.save(folder / f'frame-{frame:06d}.png')
        image.thumbnail((640, 360), Image.Resampling.LANCZOS)
        images.append((frame, image))
    sheets = []
    for start in range(0, len(images), 6):
        sheet = Image.new('RGB', (1920, 780), '#fffaf2')
        draw = ImageDraw.Draw(sheet)
        for i, (frame, image) in enumerate(images[start:start + 6]):
            x, y = (i % 3) * 640, (i // 3) * 390
            sheet.paste(image, (x, y))
            draw.text((x + 8, y + 363), f'{frame / 30:.3f}s / frame {frame}', font=font, fill='#3e322b')
        path = folder / f'sheet-{len(sheets) + 1:02d}.png'
        sheet.save(path)
        sheets.append(str(path.relative_to(ROOT)))
    candidate = {'passed': False, 'reviewed': False, 'movieSha256': sha(movie),
                 'timelineSha256': sha(timeline_path), 'contactSheets': sheets,
                 'frames': sorted(frames), 'note': 'Extraction only. A real reviewer must inspect actual frames and complete the separate final-visual-review.json.'}
    (O / 'research/visual-review-candidate.json').write_text(json.dumps(candidate, ensure_ascii=False, indent=2) + '\n')
    print('EXTRACTED; NOT YET VISUALLY REVIEWED', len(images), 'frames')


if __name__ == '__main__':
    main()
