(()=>{
'use strict';
if(window.__foldworldTouchFix)return;
window.__foldworldTouchFix=true;
const c=document.getElementById('game');
if(!c)return;
const MOVE_THRESHOLD=9;
let gesture=null;
const touchById=(list,id)=>{for(const t of list)if(t.identifier===id)return t;return null};
const blockSyntheticPointer=e=>{if(e.pointerType==='touch'||e.pointerType==='pen'){e.preventDefault();e.stopImmediatePropagation()}};
c.addEventListener('pointerdown',blockSyntheticPointer,true);
c.addEventListener('pointermove',blockSyntheticPointer,true);
c.addEventListener('pointerup',blockSyntheticPointer,true);
c.addEventListener('pointercancel',blockSyntheticPointer,true);
c.addEventListener('touchstart',e=>{
 if(e.touches.length!==1)return;
 e.preventDefault();
 const t=e.touches[0],x=t.clientX,y=t.clientY,p=plateAt(x,y);
 gesture={id:t.identifier,startX:x,startY:y,lastX:x,lastY:y,p,dx:p?x-p.x:0,dy:p?y-p.y:0,moved:false};
},{passive:false});
c.addEventListener('touchmove',e=>{
 if(!gesture)return;
 const t=touchById(e.touches,gesture.id);if(!t)return;
 e.preventDefault();
 gesture.lastX=t.clientX;gesture.lastY=t.clientY;
 const distance=Math.hypot(t.clientX-gesture.startX,t.clientY-gesture.startY);
 if(distance>MOVE_THRESHOLD)gesture.moved=true;
 if(gesture.p&&gesture.moved){
   const p=gesture.p;
   p.x=clamp(t.clientX-gesture.dx,p.r*.7,W-p.r*.7);
   p.y=clamp(t.clientY-gesture.dy,p.r*.7,H-p.r*.7);
   updateConnections();
   hint.style.opacity=0;
 }
},{passive:false});
function finishTouch(e,cancelled=false){
 if(!gesture)return;
 e.preventDefault();
 const g=gesture;gesture=null;
 if(g.p&&g.moved&&!cancelled){
   updateConnections();
   navigator.vibrate?.(18);
   hint.style.opacity=0;
   return;
 }
 if(cancelled)return;
 const o=nearestOrg(g.startX,g.startY);
 if(o){selected=o;showSelected(o);sheet.classList.add('open');hint.style.opacity=0;navigator.vibrate?.(8)}
}
c.addEventListener('touchend',e=>finishTouch(e,false),{passive:false});
c.addEventListener('touchcancel',e=>finishTouch(e,true),{passive:false});
window.__foldworldTouchReady=true;
})();