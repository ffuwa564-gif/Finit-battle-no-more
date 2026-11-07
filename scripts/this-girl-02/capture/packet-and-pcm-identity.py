"""Independently reject acquisition gaps and hidden waveform/tempo changes.

Run only after capture/calibration is finished. The reference is the original OS
PCM, not the edited movie. Only the predeclared shared-PTS boundary pad/trim and
at most one sample of timebase quantization are permitted.
"""
from pathlib import Path
from decimal import Decimal
import argparse, hashlib, json, subprocess, traceback
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
O = ROOT / 'artifacts/this-girl-02'
C = O / 'capture'


def sha(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda: f.read(1048576), b''):
            h.update(b)
    return h.hexdigest()


def run(*args):
    return subprocess.check_output(list(map(str, args)))


def pcm(p):
    raw = run('ffmpeg', '-v', 'error', '-threads', '1', '-i', p, '-map', '0:a:0',
              '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2', '-f', 's16le', '-')
    return np.frombuffer(raw, '<i2').reshape(-1, 2)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('id')
    a = ap.parse_args()
    assert a.id.replace('-', '').isalnum()
    raw = C / (a.id + '-os-raw.mkv')
    canonical = C / (a.id + '-native-calibration.mov')
    metadata = C / (a.id + '.json')
    result = {'passed': False, 'id': a.id, 'codeSha256': sha(Path(__file__)),
              'rawMovieSha256': sha(raw), 'canonicalMovieSha256': sha(canonical),
              'metadataSha256': sha(metadata), 'gapThresholdSeconds': .1,
              'totalDurationToleranceSeconds': .08, 'maximumBoundaryQuantizationSamples': 1}
    try:
        probe = json.loads(run('ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_streams',
                               '-show_packets', '-show_entries', 'stream=codec_name,sample_rate,channels:packet=pts_time,size',
                               '-of', 'json', raw))
        stream = probe['streams'][0]
        assert stream['codec_name'] == 'pcm_s16le' and int(stream['sample_rate']) == 48000 and stream['channels'] == 2
        packets = probe['packets']
        assert len(packets) >= 2
        starts = [Decimal(p['pts_time']) for p in packets]
        lengths = [Decimal(int(p['size'])) / Decimal(4 * 48000) for p in packets]
        gaps = [float(starts[i + 1] - starts[i] - lengths[i]) for i in range(len(packets) - 1)]
        sample_seconds = sum(lengths)
        pts_seconds = starts[-1] + lengths[-1] - starts[0]
        gap_pass = max(gaps) <= .1 and min(gaps) >= -.1 and abs(float(sample_seconds - pts_seconds)) <= .08
        result['packetClock'] = {'passed': gap_pass, 'packets': len(packets), 'maximumGapSeconds': max(gaps),
                                 'minimumGapSeconds': min(gaps), 'sampleSeconds': float(sample_seconds),
                                 'ptsSpanSeconds': float(pts_seconds), 'durationDifferenceSeconds': float(sample_seconds - pts_seconds)}
        assert gap_pass, 'Discontinuous native OS acquisition; do not conceal by padding or tempo changes'
        m = json.loads(metadata.read_text())
        window = m['calibration']['commonWindow']
        shift = (Decimal(str(window['audioStartPts'])) - Decimal(str(window['videoStartPts']))) * Decimal(48000)
        nearest = int(shift.to_integral_value())
        original, normalized = pcm(raw), pcm(canonical)
        assert len(original) == sum(int(p['size']) for p in packets) // 4
        assert len(normalized) == window['samples']
        matching = []
        for padding in sorted({int(shift), nearest, nearest - 1, nearest + 1}):
            if abs(Decimal(padding) - shift) > 1:
                continue
            src_start, dst_start = max(0, -padding), max(0, padding)
            count = min(len(original) - src_start, len(normalized) - dst_start)
            if count <= 0:
                continue
            equal = np.array_equal(original[src_start:src_start + count], normalized[dst_start:dst_start + count])
            zero_head = not np.any(normalized[:dst_start])
            zero_tail = not np.any(normalized[dst_start + count:])
            if equal and zero_head and zero_tail:
                matching.append({'startPaddingFrames': dst_start, 'rawLeadingTrimFrames': src_start,
                                 'comparedFrames': count, 'rawTrailingTrimFrames': len(original) - src_start - count,
                                 'trailingPaddingFrames': len(normalized) - dst_start - count,
                                 'shiftFromPtsSamples': str(shift), 'appliedBoundarySamples': padding,
                                 'boundaryQuantizationSamples': float(Decimal(padding) - shift),
                                 'comparedSha256': hashlib.sha256(original[src_start:src_start + count].tobytes()).hexdigest()})
        assert matching, 'Canonical pre-notch PCM differs from the shared-window raw samples'
        result['pcmIdentity'] = {'passed': True, 'changedFrames': 0, 'matches': matching,
                                 'scope': 'Full pre-notch sample window, bitwise; only timestamped boundary pad/trim. No interior insertions, deletions or sample rescaling.'}
        assert sha(raw) == result['rawMovieSha256'] and sha(canonical) == result['canonicalMovieSha256'] and sha(metadata) == result['metadataSha256']
        result['passed'] = True
    except Exception as e:
        result.update(error=str(e), traceback=traceback.format_exc())
    target = O / 'research' / ('packet-pcm-qa-' + a.id + '.json')
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print('OS PACKET/PCM IDENTITY', a.id, result['passed'])
    if not result['passed']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
