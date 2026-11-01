"""Fetch the two official standing images; game art/music come from the fixed game tree."""
import pathlib,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/command-lab'
for directory in ['assets','speech','delivery','research']:(OUT/directory).mkdir(parents=True,exist_ok=True)
for folder,name in [('zundamon','zunmon003'),('methane','met012')]:
 p=OUT/'assets'/(name+'.png')
 if not p.exists():urllib.request.urlretrieve(f'https://zunko.jp/sozai/{folder}/{name}.png',p)
print('Official terms: https://zunko.jp/guideline.html and https://zunko.jp/con_ongen_kiyaku.html')
