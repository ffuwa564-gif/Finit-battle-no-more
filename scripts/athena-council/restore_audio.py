import pathlib,subprocess,json,hashlib,wave
ROOT=pathlib.Path(__file__).resolve().parents[2]
for row in json.loads((ROOT/'Speech-Manifest.json').read_text()):
 wav=ROOT/row['wav'];flac=wav.with_suffix('.flac');subprocess.run(['ffmpeg','-v','error','-y','-i',str(flac),'-c:a','pcm_s16le',str(wav)],check=True)
 with wave.open(str(wav))as f:assert hashlib.sha256(f.readframes(f.getnframes())).hexdigest()==row['pcmFramesSha256']
print('Lossless speech restored and PCM hashes verified')
