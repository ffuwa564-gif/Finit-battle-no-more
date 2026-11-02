"""Decode every delivered narration source and bind readings/input integrity to the actual files.

This is a source-audio check, not a substitute for the final MP4 AV/voice audit.
"""
from pathlib import Path
import hashlib,json,subprocess,urllib.request,urllib.parse,re
import numpy as np
from story import CH, STORY_FINALIZED
from synth import tts_text
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-04'
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def main():
 assert STORY_FINALIZED,'Story has not been approved'
 n=json.loads((O/'narration.json').read_text());code=Path(__file__).with_name('synth.py');story=Path(__file__).with_name('story.py')
 assert n['processingSha256']==sha(code)and n['storySha256']==sha(story),'Synthesis source hash changed'
 lines=[l for c in n['chapters']for l in c['lines']];assert len(lines)==sum(len(c['lines'])for c in CH)
 assert len(n['chapters'])==len(CH)
 for actualChapter,scriptChapter in zip(n['chapters'],CH):
  assert all(actualChapter[k]==scriptChapter[k]for k in['id','title','topic','clip'])
  assert len(actualChapter['lines'])==len(scriptChapter['lines'])
  for a,b in zip(actualChapter['lines'],scriptChapter['lines']):
   assert a['speaker']==b['speaker']and a['text']==b['text']and a['ttsText']==tts_text(b['text'])
 counts={who:sum(l['speaker']==who for l in lines)for who in['t','z','m']};assert counts=={who:sum(l['speaker']==who for c in CH for l in c['lines'])for who in['t','z','m']},counts
 audioChecks=[];seen={}
 for l in lines:
  p=ROOT/l['wav'];mark=p.with_suffix('.key');assert mark.exists()and mark.read_text()==p.stem
  assert l['voiceId']=={'t':8,'z':3,'m':2}[l['speaker']]
  assert isinstance(l['ttsText'],str)and l['ttsText']
  if l['wav']not in seen:
   streams=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(p)]))['streams'];assert len(streams)==1;s=streams[0];assert s['codec_name']=='flac'and s['sample_rate']=='24000'and s['channels']==1,s
   raw=subprocess.check_output(['ffmpeg','-v','error','-xerror','-i',str(p),'-map','0:a:0','-c:a','pcm_f32le','-f','f32le','pipe:1']);x=np.frombuffer(raw,dtype='<f4');dur=len(x)/24000;assert len(x)>0 and np.isfinite(x).all();rms=float(np.sqrt(np.mean(x*x)));peak=float(np.max(np.abs(x)));assert rms>.001 and peak<=1.000001,(p,rms,peak)
   r={'path':l['wav'],'sha256':sha(p),'sampleRate':24000,'channels':1,'samples':len(x),'duration':dur,'rms':rms,'peak':peak,'fullDecodePassed':True,'passed':abs(dur-l['duration'])<=1/24000};assert r['passed'],r;seen[l['wav']]=r;audioChecks.append(r)
  else:assert abs(seen[l['wav']]['duration']-l['duration'])<=1/24000
 roster=json.loads((O/'roster-ready.json').read_text());actual=n['chapters'][0];assert actual['id']=='roster'
 assert len(actual['lines'])==len(roster['chapter']['lines'])
 for a,b in zip(actual['lines'],roster['chapter']['lines']):assert all(a[k]==b[k]for k in['speaker','text','ttsText','wav','duration','voiceId'])
 for name,digest in roster['inputAudioHashes'].items():assert sha(ROOT/name)==digest
 for readyPath in O.glob('chapter-ready-*.json'):
  ready=json.loads(readyPath.read_text());assert ready['synthSha256']==sha(code)and ready['storySha256']==sha(story)
  actualChapter=next(c for c in n['chapters']if c['id']==ready['chapter']['id']);assert actualChapter==ready['chapter']
 preview=n['chapters'][-1];assert preview['id']==preview['topic']=='next-episode'
 previewText=''.join(l['text']for l in preview['lines']);assert all(v in previewText for v in['エレイン','BD001','同じ回復役、エレインだから出来ることは？','まだ未検証'])
 previewSeconds=sum(l['duration']for l in preview['lines']);assert 28<=previewSeconds<=44,previewSeconds
 readingChecks=[]
 for text,expected in[
  ('バージョンいってんいちいち。バージョンいってんいちぜろ。',['イッテンイチイチ','イッテンイチゼロ']),
  ('あかりを返す夜番、ネリ。交代の灯。よつぎの仕立て屋、ルカ。',['アカリ','ヨバン','ネリ','コオタイ','ヨツギ','ルカ']),
  ('よかの包帯。やくふの渡り廊下。慈雨。余り布の預かり箱。フィオ。エレイン。白花のいのりて。',['ヨカ','ホオタイ','ヤクフ','ワタリロオカ','ジウ','アマリヌノ','アズカリバコ','フィオ','エレイン','イノリテ']),
 ]:
  q=json.loads(urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:50021/audio_query?'+urllib.parse.urlencode({'text':text,'speaker':8}),data=b''),timeout=180).read());flat=re.sub("[/_'、。？]",'',q['kana']);passed=all(v in flat for v in expected);r={'text':text,'voiceId':8,'frontendKana':q['kana'],'expectedFragments':expected,'passed':passed};assert passed,r;readingChecks.append(r)
 report={'passed':True,'narrationSha256':sha(O/'narration.json'),'synthSha256':sha(code),'storySha256':sha(story),'engineVersion':'0.26.0','lineCount':len(lines),'uniqueAudioFiles':len(seen),'voiceCounts':counts,'totalVoiceSeconds':sum(l['duration']for l in lines),'rosterSeconds':sum(l['duration']for l in actual['lines']),'rosterEarlyRenderInputsUnchanged':True,'nextEpisodePreviewVoiceSeconds':previewSeconds,'nextEpisodeStatus':'Elaine BD001; new build explicitly unverified and not certified','audioChecks':audioChecks,'readingChecks':readingChecks,'normalizations':[{'text':l['text'],'ttsText':l['ttsText'],'speaker':l['speaker']}for l in lines if l['text']!=l['ttsText']],'limits':'Full source decode, sample-clock duration and frontend readings checked. This is not a claim of subjective manual listening or finished-movie synchronization; the exact distributed MP4 requires its separate audit.'}
 (O/'research/Speech-QC.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('SPEECH SOURCE QC PASSED',len(lines),'lines',round(report['totalVoiceSeconds'],3),'seconds',counts,flush=True)
if __name__=='__main__':main()
