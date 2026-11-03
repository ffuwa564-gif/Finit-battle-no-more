"""Package this episode only after exact-final-file checks; no network or deployment.

A research verdict of 'research' is valid. Missing evidence, an unfinished movie,
or a falsely certified verdict is not. Standalone licensed music/voice is excluded.
"""
from pathlib import Path
import argparse, gzip, hashlib, json, subprocess, zipfile
import jsonschema

ROOT = Path(__file__).resolve().parents[2]
O = ROOT / 'artifacts/this-girl-01'
D = O / 'delivery'
R = O / 'research'
LIMIT = 100 * 1024 * 1024
CHUNK = 88 * 1024 * 1024
EPISODE = 'THIS-GIRL-001'
REPO = 'ffuwa564-gif/Finit-battle-no-more'


def sha(p):
    h = hashlib.sha256()
    with Path(p).open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def read(p):
    return json.loads(Path(p).read_text())


def write(p, value):
    Path(p).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def local(value):
    p = Path(value)
    p = p if p.is_absolute() else ROOT / p
    assert p.is_relative_to(ROOT), ('Non-project logical path', value)
    assert p.is_file(), ('Missing input', value)
    assert not any(x in p.relative_to(ROOT).parts for x in ['.git', 'node_modules', '__pycache__'])
    # Heavy media may be /tmp-backed, but only through this episode's directories.
    allowed = [ROOT] + [(O / x).resolve() for x in ['render', 'capture', 'assets', 'proofs', 'research', 'speech']]
    assert any(p.resolve().is_relative_to(a) for a in allowed), ('Unapproved symlink', value)
    return p


def rel(p):
    return str(Path(p).relative_to(ROOT))


