"""Quiet all-girl research ledger, bound to the actual critic judgment.

Historical amber is explicitly historical. New endgame recognition is never
inferred from legacy LAB results, names, illustrations or a successful clip.
"""
from pathlib import Path
from functools import lru_cache
import json,hashlib,math,subprocess
from PIL import Image,ImageDraw
import visuals as v
ROOT=v.ROOT;O=v.O;A=v.A
W,H=1920,1080;FPS=30;CARD=260;PITCH=280;ROW_H=365;VX=100;VY=145;VW=1720;HOLD=4.0

def judgment(value):
    data=value if isinstance(value,dict)else json.loads(Path(value).read_text())
    assert data.get('finalized') is True,'Final ledger awaits an actual finalized research judgment'
    overall=data['overall']
    assert overall['status'] in ['research','verified-scoped']
    assert bool(overall['certified'])==(overall['status']=='verified-scoped'),'Inconsistent certification status'
    assert data['subject']['characterId']=='miette'and data['subject']['seriesId']=='BD019'
    assert data['nextEpisode']['certified'] is False
    assert data['nextEpisode']['status']=='unverified'
    return data

def entries(value):
    result=judgment(value);old=json.loads((A/'reference-roster-05.json').read_text());rows=[]
    for e in old['entries']:
        path=ROOT/'public'/e['artPath']
        assert v.sha(path)==e['artSha256'],('Original changed',e['characterId'])
        historical=e['gems'];is_old_amber=historical.get('badge')=='solid-amber'
        row={k:e[k]for k in ['seriesId','characterId','name','artPath','artSha256']}
        row.update(displayName=e.get('displayName',e['name']),formLabel=e.get('shortFormLabel','登録形態'),
            historical=historical,solid=is_old_amber,color=v.GOLD if is_old_amber else v.SAGE,
            label='旧LAB／限定検証'if is_old_amber else'案あり／未認定'if e.get('buildIdeas')else'最終盤・未認定',
            scope='historical-lab-only'if is_old_amber else'unverified',
            buildName=e.get('researchBuild',{}).get('name'),newEndgameAward=False)
        prior_path=A/'prior-judgments.json'
        prior=json.loads(prior_path.read_text())if prior_path.exists()else{}
        if e['characterId']in prior:
            previous=prior[e['characterId']]
            row.update(solid=False,color=v.ROSE,label=previous['overall']['label'],scope='previous-episode-scoped-research',buildName=previous['subject']['buildName'],newEndgameAward=False,currentJudgment=previous['overall'])
        if e['characterId']=='miette':
            certified=result['overall']['certified']
            row.update(solid=certified,color=v.ROSE,label='限定検証済み'if certified else'改修採用／研究中',
                scope=result['scope'],buildName=result['subject']['buildName'],newEndgameAward=certified,
                currentJudgment=result['overall'])
        rows.append(row)
    assert len(rows)==72 and len({r['seriesId']for r in rows})==72
    assert old['summary']['canonicalGirls']==49
    return rows,result

