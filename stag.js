"use strict";
(() => {
 const stage=document.querySelector('.ghost-elk'), fallback=stage?.querySelector('.stag-fallback');
 if(!fallback)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'), narrow=matchMedia('(max-width:615px)');
 const fig=document.createElement('div'), surface=document.createElement('canvas'), reflect=document.createElement('canvas');
 const front=surface.getContext('2d'), mirror=reflect.getContext('2d');
 if(!front||!mirror)return;
 const W=576,H=512, hoof=476;
 // Measured contact points in each walking tile, relative to its top left.
 const contacts=[[263,462],[404,465],[286,458],[338,463]];
 const NS='http://www.w3.org/2000/svg';
 const svg=(tag,attributes={})=>{
  const node=document.createElementNS(NS,tag);
  for(const [key,value] of Object.entries(attributes))node.setAttribute(key,value);
  return node;
 };
 const track=svg('svg',{class:'stag-tracks','aria-hidden':'true',focusable:'false'});
 const defs=svg('defs'), gradient=svg('linearGradient',{id:'stag-hoof-glow',x1:'0%',x2:'100%',y1:'0%',y2:'0%'});
 for(const [offset,color,alpha] of [['0%','#6ca7dd','0'],['37%','#9bccff','.29'],['74%','#bfe9ff','.68'],['91%','#e3faff','.99'],['100%','#d5f3ff','.73']]){
  gradient.append(svg('stop',{offset,'stop-color':color,'stop-opacity':alpha}));
 }
 defs.append(gradient);track.append(defs);
 for(const c of [surface,reflect]){c.width=W;c.height=H;}
 fig.className='stag-figure';reflect.className='stag-light';fig.append(reflect,surface);
 const load=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});
 const limit=x=>Math.max(0,Math.min(1,x)), smooth=x=>(x=limit(x))*x*(3-2*x);
 Promise.all([load(fallback.getAttribute('src')),load('./stag-walk.webp?v=7')]).then(([still,sheet])=>{
  if(sheet.naturalWidth!==2*W||sheet.naturalHeight!==2*H)return;
  stage.append(track,fig);
  const traces=[];
  let last=0,raf=0,t=0,kind=null,previousFrame=null,previousLane=null,trackWidth=0,trackHeight=0;
  function clearTraces(){for(const item of traces)item.node.remove();traces.length=0;previousFrame=null;previousLane=null;}
  function stepLight(x,y,side,s,alpha,step){
   const group=svg('g',{transform:`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(s*side).toFixed(3)} ${s.toFixed(3)})`});
   // Fixed on the forest floor; the line narrows into the wake of the hoof.
   const anchor=step%2===0?'M-118 10C-83 15-63 4-37 7Q-15 10 0 0':'M-104 8C-76 16-56 2-32 5Q-13 8 0 0';
   const branch=step%2===0?'M-82 16Q-63 17-43 12T-9 4':'M-72 15Q-55 17-35 10T-9 4';
   for(const [d,width,opacity,cls] of [[anchor,5.8,.78,'stag-track-halo'],[anchor,1.85,.96,''],[branch,.88,.55,'']]){
    group.append(svg('path',{d,fill:'none',stroke:'url(#stag-hoof-glow)','stroke-linecap':'round','stroke-width':width,opacity,...(cls?{class:cls}:{})}));
   }
   track.append(group);traces.push({node:group,born:t,alpha});
   if(traces.length>7)traces.shift().node.remove();
  }
  function picture(frame,mix){
   front.clearRect(0,0,W,H);
   if(frame===null){
    const high=462,wide=high*still.naturalWidth/still.naturalHeight;
    front.drawImage(still,(W-wide)/2,24,wide,high);
   }else{
    const draw=(i,a)=>{
     front.globalAlpha=a;
     front.drawImage(sheet,(i%2)*W,Math.floor(i/2)*H,W,H,0,0,W,H);
    };
    draw(frame,1);if(mix>0)draw((frame+1)%4,mix);
    front.globalAlpha=1;
   }
   mirror.clearRect(0,0,W,H);mirror.drawImage(surface,0,0);
  }
  function draw(){
   const w=stage.clientWidth,h=stage.clientHeight,width=fig.clientWidth;
   if(!w||!h||!width)return;
   const mobile=narrow.matches,s=width/W, floor=Math.max(h*(mobile?.49:.64),hoof*s+12);
   if(w!==trackWidth||h!==trackHeight){clearTraces();trackWidth=w;trackHeight=h;}
   let x=w*(mobile?.65:.72),alpha=.87, facing=1, frame=null,mix=0,lane=null;
   if(!reduced.matches){
    if(t<4){alpha*=1-smooth((t-2.8)/1.1);}
    else{
     const cycle=mobile?13:19, elapsed=t-4, at=elapsed%cycle;
     lane=Math.floor(elapsed/cycle);
     const p=limit(at/(cycle-1.6));
     facing=lane%2===0?-1:1;
     x=w*(facing>0 ? -.14+p*1.28 : 1.14-p*1.28);
     alpha*=smooth(p/.25)*(1-smooth((p-.72)/.28));
     const gait=(at/(mobile?1.63:1.85)*4)%4;
     frame=Math.floor(gait);
     mix=smooth((gait%1-.79)/.21);
    }
   }
   if(frame===null||alpha<.07||document.hidden)clearTraces();
   else {
    if(lane===previousLane&&previousFrame!==null&&frame!==previousFrame&&alpha>.28){
     const [fx,fy]=contacts[frame], gx=x+(fx-W/2)*s*facing,gy=floor+(fy-hoof)*s;
     if(gx>0&&gx<w&&gy>=0&&gy<h)stepLight(gx,gy,facing,s,Math.min(1,alpha+.12),frame);
    }
    previousLane=lane;previousFrame=frame;
    for(let i=traces.length-1;i>=0;i--){
     const p=(t-traces[i].born)/1.72;
     if(p>=1){traces[i].node.remove();traces.splice(i,1);}
     else traces[i].node.setAttribute('opacity',((1-smooth(p))*traces[i].alpha).toFixed(3));
    }
   }
   const key=frame===null?'still':frame+':'+Math.round(mix*10);
   if(key!==kind){picture(frame,mix);kind=key;}
   fig.style.opacity=alpha.toFixed(3);
   fig.style.transform=`translate3d(${(x-width/2).toFixed(1)}px,${(floor-hoof*s).toFixed(1)}px,0) scaleX(${facing})`;
  }
  function tick(ms){
   t+=last?Math.min(.05,(ms-last)/1000):0;last=ms;draw();raf=requestAnimationFrame(tick);
  }
  function sync(){
   if(raf)cancelAnimationFrame(raf);raf=0;last=0;
   if(reduced.matches||document.hidden)clearTraces();
   draw();if(!reduced.matches&&!document.hidden)raf=requestAnimationFrame(tick);
  }
  draw();fallback.hidden=true;fallback.style.display='none';
  reduced.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('resize',draw,{passive:true});
  sync();
 }).catch(()=>{}); // Show the standing stag if motion assets fail to load.
})();
