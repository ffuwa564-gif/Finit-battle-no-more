"""Calibrate a counter source whose first detected white pulse is a real start marker.
The common sync implementation always removes a warmup pulse. In this capture no
warmup flash was recorded; six real start/interior/end clocks remain. Preserve all
six without weakening any spectral/residual/minimum-anchor acceptance criterion.
"""
from pathlib import Path
import json,shutil,hashlib
ROOT=Path(__file__).resolve().parents[2];O=ROOT/'artifacts/build-diary-02/capture';metaPath=O/'lab-counter.json';backup=O/'lab-counter.uncalibrated-original.json'
if backup.exists():assert backup.read_bytes()==metaPath.read_bytes(),'Metadata changed after failed calibration'
else:shutil.copy2(metaPath,backup)
s=(ROOT/'scripts/build-diary-02/sync_capture.py').read_text();s=s.replace("v,dur=marker_video(cal);warmup=float(v[0]);v=v[1:];raw=", "v,dur=marker_video(cal);warmup=None;assert len(v)>=6;assert abs(float(v[0])+initial-meta['markers'][0]['time'])<.1;raw=")
s=s.replace('v2=v2[1:];encoded=','encoded=')
s=s.replace('if len(g)>=4','if len(g)>=12') # reject clipped fragments of the unmatched earlier end-0 pulse; require60ms of the120ms pulse.
# __file__ resolves to this wrapper, so the processing hash names the actual exception handling.
exec(compile(s,str(__file__),'exec'))
m=json.loads(metaPath.read_text());m['calibration']['independentDiagnosticMinimumDurationMs']=60;m['calibration']['firstPulseIsActualStartMarker']=True;m['calibration']['missingVisualMarkerLabels']=['end-0'];m['calibration']['warmupHandling']='No warmup flash recorded; all six detected flashes match actual start/interior/end markers.';m['processingInputs']={'wrapper':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'frozenBaseSync':hashlib.sha256((ROOT/'scripts/build-diary-02/sync_capture.py').read_bytes()).hexdigest(),'rawMetadataBackup':str(backup.relative_to(ROOT))};metaPath.write_text(json.dumps(m,ensure_ascii=False,indent=2))
