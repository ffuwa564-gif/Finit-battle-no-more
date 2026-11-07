#!/usr/bin/env python3
"""Fetch hash-pinned Debian runtime into /tmp only; never starts any service."""
import hashlib, json, subprocess
from pathlib import Path
ROOT = Path('/tmp/stillveil-native-runtime')
ROOT.mkdir(exist_ok=True)
(ROOT / 'debs').mkdir(exist_ok=True)
(ROOT / 'root').mkdir(exist_ok=True)
for package in json.loads(Path(__file__).with_name('packages.json').read_text()):
    filename = ROOT / 'debs' / Path(package['Filename']).name
    if not filename.exists() or hashlib.sha256(filename.read_bytes()).hexdigest() != package['SHA256']:
        subprocess.run(['curl', '-fLsS', 'https://deb.debian.org/debian/' + package['Filename'], '-o', str(filename)], check=True)
    if hashlib.sha256(filename.read_bytes()).hexdigest() != package['SHA256']:
        raise SystemExit('Hash mismatch: ' + str(filename))
    subprocess.run(['dpkg-deb', '-x', str(filename), str(ROOT / 'root')], check=True)
print('Runtime extracted; no browser or audio/display server was started.')
