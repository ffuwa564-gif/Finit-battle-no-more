from pathlib import Path
import json,math,subprocess,hashlib,csv
from PIL import Image
from visuals import speech_plate,catalogue_plate,section_plate,thumbnail,C,CAT_QC
B=Path(__file__).resolve().parent;P=B/'plates';P.mkdir(exist_ok=True);FPS=30;SR=48000
N=json.loads((B/'narration.json').read_text());cursor=0;items=[];chapters=[];voices=[]
def saveplate(name,im):
 p=P/(name+'.jpg');im.convert('RGB').save(p,quality=96,subsampling=0);return p
last=None

def add(image,frames,kind,id,transition=6):
 global cursor,last
 p=saveplate(id,image)
 if last is not None and transition:
  prev=Image.open(last).convert('RGB');new=Image.open(p).convert('RGB');per=2
  for k,a in enumerate([.20,.50,.80]):
   blend=P/f'{id}-blend{k}.jpg';Image.blend(prev,new,a).save(blend,quality=93,subsampling=0);items.append(dict(path=str(blend),atFrame=cursor,frames=per,kind='transition',id=id));cursor+=per
 start=cursor;items.append(dict(path=str(p),atFrame=cursor,frames=frames,kind=kind,id=id));cursor+=frames;last=p
 return start

for i,line in enumerate(N['lines']):
 if i==0 or N['lines'][i-1]['chapter']!=line['chapter']:chapters.append(dict(title=line['chapterTitle'],atFrame=cursor,id=line['chapter']))
 durationFrames=math.ceil(line['duration']*FPS);gap=23 if i==len(N['lines'])-1 or N['lines'][i+1]['chapter']!=line['chapter']else 9
 lead=0;st=add(speech_plate(line,i),lead+durationFrames+gap,'dialogue','line-'+line['id']);voices.append({**line,'atFrame':st+lead,'at':(st+lead)/FPS})
bodyEnd=cursor/FPS
appendixStart=cursor/FPS;chapters.append(dict(title='資料編：全キャラの通常スキル・LS',atFrame=cursor,id='catalogue-characters'))
add(section_plate('全キャラのスキル・LS','ver1.10の登録75形態。姿違い・クリーチャーも含みます。'),180,'section','characters-title')
for i,char in enumerate(C['characters']):add(catalogue_plate('character',char,i+1,len(C['characters'])),360,'character',char['id'])
chapters.append(dict(title='資料編：必殺技の共通役割契約',atFrame=cursor,id='catalogue-ultimates'));add(section_plate('必殺技の共通効果','各キャラの技名に対応する、役割別の実装です。'),150,'section','ultimates-title')
seen=set()
for char in C['characters']:
 u=char['ultimate'];key=u['theme']
 if key in seen:continue
 seen.add(key);item={'id':'ultimate-'+key,'name':char['role']+'の必殺技','subtitle':'同じ役割のキャラは、この効果契約を使用','blocks':[('効果',u['description']),('発動','生存中の味方がゲージ100以上で予約。通常スキルの再使用待ちとは別。')],'footer':'キャラごとの必殺技名は前の各カードに掲載。演出や個別名称と効果契約を区別します。'};add(catalogue_plate('reference',item,len(seen),6),330,'ultimate',item['id'])
