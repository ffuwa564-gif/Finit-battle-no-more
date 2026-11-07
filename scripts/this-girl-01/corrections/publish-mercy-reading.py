"""Publish the checked audio-only revision; reuse unchanged large evidence blobs."""
from pathlib import Path
import base64, hashlib, json, os, shutil, subprocess, tempfile, urllib.request, urllib.parse, zipfile
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-01';P=O/'pronunciation-fix';D=O/'delivery'
REPO='ffuwa564-gif/Finit-battle-no-more';BRANCH='downloads/this-girl-01'
BASE='5684031a8a320ae0f323f094b4bfe2d7719796c4'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p):return json.loads(Path(p).read_text())
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def cmd(a,env=None,data=None):return subprocess.check_output(a,cwd=ROOT,env=env,text=True,input=data).strip()
def main():
    fix=read(P/'correction.json');qa=read(P/'correction-qa.json');browser=read(P/'browser-qa.json');movie=P/'ThisGirl-01.mp4';digest=sha(movie)
    assert qa['passed'] and browser['passed'] and len(browser['checks'])==6
    assert fix['movieSha256']==qa['movieSha256']==browser['movieSha256']==digest
    assert qa['all12655VideoPacketPayloadsAndPtsDtsIdentical'] and qa['losslessMasterPcmUnchangedOutsideWord']
    assert qa['codeSha256']==sha(Path(__file__).with_name('verify-mercy-reading.py'))
    assert fix['sourceCodeSha256']==sha(Path(__file__).with_name('mercy-reading.py'))
    assert fix['correctedQuerySha256']==sha(P/'design-14-ji-u.query.json')
    assert all(x['passed'] and abs(x['lagSeconds'])<=.08 for x in qa['audioAnchors'])
    assert cmd(['git','ls-remote','--heads','origin','refs/heads/'+BRANCH]).split()[0]==BASE,'Concurrent media edit; inspect before updating'
    old=read(D/'Packaging-Manifest.json');receipt=read(O/'research/github-publication.json');assert receipt['passed'] and receipt['commit']==BASE
    public={n:D/n for n in old['publicFiles']}
    for name in ['Packaging-Manifest.json','SHA256SUMS.txt']:public.pop(name)
    shutil.copy2(D/'Packaging-Manifest.json',P/'Base-Packaging-Manifest-v1.json')
    shutil.copy2(D/'SHA256SUMS.txt',P/'Base-SHA256SUMS-v1.txt')
    for n in ['Base-Packaging-Manifest-v1.json','Base-SHA256SUMS-v1.txt']:public[n]=P/n
    public['ThisGirl-01.mp4']=movie
    note='''# 慈雨の読みの修正

音声の「慈雨」が「じい」に聞こえる箇所を「じう」に修正しました。
VOICEVOXの保存queryで「ジ・イ」になっていた第2モーラを「ウ / u」と明示しています。
約3:00.45〜3:01.47の単語と前後の読点休止だけを、元の無損失masterへ差し込みました。
他の音声部分の無損失PCM、全12,655映像packetと時刻、動画尺・字幕・図・ゲーム音は維持しています。
AACは修正した無損失masterから生成し、元動画の圧縮音声の再圧縮は使用しません。

元の制作・研究ZIP5分割は変更していません。元のmanifest/checksumはBase-*へ保存し、
最新動画と差分パッケージは新Packaging-Manifest.json / SHA256SUMS.txtで照合してください。
原版の再現に最新動画のSHAを流用しません。研究結果・研究中の認定・未公開仕様はそのままです。

## 再現

1. Base-Packaging-Manifest-v1.jsonの元資料を復元し、元のReproduce手順でVOICEVOX0.26.0のmasterを再構築。
2. 原版MP4は https://raw.githubusercontent.com/ffuwa564-gif/Finit-battle-no-more/5684031a8a320ae0f323f094b4bfe2d7719796c4/ThisGirl-01.mp4 。原版のSHAを照合。
3. Audio-Correction-jiu.zipを同じrepositoryへ展開。既存のraw入力・研究データを改変しない。
4. VOICEVOX0.26.0 / 春日部つむぎstyle8で `python scripts/this-girl-01/corrections/mercy-reading.py` を実行。
5. `python scripts/this-girl-01/corrections/verify-mercy-reading.py` と、既存の独立browser検査を修正版に実行。

補正query・コード・検査報告を差分ZIPに含めます。生の合成音声、楽曲だけの素材は含めません。
ブラウザ検査は新規playerごとの6点です。Linux WPE同一player連続seekの既知未達は元報告と同じ限定範囲です。
'''
    (P/'Audio-Correction-README.md').write_text(note);public['Audio-Correction-README.md']=P/'Audio-Correction-README.md'
    (P/'Reproduce.md').write_text((D/'Reproduce.md').read_text()+'\n\n---\n\n'+note);public['Reproduce.md']=P/'Reproduce.md'
    bundle=P/'Audio-Correction-jiu.zip'
    with zipfile.ZipFile(bundle,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for p in sorted(Path(__file__).parent.glob('*.py')):z.write(p,str(p.relative_to(ROOT)))
        for n in ['correction.json','correction-qa.json','browser-qa.json','design-14-ji-u.query.json','Audio-Correction-README.md']:
            z.write(P/n,'artifacts/this-girl-01/pronunciation-fix/'+n)
    public[bundle.name]=bundle
    manifest={'passed':True,'revision':'pronunciation-jiu-01','finishedSha256':digest,'baseCommit':BASE,'baseManifest':'Base-Packaging-Manifest-v1.json','sourceCommit':cmd(['git','rev-parse','HEAD']),'sourceBranch':'research/sakuya-this-girl-01','mediaBranch':BRANCH,'correction':fix,'qa':{'reportSha256':sha(P/'correction-qa.json'),'browserReportSha256':sha(P/'browser-qa.json'),'scope':qa['scope'],'browserScope':browser['scope']},'archive':old['archive'],'patch':{'file':bundle.name,'bytes':bundle.stat().st_size,'sha256':sha(bundle)},'rights':old['rights'],'publication':'Audio-only correction; game and research unchanged','publicFiles':sorted([*public,'Packaging-Manifest.json','SHA256SUMS.txt'])}
    write(P/'Packaging-Manifest.json',manifest);public['Packaging-Manifest.json']=P/'Packaging-Manifest.json'
    (P/'SHA256SUMS.txt').write_text(''.join(sha(p)+'  '+n+'\n' for n,p in sorted(public.items())));public['SHA256SUMS.txt']=P/'SHA256SUMS.txt'
    assert all(p.stat().st_size<100*1024*1024 for p in public.values())
    changed=[n for n,p in public.items() if p.parent==P]
    with tempfile.TemporaryDirectory(prefix='jiu-media-git-',dir='/tmp') as area:
        area=Path(area);objects=area/'objects';objects.mkdir()
        common=Path(cmd(['git','rev-parse','--path-format=absolute','--git-common-dir']))
        env=dict(os.environ,GIT_OBJECT_DIRECTORY=str(objects),GIT_ALTERNATE_OBJECT_DIRECTORIES=str(common/'objects'),GIT_INDEX_FILE=str(area/'index'))
        cmd(['git','fetch','--filter=blob:none','--no-tags','--no-write-fetch-head','origin','refs/heads/'+BRANCH],env)
        cmd(['git','read-tree',BASE+'^{tree}'],env)
        for n in changed:
            blob=cmd(['git','hash-object','-w','--',str(public[n])],env)
            cmd(['git','update-index','--add','--cacheinfo','100644,'+blob+','+n],env)
        # Unchanged blobs already exist in the leased remote base. Do not lazily
        # fetch the large original evidence ZIPs just to verify local existence.
        tree=cmd(['git','write-tree','--missing-ok'],env);commit=cmd(['git','commit-tree',tree,'-p',BASE],env,'media: 慈雨の読みをジウに修正\n')
        cmd(['git','push','--force-with-lease=refs/heads/'+BRANCH+':'+BASE,'origin',commit+':refs/heads/'+BRANCH],env)
    receipts=[]
    for n in changed:
        url=f'https://raw.githubusercontent.com/{REPO}/{commit}/'+urllib.parse.quote(n)
        h=hashlib.sha256();size=0
        with urllib.request.urlopen(url,timeout=120) as response:
            while b:=response.read(1048576):h.update(b);size+=len(b)
        assert h.hexdigest()==sha(public[n]) and size==public[n].stat().st_size
        receipts.append({'file':n,'url':url,'sha256':h.hexdigest(),'bytes':size});print('REMOTE VERIFIED',n,flush=True)
    write(P/'publication.json',{'passed':True,'commit':commit,'baseCommit':BASE,'movieSha256':digest,'changedFiles':receipts,'unchangedFilesReusedFromVerifiedBase':sorted(set(public)-set(changed))})
    print('PUBLISHED AUDIO CORRECTION',commit,flush=True)
if __name__=='__main__':main()
