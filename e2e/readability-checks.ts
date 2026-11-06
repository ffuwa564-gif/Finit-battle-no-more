import {expect,type Locator} from '@playwright/test';
export async function contrast(locator:Locator) {
 const readings=await locator.evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width&&n.getBoundingClientRect().height).map(node=>{
  const rgb=(s:string)=>s.match(/[\d.]+/g)?.map(Number)??[0,0,0,0];
  const luminance=(c:number[])=>c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
  const style=getComputedStyle(node),fill=style.getPropertyValue('-webkit-text-fill-color');
  const fg=rgb(fill&&fill!=='currentcolor'?fill:style.color);let parent:Element|null=node,bg=[255,255,255,1];
  while(parent){const color=rgb(getComputedStyle(parent).backgroundColor);if(color.length===3||color[3]>=.98){bg=color;break;}parent=parent.parentElement;}
  const a=luminance(fg),b=luminance(bg);return {text:node.textContent?.trim().slice(0,80),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
 }));
 expect(readings.length).toBeGreaterThan(0);
 for(const r of readings)expect(r.ratio,`${r.text}: contrast ${r.ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
}

export async function touchTargets(scope:Locator) {
 const boxes=await scope.locator('button,input:not([type=hidden]),select,summary').evaluateAll(nodes=>nodes.map(el=>({label:el.getAttribute('aria-label')??el.textContent?.trim().slice(0,50),rect:el.getBoundingClientRect()})).filter(x=>x.rect.width&&x.rect.height).map(x=>({label:x.label,width:x.rect.width,height:x.rect.height})));
 expect(boxes.length).toBeGreaterThan(0);
 for(const box of boxes){expect(box.height,`${box.label}: height`).toBeGreaterThanOrEqual(43.9);expect(box.width,`${box.label}: width`).toBeGreaterThanOrEqual(43.9);}
 expect(await scope.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
}
