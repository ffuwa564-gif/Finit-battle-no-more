"""Re-fetch the licensed original locally, never include it in the source bundle."""
from pathlib import Path
import hashlib,json,urllib.request
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-02-preview'
def main():
 record=json.loads((O/'research/rights/music-source.json').read_text())
 assert record['standaloneRedistribution']is False
 url=record['downloadUrl'];assert url.startswith('https://amachamusic.chagasi.com/')
 raw=urllib.request.urlopen(url,timeout=60).read()
 assert hashlib.sha256(raw).hexdigest()==record['sha256'],'Official original changed; re-review the source instead of silently replacing it'
 path=ROOT/record['file'];path.parent.mkdir(exist_ok=True,parents=True);path.write_bytes(raw)
 print('Verified local music source',path,len(raw))
if __name__=='__main__':main()
