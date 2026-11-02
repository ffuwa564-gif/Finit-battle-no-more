"""Local-only static media server with byte ranges, including this task's /tmp symlinks."""
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import os,re
ROOT=Path(__file__).resolve().parents[2]
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def send_head(self):
  value=self.headers.get('Range');p=Path(self.translate_path(self.path));self.remaining=None
  if not value or not p.is_file():return super().send_head()
  match=re.fullmatch(r'bytes=(\d*)-(\d*)',value)
  if not match:return super().send_head()
  size=p.stat().st_size;a,b=match.groups();start=int(a)if a else max(0,size-int(b));end=min(size-1,int(b))if a and b else size-1
  if start<0 or start>=size or end<start:self.send_error(416);return None
  f=open(p,'rb');f.seek(start);self.remaining=end-start+1;self.send_response(206);self.send_header('Content-type',self.guess_type(str(p)));self.send_header('Accept-Ranges','bytes');self.send_header('Content-Range',f'bytes {start}-{end}/{size}');self.send_header('Content-Length',str(self.remaining));self.end_headers();return f
 def copyfile(self,source,outputfile):
  if self.remaining is None:return super().copyfile(source,outputfile)
  try:
   while self.remaining:
    block=source.read(min(65536,self.remaining))
    if not block:break
    outputfile.write(block);self.remaining-=len(block)
  except(BrokenPipeError,ConnectionResetError):pass
if __name__=='__main__':ThreadingHTTPServer(('127.0.0.1',4329),Handler).serve_forever()
