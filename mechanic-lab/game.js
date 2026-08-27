(()=>{
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const menu=$('#menu'),game=$('#game'),cv=$('#c'),ctx=cv.getContext('2d'),controls=$('#controls'),toast=$('#toast');
const W=cv.width,H=cv.height; let mode=null,level=0,state={},raf=0,last=0,won=false;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function say(t){toast.textContent=t;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1200)}
function btn(label,action,cls=''){return `<button class="ctrl ${cls}" data-a="${action}">${label}</button>`}
function pointerPos(e){const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
function circle(x,y,r,fill,stroke='#fff'){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke()}
function rect(o,fill,stroke='#fff'){ctx.fillStyle=fill;ctx.fillRect(o.x,o.y,o.w,o.h);ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.strokeRect(o.x,o.y,o.w,o.h)}
function arrow(x,y,ang,len=42,col='#75e6ff'){ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(len,0);ctx.stroke();ctx.beginPath();ctx.moveTo(len,0);ctx.lineTo(len-13,-9);ctx.lineTo(len-13,9);ctx.closePath();ctx.fill();ctx.restore()}
function text(t,x,y,size=26,align='center',col='#fff'){ctx.fillStyle=col;ctx.font=`800 ${size}px -apple-system,BlinkMacSystemFont,sans-serif`;ctx.textAlign=align;ctx.fillText(t,x,y)}
const common={gravity:900, floor:535};
const reactionLevels=[
 ['Wall Test','Schieße die Kugel. Wähle vorher, ob Kugel oder Wand den Stoß bekommt.',{wallX:690,target:'wall',need:'wall'}],
 ['Return Fire','Lass die Kugel zurückprallen und triff den grünen Sender.',{wallX:740,target:'ball',need:'ballReturn'}],
 ['Move the Block','Nutze den Stoß, um die rote Kiste in die Zielzone zu schieben.',{block:true,target:'block',need:'blockGoal'}],
 ['Keep Momentum','Die Kugel soll drei Wände treffen, ohne selbst gestoppt zu werden.',{multiWalls:3,target:'walls',need:'pass3'}],
 ['Domino','Stoß die erste Kiste in die zweite und erreiche die Zielzone.',{domino:true,target:'block',need:'domino'}],
 ['Ceiling Break','Lenke die Reaktion nach oben: katapultiere die Platte gegen die Decke.',{ceiling:true,target:'plate',need:'ceiling'}],
 ['Shield','Eine feindliche Kugel kommt auf dich zu. Gib die Reaktion der Kugel zurück.',{enemy:true,target:'ball',need:'shield'}],
 ['Two Targets','Wähle bei zwei Treffern jeweils den richtigen Reaktionsempfänger.',{sequence:true,target:'mixed',need:'sequence'}],
 ['Chain Reaction','Vier Objekte, ein Schuss. Halte die Reaktionskette am Leben.',{chain:true,target:'mixed',need:'chain'}],
 ['Reaction Run','Finale: Sender → Kiste → Wand → Ziel. Du entscheidest dreimal.',{final:true,target:'mixed',need:'final'}]
];
const promiseLevels=[
 ['First Promise','Tippe die Kiste und dann die leuchtende Zielzone.',{boxes:1,goal:[760,430],need:'box'}],
 ['Ride It','Setze die Kiste oben aufs Podest und springe im richtigen Moment mit.',{ride:true,goal:[730,260],need:'ride'}],
 ['Under the Door','Versprich die Kiste hinter die Wand – sie muss physisch darunter hindurch.',{tunnel:true,goal:[780,450],need:'box'}],
 ['Push a Switch','Setze den Zukunftspunkt hinter dem Schalter.',{switch:true,goal:[820,400],need:'switch'}],
 ['Counterforce','Die Kiste zieht beim Beschleunigen eine Plattform in Gegenrichtung.',{counter:true,goal:[760,380],need:'counter'}],
 ['Moving Goal','Treffe eine bewegte Zukunftszone.',{moving:true,goal:[740,300],need:'box'}],
 ['Two Promises','Erfülle nacheinander zwei Zukunftspunkte.',{two:true,goal:[430,270],goal2:[790,430],need:'two'}],
 ['Heavy Object','Die schwere Kiste braucht mehr Zeit: wähle den richtigen Zukunftshorizont.',{heavy:true,goal:[790,390],need:'box'}],
 ['Promise Platformer','Nutze zwei versprochene Kistenpositionen als temporäre Plattformen.',{platformer:true,goal:[800,210],need:'platformer'}],
 ['Impossible?','Finale: bring dich und die Kiste gemeinsam in zwei Zielzonen.',{final:true,goal:[800,250],need:'final'}]
];
const normalLevels=[
 ['First Bounce','Tippe die Bodenfläche, drehe den Pfeil nach rechts und starte den Ball.',{surfaces:1,goal:[820,400],need:'goal'}],
 ['Wall Lift','Drehe die Wand-Normale nach oben, damit der Ball hochkatapultiert wird.',{wall:true,goal:[760,160],need:'goal'}],
 ['Corner Shot','Zwei Flächen, zwei Pfeile. Erreiche die obere Ecke.',{corner:true,goal:[820,120],need:'goal'}],
 ['Avoid Red','Ändere den Bounce so, dass der Ball die rote Zone meidet.',{hazard:true,goal:[820,180],need:'goal'}],
 ['S-Curve','Drei Normals ergeben einen gekrümmten Weg ohne Kurve.',{s:true,goal:[850,210],need:'goal'}],
 ['Backwards Floor','Der Boden schießt den Ball gegen seine ursprüngliche Bewegungsrichtung.',{back:true,goal:[130,190],need:'goal'}],
 ['Pinball Logic','Vier Kontaktflächen – plane die Pfeile vor dem Start.',{pin:true,goal:[810,110],need:'goal'}],
 ['Moving Surface','Eine Plattform fährt. Ihre Normale entscheidet den Absprung.',{moving:true,goal:[820,160],need:'goal'}],
 ['One Edit Only','Du darfst genau eine Normale verändern.',{one:true,goal:[830,140],need:'goal'}],
 ['Normal Run','Finale: fünf Flächen, ein Ball, ein Ziel.',{final:true,goal:[860,100],need:'goal'}]
];
const info={reaction:{name:'REACTION',levels:reactionLevels},promise:{name:'PROMISE',levels:promiseLevels},normal:{name:'NORMAL',levels:normalLevels}};
function buildProgress(){const p=$('#progress');p.innerHTML='';for(let i=0;i<10;i++){const d=document.createElement('div');d.className='dot'+(i<level?' done':'')+(i===level?' current':'');p.appendChild(d)}}
function openMode(m){mode=m;level=0;menu.style.display='none';game.style.display='block';loadLevel()}
function loadLevel(){won=false;cancelAnimationFrame(raf);last=0;const L=info[mode].levels[level];$('#modeName').textContent=info[mode].name;$('#levelName').textContent=`${level+1}/10 · ${L[0]}`;$('#objective').textContent='Ziel: '+L[0];buildProgress(); if(mode==='reaction') initReaction(L); if(mode==='promise') initPromise(L); if(mode==='normal') initNormal(L); raf=requestAnimationFrame(loop)}
function complete(){if(won)return;won=true;say(level===9?'Mechanic Test abgeschlossen!':'Challenge geschafft!');setTimeout(()=>{if(level<9){level++;loadLevel()}else{showMenu()}},900)}
function showMenu(){cancelAnimationFrame(raf);game.style.display='none';menu.style.display='block';mode=null}
$$('.mode').forEach(b=>b.onclick=()=>openMode(b.dataset.mode));$('#home').onclick=showMenu;$('#reset').onclick=loadLevel;
controls.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-a]');if(!b)return;e.preventDefault();handleAction(b.dataset.a,true)});controls.addEventListener('pointerup',e=>{const b=e.target.closest('[data-a]');if(b)handleAction(b.dataset.a,false)});controls.addEventListener('pointercancel',e=>{const b=e.target.closest('[data-a]');if(b)handleAction(b.dataset.a,false)});
cv.addEventListener('pointerdown',e=>{e.preventDefault();const p=pointerPos(e); if(mode==='promise') promiseTap(p); if(mode==='normal') normalTap(p); if(mode==='reaction') reactionTap(p)});
let keys={left:false,right:false};
function handleAction(a,on){if(a==='left'||a==='right'){keys[a]=on;return}if(!on)return;if(mode==='reaction')reactionAction(a);if(mode==='promise')promiseAction(a);if(mode==='normal')normalAction(a)}
function loop(ts){const dt=Math.min(.028,(ts-last)/1000||.016);last=ts;ctx.clearRect(0,0,W,H);if(mode==='reaction'){updateReaction(dt);drawReaction()}if(mode==='promise'){updatePromise(dt);drawPromise()}if(mode==='normal'){updateNormal(dt);drawNormal()}raf=requestAnimationFrame(loop)}
// REACTION
function initReaction(L){const cfg=L[2];state={cfg,ball:{x:160,y:450,r:20,vx:0,vy:0},wall:{x:cfg.wallX||700,y:260,w:40,h:275,vx:0},block:cfg.block||cfg.domino||cfg.final?{x:570,y:455,w:70,h:80,vx:0}:null,block2:cfg.domino?{x:700,y:455,w:70,h:80,vx:0}:null,plate:cfg.ceiling?{x:500,y:470,w:110,h:28,vy:0}:null,choice:'ball',shot:false,hits:0,seq:0,hitCd:0};
$('#instructions').innerHTML=`<b>Core mechanic:</b> Vor dem Treffer bestimmst du den Reaktionsempfänger. ${level===0?'Teste erst BALL, dann WALL.':''}`;
controls.innerHTML=`<div class="row two">${btn('⚪ BALL reagiert','pickBall')}${btn('🧱 OBJEKT reagiert','pickObj')}</div><div class="row two">${btn('FIRE','fire','primary')}${btn('RESET','restart')}</div>`; updateReactionStatus()}
function updateReactionStatus(){$('#status').textContent='Empfänger: '+(state.choice==='ball'?'BALL':'OBJEKT')}
function reactionAction(a){if(a==='pickBall'){state.choice='ball';updateReactionStatus()}if(a==='pickObj'){state.choice='obj';updateReactionStatus()}if(a==='fire'&&!state.shot){state.shot=true;if(state.cfg.enemy){state.ball.x=820;state.ball.y=450;state.ball.vx=-520}else state.ball.vx=500}if(a==='restart')loadLevel()}
function reactionTap(p){if(p.x>450){state.choice='obj';updateReactionStatus()}else{state.choice='ball';updateReactionStatus()}}
function updateReaction(dt){let s=state,b=s.ball;if(s.hitCd>0)s.hitCd-=dt;if(!s.shot)return;b.x+=b.vx*dt;b.y+=b.vy*dt;b.vy+=common.gravity*dt;if(b.y+b.r>common.floor){b.y=common.floor-b.r;b.vy*=-.55}
if(s.block){s.block.x+=s.block.vx*dt;s.block.vx*=.985;if(hitCircleRect(b,s.block)){collisionRect(s.block)}}
if(s.block2){s.block2.x+=s.block2.vx*dt;s.block2.vx*=.985;if(rectHit(s.block,s.block2)&&Math.abs(s.block.vx)>20){s.block2.vx+=s.block.vx*.8;s.block.vx*=.35}}
if(s.plate){s.plate.y+=s.plate.vy*dt;s.plate.vy+=700*dt;if(s.plate.y>470){s.plate.y=470;s.plate.vy=0}if(hitCircleRect(b,s.plate)){if(s.choice==='obj')s.plate.vy=-620;else b.vy=-500;b.vx*=.85}}
if(hitCircleRect(b,s.wall)&&s.hitCd<=0){s.hitCd=.16;s.hits++; if(s.choice==='obj'){s.wall.vx+=Math.max(170,Math.abs(b.vx)*.55);b.vx*=.75;if(s.cfg.multiWalls&&s.hits<3){s.wall.x=Math.min(900,b.x+170);s.wall.vx=0}}else{b.vx=-Math.abs(b.vx)*.9}}
s.wall.x+=s.wall.vx*dt;s.wall.vx*=.985;
if(s.cfg.enemy && s.shot && b.vx>0 && b.x>760){complete()}
if(s.cfg.need==='wall'&&s.wall.x>760)complete();if(s.cfg.need==='ballReturn'&&b.x<120&&s.shot&&b.vx<0)complete();if(s.cfg.need==='blockGoal'&&s.block&&s.block.x>780)complete();if(s.cfg.need==='pass3'&&s.hits>=3)complete();if(s.cfg.need==='domino'&&s.block2&&s.block2.x>820)complete();if(s.cfg.need==='ceiling'&&s.plate&&s.plate.y<100)complete();if((s.cfg.need==='sequence'||s.cfg.need==='chain'||s.cfg.need==='final')&&s.hits>=2&&((s.block&&s.block.x>730)||s.wall.x>780))complete();if(s.cfg.enemy&&b.x<70&&!won){s.shot=false;b.x=820;b.y=450;b.vx=0;say('Treffer – BALL reagieren lassen')} }
function collisionRect(o){if(state.choice==='obj'){o.vx+=(state.ball.vx||380)*.8;state.ball.vx*=.55}else state.ball.vx=-Math.abs(state.ball.vx)*.8}
function hitCircleRect(c,r){const nx=clamp(c.x,r.x,r.x+r.w),ny=clamp(c.y,r.y,r.y+r.h);return Math.hypot(c.x-nx,c.y-ny)<c.r}
function rectHit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function drawReaction(){ctx.fillStyle='#0a1320';ctx.fillRect(0,0,W,H);ctx.fillStyle='#243244';ctx.fillRect(0,common.floor,W,H-common.floor);let s=state;circle(s.ball.x,s.ball.y,s.ball.r,'#eff7ff','#75e6ff');rect(s.wall,'#7b3b46','#ff758f');if(s.block)rect(s.block,'#a05252','#ffb1b1');if(s.block2)rect(s.block2,'#7f5aa8','#d9b6ff');if(s.plate)rect(s.plate,'#6a7890','#cbd8ec');ctx.fillStyle='rgba(115,255,166,.2)';ctx.fillRect(790,400,140,135);text('GOAL',860,465,20,'center','#73ffa6');text(state.choice==='ball'?'BALL':'OBJECT',480,90,30,'center','#75e6ff')}
// PROMISE
function initPromise(L){const cfg=L[2];state={cfg,box:{x:230,y:430,w:70,h:70,vx:0,vy:0,mass:cfg.heavy?3:1},player:{x:100,y:460,w:34,h:70,vx:0,vy:0,on:false},goal:{x:cfg.goal[0],y:cfg.goal[1],r:34},goal2:cfg.goal2?{x:cfg.goal2[0],y:cfg.goal2[1],r:34}:null,selected:false,promise:null,timer:0,stage:0};
$('#instructions').innerHTML='<b>Core mechanic:</b> Tippe die Kiste, dann den gewünschten Zukunftsort. Die Kiste wird nicht teleportiert – sie wird dorthin beschleunigt.';
controls.innerHTML=`<div class="row">${btn('◀','left')}${btn('JUMP','jump','primary')}${btn('▶','right')}</div><div class="row two">${btn('PROMISE 1.5s','promise')}${btn('RESET','restart')}</div>`;$('#status').textContent='Tippe Kiste → Ziel'}
function promiseAction(a){if(a==='jump'&&state.player.on){state.player.vy=-460;state.player.on=false}if(a==='promise'){state.selected=true;$('#status').textContent='Tippe Zukunftspunkt'}if(a==='restart')loadLevel()}
function promiseTap(p){let s=state;if(p.x>=s.box.x-20&&p.x<=s.box.x+s.box.w+20&&p.y>=s.box.y-20&&p.y<=s.box.y+s.box.h+20){s.selected=true;$('#status').textContent='Tippe Zukunftspunkt';return}if(s.selected){s.promise={x:p.x,y:p.y,t:1.5};s.timer=0;s.selected=false;$('#status').textContent='Promise aktiv';}}
function updatePromise(dt){let s=state,p=s.player,b=s.box;p.vx=(keys.right?220:0)-(keys.left?220:0);p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=common.gravity*dt;if(p.y+p.h>common.floor){p.y=common.floor-p.h;p.vy=0;p.on=true}if(s.promise){s.timer+=dt;const left=Math.max(.15,s.promise.t-s.timer);const tx=s.promise.x-b.w/2,ty=s.promise.y-b.h/2;const ax=(tx-b.x-b.vx*left)/(left*left*.5),ay=(ty-b.y-b.vy*left)/(left*left*.5);b.vx+=clamp(ax,-1300,1300)*dt/b.mass;b.vy+=clamp(ay,-1300,1300)*dt/b.mass;if(s.timer>=s.promise.t){s.promise=null;$('#status').textContent='Promise erfüllt?'}}else b.vy+=common.gravity*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=.996;if(b.y+b.h>common.floor){b.y=common.floor-b.h;b.vy*=-.25}
if(p.x+p.w>b.x&&p.x<b.x+b.w&&p.y+p.h>=b.y&&p.y+p.h<=b.y+24&&p.vy>=0){p.y=b.y-p.h;p.vy=b.vy;p.on=true}
let ok=dist({x:b.x+b.w/2,y:b.y+b.h/2},s.goal)<55;if(ok){if(s.cfg.need==='ride'&&p.y<340)complete();else if(s.cfg.need==='switch'||s.cfg.need==='counter'||s.cfg.need==='box')complete();else if(s.cfg.need==='two'){if(s.stage===0&&s.goal2){s.stage=1;s.goal=s.goal2;s.goal2=null;say('Erstes Promise erfüllt')}else complete()}else if(s.cfg.need==='platformer'&&p.y<300)complete();else if(s.cfg.need==='final'&&p.x>650)complete()} }
function drawPromise(){ctx.fillStyle='#0c1020';ctx.fillRect(0,0,W,H);ctx.fillStyle='#283347';ctx.fillRect(0,common.floor,W,H-common.floor);let s=state;if(s.cfg.tunnel){ctx.fillStyle='#334258';ctx.fillRect(480,240,70,230)}if(s.cfg.ride||s.cfg.platformer||s.cfg.final){ctx.fillStyle='#32425a';ctx.fillRect(680,330,220,24)}circle(s.goal.x,s.goal.y,s.goal.r,'rgba(115,255,166,.12)','#73ffa6');if(s.goal2)circle(s.goal2.x,s.goal2.y,s.goal2.r,'rgba(115,255,166,.08)','#73ffa6');rect(s.box,'#6653b7','#c9bfff');rect(s.player,'#2e7192','#75e6ff');if(s.promise){circle(s.promise.x,s.promise.y,24,'rgba(117,230,255,.08)','#75e6ff');ctx.setLineDash([10,10]);ctx.strokeStyle='#75e6ff';ctx.beginPath();ctx.moveTo(s.box.x+s.box.w/2,s.box.y+s.box.h/2);ctx.lineTo(s.promise.x,s.promise.y);ctx.stroke();ctx.setLineDash([])}}
// NORMAL
function initNormal(L){const cfg=L[2],surfs=[];surfs.push({x:0,y:520,w:960,h:25,a:-Math.PI/2,sel:true});if(cfg.wall||cfg.corner||cfg.hazard||cfg.s||cfg.pin||cfg.final)surfs.push({x:700,y:220,w:25,h:300,a:Math.PI,sel:false});if(cfg.corner||cfg.s||cfg.pin||cfg.final)surfs.push({x:420,y:330,w:220,h:22,a:-Math.PI/2,sel:false});if(cfg.pin||cfg.final)surfs.push({x:180,y:210,w:22,h:210,a:0,sel:false});if(cfg.final)surfs.push({x:560,y:120,w:190,h:20,a:Math.PI/2,sel:false});state={cfg,ball:{x:120,y:450,r:18,vx:0,vy:0},surfs,sel:0,running:false,goal:{x:cfg.goal[0],y:cfg.goal[1],r:30},edits:0};
$('#instructions').innerHTML='<b>Core mechanic:</b> Tippe eine Fläche und drehe ihren Pfeil. Beim Kontakt wird der Ball in Pfeilrichtung weggeschossen.';
controls.innerHTML=`<div class="row">${btn('↺ -45°','rotL')}${btn('START','start','primary')}${btn('+45° ↻','rotR')}</div><div class="row two">${btn('STOP','stop')}${btn('RESET','restart')}</div>`;$('#status').textContent='Fläche 1 ausgewählt'}
function normalAction(a){let s=state;if(a==='rotL'&&!s.running){s.surfs[s.sel].a-=Math.PI/4;s.edits++;}if(a==='rotR'&&!s.running){s.surfs[s.sel].a+=Math.PI/4;s.edits++;}if(a==='start'&&!s.running){s.running=true;s.ball.vx=300;s.ball.vy=-80;$('#status').textContent='RUN'}if(a==='stop'){s.running=false;s.ball.vx=s.ball.vy=0}if(a==='restart')loadLevel()}
function normalTap(p){if(state.running)return;let best=-1,bd=80;state.surfs.forEach((r,i)=>{const cx=clamp(p.x,r.x,r.x+r.w),cy=clamp(p.y,r.y,r.y+r.h),d=Math.hypot(p.x-cx,p.y-cy);if(d<bd){bd=d;best=i}});if(best>=0){state.sel=best;$('#status').textContent='Fläche '+(best+1)+' ausgewählt'}}
function updateNormal(dt){let s=state,b=s.ball;if(!s.running)return;b.vy+=430*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;for(const r of s.surfs){if(hitCircleRect(b,r)){const sp=Math.max(330,Math.hypot(b.vx,b.vy)*.92);b.vx=Math.cos(r.a)*sp;b.vy=Math.sin(r.a)*sp;b.x+=Math.cos(r.a)*6;b.y+=Math.sin(r.a)*6}}
if(dist(b,s.goal)<48)complete();if(b.x<-80||b.x>1040||b.y>680||b.y<-80){s.running=false;s.ball={x:120,y:450,r:18,vx:0,vy:0};$('#status').textContent='Nochmal versuchen'}}
function drawNormal(){ctx.fillStyle='#08131a';ctx.fillRect(0,0,W,H);let s=state;circle(s.goal.x,s.goal.y,s.goal.r,'rgba(115,255,166,.12)','#73ffa6');s.surfs.forEach((r,i)=>{rect(r,i===s.sel?'#344b5f':'#243140',i===s.sel?'#75e6ff':'#6b7d92');const cx=r.x+r.w/2,cy=r.y+r.h/2;arrow(cx,cy,r.a,44,i===s.sel?'#75e6ff':'#d1d9e5')});circle(s.ball.x,s.ball.y,s.ball.r,'#fff2a8','#ffd36b');text('GOAL',s.goal.x,s.goal.y-45,16,'center','#73ffa6')}
})();
