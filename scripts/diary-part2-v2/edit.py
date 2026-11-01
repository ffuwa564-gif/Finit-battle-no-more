"""A shorter, visual-led re-edit of the same verified native floor-2 run."""
import copy,json,pathlib,hashlib,subprocess,wave,urllib.request,urllib.parse,time
ROOT=pathlib.Path(__file__).resolve().parents[2];O=ROOT/'artifacts/diary-part2-v2';OLD=ROOT/'artifacts/diary-part2';(O/'speech').mkdir(exist_ok=True)
SOURCE=json.loads((OLD/'narration.json').read_text());BY={c['id']:c for c in SOURCE['chapters']}
KEEP={'opening':[0,2,3,4,5,6,9],'carry':[0,2,5,6,8],'enemy':[0,1,3,5,7,8,9,10,11,13,14],'jobs':[0,2,3,4,5,6,7], 'farm':[0,1,3,5,6,10], 'first':list(range(11)), 'rebuild':[0,1,2,3,4,5,6,8,9,10], 'awake':[0,1,2,3,4,5,7,8,10,12], 'stones':[0,1,3,5,6,7,8,9,11,12], 'controls':[0,1,2,3,7,8,9], 'battle1':list(range(16)), 'ultimate':list(range(9))+[10,13,14], 'battle2':list(range(13))+[18], 'battle3':list(range(16)), 'review':[0,1,3,5,7,8,9,11], 'ending':[0,1,2,3,4,5,6,8,9,10,12]}
CH=[]
def old(id):
 c=copy.deepcopy(BY[id]);c['lines']=[]
 for index in KEEP[id]:
  l=copy.deepcopy(BY[id]['lines'][index]);l['wav']=str(pathlib.Path(l['wav']).with_suffix('.flac'));l.update(sourceChapter=id,sourceLine=index);c['lines'].append(l)
 return c

def new(who,text,tag=''):
 return dict(speaker=who,text=text,new=True,tag=tag)
hook={'id':'hook','title':'まずは、この失敗から。','bullets':['守りは厚い。なのに、40Rで時間切れ。'],'clip':'hook','lines':[new('z','回復も守りも厚い。なのに、四十ラウンドで時間切れなのだ！'),new('t','守りが厚いのに、締め切りは守れてないじゃん！'),new('m','今日は、攻撃を一人に任せない編成へ作り直すわ。')]};CH.append(hook)
for id in KEEP:
 c=old(id)
 if id=='farm':c['lines'][2:2]=[new('z','十八個！　これで帰れるのだ！','gear18'),new('m','二個足りないわ。','gear18'),new('t','はい、もう一周！','gear18')]
 if id=='rebuild':c['lines'].insert(3,new('t','主役に仕事を全部乗せない。チームなんだから、相方も連れてこ！'))
 if id=='ultimate':c['lines'][6:6]=[new('t','うさぎの出勤だけ、統率めっちゃ良くない？'),new('z','うちの編成より、連携できてるのだ！'),new('m','その反省を、次のラウンドに活かして。')]
 CH.append(c)
 if id=='battle2':
  fairy={'id':'fairy','title':'ちょっと待って、妖精さん！','bullets':['再掲：この戦いで使った助け','妖精4回／戦場の花11回'],'clip':'fairy','lines':[new('m','妖精が来た場面を、ここでもう一度。'),*[{**copy.deepcopy(BY['battle2']['lines'][i]),'wav':str(pathlib.Path(BY['battle2']['lines'][i]['wav']).with_suffix('.flac')),'sourceChapter':'battle2','sourceLine':i}for i in[13,15,16,14]]]};CH.append(fairy)
# Native footage is the same run; editing and the narration order are new.
def call(path,data):return urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:50021'+path,data=data,headers={'Content-Type':'application/json'}),timeout=180).read()
def synth(l):
 who=l['speaker'];speaker={'z':3,'m':2,'t':8}[who];setting={'speedScale':{'z':1.12,'m':1.08,'t':1.13}[who],'intonationScale':1.16,'prePhonemeLength':.045,'postPhonemeLength':.07,'outputSamplingRate':24000,'volumeScale':1.0};key=hashlib.sha256(json.dumps({'text':l['text'],'speaker':speaker,'setting':setting,'engine':'0.26.0','code':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()},ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:24];p=O/'speech'/(key+'.flac');k=p.with_suffix('.key')
 if not(p.exists()and k.exists()and k.read_text()==key):
  q=json.loads(call('/audio_query?'+urllib.parse.urlencode({'text':l['text'],'speaker':speaker}),b''));q.update(setting);raw=call('/synthesis?speaker='+str(speaker),json.dumps(q).encode());w=p.with_suffix('.wav');w.write_bytes(raw);subprocess.run(['ffmpeg','-v','error','-y','-i',str(w),'-c:a','flac',str(p)],check=True);w.unlink();k.write_text(key)
 dur=float(json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(p)]))['format']['duration']);return{**l,'wav':str(p.relative_to(ROOT)),'duration':dur,'voice_id':speaker}
def prepare():
 for ch in CH:
  for i,l in enumerate(ch['lines']):
   if l.get('new'):ch['lines'][i]=synth(l)
   else:assert(ROOT/l['wav']).exists(),l['wav']
  print('VOICE READY',ch['id'],round(sum(l['duration']for l in ch['lines'])),flush=True)
 data={'chapters':CH,'sourceGameCommit':'1f4e970117c95a11ef38c8f1e12fe232e5a7b964','sameNativeRunAsPart2':True,'voicevoxVersion':'0.26.0','referencePart11':'cd6854ccc870a6ec5c973d5be88ffc9bbf4f62cd'};(O/'narration.json').write_text(json.dumps(data,ensure_ascii=False,indent=2));print('SPEECH COMPLETE',sum(l['duration']for c in CH for l in c['lines'])/60,flush=True)
if __name__=='__main__':prepare()
