import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
const port=Number(process.env.PORT || 4182), root=resolve('dist-itch'), prefix='/nested/game/';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.mp4':'video/mp4','.mp3':'audio/mpeg','.ttf':'font/ttf','.woff2':'font/woff2'};
createServer((request,response)=>{
 const pathname=new URL(request.url,'http://localhost').pathname;
 if(pathname==='/'){response.setHeader('Content-Type','text/html');response.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><iframe title="STILLVEIL" src="http://localhost:${port}${prefix}index.html" style="border:0;width:100%;height:100dvh;display:block" allow="autoplay;fullscreen" allowfullscreen></iframe></body></html>`);return;}
 if(!pathname.startsWith(prefix)){response.writeHead(404).end();return;}
 let path;try{path=resolve(root,decodeURIComponent(pathname.slice(prefix.length)));}catch{response.writeHead(400).end();return;}
 if(!path.startsWith(root+sep)||!existsSync(path)||!statSync(path).isFile()){response.writeHead(404).end();return;}
 const size=statSync(path).size;response.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');response.setHeader('Accept-Ranges','bytes');response.setHeader('Cache-Control','no-store');
 const range=request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
 if(range){const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):size-1,size-1);if(start>end||start>=size){response.writeHead(416).end();return;}response.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});createReadStream(path,{start,end}).pipe(response);}
 else{response.setHeader('Content-Length',size);createReadStream(path).pipe(response);}
}).listen(port,'0.0.0.0',()=>console.log(`itch-style nested iframe preview: http://127.0.0.1:${port}`));
