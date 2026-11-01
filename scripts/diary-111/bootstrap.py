import pathlib,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/diary-111'
for d in ['assets','speech','delivery','render','capture','proofs','search','reference']:(OUT/d).mkdir(parents=True,exist_ok=True)
for folder,name in [('zundamon','zunmon003'),('methane','met002_cr')]:
 p=OUT/'assets'/(name+'.png')
 if not p.exists():urllib.request.urlretrieve(f'https://zunko.jp/sozai/{folder}/{name}.png',p)
print('Official terms: https://zunko.jp/guideline.html / https://zunko.jp/con_ongen_kiyaku.html')
