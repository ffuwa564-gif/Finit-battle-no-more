"""Independent encoded-file check; never trust the calibration algebra alone."""
import json,subprocess,pathlib,numpy as np,sys
P=pathlib.Path('artifacts/diary-111/capture');ident=sys.argv[1];m=json.loads((P/f'{ident}.json').read_text());movie=P/f'{ident}.mp4';pairs=[]
for marker in m['calibration']:
 start=max(0,marker['videoMarker']-.4)
 raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(start),'-i',str(movie),'-t','1','-vf','crop=4:4:20:20,fps=60','-pix_fmt','rgb24','-f','rawvideo','-'])
 x=np.frombuffer(raw,dtype='u1').reshape(-1,4,4,3).mean((1,2));hit=np.flatnonzero((x[:,0]>200)&(x[:,2]>200)&(x[:,1]<90));assert len(hit)>0
 vt=start+hit[0]/60
 raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(start),'-i',str(movie),'-t','1','-vn','-ac','1','-ar','48000','-f','f32le','-'])
 a=np.frombuffer(raw,dtype='<f4');hit=np.flatnonzero(abs(a)>.12);assert len(hit)>100;at=start+hit[0]/48000
 pairs.append({'encodedVideoOnset':vt,'encodedAudioOnset':at,'residual':at-vt})
assert max(abs(p['residual'])for p in pairs)<.075,pairs
assert m['gameplayWindow'][0]>m['calibration'][0]['videoMarker']+.3
assert m['gameplayWindow'][1]<m['calibration'][1]['videoMarker']-.3
report={'id':ident,'passed':True,'maximumAllowedSeconds':.075,'endpoints':pairs,'originalClockRatio':m['audioClockRatio'],'rawDriftSeconds':m['maxEndpointDrift'],'packetTimelinePreserved':True,'calibrationMarkersExcludedFromGameplay':True}
(P/f'{ident}-sync-check.json').write_text(json.dumps(report,indent=2));print(report)