def validate():
    movie = local(D / 'ThisGirl-01.mp4')
    assert movie.stat().st_size < LIMIT, 'Re-encode below 100MiB, then repeat every final QA'
    digest = sha(movie)
    timeline = read(local(O / 'render/timeline.json'))
    assert timeline['finalized'] and timeline['episode'] == EPISODE
    freeze = read(local(R / 'render-input-freeze.json'))
    assert freeze['passed'] and freeze['finishedSha256'] == digest
    for name, expected in freeze['inputs'].items():
        p = Path(name)
        if p.is_absolute() and p.parent == Path('/usr/share/fonts/opentype/noto'):
            assert p.name in [f'Noto{family}CJK-{weight}.ttc' for family in ['Sans', 'Serif'] for weight in ['Regular', 'Bold']]
        else:
            p = local(name)
        assert sha(p) == expected, ('Changed render input', name)
    qa = read(local(R / 'final-independent-qa.json'))
    browser = read(local(R / 'final-browser-qa.json'))
    visual = read(local(R / 'final-visual-review.json'))
    for report in [qa, browser, visual]:
        assert report['passed'] and report['movieSha256'] == digest, 'Stale or failed exact-file QA'
    assert qa['fullDecodePassed'] and qa['timelineSha256'] == sha(O / 'render/timeline.json')
    assert qa['qaCodeSha256'] == sha(ROOT / 'scripts/this-girl-01/capture/finished-qa.py')
    assert qa['constantFrameRateVerified']
    assert qa['audioMixSha256'] == sha(R / 'audio-mix.json')
    assert qa['audio'] and qa['video']
    assert {'voice', 'music', 'game'} <= {x['component'] for x in qa['audio']}
    assert all(x['passed'] and abs(x['lagSeconds']) <= .08 for x in qa['audio'] + qa['video'])
    assert {(x['engine'], x['fraction']) for x in browser['checks'] if x['passed']} == {
        (engine, f) for engine in ['chromium', 'webkit'] for f in [.05, .5, .9]}
    assert browser['unchangedDuringQA']
    assert len(browser['checks']) == 6 and all(x['passed'] for x in browser['checks'])
    assert visual['reviewer'] == '/root' and visual['contactSheets']
    assert all(visual['checks'].values())
    for name in visual['contactSheets']:
        local(name)
    lock = local(R / 'confirmation-lock.json')
    locksha = sha(lock)
    for name, expected in read(lock)['sources'].items():
        assert sha(local(name)) == expected, ('Changed locked research source', name)
    judgment = read(local(R / 'reports/judgment.json'))
    jsonschema.validate(judgment, read(ROOT / 'scripts/this-girl-01/analysis/judgment.schema.json'))
    assert judgment['finalized'] and judgment['sourceLockSha256'] == locksha
    status = judgment['overall']
    assert status['status'] in ['research', 'verified-scoped']
    assert status['certified'] == (status['status'] == 'verified-scoped')
    if not status['certified']:
        assert status['label'] == '研究中'
    assert judgment['nextEpisode']['characterId'] == 'miette' and not judgment['nextEpisode']['certified']
    refs = judgment['evidenceRefs'] + [r for g in judgment['gates'] + judgment['verifiedClaims'] for r in g['evidenceRefs']]
    for item in refs:
        assert sha(local(item['path'])) == item['sha256']
    ledger = read(local(R / 'roster-visibility.json'))
    assert ledger['inputHashes']['judgment'] == sha(R / 'reports/judgment.json')
    assert len(ledger['cards']) == len({x['seriesId'] for x in ledger['cards']}) == 72
    assert all(x['fullyVisibleSeconds'] >= 3 - 1e-8 for x in ledger['cards'])
    assert ledger['historicalAwardsAreNotCurrentAwards']
    selection = read(local(R / 'recording-selection.json'))
    chosen = None
    locked_cases = read(lock)['cases']
    case_order = [(tier, stage, core) for tier in [6, 4, 3]
                  for stage in ['ivory-tower-010', 'kuzuha-awakening'] for core in ['F1', 'F4']]
    for tier, stage, core in case_order:
        candidate = next(c for c in locked_cases if (c['tier'], c['stage'], c['coreId']) == (tier, stage, core))
        with gzip.open(local(R / 'confirmation' / (candidate['id'] + '.json.gz')), 'rt') as f:
            data = json.load(f)
        assert data['lockSha'] == locksha
        for a, c in zip(data['arms']['A']['rows'], data['arms']['C']['rows']):
            assert a['seed'] == c['seed']
            if a['win'] and c['win'] and all(c['telemetry'].get(k, 0) > 0 for k in ['petalsStored', 'petalsSpent', 'returnDamage']):
                chosen = (candidate['id'], c['seed'], data)
                break
        if chosen:
            break
    assert chosen and (selection['caseId'], selection['logicalSeed']) == chosen[:2], 'Recording differs from prospective selection rule'
    case = next(c for c in read(lock)['cases'] if c['id'] == selection['caseId'])
    seed = next(s for s in read(lock)['seedMap'] if s['logical'] == selection['logicalSeed'])
    assert selection['applicationSeed'] == seed['applicationSeed'] and selection['stageId'] == case['stage']
    assert selection['arms'] == {k: case['arms'][k] for k in ['A', 'C']}
    for ident, arm in [('reference', 'A'), ('sakuya', 'C')]:
        source = local(O / 'capture' / (ident + '.mov'))
        info = read(local(R / ('capture-source-' + ident + '.json')))
        proof = read(local(R / ('proof-' + ident + '.json')))
        assert info['nativeBrowserVerified'] and info['cleanSha256'] == sha(source)
        assert info['calibration']['passed'] and max(map(abs, info['calibration']['encodedResidualMs'])) <= 80
        norm = info['sourceNormalization']
        assert norm['passed'] and norm['pcmIdentical'] and norm['fullDecodePassed']
        assert norm['outputSha256'] == sha(source) and norm['allFramesCompared'] > 0
        assert proof['passed'] and all(proof['checks'].values())
        assert info['proofSha256'] == proof['proofSha256']
        assert sha(local(O / 'proofs' / (ident + '.json.gz'))) == proof['proofSha256']
        spec = proof['spec']
        assert spec.get('preflight') is not True and spec['model'] == case['arms'][arm]['mode'] == 'after'
        assert spec['caseId'] == case['id'] and spec['arm'] == arm
        assert spec['config'] == case['arms'][arm]['config']
        assert spec['stageId'] == case['stage'] and spec['applicationSeed'] == seed['applicationSeed']
        assert spec['logicalSeed'] == seed['logical']
        assert proof['sourceTreeSha256'] == info['sourceTreeSha256']
        native_audio = read(local(R / ('native-buffer-qa-' + ident + '.json')))
        assert native_audio['passed'] and native_audio['rawOnly'] is False
        assert native_audio['partialPreflight'] is False and native_audio['sampleContinuity']
        assert native_audio['sourceSha256'] == sha(source)
        assert native_audio['metadataSha256'] == sha(O / 'capture' / (ident + '.json'))
        assert native_audio['pcmSha256'] == sha(local(O / 'capture' / (ident + '.pcm')))
        measured = next(r for r in chosen[2]['arms'][arm]['rows'] if r['seed'] == seed['logical'])
        summary = proof['nativeSummary']
        assert (summary['win'], summary['rounds'], summary['pots'], summary['survivors']) == (
            measured['win'], measured['rounds'], measured['potionsUsed'], measured['survivors'])
        assert summary['telemetry'] == measured['telemetry']
    assert '研究版・未公開仕様' in (D / 'Script.md').read_text()
    assert 'VOICEVOX:春日部つむぎ' in (D / 'Credits.md').read_text()
    from PIL import Image
    assert Image.open(local(D / 'Thumbnail-ThisGirl-01.png')).size == (1280, 720)
    return movie, digest, locksha