chapters.append(dict(title='資料編：全記憶石・全変種',atFrame=cursor,id='catalogue-gems'));add(section_plate('全記憶石・全変種','13種類・20変種。通常品は強度80、特性なしの表示例。'),180,'section','gems-title')
for i,g in enumerate(C['gems']):add(catalogue_plate('gem',g,i+1,len(C['gems'])),420,'gem','gem-'+g['id']+'-'+g['variant'])
extras=[
{'id':'variants','name':'変種と追加特性は別','blocks':[(v['name'],v['description'])for v in C['gemVariants'].values()],'subtitle':'その石に対応する変種だけを選べます'},
{'id':'traits','name':'追加特性：全5種類','blocks':[('効果一覧','\n'.join(v['name']+'：'+v['description']for v in C['gemTraits'].values()))],'subtitle':'効果量は特性値で変化。対応しない特性は付かない'},
{'id':'tiers','name':'強度Tier・特性Tier','blocks':[('値の帯',' / '.join('T'+str(k)+'：'+str(v[0])+'〜'+str(v[1])for k,v in C['tiers'].items())),('表示の意味','石の総合Tierは強度と特性の高い方。特性なしの特性Tierは0。強度と特性のTierを別々に比較します。'),('上限と固定品','高Tierで効果や再使用待ちが上限に達する石があります。固定製作品は調律できません。')],'subtitle':'Tierはレア度やキャラの強さ定数とは別'},
{'id':'command-rule','name':'指揮：星図の号令','blocks':[('使えるリーダー','ノエル3枠、覚醒ノエル4枠。'),('受領者の負荷','R1・SR2・SSR3・XR4。明示的な覚醒前の負荷を引き継ぎ、別衣装は別に数えます。'),('予約','ラウンド準備中、生存している指揮官以外の味方と、敵を指定。最大3人、合計負荷は枠以内。')],'subtitle':'攻撃強化の通常スキル「号令」とは別'},
{'id':'command-boundaries','name':'指揮：何を変えるか','blocks':[('変更するもの','対象となる味方の通常単体行動の攻撃先を、指定した生存中の敵へ合わせる。'),('変更しないもの','石・追撃・範囲・支援・状態異常による強制行動・予約必殺・先頭本人の明示操作は奪いません。'),('支援の指定は不可','回復や障壁を特定の味方へ命令する機能ではありません。')],'subtitle':'行動の種類や石の使用を、自由に命令する機能ではありません'},
{'id':'command-costs','name':'指揮：費用と不発条件','blocks':[('発令の費用','ノエル本人の通常1手と、そのラウンドの追加リーダー効果。'),('使えない例','指揮官の戦闘不能・状態異常・必殺予約。先頭の指揮官本人に明示操作がある場合も競合します。'),('対象が倒れた後','通常判断へ戻ります。消費した枠と本人の一手は返りません。')],'subtitle':'発令回数ではなく、実際に変わった一手と純利益を見る'},
{'id':'command-choice','name':'指揮：リーダーを選ぶ機会費用','blocks':[('ノエルをリーダー','指揮枠を使う連携型。発令の利益と費用を比較する。'),('サクヤヒメをリーダー','月の慈愛などを使う回復・守りの方針。ノエルの指揮は使えない。'),('今後の研究候補とは区別','軍議の栞・桜の返礼・花宴の循環などの提案を、ver1.10の能力としてこの一覧へ追加していません。')],'subtitle':'ver1.10の現行仕様。新しい研究方針の実証結果ではありません'},
]
chapters.append(dict(title='資料編：変種・追加特性・Tier',atFrame=cursor,id='catalogue-affixes'))
for i,e in enumerate(extras):
 if i==3:chapters.append(dict(title='資料編：指揮の詳細と機会費用',atFrame=cursor,id='catalogue-command'))
 add(catalogue_plate('reference',e,i+1,len(extras)),540 if i>=3 else 600,'reference',e['id'])
add(section_plate('資料は、GitHubでも読めます','VOICEVOX：春日部つむぎ・ずんだもん・四国めたん\nBGM：甘茶の音楽工房「フィヨルドの澄んだ風」'),330,'credits','credits')
# Keep a final fade as actual frames, tied to the same 30fps timeline.
for k in range(6):
 im=Image.open(last).convert('RGB');dark=Image.new('RGB',im.size,'#f7e9ee');p=P/f'ending-fade-{k}.jpg';Image.blend(im,dark,(k+1)/6).save(p,quality=94,subsampling=0);items.append(dict(path=str(p),atFrame=cursor,frames=4,kind='fade',id='ending'));cursor+=4
out={'fps':FPS,'sampleRate':SR,'durationFrames':cursor,'duration':cursor/FPS,'bodyEnd':bodyEnd,'appendixStart':appendixStart,'chapters':chapters,'voices':voices,'pictures':items,'gameCommit':C['gameCommit'],'gameVersion':C['version'],'counts':{'characters':len(C['characters']),'gemDefinitions':C['gemBaseCount'],'gemVariants':len(C['gems']),'ultimates':len(seen),'reference':len(extras)}}
(B/'timeline.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));(B/'visual-layout-qc.json').write_text(json.dumps(CAT_QC,ensure_ascii=False,indent=2))
with (B/'pictures.ffconcat').open('w')as f:
 f.write('ffconcat version 1.0\n')
 for item in items:f.write("file '"+item['path']+"'\noption framerate 30\nduration "+format(item['frames']/FPS,'.9f')+'\n')
 f.write("file '"+items[-1]['path']+"'\noption framerate 30\n")
thumbnail().save(B/'Thumbnail-BuildResearchDiary-00.png');print('duration',cursor/FPS,'body',bodyEnd,'cards',len(CAT_QC),'pictures',len(items),flush=True)
