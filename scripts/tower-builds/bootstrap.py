import pathlib,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/tower-builds'
for directory in ['assets','capture','proofs','speech','reference']:(OUT/directory).mkdir(parents=True,exist_ok=True)
for folder,name in [('zundamon','zunmon003'),('methane','met012')]:
 path=OUT/'assets'/(name+'.png')
 if not path.exists():urllib.request.urlretrieve(f'https://zunko.jp/sozai/{folder}/{name}.png',path)
print('Official standing assets ready. Terms: https://zunko.jp/guideline.html and https://zunko.jp/con_ongen_kiyaku.html')
