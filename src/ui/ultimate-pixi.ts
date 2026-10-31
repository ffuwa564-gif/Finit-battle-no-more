import { RABBIT_SEQUENCE, rabbitStage } from '../platform/ultimate-timing';
import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { assetPath } from '../content';
import { ultimateFrame, rabbitBitFrame, rabbitMount, rabbitCameraZoom, rabbitLoopCamera, rabbitEnergyFrame, rabbitMuzzle, RABBIT_VOLLEY, clamp01 as clamp, type UltimateVisual } from '../platform/ultimate-choreography';

const palette: Record<UltimateVisual, number> = { blade: 0x87caff, stars: 0xb1b9ff, eclipse: 0xc37dff, bloom: 0x8aefca, aegis: 0x8fcfff, dawn: 0xffd68b, clockwork: 0xff9cbd, 'rabbit-bits': 0x9aeee7 };
const decay = (age: number, rate = 3) => Math.exp(-Math.max(0,age)*rate);

/** Seven authored silhouettes, with traveling edges, a held impact and material-specific exits. */
export interface UltimateTargetPoint { x: number; y: number; size: number }
export async function createUltimateEffect(host: HTMLElement, visual: UltimateVisual, position: () => number, onFailure: () => void, targets?: () => UltimateTargetPoint[]) {
  const rabbitTextures = visual === 'rabbit-bits'
    ? await Promise.all([1,2,3,4].map(index => Assets.load<Texture>(assetPath(`lunette-bit-${index}`)))) : [];
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
  const texture=Texture.from(glow);let color=palette[visual];
  const particles=Array.from({length:56*(targets?4:1)},(_,i)=>{
    const sprite=new Sprite(texture);sprite.anchor.set(.5);sprite.blendMode='add';sprite.tint=i%4?color:0xffffff;scene.addChild(sprite);
    return {sprite,angle:i*2.39996,speed:.35+(i*37%73)/100,size:3+i%5};
  });
  const rabbits = rabbitTextures.map(texture => {
    const sprite = new Sprite(texture); sprite.anchor.set(.5); scene.addChild(sprite); return sprite;
  });
  // Clock-face discharge, projectile and impact light must read above the robot artwork.
  if(visual==='rabbit-bits')scene.addChild(light);
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
    const elapsed=position();
    if(visual==='rabbit-bits'){const energy=rabbitEnergyFrame(elapsed);color=energy.color;host.dataset.rabbitColor=color.toString(16).padStart(6,'0');host.dataset.rabbitEnergy=String(energy.phase);}
    const f=ultimateFrame(visual,elapsed),{hit,action:age,gather,travel}=f;
    const w=host.clientWidth,h=host.clientHeight;
    if(w!==app.screen.width||h!==app.screen.height)app.renderer.resize(w,h);
    if(visual==='rabbit-bits'&&!targets){
      const pulse=rabbitLoopCamera(elapsed);
      scene.pivot.set(w*.5,h*.46);scene.position.set(w*.5+pulse.x,h*.46+pulse.y);scene.scale.set(rabbitCameraZoom(elapsed));
    }
    forms.clear();light.clear();scene.visible=f.visible;scene.alpha=visual==='rabbit-bits'?clamp((RABBIT_SEQUENCE.tail-elapsed)/550):f.fade;
    if(visual==='rabbit-bits'){host.dataset.rabbitStage=rabbitStage(elapsed);host.dataset.rabbitFlight=String([0,1,2,3].filter(i=>rabbitBitFrame(i,elapsed).flight).length);}
    for(const rabbit of rabbits)rabbit.visible=false;
    if(!scene.visible){app.render();return;}
    for(const {sprite} of particles)sprite.alpha=0;
    // Explicit recipients never fall back to the enemy-stage centre. A single
    // canvas serves all area recipients without allocating extra WebGL contexts.
    const points=targets?targets().slice(0,4):[{x:w*.5,y:h*.46,size:Math.min(w,h)}];
    for(const [targetIndex,point] of points.entries()){
    const s=Math.min(w,h,point.size),cx=point.x,cy=point.y;
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
    }else if(visual==='rabbit-bits'){
      // Lunette's four illustrated robots materialize around the actual target.
      const aiming=clamp((elapsed-RABBIT_SEQUENCE.aim)/650);
      const summoning=elapsed<RABBIT_SEQUENCE.aim;
      // An expanding clockwork seal binds the four gates before they open fire.
      // Keep all light local to the target: no full-screen white wash over HUD text.
      const charge=summoning?Math.sin(Math.PI*clamp((elapsed-RABBIT_SEQUENCE.summon)/2000))*.8:0;
      const seal=s*(.24+.055*gather);
      for(let segment=0;segment<16;segment++){
        const a=segment*Math.PI/8+elapsed*.00065;
        const line:number[]=[];
        for(let j=0;j<=6;j++){
          const theta=a+j*.045;
          line.push(cx+Math.cos(theta)*seal,cy+Math.sin(theta)*seal*.82);
        }
        stroke(line,segment%4===0?2:1,charge*.65);
      }
      const finishAge=hit-RABBIT_VOLLEY.finale;
      if(finishAge>=0){
        // The finishing hit expands as a lens-shaped blast, not a static star icon.
        const blast=decay(finishAge,9),radius=s*(.07+clamp(finishAge*3)*.46);
        // Four heavy bolts crush to a narrow core, then bloom out across the target.
        const expand=1-(1-clamp(finishAge/.12))**3;
        light.ellipse(cx,cy,s*(.025+.31*expand),s*(.10+.10*expand)).fill({color,alpha:blast*.55});
        light.ellipse(cx,cy,s*(.018+.22*expand),s*(.075-.025*expand)).fill({color:0xffffff,alpha:blast*.85});
        light.ellipse(cx,cy,radius,radius*.65).stroke({color,width:5*decay(finishAge,4)+.5,alpha:decay(finishAge,5)*.9});
        for(let shard=0;shard<14;shard++){
          const a=shard*2.39996,r=s*(.12+finishAge*(.32+(shard%3)*.1));
          const length=s*.035*decay(finishAge,3);
          const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
          stroke([x,y,x+Math.cos(a)*length,y+Math.sin(a)*length],2,decay(finishAge,4));
        }
        for(const delay of RABBIT_VOLLEY.echoes){
          const age=finishAge-delay;
          if(age>=0)light.ellipse(cx,cy,s*(.09+age*.5),s*(.06+age*.31)).stroke({color,width:1.5,alpha:decay(age,12)*.45});
        }
      }
      for(let bit=0;bit<4;bit++){
        const state=rabbitBitFrame(bit,elapsed),mount=rabbitMount(bit,elapsed);
        const x=cx+mount.x*s,y=cy+mount.y*s;
        const spread=state.round===RABBIT_VOLLEY.rounds-1?.4:1;
        const aimX=cx+(state.final?0:[-.09,.08,-.045,.055][bit]*s*spread);
        const aimY=cy+(state.final?0:[-.055,-.015,.065,.09][bit]*s*spread);
        const angle=Math.atan2(aimY-y,aimX-x),back=state.recoil*s*.035;
        const bunny=rabbits[bit];bunny.visible=true;
        bunny.position.set(x-Math.cos(angle)*back,y-Math.sin(angle)*back);
        const width=s*mount.size*(.35+.65*state.summon);
        bunny.scale.set(width/bunny.texture.width);bunny.alpha=state.summon*state.alpha;
        bunny.rotation=mount.rotation-state.recoil*.065*(bit%2?1:-1);
        const muzzle=rabbitMuzzle(bit,bunny.x,bunny.y,width,bunny.texture.height/bunny.texture.width,bunny.rotation);
        const dx=aimX-muzzle.x,dy=aimY-muzzle.y,length=Math.max(1,Math.hypot(dx,dy));
        const ux=dx/length,uy=dy/length,nx=-uy,ny=ux;
        // A small clock-shaped summon gate behind each rabbit, not a generic star.
        const ring=s*.10*(.6+.4*state.summon);
        light.ellipse(x,y+s*.08,ring,ring*.24).stroke({width:2,color,alpha:state.gate*.85});
        light.ellipse(x,y+s*.08,ring*1.22,ring*.34).stroke({width:1,color,alpha:state.gate*.55});
        if(summoning && state.summon>0 && state.summon<1){
          const power=state.summon;
          for(let spark=0;spark<5;spark++){
            const a=spark*Math.PI*.4+elapsed*.004+bit;
            const orbit=s*(.09-.045*power);
            const px=x+Math.cos(a)*orbit,py=y+Math.sin(a)*orbit*.7;
            light.circle(px,py,1+power*1.6).fill({color:0xdffff8,alpha:power*.85});
          }
          light.circle(x,y,s*.035*power).fill({color,alpha:power*.4});
        }
        if(hit<0 && aiming>0){
          stroke([x,y,x+(cx-x)*aiming,y+(cy-y)*aiming],.65,aiming*.3);
        }
        const energy=rabbitEnergyFrame(elapsed);
        if(energy.power>0){
          // The charge visibly energizes the same emitters that fire next.
          const r=s*(.022+.035*energy.power);
          light.circle(muzzle.x,muzzle.y,r*1.8).fill({color,alpha:energy.power*.24});
          light.circle(muzzle.x,muzzle.y,r).stroke({color,width:2,alpha:energy.power*.85});
          for(let ray=0;ray<4;ray++){
            const a=ray*Math.PI/2+elapsed*.002;
            stroke([muzzle.x+Math.cos(a)*r,muzzle.y+Math.sin(a)*r,muzzle.x+Math.cos(a)*r*1.8,muzzle.y+Math.sin(a)*r*1.8],1,energy.power*.6);
          }
        }
        if(state.finishCharge>0){
          light.circle(muzzle.x,muzzle.y,s*.04*state.finishCharge).fill({color,alpha:state.finishCharge*.7});
          stroke([muzzle.x-nx*s*.035,muzzle.y-ny*s*.035,muzzle.x+nx*s*.035,muzzle.y+ny*s*.035],1.5,state.finishCharge);
          for(let spark=0;spark<8;spark++){
            const a=spark*Math.PI/4+elapsed*.003;
            const radius=s*(.13-.10*state.finishCharge);
            light.circle(muzzle.x+Math.cos(a)*radius,muzzle.y+Math.sin(a)*radius*.7,1+state.finishCharge)
              .fill({color:0xffffff,alpha:state.finishCharge*.8});
          }
        }
        if(state.muzzle>.02){
          const radius=s*(state.final?.038:.019)*state.muzzle;
          light.circle(muzzle.x,muzzle.y,radius*1.6).fill({color,alpha:state.muzzle*.35});
          stroke([muzzle.x-ux*radius,muzzle.y-uy*radius,muzzle.x+ux*radius*2,muzzle.y+uy*radius*2],2.5,state.muzzle);
          stroke([muzzle.x-nx*radius,muzzle.y-ny*radius,muzzle.x+nx*radius,muzzle.y+ny*radius],1.4,state.muzzle);
        }
        if(state.flight){
          // A short moving bolt with a tail, never a full source-to-target line.
          const head=state.travel,tail=Math.max(0,head-(state.final?.42:.23));
          const hx=muzzle.x+dx*head,hy=muzzle.y+dy*head;
          const tx=muzzle.x+dx*tail,ty=muzzle.y+dy*tail;
          stroke([tx,ty,hx,hy],state.final?5:1.6,.75);
          if(state.final){
            const half=s*.025,body=s*.075;
            const shape=[hx+ux*half,hy+uy*half,hx-ux*body+nx*half,hy-uy*body+ny*half,hx-ux*body*1.35,hy-uy*body*1.35,hx-ux*body-nx*half,hy-uy*body-ny*half];
            light.poly(shape).fill({color,alpha:.85});
            stroke([hx-ux*body,hy-uy*body,hx,hy],6,1);
          }else stroke([hx-ux*s*.025,hy-uy*s*.025,hx,hy],3.5,1);
        }
        if(!state.final&&state.impact>.015){
          const age=state.impactAge,power=state.impact;
          light.circle(aimX,aimY,s*.014*power).fill({color:0xffffff,alpha:power});
          // Directional fragments continue the incoming bolt through the contact.
          for(let shard=0;shard<6;shard++){
            const a=Math.atan2(uy,ux)+(shard-2.5)*.46;
            const radius=s*(.009+age*(.35+shard*.06));
            const px=aimX+Math.cos(a)*radius,py=aimY+Math.sin(a)*radius;
            const size=s*.025*power;
            stroke([px,py,px+Math.cos(a)*size,py+Math.sin(a)*size],1.1,power*.85);
          }
        }
      }
      if(hit<0 && aiming>0){
        const r=s*.07;
        light.circle(cx,cy,r).stroke({color,width:1.5,alpha:aiming*.75});
        for(let mark=0;mark<4;mark++){
          const a=mark*Math.PI/2+aiming*.35;
          stroke([cx+Math.cos(a)*r*1.2,cy+Math.sin(a)*r*1.2,cx+Math.cos(a)*r*1.65,cy+Math.sin(a)*r*1.65],1.2,aiming);
        }
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
    if(!['bloom','aegis','dawn','rabbit-bits'].includes(visual)&&hit>=0){
      forms.circle(cx,cy,s*.026).fill({color:0xffffff,alpha:impact});
      stroke([cx-s*.12,cy,cx+s*.12,cy],2,impact);
    }
    for(let i=0;i<56;i++){
      if(visual==='rabbit-bits')continue;
      const {sprite,angle,speed,size}=particles[targetIndex*56+i];
      const support=['bloom','aegis','dawn'].includes(visual);
      if(hit<0){const radius=s*(.5-gather*.43)*speed;sprite.position.set(cx+Math.cos(angle)*radius,cy+Math.sin(angle)*radius);sprite.alpha=gather*.35;}
      else if(support){sprite.position.set(w*(.17+(i%4)*.22)+Math.sin(angle+hit)*s*.09,cy+s*.25-hit*s*.3*speed);sprite.alpha=decay(hit,1.5)*.65;}
      else{const direction=visual==='blade'?-.42+Math.sin(angle)*.28:angle,r=s*(.04+Math.max(0,age)*speed*.65);sprite.position.set(cx+Math.cos(direction)*r,cy+Math.sin(direction)*r);sprite.alpha=decay(age,2)*.7;}
      sprite.width=size*(support?1:2.8);sprite.height=size*(support?1:.4);sprite.rotation=support?0:visual==='blade'?-.42:angle;
    }
    }
    app.render();
  };
  const tick=()=>{try{draw();}catch{app.ticker.stop();onFailure();}};
  app.ticker.remove(app.render,app);app.ticker.maxFPS=visual==='rabbit-bits'?60:30;app.ticker.add(tick);
  // A timed HP impact must paint its landing in the same frame, even between ticker beats.
  const landing=()=>{if(visual==='rabbit-bits')tick();};
  window.addEventListener('game:combat-numbers',landing);
  const visibility=()=>{if(document.hidden)app.ticker.stop();else{app.ticker.start();tick();}};
  const lost=(event:Event)=>{event.preventDefault();onFailure();};
  document.addEventListener('visibilitychange',visibility);canvas.addEventListener('webglcontextlost',lost);visibility();
  return ()=>{if(destroyed)return;destroyed=true;window.removeEventListener('game:combat-numbers',landing);document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',lost);app.ticker.stop();app.destroy(true,{children:true});texture.destroy(true);};
}
