import type {Route} from '@playwright/test';
/** WebKit seeks using byte ranges, including rate changes and resumed streams. */
export async function fulfillAudioFixture(route:Route,body:Buffer):Promise<void>{
 const range=/^bytes=(\d*)-(\d*)$/.exec(route.request().headers().range??'');
 if(!range){await route.fulfill({contentType:'audio/wav',headers:{'Accept-Ranges':'bytes'},body});return;}
 const start=range[1]?Number(range[1]):Math.max(0,body.length-Number(range[2]));
 const end=range[1]&&range[2]?Math.min(body.length-1,Number(range[2])):body.length-1;
 if(start>end||start>=body.length){await route.fulfill({status:416,headers:{'Content-Range':`bytes */${body.length}`},body:''});return;}
 await route.fulfill({status:206,contentType:'audio/wav',headers:{'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${body.length}`},body:body.subarray(start,end+1)});
}