def sources():
    """Explicit rights-aware archive; no raw BGM, generated voice, or music-only mix."""
    files = set()
    for folder in [ROOT / 'scripts/this-girl-01', ROOT / 'docs/media/this-girl/episodes/01',
                   ROOT / 'src', O / 'baseline/src', ROOT / 'tools/media-sync',
                   ROOT / 'tests', ROOT / 'e2e', ROOT / 'itch-e2e', R, O / 'proofs', O / 'assets']:
        for p in folder.rglob('*'):
            if not p.is_file() or '__pycache__' in p.parts or p.name.endswith(('.partial', '.pyc')):
                continue
            if p.suffix.lower() in ['.mp3', '.wav', '.flac', '.ogg', '.webm']:
                continue
            files.add(local(p))
    for p in [ROOT / 'package.json', ROOT / 'package-lock.json', ROOT / 'tsconfig.json',
              ROOT / '.github/workflows/sakuya-research-search.yml',
              ROOT / '.github/workflows/sakuya-research-confirm.yml']:
        files.add(local(p))
    for p in ROOT.glob('playwright*.config.ts'):
        files.add(local(p))
    # Preserve the normalized native footage and its calibrated pre-normalization original.
    for p in (O / 'capture').glob('*'):
        final_capture = any(p.name.startswith(ident + '.') for ident in ['reference', 'sakuya'])
        if p.is_file() and final_capture and (p.suffix in ['.mov', '.json', '.pcm'] or p.name.endswith(('.mov.tmporiginal', '.json.tmporiginal'))):
            files.add(local(p))
    for ident in ['reference', 'sakuya']:
        pcm = local(O / 'capture' / (ident + '.pcm'))
        metadata = read(O / 'capture' / (ident + '.json'))
        assert sha(pcm) == metadata['audioCapture']['sha256']
        files.add(pcm)
        for p in (O / 'capture' / ('native-references-' + ident)).glob('*.f32'):
            files.add(local(p))
    for p in [O / 'render/timeline.json', O / 'narration.json', O / 'editorial.json']:
        files.add(local(p))
    return sorted(files)


