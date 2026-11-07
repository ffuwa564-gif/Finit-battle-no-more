"""Plan one fixed sample shift per frozen shot from independent native graph QA.

No audio/video is edited here. Positive audioSourceOffsetSamples means read later
source audio (advance audio). Original global failures and measured low NCC remain.
The result is planning evidence; exact finished-file QA is separately mandatory.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
EPISODE = 'THIS-GIRL-002'
RATE = 48000
LIMIT = .08
MIN_NCC = .65


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for b in iter(lambda: f.read(1024 * 1024), b''):
            h.update(b)
    return h.hexdigest()


def local(value: str | Path) -> Path:
    p = Path(value)
    return p if p.is_absolute() else ROOT / p


def read(path: str | Path) -> Any:
    return json.loads(local(path).read_text())


def evidence(path: str | Path) -> dict[str, str]:
    p = local(path)
    return {'path': str(p.relative_to(ROOT)), 'sha256': sha(p)}


def finite(value: Any) -> bool:
    return type(value) in (int, float) and math.isfinite(value)


def minimax(lags: list[float], rate: int = RATE) -> tuple[int, float]:
    if not lags or any(not finite(x) for x in lags):
        raise ValueError('All lags must be observed finite values')
    center = (min(lags) + max(lags)) / 2
    # Check both adjacent integers; select the one minimizing worst residual.
    # Ties resolve to the smaller integer, deterministically, not by a later cue.
    lower = math.floor(center * rate)
    candidates = [lower, lower + 1]
    samples = min(candidates, key=lambda n: (max(abs(x - n / rate) for x in lags), n))
    return samples, center


def native_span(entry: dict[str, Any], metadata: dict[str, Any]) -> tuple[float, float | None]:
    scheduled = entry.get('effectiveStartContextTime', entry['scheduledContextTime'])
    start = (entry['wallTime'] - metadata['cameraEpochUnixSeconds']
             + max(0, scheduled - entry['contextTime']))
    if entry.get('cancelledBeforeStart'):
        return start, start
    stops = []
    if finite(entry.get('effectiveStopContextTime')):
        stops.append(max(0, entry['effectiveStopContextTime'] - scheduled))
    if finite(entry.get('duration')):
        stops.append(max(0, entry['duration'] / entry['playbackRate']))
    if not entry.get('loop'):
        stops.append(max(0, (entry['frames'] / entry['sampleRate'] - entry['offset'])
                         / entry['playbackRate']))
    if not stops:
        return start, None  # Undetermined loop tail cannot silently disappear.
    return start, start + min(stops)


def required_indices(shot: dict[str, Any], metadata: dict[str, Any]) -> tuple[list[int], list[str]]:
    start, end = shot['sourceStartFrame'] / 30, shot['sourceEndFrame'] / 30
    result, problems = [], []
    for i, entry in enumerate(metadata['nativeBufferStarts']):
        lo, hi = native_span(entry, metadata)
        if hi == lo:
            continue
        if lo < end + LIMIT and (hi is None or hi > start - LIMIT):
            result.append(i)
            if hi is None:
                problems.append(f'Native index {i} has an undetermined active/loop tail')
    return result, problems


def plan_one(shot: dict[str, Any], measured: dict[str, Any],
             metadata: dict[str, Any]) -> dict[str, Any]:
    required, problems = required_indices(shot, metadata)
    rows = measured.get('measurements', [])
    indices = [r.get('nativeIndex') for r in rows]
    if len(set(indices)) != len(indices):
        problems.append('Duplicate nativeIndex in shot measurements')
    if any(type(i) is not int or not 0 <= i < len(metadata['nativeBufferStarts']) for i in indices):
        problems.append('Invalid nativeIndex in shot measurements')
    if measured.get('id') != shot['id']:
        problems.append('Shot measurement ID mismatch')
    if set(measured.get('eligibleNativeIndices', [])) != set(indices):
        problems.append('Eligible native indices do not equal the measured set')
    if not set(required).issubset(indices):
        problems.append('Missing boundary/active cues: ' + str(sorted(set(required) - set(indices))))
    if measured.get('tailsIncluded') is not True:
        problems.append('Boundary tails were not included')
    if not rows:
        problems.append('No eligible independent mixture measurements')
    for exclusion in measured.get('exclusions', []):
        if exclusion.get('status') != 'out-of-used-range':
            problems.append('Unverifiable excluded cue: ' + str(exclusion))
    coverage = measured.get('coverage', {})
    if not coverage or not all(v is True for v in coverage.values()):
        problems.append('Declared time coverage incomplete or missing')
    valid = []
    for r in rows:
        if not finite(r.get('lagSeconds')) or not finite(r.get('correlation')):
            problems.append(f"Missing/nonfinite lag or NCC: {r.get('nativeIndex')}")
            continue
        if not -1 <= r['correlation'] <= 1.00001:
            problems.append(f"Invalid normalized correlation: {r['nativeIndex']}")
        if r['correlation'] < MIN_NCC:
            problems.append(f"NCC below fixed .65: {r['nativeIndex']}")
        if r.get('ambiguous'):
            problems.append(f"Ambiguous mixture identity: {r['nativeIndex']}")
        if r.get('independentGraphReference') is not True:
            problems.append(f"Independent graph reference not certified: {r['nativeIndex']}")
        valid.append(r)
    offset, center = minimax([r['lagSeconds'] for r in valid]) if valid else (0, None)
    audio_start = shot['sourceStartFrame'] * 1600 + offset
    audio_end = shot['sourceEndFrame'] * 1600 + offset
    source_samples = metadata.get('sourceNormalization', {}).get('audioSamples')
    if source_samples is None and finite(metadata.get('duration')):
        source_samples = round(metadata['duration'] * RATE)
    if source_samples is None or audio_start < 0 or audio_end > source_samples:
        problems.append('Shifted source audio window is unavailable or unbounded')
    output_rows = []
    for r in valid:
        residual = r['lagSeconds'] - offset / RATE
        passed = (abs(residual) <= LIMIT and r['correlation'] >= MIN_NCC
                  and not r.get('ambiguous') and bool(r.get('independentGraphReference')))
        output_rows.append({**r, 'lagBeforeSeconds': r['lagSeconds'],
                            'residualSeconds': residual, 'passed': passed})
    residuals_pass = bool(output_rows) and all(abs(r['residualSeconds']) <= LIMIT for r in output_rows)
    ncc_pass = bool(output_rows) and all(r['correlation'] >= MIN_NCC for r in output_rows)
    if not residuals_pass:
        problems.append('A constant shot shift cannot establish all residuals <=80ms')
    lags = [r['lagSeconds'] for r in valid]
    return {k: shot[k] for k in ['id', 'file', 'sourceStartFrame', 'sourceEndFrame',
                                'sourceSha256', 'metadataSha256']} | {
        'audioSourceOffsetSamples': offset, 'sampleRate': RATE,
        'shiftedSourceAudioStartSample': audio_start, 'shiftedSourceAudioEndSample': audio_end,
        'eligibleNativeIndices': indices, 'metadataRequiredNativeIndices': required,
        'minimumLagSeconds': min(lags) if lags else None,
        'maximumLagSeconds': max(lags) if lags else None,
        'minimaxCenterSeconds': center,
        'maximumResidualSeconds': max((abs(r['residualSeconds']) for r in output_rows), default=None),
        'allEligibleResidualsWithin80ms': residuals_pass,
        'allCorrelationsPassed': ncc_pass, 'tailsIncluded': bool(measured.get('tailsIncluded')),
        'coverage': coverage, 'measurements': output_rows,
        'exclusions': measured.get('exclusions', []), 'problems': problems,
        'passed': not problems and len(output_rows) == len(rows) and all(r['passed'] for r in output_rows),
    }


def build(shots_path: str, catalog_path: str, measurements_path: str) -> dict[str, Any]:
    freeze, catalog, measurement = read(shots_path), read(catalog_path), read(measurements_path)
    assert freeze['selectionFinalized'] and freeze['episode'] == EPISODE
    assert measurement['finalized'] and measurement['episode'] == EPISODE
    assert measurement['shotFreezeSha256'] == sha(local(shots_path))
    assert measurement['sourceCatalogSha256'] == sha(local(catalog_path))
    measurement_code = ROOT / 'scripts/this-girl-02-preview/capture/measure-used-shots.py'
    assert measurement['codeSha256'] == sha(measurement_code), 'Changed waveform measurement code'
    assert freeze['sampleRate'] == RATE and freeze['fps'] == 30
    by_id = {s['id']: s for s in measurement['shots']}
    assert len(by_id) == len(measurement['shots'])
    assert set(by_id) == {s['id'] for s in freeze['shots']}
    planned = []
    for s in freeze['shots']:
        assert s['durationFrames'] == s['sourceEndFrame'] - s['sourceStartFrame'] > 0
        assert s['sampleRate'] == RATE and s['editorialPlaybackRate'] == 1
        assert sha(local(s['file'])) == s['sourceSha256']
        assert sha(local(s['metadata'])) == s['metadataSha256']
        catalog_source = next(c for c in catalog['sources'].values() if c['movie'] == s['file'])
        assert catalog_source['hashes']['movie'] == s['sourceSha256']
        assert catalog_source['hashes']['metadata'] == s['metadataSha256']
        assert by_id[s['id']]['sourceMovieSha256'] == s['sourceSha256']
        assert by_id[s['id']]['sourceMetadataSha256'] == s['metadataSha256']
        planned.append(plan_one(s, by_id[s['id']], read(s['metadata'])))
    return {'schemaVersion': 1, 'episode': EPISODE, 'finalized': True,
            'passed': all(s['passed'] for s in planned),
            'scope': '使用区間・編集補正後。Planning only; exact finished-file verification remains mandatory.',
            'codeSha256': sha(Path(__file__)),
            'inputs': {'shotFreeze': evidence(shots_path), 'sourceCatalog': evidence(catalog_path),
                       'measurements': evidence(measurements_path),
                       'measurementCode': evidence(measurement_code),
                       'waveformTools': evidence(ROOT / 'scripts/this-girl-02-preview/capture/native-buffer-qa.py')},
            'thresholds': {'sampleRate': RATE, 'maxResidualSeconds': LIMIT, 'minimumCorrelation': MIN_NCC},
            'offsetSign': 'Positive reads later source audio and advances game audio; residual=measuredLag-offset/sampleRate',
            'correctionPolicy': 'One minimax integer sample shift per prospectively frozen shot; no pitch/tempo/warp/replay/reordering',
            'globalSourcePassClaimed': False, 'shots': planned}


def self_test() -> None:
    n, _ = minimax([.04, .145]); assert n == 4440
    assert max(abs(x - n / RATE) for x in [.04, .145]) < LIMIT
    n, _ = minimax([-.03, .2]); assert max(abs(x - n / RATE) for x in [-.03, .2]) > LIMIT
    n, _ = minimax([-.1, -.08]); assert n == -4320
    m = {'cameraEpochUnixSeconds': 100, 'nativeBufferStarts': [
        {'scheduledContextTime': 2, 'contextTime': 2, 'wallTime': 109.9,
         'sampleRate': 100, 'frames': 100, 'offset': 0, 'playbackRate': 1, 'loop': False}]}
    s = {'sourceStartFrame': 300, 'sourceEndFrame': 330}
    assert required_indices(s, m)[0] == [0], 'Boundary tail was missed'
    m['duration'] = 20
    s.update(id='synthetic', file='synthetic.mov', sourceSha256='synthetic', metadataSha256='synthetic')
    measured = {'id': 'synthetic', 'eligibleNativeIndices': [0], 'tailsIncluded': True,
                'coverage': {'allAudibleCues': True}, 'measurements': [
                    {'nativeIndex': 0, 'lagSeconds': .145, 'correlation': .9,
                     'independentGraphReference': True, 'ambiguous': False}]}
    good = plan_one(s, measured, m)
    assert good['passed'] and good['audioSourceOffsetSamples'] == 6960
    measured['measurements'][0]['correlation'] = .64
    assert not plan_one(s, measured, m)['passed'], 'Low NCC was hidden by correction'
    measured['measurements'] = []; measured['eligibleNativeIndices'] = []
    assert not plan_one(s, measured, m)['passed'], 'Missing boundary tail was accepted'
    print('Synthetic sign/minimax/tail/NCC/missing-coverage tests passed; not combat or media evidence')


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--shots', default='artifacts/this-girl-02-preview/capture/used-intervals.json')
    p.add_argument('--catalog', default='artifacts/this-girl-02-preview/research/source-catalog.json')
    p.add_argument('--measurements', default='artifacts/this-girl-02-preview/research/used-shot-audio-measurements.json')
    p.add_argument('--out', default='artifacts/this-girl-02-preview/research/used-audio-offset-plan.json')
    p.add_argument('--self-test', action='store_true')
    a = p.parse_args()
    if a.self_test:
        self_test(); return
    report = build(a.shots, a.catalog, a.measurements)
    local(a.out).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print('SCOPED AUDIO OFFSET PLAN', report['passed'])
    if not report['passed']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
