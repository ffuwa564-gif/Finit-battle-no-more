"""Short round-by-round bridges, separate from the approved four-voice source cache."""
import json
from script import synth,O
EXTRA={'final-a':[('z','この薬で、次の必殺までつなぐのだ。使える手があるうちは、諦めないのだ。'),('t','薬が減るのは怖いけど、四人が動ける時間を買ってるんだね！')]}
def main():
 d={k:[synth({'speaker':s,'text':t})for s,t in lines]for k,lines in EXTRA.items()};(O/'extra-narration.json').write_text(json.dumps(d,ensure_ascii=False,indent=2));print('BRIDGES READY')
if __name__=='__main__':main()