def archive(files):
    """Split any large byte stream losslessly; every Git blob remains below the limit."""
    folder = O / 'render/package-staging'
    folder.mkdir(exist_ok=True)
    stream = folder / 'Production-and-Evidence.zip'
    with zipfile.ZipFile(stream, 'w', zipfile.ZIP_DEFLATED, compresslevel=5) as z:
        for p in files:
            z.write(p, rel(p))
    parts = []
    with stream.open('rb') as f:
        while block := f.read(CHUNK):
            name = f'Production-and-Evidence.zip.part{len(parts) + 1:03d}'
            physical = folder / name
            physical.write_bytes(block)
            part = D / name
            if part.is_symlink():
                assert part.resolve() == physical.resolve(), 'Unexpected prior delivery symlink'
                part.unlink()
            assert not part.exists(), 'Refuse to overwrite an unrelated delivery file'
            part.symlink_to(physical.resolve())
            parts.append({'file': part.name, 'bytes': len(block), 'sha256': sha(part)})
    result = {'file': stream.name, 'bytes': stream.stat().st_size, 'sha256': sha(stream), 'parts': parts,
              'restore': 'Concatenate .part001, .part002, ... in numeric order, verify whole ZIP SHA256, then unzip.'}
    stream.unlink()
    return result


def package():
    movie, digest, locksha = validate()
    render_path = local(R / 'render-manifest.json')
    rendered = read(render_path)
    assert rendered['renderComplete'] and rendered['sha256'] == digest
    rendered.update(finalized=True, finalQaComplete=True,
                    note='Exact finished-file sync, decode, browser and visual QA passed. This finalizes the media only; the separate research judgment can remain research ongoing.',
                    finalQa={name: sha(R / name) for name in [
                        'final-independent-qa.json', 'final-browser-qa.json', 'final-visual-review.json']})
    write(render_path, rendered)
    required = ['Script.md', 'Subtitles-ja.srt', 'Chapters.txt', 'YouTube-Description.txt', 'Credits.md',
                'Reproduce.md', 'ResearchReport.md', 'Character-Judgment.json', 'Design-Decisions.md',
                'Roster-Audit.md', 'Stone-Goals.md', 'Thumbnail-ThisGirl-01.png']
    for name in required:
        local(D / name)
    assert sha(D / 'Character-Judgment.json') == sha(R / 'reports/judgment.json')
    files = sources()
    inputs = {rel(p): {'bytes': p.stat().st_size, 'sha256': sha(p)} for p in files}
    bundle = archive(files)
    manifest = {'passed': True, 'episode': EPISODE, 'finishedSha256': digest, 'sourceLockSha256': locksha,
                'sourceCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
                'sourceBranch': 'research/sakuya-this-girl-01', 'mediaBranch': 'downloads/this-girl-01',
                'researchJudgment': read(R / 'reports/judgment.json')['overall'], 'inputs': inputs, 'archive': bundle,
                'rights': 'Raw music, standalone synthesized voice, and music-only mixes excluded. Restore licensed inputs from recorded official sources under their terms.',
                'publication': 'GitHub research/media only; no public game merge or itch.io deployment.'}
    public = ['ThisGirl-01.mp4', *required, *[p['file'] for p in bundle['parts']], 'Packaging-Manifest.json', 'SHA256SUMS.txt']
    manifest['publicFiles'] = public
    write(D / 'Packaging-Manifest.json', manifest)
    (D / 'SHA256SUMS.txt').write_text(''.join(sha(local(D / name)) + '  ' + name + '\n' for name in public if name != 'SHA256SUMS.txt'))
    check()


def check():
    _, digest, locksha = validate()
    manifest = read(local(D / 'Packaging-Manifest.json'))
    assert manifest['passed'] and manifest['finishedSha256'] == digest and manifest['sourceLockSha256'] == locksha
    for path, info in manifest['inputs'].items():
        p = local(path)
        assert p.stat().st_size == info['bytes'] and sha(p) == info['sha256'], ('Changed package input', path)
    sums = {}
    for line in (D / 'SHA256SUMS.txt').read_text().splitlines():
        digest, name = line.split('  ', 1)
        assert name not in sums
        sums[name] = digest
    assert set(sums) == set(manifest['publicFiles']) - {'SHA256SUMS.txt'}
    for name in manifest['publicFiles']:
        assert Path(name).name == name
        p = local(D / name)
        assert p.stat().st_size < LIMIT
        if name in sums:
            assert sha(p) == sums[name]
    print('EXACT-FILE PUBLICATION GATE PASSED', manifest['finishedSha256'])
    return manifest


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('action', choices=['package', 'check'])
    a = p.parse_args()
    package() if a.action == 'package' else check()
