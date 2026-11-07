"""Verify the audio-only correction against independent lossless sources."""
from pathlib import Path
import hashlib, json, subprocess, importlib.util
import numpy as np
ROOT=Path(__file__).resolve().parents[3];O=ROOT/'artifacts/this-girl-01';P=O/'pronunciation-fix'
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def main():
    spec=importlib.util.spec_from_file_location('fix',Path(__file__).with_name('mercy-reading.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
    spec=importlib.util.spec_from_file_location('qa',ROOT/'scripts/this-girl-01/capture/finished-qa.py');q=importlib.util.module_from_spec(spec);spec.loader.exec_module(q)
    movie=P/'ThisGirl-01.mp4';base=O/'render/ThisGirl-01.mp4';fix=json.loads((P/'correction.json').read_text())
    def packets(p):
        return json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_packets','-show_data_hash','sha256','-show_entries','packet=pts,dts,duration,size,data_hash','-of','json',str(p)]))['packets']
    old=packets(base);new=packets(movie);assert old==new and len(new)==12655
    subprocess.run(['ffmpeg','-v','error','-xerror','-threads','1','-i',str(movie),'-f','null','-'],check=True)
    streams=q.probe(movie)['streams'];v=next(x for x in streams if x['codec_type']=='video');a=next(x for x in streams if x['codec_type']=='audio')
    assert v['width']==1920 and v['height']==1080 and v['avg_frame_rate']=='30/1' and int(a['sample_rate'])==48000
    original=m.pcm(O/'render/master.flac');reference=m.pcm(P/'master-jiu.flac');out=m.pcm(movie)[:len(reference)]
    sa,sb=fix['changedMasterSampleRange'];assert np.array_equal(original[:sa],reference[:sa]) and np.array_equal(original[sb:],reference[sb:])
    anchors=[x['outputSample'] for x in json.loads((O/'research/final-independent-qa.json').read_text())['audio']]
    anchors += [sa-24000,sa,sb-24000]
    results=[]
    for at in anchors:
        count=48000;pad=24000
        offset,corr=q.corr(reference[at:at+count],out[at-pad:at+count+pad])
        lag=offset-pad/48000;assert abs(lag)<=.08 and corr>.97,(at,lag,corr)
        results.append({'sample':at,'lagSeconds':lag,'correlation':corr,'passed':True})
    report={'passed':True,'movieSha256':sha(movie),'baseMovieSha256':sha(base),'codeSha256':sha(__file__),'correctionSha256':sha(P/'correction.json'),'all12655VideoPacketPayloadsAndPtsDtsIdentical':True,'fullDecodePassed':True,'sameResolutionFpsSampleRate':True,'losslessMasterPcmUnchangedOutsideWord':True,'audioAnchors':results,'scope':'Audio-only revision: original video packet payloads/timestamps and lossless master outside the noun are identical. Final AAC independently compared to revised lossless master, including the correction and all prior audio-check locations.'}
    (P/'correction-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('CORRECTION QA PASS',report['movieSha256'],len(results),'audio anchors',flush=True)
if __name__=='__main__': main()
