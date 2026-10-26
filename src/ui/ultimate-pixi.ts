import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { ultimateFrame, clamp01 as clamp, type UltimateVisual } from '../platform/ultimate-choreography';

const palette: Record<UltimateVisual, number> = { blade: 0x87caff, stars: 0xb1b9ff, eclipse: 0xc37dff, bloom: 0x8aefca, aegis: 0x8fcfff, dawn: 0xffd68b, clockwork: 0xff9cbd };
const decay = (age: number, rate = 3) => Math.exp(-Math.max(0,age)*rate);

/** Seven authored silhouettes, with traveling edges, a held impact and material-specific exits. */
export async function createUltimateEffect(host: HTMLElement, visual: UltimateVisual, position: () => number, onFailure: () => void) {
  const app = new Application();
  try {
    await app.init({ width: Math.max(1,host.clientWidth),height: Math.max(1,host.clientHeight),backgroundAlpha:0,
      resolution:Math.min(devicePixelRatio||1,1.5),autoDensity:true,antialias:true,preference:'webgl',powerPreference:'low-power',autoStart:false });
  } catch(error) { try{app.destroy(true);}catch{/* partially initialized */} throw error; }
  const canvas=app.canvas;canvas.className='ultimate-pixi-canvas';canvas.setAttribute('aria-hidden','true');host.appendChild(canvas);
  const scene=new Container(), forms=new Graphics(), light=new Graphics();
  light.blendMode='add';scene.addChild(forms,light);app.stage.addChild(scene);
  const glow=document.createElement('canvas');glow.width=glow.height=64;
  const ctx=glow.getContext('2d')!,gradient=ctx.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.14,'#ffffffff');gradient.addColorStop(.35,'#ffffff70');gradient.addColorStop(1,'#ffffff00');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const texture=Texture.from(glow),color=palette[visual];
  const particles=Array.from({length:56},(_,i)=>{
    const sprite=new Sprite(texture);sprite.anchor.set(.5);sprite.blendMode='add';sprite.tint=i%4?color:0xffffff;scene.addChild(sprite);
    return {sprite,angle:i*2.39996,speed:.35+(i*37%73)/100,size:3+i%5};
  });
  let destroyed=false;
  const stroke=(points:number[],width:number,alpha:number,tint=color)=>{
    if(alpha<=0)return;
    for(const [scale,strength,ink] of [[3.8,.1,tint],[1.7,.35,tint],[1,.9,0xffffff]]){
      light.moveTo(points[0],points[1]);for(let j=2;j<points.length;j+=2)light.lineTo(points[j],points[j+1]);
      light.stroke({width:width*scale,color:ink,alpha:alpha*strength,cap:'round',join:'round'});
    }
  };
  const polygon=(points:number[],alpha:number,tint=color)=>{if(alpha>0)forms.poly(points).fill({color:tint,alpha});};
  const draw=()=>{
    if(destroyed||document.hidden)return;
    const elapsed=position(),f=ultimateFrame(visual,elapsed),{hit,action:age,gather,travel}=f;
    const w=host.clientWidth,h=host.clientHeight,s=Math.min(w,h),cx=w*.5,cy=h*.46;
    if(w!==app.screen.width||h!==app.screen.height)app.renderer.resize(w,h);
    forms.clear();light.clear();scene.visible=f.visible;scene.alpha=f.fade;
    if(!scene.visible){app.render();return;}
    const alive=hit<0?1:decay(age,2.8),impact=hit>=0?decay(age,7):0;
    if(visual==='blade'){
      // A broad tapered blade moves across the target; no lightning or generic rings.
      const cut=(offset:number,flip:number,weight:number)=>{
        const move=clamp(travel-offset),head=-1+move+Math.max(0,age)*2.4;
        if(move<=0)return;
        const points:number[]=[],back:number[]=[];
        for(let j=0;j<=28;j++){
          const u=j/28,t=head-.95+u*.95;
          const x=cx+s*t,y=cy-flip*s*(t*.43+Math.sin(u*Math.PI)*.08)+offset*s*.7;
          const width=s*.11*Math.sin(u*Math.PI)*weight;
          points.push(x,y-width);back.unshift(y+width);back.unshift(x);
        }
        polygon([...points,...back],alive*.75);
        const line:number[]=[];for(let j=0;j<=24;j++){const u=j/24,t=head-.95+u*.95;line.push(cx+s*t,cy-flip*s*(t*.43+Math.sin(u*Math.PI)*.08)+offset*s*.7);}
        stroke(line,3*weight,alive);
      };
      cut(0,1,1);cut(.18,-1,.38);
      if(hit>=0){
        const split=s*.055*clamp(age*5);
        stroke([cx-s*.22-split,cy+s*.1,cx+s*.32-split,cy-s*.14],1.5,decay(age,1.8));
      }
    }else if(visual==='eclipse'){
      // A single dominant thunder channel arrives first; smaller branches follow.
      if(hit<0){forms.circle(cx,cy,s*(.04+.14*gather)).fill({color:0x271735,alpha:gather*.8});light.circle(cx,cy,s*(.04+.14*gather)).stroke({color,width:2,alpha:gather});}
      if(gather>.82){
        for(let bolt=0;bolt<4;bolt++){
          const progress=clamp((travel-bolt*.12)/(1-bolt*.12)),points:number[]=[];
          const startX=cx+s*(bolt===0?.15:(bolt-2)*.38),startY=cy-s*.88;
          for(let j=0;j<=14;j++){
            const t=j/14;if(t>progress)break;
            const jitter=j===0||j===14?0:Math.sin(j*12.7+bolt*3)*s*.065;
            points.push(startX+(cx-startX)*t+jitter,startY+(cy-startY)*t);
          }
          if(points.length>=4)stroke(points,bolt===0?5:1.4,alive*(bolt===0?1:.65));
        }
      }
      if(hit>=0){
        for(let b=0;b<5;b++){const a=b*1.21;stroke([cx,cy,cx+Math.cos(a)*s*.16,cy+Math.sin(a)*s*.16,cx+Math.cos(a+.2)*s*.35,cy+Math.sin(a+.2)*s*.35],1.4,decay(age,3));}
        light.circle(cx,cy,s*(.08+clamp(age*2)*.5)).stroke({width:4,color,alpha:impact});
      }
    }else if(visual==='stars'){
      // Falling spears leave short ribbons, with a moon-shaped wake instead of spokes.
      for(let star=0;star<5;star++){
        const p=clamp((gather-.45-star*.035)/(.55-star*.035));
        const x=cx+(star-2)*s*.16+(1-p)*s*.35,y=cy-(1-p)*h*.7;
        const a=hit<0?p:decay(age-star*.025,3.2);
        stroke([x+s*.16,y-s*.29,x,y],star===2?4:1.6,a);
        polygon([x,y-s*.04,x+s*.018,y,x,y+s*.06,x-s*.018,y],a,0xffffff);
      }
      if(hit>=0){
        const r=s*(.12+clamp(age*1.7)*.38);
        forms.moveTo(cx-r,cy).bezierCurveTo(cx-r*.25,cy+r*.8,cx+r,cy+r*.7,cx+r*.4,cy-r*.6).bezierCurveTo(cx+r*.75,cy+r*.25,cx-r*.05,cy+r*.4,cx-r,cy).fill({color,alpha:decay(age,2)*.45});
      }
    }else if(visual==='bloom'){
      // Four flowers open at the recipients and release soft rising petals.
      for(let unit=0;unit<4;unit++){
        const x=w*(.17+unit*.22),y=cy+s*.13,open=hit<0?.08*gather:clamp(hit*4);
        for(let petal=0;petal<6;petal++){
          const a=petal*Math.PI/3-Math.PI/2,rx=Math.cos(a),ry=Math.sin(a),length=s*.13*open;
          forms.moveTo(x,y).quadraticCurveTo(x+rx*length-ry*length*.5,y+ry*length+rx*length*.5,x+rx*length*1.7,y+ry*length*1.7).quadraticCurveTo(x+rx*length+ry*length*.5,y+ry*length-rx*length*.5,x,y).fill({color,alpha:.48*(hit<0?gather:decay(hit,1.2))});
        }
        if(hit>=0)stroke([x-s*.035,y,x,y-s*.065,x+s*.035,y],1.5,decay(hit,1.3));
      }
    }else if(visual==='aegis'){
      // A broad faceted shield rises in front of each ally, then holds its edge.
      const rise=hit<0?gather*.35:.35+.65*clamp(hit*8);
      for(let unit=0;unit<4;unit++){
        const x=w*(.17+unit*.22),y=cy+s*.12+(1-rise)*s*.25,r=w*.095;
        const points=[x-r,y-s*.13,x,y-s*.16,x+r,y-s*.13,x+r*.85,y+s*.08,x,y+s*.16,x-r*.85,y+s*.08,x-r,y-s*.13];
        polygon(points,(hit<0?gather*.1:decay(hit,.9)*.2));
        stroke(points,2,hit<0?gather*.3:decay(hit,1.1));
        if(hit>=0)stroke([x-r*.6,y+s*.05,x+r*.6,y-s*.07],2,impact);
      }
    }else if(visual==='dawn'){
      // A crest over the party, with standards of light descending to each ally.
      const y=cy-s*.22,r=s*(.035+.07*(hit<0?gather:1));
      light.circle(cx,y,r).stroke({color,width:3,alpha:hit<0?gather:decay(hit,1.1)});
      for(let ray=0;ray<12;ray++){const a=ray*Math.PI/6;stroke([cx+Math.cos(a)*r*1.4,y+Math.sin(a)*r*1.4,cx+Math.cos(a)*r*2.1,y+Math.sin(a)*r*2.1],1.5,hit<0?gather*.6:decay(hit,1.5));}
      if(hit>=0)for(let unit=0;unit<4;unit++){
        const x=w*(.17+unit*.22),endY=cy+s*.1,reach=clamp(hit*7);
        stroke([cx,y,x,y+(endY-y)*reach],2,decay(hit,1.5));
        polygon([x-w*.08,endY-s*.09,x+w*.08,endY-s*.09,x+w*.08,endY+s*.08,x,endY+s*.04,x-w*.08,endY+s*.08],decay(hit,1.4)*.2);
      }
    }else{
      // Clockwork bits deploy, aim, then shoot converging beams together.
      for(let bit=0;bit<4;bit++){
        const a=bit*Math.PI/2-.85,r=s*(.12+gather*.3),x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
        polygon([x,y-s*.055,x+s*.04,y,x,y+s*.055,x-s*.04,y],.85*alive,0x304459);
        stroke([x,y-s*.055,x+s*.04,y,x,y+s*.055,x-s*.04,y,x,y-s*.055],1.4,alive);
        if(hit<0)stroke([x,y,x+(cx-x)*gather*.8,y+(cy-y)*gather*.8],.7,gather*.35);
        else stroke([x,y,cx,cy],5*decay(age,6),alive);
      }
      if(hit>=0)polygon([cx,cy-s*.08,cx+s*.025,cy-s*.025,cx+s*.08,cy,cx+s*.025,cy+s*.025,cx,cy+s*.08,cx-s*.025,cy+s*.025,cx-s*.08,cy,cx-s*.025,cy-s*.025],impact,0xffffff);
    }
    if(!['bloom','aegis','dawn'].includes(visual)&&hit>=0){
      forms.circle(cx,cy,s*.026).fill({color:0xffffff,alpha:impact});
      stroke([cx-s*.12,cy,cx+s*.12,cy],2,impact);
    }
    for(let i=0;i<particles.length;i++){
      const {sprite,angle,speed,size}=particles[i];
      const support=['bloom','aegis','dawn'].includes(visual);
      if(hit<0){const radius=s*(.5-gather*.43)*speed;sprite.position.set(cx+Math.cos(angle)*radius,cy+Math.sin(angle)*radius);sprite.alpha=gather*.35;}
      else if(support){sprite.position.set(w*(.17+(i%4)*.22)+Math.sin(angle+hit)*s*.09,cy+s*.25-hit*s*.3*speed);sprite.alpha=decay(hit,1.5)*.65;}
      else{const direction=visual==='blade'?-.42+Math.sin(angle)*.28:angle,r=s*(.04+Math.max(0,age)*speed*.65);sprite.position.set(cx+Math.cos(direction)*r,cy+Math.sin(direction)*r);sprite.alpha=decay(age,2)*.7;}
      sprite.width=size*(support?1:2.8);sprite.height=size*(support?1:.4);sprite.rotation=support?0:visual==='blade'?-.42:angle;
    }
    app.render();
  };
  const tick=()=>{try{draw();}catch{app.ticker.stop();onFailure();}};
  app.ticker.remove(app.render,app);app.ticker.maxFPS=30;app.ticker.add(tick);
  const visibility=()=>{if(document.hidden)app.ticker.stop();else{app.ticker.start();tick();}};
  const lost=(event:Event)=>{event.preventDefault();onFailure();};
  document.addEventListener('visibilitychange',visibility);canvas.addEventListener('webglcontextlost',lost);visibility();
  return ()=>{if(destroyed)return;destroyed=true;document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',lost);app.ticker.stop();app.destroy(true,{children:true});texture.destroy(true);};
}
