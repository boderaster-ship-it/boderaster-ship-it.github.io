(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const cv=$('#c'),ctx=cv.getContext('2d'),W=cv.width,H=cv.height;
const menu=$('#menu'),game=$('#game'),toast=$('#toast'),impactFlash=$('#impactFlash');
const launchBtn=$('#launch'),applyBtn=$('#apply');
const DIRS={ul:[-.707,-.707],u:[0,-1],ur:[.707,-.707],l:[-1,0],r:[1,0],dl:[-.707,.707],d:[0,1],dr:[.707,.707]};
const dirNames={ul:'↖',u:'↑',ur:'↗',l:'←',r:'→',dl:'↙',d:'↓',dr:'↘'};
let level=0,state=null,raf=0,last=0,won=false;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const levels=[
 {name:'WHO REACTS?',sub:'First contact',objective:'Move the wall into the green zone.',instruction:'Tap the wall. Set <b>SURFACE + →</b>, then launch.',ball:{x:120,y:380,vx:430,vy:0},surfaces:[{id:'A',x:560,y:250,w:55,h:250}],goals:[{type:'surface',id:'A',x:785,y:275,w:145,h:205}],preset:{A:['ball','l']}},
 {name:'WHERE DOES IT GO?',sub:'Return the shot',objective:'Send the ball back into the goal.',instruction:'Same wall, different rule: <b>BALL + ←</b>.',ball:{x:130,y:390,vx:470,vy:0},surfaces:[{id:'A',x:760,y:245,w:48,h:270}],goals:[{type:'ball',x:45,y:325,w:115,h:130}],preset:{A:['surface','r']}},
 {name:'WALL JUMP',sub:'Direction becomes movement',objective:'Reach the high green target.',instruction:'Use the wall as a launcher: <b>BALL + ↗</b>.',ball:{x:110,y:440,vx:430,vy:0},surfaces:[{id:'A',x:405,y:300,w:45,h:225}],goals:[{type:'ball',x:735,y:80,w:175,h:130}],preset:{A:['ball','l']}},
 {name:'DROP THE BRIDGE',sub:'Move the thing you hit',objective:'Push the plate down into its dock.',instruction:'This time the ball should keep going. Make the <b>SURFACE react ↓</b>.',ball:{x:115,y:320,vx:440,vy:0},surfaces:[{id:'A',x:570,y:225,w:85,h:170,push:300}],goals:[{type:'surface',id:'A',x:535,y:420,w:155,h:145}],preset:{A:['ball','l']}},
 {name:'TWO RULES',sub:'Program a path',objective:'Hit the final goal after two impacts.',instruction:'Configure both blue surfaces before launch. Hint: first <b>↗</b>, then <b>↘</b>.',ball:{x:90,y:410,vx:440,vy:0},surfaces:[{id:'A',x:360,y:295,w:42,h:220},{id:'B',x:525,y:145,w:235,h:35}],goals:[{type:'ball',x:790,y:350,w:135,h:150}],preset:{A:['ball','l'],B:['ball','u']}},
 {name:'CHAIN PUSH',sub:'Who + where, twice',objective:'Dock both movable blocks.',instruction:'The ball crosses both blocks. Give <b>A →</b> and <b>B ↑</b> to the surfaces.',ball:{x:80,y:390,vx:500,vy:0},surfaces:[{id:'A',x:330,y:345,w:58,h:90,push:250},{id:'B',x:600,y:345,w:58,h:90,push:250}],goals:[{type:'surface',id:'A',x:430,y:345,w:125,h:95},{type:'surface',id:'B',x:585,y:150,w:90,h:145}],preset:{A:['ball','l'],B:['ball','l']},allGoals:true},
 {name:'LIVE IMPACT',sub:'Decide at the collision',objective:'React in real time and hit the goal.',instruction:'Now the game freezes <b>at impact</b>. Choose BALL + ↗ and tap APPLY IMPACT.',ball:{x:105,y:440,vx:470,vy:0},surfaces:[{id:'A',x:470,y:285,w:48,h:240}],goals:[{type:'ball',x:735,y:90,w:170,h:120}],live:true,preset:{A:['ball','l']}},
 {name:'RETURN FIRE',sub:'Live defense',objective:'Redirect the incoming shot into the target.',instruction:'The red shot comes from the right. At impact choose <b>BALL + ↖</b>.',ball:{x:865,y:425,vx:-470,vy:0,enemy:true},surfaces:[{id:'A',x:510,y:285,w:42,h:240}],goals:[{type:'ball',x:80,y:90,w:170,h:130}],live:true,preset:{A:['ball','r']}},
 {name:'DOUBLE IMPACT',sub:'Two live decisions',objective:'Survive two impacts and reach the goal.',instruction:'First send the ball <b>↗</b>. At the ceiling send it <b>↘</b>.',ball:{x:85,y:420,vx:460,vy:0},surfaces:[{id:'A',x:355,y:290,w:42,h:225},{id:'B',x:515,y:145,w:235,h:34}],goals:[{type:'ball',x:800,y:350,w:130,h:150}],live:true,preset:{A:['ball','l'],B:['ball','u']}},
 {name:'IMPACT RUN',sub:'Hybrid finale',objective:'Move the gate AND finish the shot.',instruction:'Impact 1: make the <b>SURFACE go →</b>. Impact 2: send the <b>BALL ↗</b>. Impact 3: send the <b>BALL ↘</b>.',ball:{x:70,y:420,vx:500,vy:0},surfaces:[{id:'A',x:260,y:330,w:45,h:150,push:260},{id:'B',x:500,y:290,w:42,h:230},{id:'C',x:650,y:140,w:230,h:34}],goals:[{type:'surface',id:'A',x:340,y:330,w:115,h:155},{type:'ball',x:805,y:350,w:125,h:155}],live:true,allGoals:true,preset:{A:['ball','l'],B:['ball','l'],C:['ball','u']}}
];

function say(t){toast.textContent=t;toast.classList.add('show');clearTimeout(say.t);say.t=setTimeout(()=>toast.classList.remove('show'),1200)}
function pointerPos(e){const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
function text(t,x,y,size=20,align='center',col='#fff'){ctx.fillStyle=col;ctx.font=`900 ${size}px -apple-system,BlinkMacSystemFont,sans-serif`;ctx.textAlign=align;ctx.fillText(t,x,y)}
function rectDraw(o,fill,stroke='#fff',lw=3){ctx.fillStyle=fill;ctx.fillRect(o.x,o.y,o.w,o.h);ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.strokeRect(o.x,o.y,o.w,o.h)}
function circleDraw(o,fill,stroke='#fff'){ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke()}
function arrow(x,y,dir,len=48,col='#6ee7ff'){const d=DIRS[dir]||DIRS.r,ang=Math.atan2(d[1],d[0]);ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(len,0);ctx.stroke();ctx.beginPath();ctx.moveTo(len,0);ctx.lineTo(len-13,-9);ctx.lineTo(len-13,9);ctx.closePath();ctx.fill();ctx.restore()}
function insideRect(x,y,r){return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h}
function circleRect(c,r){const nx=clamp(c.x,r.x,r.x+r.w),ny=clamp(c.y,r.y,r.y+r.h);return Math.hypot(c.x-nx,c.y-ny)<=c.r}

function buildProgress(){const p=$('#progress');p.innerHTML='';for(let i=0;i<10;i++){const d=document.createElement('div');d.className='dot'+(i<level?' done':'')+(i===level?' current':'');p.appendChild(d)}}
function showMenu(){cancelAnimationFrame(raf);game.style.display='none';menu.style.display='block';impactFlash.classList.remove('show')}
function start(){menu.style.display='none';game.style.display='block';level=0;loadLevel()}
function loadLevel(){cancelAnimationFrame(raf);won=false;last=0;const L=levels[level];state={L,ball:{...L.ball,r:18},surfaces:L.surfaces.map(s=>({...s,vx:0,vy:0,cool:0,rule:{who:'ball',dir:'l'}})),selected:'A',launched:false,paused:false,pending:null,hitSet:new Set(),goalDone:new Set()};
 for(const s of state.surfaces){const p=L.preset&&L.preset[s.id];if(p)s.rule={who:p[0],dir:p[1]};}
 $('#levelName').textContent=`${level+1}/10 · ${L.name}`;$('#levelSub').textContent=L.sub;$('#objective').textContent=L.objective;$('#instructions').innerHTML=L.instruction;launchBtn.textContent=L.live?'▶ START':'▶ LAUNCH';launchBtn.disabled=false;launchBtn.style.display='block';applyBtn.style.display='none';impactFlash.classList.remove('show');buildProgress();selectSurface(state.selected);syncEditor();updateStatus();raf=requestAnimationFrame(loop)}
function complete(){if(won)return;won=true;say(level===9?'Hybrid test complete!':'Challenge complete!');setTimeout(()=>{if(level<9){level++;loadLevel()}else{showMenu();say('10/10 complete — what felt best?')}},850)}

function selectSurface(id){state.selected=id;syncEditor();updateStatus()}
function currentSurface(){return state.surfaces.find(s=>s.id===state.selected)}
function setWho(who){const s=currentSurface();if(!s)return;s.rule.who=who;syncEditor();updateStatus()}
function setDir(dir){const s=currentSurface();if(!s)return;s.rule.dir=dir;syncEditor();updateStatus()}
function syncEditor(){if(!state)return;const s=currentSurface();$$('[data-who]').forEach(b=>b.classList.toggle('active',s&&b.dataset.who===s.rule.who));$$('[data-dir]').forEach(b=>b.classList.toggle('active',s&&b.dataset.dir===s.rule.dir))}
function updateStatus(){if(!state)return;const s=currentSurface();$('#status').textContent=s?`${s.id}: ${s.rule.who==='ball'?'BALL':'SURFACE'} ${dirNames[s.rule.dir]}`:''}

function launch(){if(!state||state.launched)return;state.launched=true;launchBtn.disabled=true;if(state.L.ball.enemy) state.ball.vx=state.L.ball.vx; say(state.L.live?'Collision incoming…':'Rules armed')}
function reset(){loadLevel()}
function applyPending(){if(!state.paused||!state.pending)return;const s=state.surfaces.find(q=>q.id===state.pending.surfaceId);state.selected=s.id;applyImpact(s,state.pending.incoming);state.paused=false;state.pending=null;applyBtn.style.display='none';impactFlash.classList.remove('show');updateStatus()}

function beginImpact(s,incoming){state.selected=s.id;syncEditor();updateStatus();if(state.L.live){state.paused=true;state.pending={surfaceId:s.id,incoming:{...incoming}};state.ball.vx=0;state.ball.vy=0;impactFlash.classList.add('show');applyBtn.style.display='block';launchBtn.style.display='none'}else applyImpact(s,incoming)}
function applyImpact(s,incoming){const d=DIRS[s.rule.dir];const speed=Math.max(410,Math.hypot(incoming.vx,incoming.vy));if(s.rule.who==='ball'){
 state.ball.vx=d[0]*speed;state.ball.vy=d[1]*speed;
 nudgeBall(s,d);
}else{
 const ps=s.push||300;s.vx=d[0]*ps;s.vy=d[1]*ps;
 state.ball.vx=incoming.vx*.96;state.ball.vy=incoming.vy*.96;
 separateBallAfterSurfacePush(s,incoming);
}
s.cool=.16;state.hitSet.add(s.id)}
function nudgeBall(s,d){state.ball.x+=d[0]*8;state.ball.y+=d[1]*8}
function separateBallAfterSurfacePush(s,incoming){const b=state.ball;if(Math.abs(incoming.vx)>=Math.abs(incoming.vy)){b.x=incoming.vx>=0?s.x+s.w+b.r+5:s.x-b.r-5}else{b.y=incoming.vy>=0?s.y+s.h+b.r+5:s.y-b.r-5}}

function update(dt){if(!state||won||state.paused)return;for(const s of state.surfaces){if(s.cool>0)s.cool-=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=.992;s.vy*=.992}
 if(!state.launched)return;const b=state.ball;b.x+=b.vx*dt;b.y+=b.vy*dt;
 for(const s of state.surfaces){if(s.cool<=0&&circleRect(b,s)){const incoming={vx:b.vx,vy:b.vy};beginImpact(s,incoming);break}}
 checkGoals();
 if(b.x<-90||b.x>W+90||b.y<-110||b.y>H+110){if(!won){say('Missed — reset');setTimeout(()=>{if(state&&!won)loadLevel()},550)}}
}
function checkGoals(){const L=state.L;for(let i=0;i<L.goals.length;i++){const g=L.goals[i];if(g.type==='ball'){if(insideRect(state.ball.x,state.ball.y,g))state.goalDone.add(i)}else{const s=state.surfaces.find(q=>q.id===g.id);if(s){const cx=s.x+s.w/2,cy=s.y+s.h/2;if(insideRect(cx,cy,g))state.goalDone.add(i)}}}
 const needed=L.allGoals?L.goals.length:1;if(state.goalDone.size>=needed)complete()}

function draw(){ctx.clearRect(0,0,W,H);const grd=ctx.createLinearGradient(0,0,0,H);grd.addColorStop(0,'#071423');grd.addColorStop(1,'#09101a');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#12243a';ctx.lineWidth=1;for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 state.L.goals.forEach((g,i)=>{ctx.save();ctx.globalAlpha=.75;rectDraw(g,'rgba(114,255,167,.14)',state.goalDone.has(i)?'#72ffa7':'#4bbd7b',3);text(g.type==='ball'?'BALL GOAL':`${g.id} DOCK`,g.x+g.w/2,g.y+g.h/2+5,15,'center','#72ffa7');ctx.restore()});
 for(const s of state.surfaces){const sel=s.id===state.selected;rectDraw(s,sel?'#21455a':'#1b2d40',sel?'#6ee7ff':'#7090ac',sel?5:3);text(s.id,s.x+s.w/2,s.y+s.h/2+7,20,'center','#eaf6ff');const cx=s.x+s.w/2,cy=s.y-18;arrow(cx,cy,s.rule.dir,38,s.rule.who==='ball'?'#6ee7ff':'#ffd66e');text(s.rule.who==='ball'?'BALL':'SURFACE',cx,cy-22,10,'center',s.rule.who==='ball'?'#6ee7ff':'#ffd66e')}
 const b=state.ball;circleDraw(b,b.enemy?'#ff718d':'#f1f7ff',b.enemy?'#ffb2c0':'#6ee7ff');arrow(b.x,b.y-35,vectorToDir(b.vx,b.vy),28,b.enemy?'#ff718d':'#bdefff');
 if(!state.launched)text('TAP A SURFACE → SET WHO + WHERE → LAUNCH',W/2,565,15,'center','#6f859f');
}
function vectorToDir(vx,vy){if(Math.abs(vx)+Math.abs(vy)<2)return'r';const a=Math.atan2(vy,vx),oct=Math.round(a/(Math.PI/4));return ['r','dr','d','dl','l','ul','u','ur','r'][(oct+8)%8]||'r'}
function loop(ts){const dt=Math.min(.03,(ts-last)/1000||.016);last=ts;update(dt);draw();raf=requestAnimationFrame(loop)}

cv.addEventListener('pointerdown',e=>{e.preventDefault();if(!state||state.paused||state.launched)return;const p=pointerPos(e);for(const s of state.surfaces){if(insideRect(p.x,p.y,s)){selectSurface(s.id);say(`Surface ${s.id} selected`);break}}});
$$('[data-who]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();setWho(b.dataset.who)}));
$$('[data-dir]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();setDir(b.dataset.dir)}));
$('#start').onclick=start;$('#home').onclick=showMenu;$('#reset').onclick=reset;launchBtn.onclick=launch;applyBtn.onclick=applyPending;
})();
