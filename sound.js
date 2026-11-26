"use strict";
(() => {
 const audio=document.getElementById("chamber-audio"),
       button=document.getElementById("sound-toggle"),
       label=document.getElementById("sound-label"),
       status=document.getElementById("sound-status");
 if(!audio||!button||!label||!status)return;
 let intent=0, stopped=false, started=false, failed=false;
 const sync=()=>{const on=!audio.paused&&!audio.ended;button.setAttribute("aria-pressed",String(on));label.textContent=on?"暫停音樂":"播放音樂";};
 const stopListening=()=>{
  document.removeEventListener("click",onGesture,true);
  document.removeEventListener("keydown",onGesture,true);
 };
 function onGesture(e){
  if(e.isTrusted===false||button.contains(e.target)||started||stopped||failed)return;
  if(e.type==="keydown"&&(e.repeat||e.ctrlKey||e.metaKey||e.altKey||["Tab","Escape","Shift","Meta","Control","Alt"].includes(e.key)))return;
  play(true);
 }
 function play(userGesture){
  const request=++intent;
  status.textContent="";
  // Call inside the original click/keypress stack, not a timer or a promise callback.
  audio.play().then(()=>{
   if(request!==intent)return;
   if(stopped){audio.pause();return;}
   started=true;stopListening();sync();
  }).catch(error=>{
   if(request!==intent)return;
   sync();
   if(error.name==="AbortError")return;
   if(error.name==="NotAllowedError"){
    if(userGesture)status.textContent="瀏覽器未允許播放音樂，可以試試右上角。";
    return;
   }
   status.textContent="音樂目前無法播放，不影響抽牌。";
  });
 }
 audio.addEventListener("play",()=>{if(stopped){audio.pause();return;}sync();});
 audio.addEventListener("playing",()=>{if(stopped){audio.pause();return;}started=true;stopListening();sync();});
 audio.addEventListener("pause",sync);
 audio.addEventListener("ended",sync);
 audio.addEventListener("error",()=>{failed=true;stopListening();sync();status.textContent="音樂目前無法播放，不影響抽牌。";});
 button.addEventListener("click",()=>{
  if(!audio.paused){stopped=true;++intent;stopListening();audio.pause();return;}
  stopped=false;play(true);
 });
 document.addEventListener("click",onGesture,true);
 document.addEventListener("keydown",onGesture,true);
 sync();play(false);
})();
