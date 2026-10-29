"""Restore fine hair from the original black-matte video, using segmentation only inside the body.
Requires numpy/scipy. No paid calls. Run before prepare-title-character.py.
"""
from pathlib import Path
import subprocess
import numpy as np
from scipy import ndimage as ndi

WIDTH, HEIGHT = 720, 1280
ROOT = Path('docs/media')

def decode(path, pixels):
    return subprocess.Popen(['ffmpeg', '-v', 'error', '-i', str(path), '-vf', 'fps=24',
        '-pix_fmt', pixels, '-f', 'rawvideo', 'pipe:1'], stdout=subprocess.PIPE)

def refine(rgb, mask):
    # The coarse segmentation is trusted only well inside the figure. Never use its jagged edge.
    core = ndi.binary_erosion(mask > 250, iterations=12)
    if not core.any():
        raise ValueError('Missing opaque body mask')
    _, nearest = ndi.distance_transform_edt(~core, return_indices=True)
    reference = ndi.maximum_filter(rgb, size=(3, 3, 1))[nearest[0], nearest[1]]
    alpha = np.clip((rgb * reference).sum(2) / np.maximum((reference * reference).sum(2), 1), 0, 1)
    alpha[core] = 1
    alpha[(~core) & (rgb.max(2) < 24)] = 0  # Reject black-matte compression specks.
    components, _ = ndi.label(alpha > .04)
    keep = np.bincount(components.ravel()) >= 16
    keep[0] = False
    alpha *= keep[components]
    # Undo the original black matte instead of multiplying it into the edge a second time.
    straight = np.clip(rgb / np.maximum(alpha[:, :, None], .01), 0, 255)
    straight[alpha < .01] = 0  # Never amplify near-black compression noise in transparent pixels.
    return np.dstack([straight, alpha * 255]).astype(np.uint8)

if __name__ == '__main__':
    source = decode(ROOT / 'title-character-source.mp4', 'rgb24')
    mask = decode(ROOT / 'title-character-mask-source.webm', 'gray')
    output = ROOT / 'title-character-alpha.webm'
    encoder = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba',
        '-s', f'{WIDTH}x{HEIGHT}', '-r', '24', '-i', 'pipe:0', '-an', '-c:v', 'libvpx-vp9',
        '-pix_fmt', 'yuva420p', '-crf', '14', '-b:v', '0', '-deadline', 'good', '-cpu-used', '3',
        '-row-mt', '1', '-threads', '4', str(output)], stdin=subprocess.PIPE)
    count = 0
    try:
        while True:
            color = source.stdout.read(WIDTH * HEIGHT * 3)
            matte = mask.stdout.read(WIDTH * HEIGHT)
            if not color and not matte:
                break
            if len(color) != WIDTH * HEIGHT * 3 or len(matte) != WIDTH * HEIGHT:
                raise ValueError('Source and mask frames do not match')
            rgb = np.frombuffer(color, np.uint8).reshape(HEIGHT, WIDTH, 3).astype(np.float32)
            alpha = np.frombuffer(matte, np.uint8).reshape(HEIGHT, WIDTH)
            encoder.stdin.write(refine(rgb, alpha).tobytes())
            count += 1
    except BaseException:
        # A broken frame must not leave decoders blocked on their full stdout pipes.
        for process in (source, mask, encoder):
            process.terminate()
        raise
    finally:
        try:
            encoder.stdin.close()
        except BrokenPipeError:
            pass
        for process in (source, mask, encoder):
            if process.wait() != 0:
                raise RuntimeError('Video processing failed')
    if count != 120:
        raise ValueError(f'Expected 120 frames, got {count}')
    print(f'Refined {count} frames: {output}')
