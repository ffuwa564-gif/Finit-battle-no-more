import { useEffect, useRef } from 'react';

/** Shared cut-in ornament. Every pose follows the existing presentation clock. */
export function UltimateIntroFx({ position, duration }: { position: () => number; duration: number }) {
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    let frame=0;
    const draw=()=>{
      const t=Math.max(0,Math.min(1,position()/duration)),ease=1-(1-t)**3;
      if(root.current){
        root.current.style.opacity=String(document.hidden?0:Math.min(1,t/.1,(1-t)/.12));
        root.current.querySelector('.ultimate-intro-fx__inner')?.setAttribute('transform',`translate(320 340) rotate(${-32+ease*58}) scale(${.82+.18*ease})`);
        root.current.querySelector('.ultimate-intro-fx__outer')?.setAttribute('transform',`translate(320 340) rotate(${24-t*46})`);
        const sweep=root.current.querySelector<HTMLElement>('.ultimate-intro-fx__sweep');
        if(sweep){sweep.style.transform=`translateX(${-160+ease*340}%) skewX(-18deg)`;sweep.style.opacity=String(Math.sin(t*Math.PI)*.45);}
      }
      if(t<1)frame=requestAnimationFrame(draw);
    };frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
  },[position,duration]);
  return <div className="ultimate-intro-fx" ref={root} aria-hidden="true">
    <svg viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">
      <g className="ultimate-intro-fx__outer">
        <circle r="264" fill="none" stroke="currentColor" strokeWidth="1" opacity=".35" />
        {Array.from({length:48},(_,i)=><path key={i} d={`M0 -${i%4===0?245:254} V-263`} transform={`rotate(${i*7.5})`} stroke="currentColor" strokeWidth={i%4===0?2:1} opacity={i%4===0?.8:.4} />)}
      </g>
      <g className="ultimate-intro-fx__inner" fill="none" stroke="currentColor">
        <circle r="232" strokeWidth="2" strokeDasharray="190 84 45 84" opacity=".7" />
        <circle r="224" strokeWidth=".7" strokeDasharray="75 94" opacity=".55" />
        <path d="M-200 90 90-200M-205 105 105-205" strokeWidth="1" opacity=".25" />
      </g>
      {[[35,110],[562,210],[48,430],[530,525],[480,64],[100,615]].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`} fill="currentColor" opacity=".8"><path d="M0-9 2-2 9 0 2 2 0 9-2 2-9 0-2-2Z" /><circle r="18" fill="none" stroke="currentColor" strokeWidth=".5" opacity=".35" /></g>)}
    </svg>
    <div className="ultimate-intro-fx__sweep" />
  </div>;
}
