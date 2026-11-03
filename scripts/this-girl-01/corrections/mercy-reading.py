"""Correct the recorded 慈雨 mora only; preserve the v1 evidence and video packets.

The engine parsed the kana じう as ジイ. Changing the stored second mora to
ウ / vowel u retains its duration, pitch and every other synthesis parameter.
Splice only that isolated noun and its surrounding silence into the lossless
master, then copy video packets and generate AAC once from that master.
"""
from pathlib import Path
import copy, hashlib, json, subprocess, urllib.request
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
O = ROOT / 'artifacts/this-girl-01'
P = O / 'pronunciation-fix'
SR = 48000

def sha(p):
    h = hashlib.sha256()
    with Path(p).open('rb') as f:
        for b in iter(lambda: f.read(1048576), b''): h.update(b)
    return h.hexdigest()

def write(p, v): p.write_text(json.dumps(v, ensure_ascii=False, indent=2) + '\n')
def pcm(p):
    raw = subprocess.check_output(['ffmpeg','-v','error','-threads','1','-i',str(p),'-vn','-ar',str(SR),'-ac','2','-f','f32le','-'])
    return np.frombuffer(raw, '<f4').reshape(-1,2).copy()

def main():
    P.mkdir(exist_ok=True)
    old_movie = O / 'render/ThisGirl-01.mp4'
    old_master = O / 'render/master.flac'
    assert sha(old_movie) == '8e86d4f4f9a8100437ac500bdf7be8febef5cf34c345fd90acd78b7f5e915058'
    narration = json.loads((O/'narration.json').read_text())
    line = next(l for c in narration['chapters'] for l in c['lines'] if l['lineId']=='design-14')
    query = json.loads((ROOT/line['queryFile']).read_text())
    assert [m['text'] for m in query['accent_phrases'][11]['moras']] == ['ジ','イ']
    assert query['accent_phrases'][11]['moras'][1]['vowel'] == 'i'
    fixed = copy.deepcopy(query)
    fixed['accent_phrases'][11]['moras'][1].update(text='ウ', vowel='u')
    # No duration/pitch/tempo change. Only the explicit second mora is changed.
    restore = copy.deepcopy(fixed)
    restore['accent_phrases'][11]['moras'][1].update(text='イ', vowel='i')
    assert restore == query
    qpath = P/'design-14-ji-u.query.json'; write(qpath, fixed)
    request = urllib.request.Request('http://127.0.0.1:50021/synthesis?speaker=8',data=json.dumps(fixed).encode(),headers={'Content-Type':'application/json'})
    raw = urllib.request.urlopen(request, timeout=180).read()
    wav = P/'corrected-line.wav'; wav.write_bytes(raw)
    before = pcm(ROOT/line['file']); after = pcm(wav)
    assert before.shape == after.shape, ('Synthesis duration changed', before.shape, after.shape)
    # This noun is separated from both neighbors by >0.5s comma pauses.
    # Query-derived midpoint cuts keep every other spoken word untouched.
    at = query['prePhonemeLength']; positions=[]
    for phrase in query['accent_phrases']:
        start=at
        for m in phrase['moras']: at+=(m.get('consonant_length') or 0)+m['vowel_length']
        end=at
        if phrase['pause_mora']: at+=phrase['pause_mora']['vowel_length']
        positions.append((start/query['speedScale'],end/query['speedScale'],at/query['speedScale']))
    a=round((positions[10][1]+positions[11][0])/2*SR)
    b=round((positions[11][1]+positions[12][0])/2*SR)
    # Both cut edges must be in silence in both synthesized takes.
    for point in [a,b]:
        for audio in [before,after]:
            assert np.max(np.abs(audio[point-240:point+240])) < .01, 'Cut is not in a comma pause'
    delta = np.zeros_like(before)
    delta[a:b] = after[a:b]-before[a:b]
    fade = 480
    delta[a:a+fade] *= np.linspace(0,1,fade)[:,None]
    delta[b-fade:b] *= np.linspace(1,0,fade)[:,None]
    manifest=json.loads((O/'research/audio-mix.json').read_text())
    v=next(v for v in manifest['voice'] if v['lineId']==line['lineId'])
    start=v['sampleStart']; mix=pcm(old_master); revised=mix.copy()
    revised[start:start+len(delta)] += delta*v['mixGain']*manifest['masterGain']
    assert np.array_equal(mix[:start+a],revised[:start+a])
    assert np.array_equal(mix[start+b:],revised[start+b:])
    assert np.max(np.abs(revised)) < 1
    master=P/'master-jiu.flac'
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','-','-c:a','flac','-sample_fmt','s32','-bits_per_raw_sample','24',str(master)],input=revised.astype('<f4').tobytes(),check=True)
    decoded=pcm(master)
    assert np.array_equal(decoded[:start+a],mix[:start+a])
    assert np.array_equal(decoded[start+b:],mix[start+b:])
    movie=P/'ThisGirl-01.mp4'
    subprocess.run(['ffmpeg','-v','error','-y','-threads','1','-i',str(old_movie),'-i',str(master),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',str(movie)],check=True)
    # Small, context-bearing local listening/QA sample; not a raw-voice bundle.
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(movie),'-ss',str((start+a)/SR-.8),'-t','2.8','-vn',str(P/'listening-context.wav')],check=True)
    report={'revision':'pronunciation-jiu-01','baseMovieSha256':sha(old_movie),'movieSha256':sha(movie),'sourceCodeSha256':sha(__file__),'originalQuerySha256':sha(ROOT/line['queryFile']),'correctedQuerySha256':sha(qpath),'oldMoras':['ジ','イ'],'newMoras':['ジ','ウ'],'changedFields':['accent_phrases[11].moras[1].text','accent_phrases[11].moras[1].vowel'],'allOtherQueryFieldsIdentical':True,'sameNarrationSampleCount':len(before),'changedMasterSampleRange':[start+a,start+b],'changedMasterTimeRange':[(start+a)/SR,(start+b)/SR],'masterPcmIdenticalOutsideCorrection':True,'masterSha256':sha(master),'videoPolicy':'Copy original H264 packets; no video re-encoding. Verify packet hashes separately.','audioPolicy':'Only the isolated noun and its comma pauses are replaced in the original lossless master. Same sample count, no time stretch; AAC generated from lossless master.'}
    write(P/'correction.json',report)
    print(json.dumps(report,ensure_ascii=False),flush=True)

if __name__=='__main__': main()
