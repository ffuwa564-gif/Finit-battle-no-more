"""Restore fine hair from the original black-matte video, using segmentation only inside the body.
Requires numpy/scipy/opencv-python-headless. No paid calls. Run before prepare-title-character.py.
"""
from pathlib import Path
import subprocess
import numpy as np
import cv2
from functools import lru_cache

cv2.setNumThreads(2)
from scipy import ndimage as ndi

WIDTH, HEIGHT = 720, 1280
ROOT = Path('docs/media')

def decode(path, pixels):
    return subprocess.Popen(['ffmpeg', '-v', 'error', '-i', str(path), '-vf', 'fps=24',
        '-pix_fmt', pixels, '-f', 'rawvideo', 'pipe:1'], stdout=subprocess.PIPE)

def refine(rgb, mask, trusted_alpha=None, reference_rgb=None):
    # The coarse segmentation is trusted only well inside the figure. Never use its jagged edge.
    semantic_core = ndi.binary_erosion(mask > 250, iterations=12)
    core = semantic_core.copy()
    trusted_weight = None
    deep = None
    if trusted_alpha is not None:
        if reference_rgb is None:
            raise ValueError('Trusted alpha requires the matching transported RGB reference')
        support = trusted_alpha > 240
        deep = ndi.binary_erosion(support, iterations=12)
        difference = np.max(np.abs(reference_rgb - rgb), axis=2) if reference_rgb is not None else np.zeros(mask.shape)
        confidence = np.exp(-.5 * (np.maximum(difference - 30, 0) / 25) ** 2)
        trusted_weight = trusted_alpha.astype(np.float32) / 255 * confidence
        # The original cutout preserves openings the coarse segmentation filled with black.
        core = (core & support & (confidence > .99)) | deep
    if not core.any():
        raise ValueError('Missing opaque body mask')
    _, nearest = ndi.distance_transform_edt(~core, return_indices=True)
    reference = ndi.gaussian_filter(ndi.maximum_filter(rgb, size=(3, 3, 1)), sigma=(1.1, 1.1, 0))[nearest[0], nearest[1]]
    alpha = np.clip((rgb * reference).sum(2) / np.maximum((reference * reference).sum(2), 1), 0, 1)
    alpha[core] = 1
    # A continuous falloff avoids pixels popping on/off when compression crosses a hard threshold.
    coverage = np.clip((rgb.max(2) - 8) / 24, 0, 1)
    alpha[~core] *= (coverage * coverage * (3 - 2 * coverage))[~core]
    if trusted_weight is not None:
        alpha = np.maximum(alpha, trusted_weight)
        alpha[deep] = 1
    if trusted_weight is not None:
        # Black matte must never become opaque merely because an estimated mask filled a gap.
        # Keep dark paint only when the transported original actually contains that dark paint.
        paint_support = ndi.binary_erosion(trusted_alpha > 240, iterations=3) | semantic_core
        dark_paint = paint_support & (trusted_alpha > 240) & (reference_rgb.max(2) < 48) & (difference < 24)
        alpha[(rgb.max(2) < 32) & ~dark_paint] = 0
    components, _ = ndi.label(alpha > .04)
    keep = np.bincount(components.ravel()) >= 16
    keep[0] = False
    alpha *= keep[components]
    # Undo the original black matte instead of multiplying it into the edge a second time.
    straight = np.clip(rgb / np.maximum(alpha[:, :, None], .01), 0, 255)
    straight[alpha < .01] = 0  # Never amplify near-black compression noise in transparent pixels.
    return np.rint(np.dstack([straight, alpha * 255])).astype(np.uint8)

@lru_cache(maxsize=2)
def grid(height, width):
    y, x = np.indices((height, width), dtype=np.float32)
    return x, y


