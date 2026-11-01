"""Mix complete reels at sample zero on ONE clock; never infer per-track offsets."""
from pathlib import Path
import sys,json,wave
import numpy as np
from media_sync import audio,sha256,SR

def build(game_reel,background,duration,output,manifest):
 length=round(float(duration)*SR);bg=audio(background);game=audio(game_reel);mix=np.zeros((length,2),np.float32);mix[:min(length,len(bg))]+=bg[:length];mix[:min(length,len(game))]+=.6*game[:length];peak=float(abs(mix).max());gain=min(1,.95/max(.001,peak));mix*=gain
 with wave.open(str(output),'w')as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((mix*32767).astype('<i2').tobytes())
 report={'clock':'48kHz presentation sample index; sample0=video0','gameReelSha256':sha256(game_reel),'narrationMusicSha256':sha256(background),'soundtrackSha256':sha256(output),'sampleCount':length,'gameGain':.6,'globalGain':gain};Path(manifest).write_text(json.dumps(report,indent=2));return report
if __name__=='__main__':print(build(*sys.argv[1:6]))
