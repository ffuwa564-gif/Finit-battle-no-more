"""Restore archived lossless speech and check PCM frames (WAV headers may differ)."""
import hashlib,json,pathlib,subprocess,wave
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/myth-lab'
manifest=ROOT/'Speech-Manifest.json'
checks={row['wav']:row for row in json.loads(manifest.read_text())}if manifest.exists()else{}
for p in (OUT/'speech').glob('*.flac'):
 target=p.with_suffix('.wav');key=str(target.relative_to(ROOT));row=checks.get(key)
 if row:assert hashlib.sha256(p.read_bytes()).hexdigest()==row['losslessFlacSha256']
 if not target.exists():subprocess.run(['ffmpeg','-v','error','-y','-i',str(p),'-ar','24000','-ac','1','-c:a','pcm_s16le',str(target)],check=True)
 if row:
  with wave.open(str(target))as stream:assert hashlib.sha256(stream.readframes(stream.getnframes())).hexdigest()==row['pcmFramesSha256']
print('Speech PCM restored and available manifest checks passed')