def stabilize_edges(current, previous, following):
    """Motion-compensated filtering only at the silhouette; opaque face/clothing stay untouched."""
    rgb, rgba = current
    h, w = rgba.shape[:2]
    x, y = grid(h, w)
    gray = cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    small = cv2.resize(gray, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    value = rgba.astype(np.float32) / 255
    alpha = value[:, :, 3]
    premult = value.copy()
    premult[:, :, :3] *= alpha[:, :, None]
    total = premult * 1.5
    weight = np.full((h, w), 1.5, np.float32)
    for neighbor_rgb, neighbor_rgba in (previous, following):
        ng = cv2.cvtColor(neighbor_rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY)
        ns = cv2.resize(ng, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
        flow = cv2.calcOpticalFlowFarneback(small, ns, None, .5, 3, 21, 3, 5, 1.1, 0)
        flow = cv2.resize(flow, (w, h), interpolation=cv2.INTER_LINEAR) * 2
        mx, my = x + flow[:, :, 0], y + flow[:, :, 1]
        nr = cv2.remap(neighbor_rgb, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
        # Reject occlusions / uncertain motion instead of leaving a transparent trail.
        error = np.max(np.abs(nr - rgb), axis=2)
        confidence = .75 * np.exp(-.5 * (error / 10) ** 2)
        nv = neighbor_rgba.astype(np.float32) / 255
        nv[:, :, :3] *= nv[:, :, 3:4]
        warped = cv2.remap(nv, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
        total += warped * confidence[:, :, None]
        weight += confidence
    filtered = total / weight[:, :, None]
    edge = cv2.dilate(alpha, np.ones((5, 5), np.uint8)) - cv2.erode(alpha, np.ones((5, 5), np.uint8)) > .005
    result = premult.copy()
    result[edge] = filtered[edge]
    a = result[:, :, 3]
    a[(alpha == 0) & (rgb.max(2) < 32)] = 0
    result[:, :, :3] /= np.maximum(a[:, :, None], .01)
    result[a < .01, :3] = 0
    return np.rint(np.clip(result, 0, 1) * 255).astype(np.uint8)


if __name__ == '__main__':
    source = decode(ROOT / 'title-character-source.mp4', 'rgb24')
    mask = decode(ROOT / 'title-character-mask-source.webm', 'gray')
    output = ROOT / 'title-character-alpha.webm'
    encoder = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba',
        '-s', f'{WIDTH}x{HEIGHT}', '-r', '24', '-i', 'pipe:0', '-an', '-c:v', 'libvpx-vp9',
        '-pix_fmt', 'yuva420p', '-crf', '14', '-b:v', '0', '-deadline', 'good', '-cpu-used', '3',
        '-row-mt', '1', '-threads', '4', str(output)], stdin=subprocess.PIPE)

    original = cv2.imread('public/art/title-birth-character.webp', cv2.IMREAD_UNCHANGED)
    if original is None or original.shape[2] != 4:
        raise ValueError('Original transparent cutout required')
    original_alpha = np.zeros((HEIGHT, WIDTH), np.uint8)
    original_alpha[100:1180] = cv2.resize(original[:, :, 3], (720, 1080), interpolation=cv2.INTER_LANCZOS4)
    initial_rgb = None
    initial_gray = None

    def read_frame():
        global initial_rgb, initial_gray
        color = source.stdout.read(WIDTH * HEIGHT * 3)
        matte = mask.stdout.read(WIDTH * HEIGHT)
        if not color and not matte:
            return None
        if len(color) != WIDTH * HEIGHT * 3 or len(matte) != WIDTH * HEIGHT:
            raise ValueError('Source and mask frames do not match')
        rgb = np.frombuffer(color, np.uint8).reshape(HEIGHT, WIDTH, 3).astype(np.float32)
        alpha = np.frombuffer(matte, np.uint8).reshape(HEIGHT, WIDTH)
        gray = cv2.resize(cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY), (360, 640))
        if initial_rgb is None:
            initial_rgb = rgb.copy()
            initial_gray = gray
        flow = cv2.calcOpticalFlowFarneback(gray, initial_gray, None, .5, 5, 31, 5, 7, 1.5, 0)
        flow = cv2.resize(flow, (WIDTH, HEIGHT), interpolation=cv2.INTER_LINEAR) * 2
        x, y = grid(HEIGHT, WIDTH)
        mx, my = x + flow[:, :, 0], y + flow[:, :, 1]
        trusted = cv2.remap(original_alpha, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
        reference = cv2.remap(initial_rgb, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
        return rgb, refine(rgb, alpha, trusted, reference)

    count = 0
    try:
        current = read_frame()
        previous = current
        following = read_frame()
        while current is not None:
            encoder.stdin.write(stabilize_edges(current, previous, following or current).tobytes())
            count += 1
            previous, current = current, following
            following = read_frame() if current is not None else None
    except BaseException:
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
    print(f'Refined and stabilized {count} frames: {output}')