def card_strip(rows):
    out=Image.new('RGBA',(36*PITCH,2*ROW_H),(0,0,0,0));draw=ImageDraw.Draw(out)
    for i,e in enumerate(rows):
        x=(i%36)*PITCH;y=(i//36)*ROW_H
        draw.rounded_rectangle((x,y,x+CARD,y+350),18,fill=v.PAPER,outline=v.EDGE,width=2)
        v.contain(out,ROOT/'public'/e['artPath'],(x+8,y+7,CARD-16,214),8)
        v.text(draw,(x+14,y+228),e['seriesId'],18,v.SAGE)
        form=e['formLabel'];form_width=v.font(14).getlength(form)
        assert form_width<CARD-106,('Shorten the source form label',form)
        v.text(draw,(x+CARD-14-form_width,y+231),form,14,v.MUTED)
        size=23;name=e.get('name',e['displayName']) # form is separately printed above, never duplicate it
        while v.font(size,True).getlength(name)>CARD-28 and size>20:size-=1
        assert v.font(size,True).getlength(name)<=CARD-28,('Source name does not fit safely',name)
        v.text(draw,(x+14,y+256),name,size,v.INK,True)
        v.gem(draw,x+26,y+306,11,solid=e['solid'],color=e['color'])
        v.text(draw,(x+47,y+295),e['label'],15,v.MUTED)
        if e['buildName']:
            build=e['buildName']+'（仮）'
            assert v.font(16).getlength(build)<=CARD-60,('Build name exceeds reserved width',build)
            v.text(draw,(x+47,y+320),build,16,v.INK)
    return out

@lru_cache(maxsize=3)
def cached_strip(serialized):
    rows,result=entries(json.loads(serialized))
    return card_strip(rows),rows,result

def layout(value,duration=40.0):
    result=judgment(value);assert duration>=26,'At least26seconds keeps all72 cards fully visible for3seconds'
    serialized=json.dumps(result,ensure_ascii=False,sort_keys=True)
    strip,rows,result=cached_strip(serialized)
    travel=35*PITCH+CARD-VW;motion=duration-2*HOLD
    coverage=[]
    for i,e in enumerate(rows):
        x=(i%36)*PITCH
        first=0.0 if x+CARD<=VW else HOLD+(x+CARD-VW)/travel*motion
        last=duration if x>=travel else HOLD+x/travel*motion
        assert last-first>=3.0-1e-8,(e['seriesId'],last-first)
        coverage.append({**e,'fullyVisibleStart':first,'fullyVisibleEnd':last,'fullyVisibleSeconds':last-first})
    return strip,coverage,result

def frame(t,duration,value):
    strip,coverage,result=layout(value,duration)
    travel=35*PITCH+CARD-VW
    offset=round(travel*min(1,max(0,(float(t)-HOLD)/(duration-2*HOLD))))
    out=v.desk();d=ImageDraw.Draw(out)
    d.rounded_rectangle((65,45,1855,925),22,fill=v.PAPER,outline=v.EDGE,width=2)
    v.text(d,(100,55),'研究の記録',42,v.INK,True,serif=True)
    v.text(d,(1180,73),'旧LABの記録と、今回の検証を分けて。',25,v.MUTED)
    out.alpha_composite(strip.crop((offset,0,offset+VW,2*ROW_H)),(VX,VY))
    v.text(d,(100,886),'旧LABの宝石は、過去の限定条件の記録です。',24,v.MUTED)
    return out

def render(value,duration=40.0,path=None):
    source=Path(value)if not isinstance(value,dict)else None
    result=judgment(value);strip,coverage,_=layout(result,duration)
    path=Path(path or O/'render/roster-silent.mp4');path.parent.mkdir(parents=True,exist_ok=True)
    frames=round(duration*FPS);duration=frames/FPS
    inputs={'code':v.sha(__file__),'visuals':v.sha(v.__file__),'oldRegistry':v.sha(A/'reference-roster-05.json'),
        'judgment':v.sha(source)if source else hashlib.sha256(json.dumps(result,ensure_ascii=False,sort_keys=True).encode()).hexdigest()}
    process=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-r','30','-i','-',
        '-an','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-threads','2',str(path)],stdin=subprocess.PIPE)
    try:
        for i in range(frames):process.stdin.write(frame(i/FPS,duration,result).convert('RGB').tobytes())
    finally:process.stdin.close()
    assert process.wait()==0
    assert inputs['code']==v.sha(__file__)and inputs['visuals']==v.sha(v.__file__),'Renderer changed during encode'
    report={'episode':'THIS-GIRL-002-V2','duration':duration,'frames':frames,'holdSeconds':HOLD,'inputHashes':inputs,
        'newEndgameAwards':sum(bool(r['newEndgameAward'])for r in coverage),'historicalAwardsAreNotCurrentAwards':True,
        'cards':coverage,'sha256':v.sha(path),'renderedFile':str(path)}
    (O/'research').mkdir(exist_ok=True)
    (O/'research/roster-visibility.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    return path

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('judgment');parser.add_argument('--duration',type=float,default=40)
    parser.add_argument('--output');args=parser.parse_args();print(render(args.judgment,args.duration,args.output))

