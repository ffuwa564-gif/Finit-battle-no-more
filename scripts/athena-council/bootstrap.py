"""Official assets only; isolated art/music are excluded from the public inputs ZIP."""
import pathlib,urllib.request,concurrent.futures
ROOT=pathlib.Path(__file__).resolve().parents[2];O=ROOT/'artifacts/athena-council';A=O/'assets'
for d in ['assets','research','speech','render','delivery']:(O/d).mkdir(exist_ok=True,parents=True)
def fetch(item):
 folder,name=item;p=A/(name+'.png')
 if not p.exists():urllib.request.urlretrieve(f'https://zunko.jp/sozai/{folder}/{name}.png',p)
 return p
items=[('zundamon','zunmon003'),('methane','met002_cr')]+[('usagi',f'usagi_s{i:03}')for i in [1,4,5]]
with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:
 for p in pool.map(fetch,items):print(p.name,flush=True)
print('Terms: https://zunko.jp/guideline.html / https://zunko.jp/con_ongen_kiyaku.html')
