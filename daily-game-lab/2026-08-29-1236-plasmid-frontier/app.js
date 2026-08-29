(() => {
'use strict';
const $=s=>document.querySelector(s), canvas=$('#c'), ctx=canvas.getContext('2d',{alpha:false}), stage=$('#stage');
const ui={pop:$('#pop'),gen:$('#gen'),score:$('#score'),best:$('#best'),phase:$('#phase'),div:$('#diversity'),fill:$('#adaptFill'),adapt:$('#adaptText'),hint:$('#hint'),toast:$('#toast')};
let W=1,H=1,dpr=1,last=0,acc=0,mode='feed',score=0,generation=1,drugA=0,drugB=0;
let best=Number(localStorage.getItem('pf-best')||0); ui.best.textContent=best;
const TAU=Math.PI*2,cells=[],food=[],particles=[];
const rng=(a=1,b=0)=>b+Math.random()*(a-b), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function resize(){const r=stage.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);W=Math.max(1,r.width);H=Math.max(1,r.height);canvas.width=Math.floor(W*dpr);canvas.height=Math.floor(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize,{passive:true}); resize();
function makeCell(x,y,parent){
 const g=parent?{a:clamp(parent.a+rng(.08,-.08),0,1),b:clamp(parent.b+rng(.08,-.08),0,1),m:clamp(parent.m+rng(.07,-.07),.15,1),t:clamp(parent.t+rng(.08,-.08),0,1),p:Math.random()<.12?1-parent.p:parent.p}:{a:rng(.22),b:rng(.22),m:rng(.75,.4),t:rng(.8,.2),p:Math.random()<.18?1:0};
 return {x,y,vx:rng(.3,-.3),vy:rng(.3,-.3),e:rng(.75,.52),age:0,g,ang:rng(TAU),pulse:rng(TAU),dead:false};
}
function spawnFood(x,y,q=1){food.push({x,y,q,r:rng(18,8),life:rng(20,10)})}
function seed(n=42){cells.length=0;food.length=0;for(let i=0;i<n;i++)cells.push(makeCell(rng(W*.85,W*.15),rng(H*.82,H*.14)));for(let i=0;i<25;i++)spawnFood(rng(W*.92,W*.08),rng(H*.88,H*.12),rng(1,.4))}
function burst(x,y,color,n=8){for(let i=0;i<n;i++)particles.push({x,y,vx:rng(1.6,-1.6),vy:rng(1.6,-1.6),life:rng(1,.35),color})}
function tone(freq=300,dur=.05,type='sine',vol=.035){try{const A=tone.ctx||(tone.ctx=new (window.AudioContext||window.webkitAudioContext)());if(A.state==='suspended')A.resume();const o=A.createOscillator(),g=A.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,A.currentTime);g.gain.exponentialRampToValueAtTime(.001,A.currentTime+dur);o.connect(g);g.connect(A.destination);o.start();o.stop(A.currentTime+dur)}catch{}}
function toast(title,text){ui.toast.querySelector('b').textContent=title;ui.toast.querySelector('span').textContent=text;ui.toast.classList.add('show');setTimeout(()=>ui.toast.classList.remove('show'),1250)}
function applyMode(x,y){
 if(mode==='feed'){for(let i=0;i<9;i++)spawnFood(x+rng(34,-34),y+rng(34,-34),rng(1,.55));score=Math.max(0,score-3);tone(420,.06);burst(x,y,'#7fffd4',14)}
 else if(mode==='a'){drugA=1;drugB*=.35;score+=4;tone(180,.12,'sawtooth');toast('DRUG A APPLIED','Low A-resistance cells are selected out.')}
 else if(mode==='b'){drugB=1;drugA*=.35;score+=4;tone(145,.12,'square');toast('DRUG B APPLIED','A different resistance pathway is now favored.')}
 else {drugA*=.12;drugB*=.12;for(let i=0;i<8;i++)spawnFood(rng(W*.9,W*.1),rng(H*.86,H*.14),.8);tone(520,.08,'triangle');toast('MEDIUM FLUSHED','Selection pressure drops; costly resistance may recede.')}
}
const d2=(a,b)=>{const x=a.x-b.x,y=a.y-b.y;return x*x+y*y};
function step(dt){
 drugA*=Math.pow(.997,dt*60); drugB*=Math.pow(.997,dt*60);
 for(const f of food){f.life-=dt;f.q-=dt*.018;if(f.life<0||f.q<=0)f.dead=true}
 for(let i=food.length-1;i>=0;i--)if(food[i].dead)food.splice(i,1);
 if(Math.random()<dt*.95&&food.length<45)spawnFood(rng(W*.94,W*.06),rng(H*.9,H*.1),rng(.8,.35));
 const newborn=[];
 for(const c of cells){
  c.age+=dt;c.pulse+=dt*4;c.ang+=rng(.18,-.18)*dt*8;
  const speed=.14+.48*c.g.m;c.vx+=Math.cos(c.ang)*speed*dt*2;c.vy+=Math.sin(c.ang)*speed*dt*2;c.vx*=.985;c.vy*=.985;c.x+=c.vx*dt*60;c.y+=c.vy*dt*60;
  if(c.x<10||c.x>W-10)c.vx*=-1;if(c.y<10||c.y>H-10)c.vy*=-1;c.x=clamp(c.x,8,W-8);c.y=clamp(c.y,8,H-8);
  let near=null,nd=1e9;for(const f of food){const d=d2(c,f);if(d<nd){nd=d;near=f}}
  if(near&&nd<1600){const d=Math.sqrt(nd)||1;c.vx+=(near.x-c.x)/d*.012;c.vy+=(near.y-c.y)/d*.012;if(d<8+near.r*.3){const bite=Math.min(near.q,.009+.013*c.g.m);near.q-=bite;c.e+=bite*.82}}
  const resistance=(1-drugA*(1-c.g.a)*1.7)*(1-drugB*(1-c.g.b)*1.7),stress=Math.max(0,1-resistance);
  const pCost=c.g.p ? .012 : 0, rCost=(c.g.a+c.g.b)*.006;c.e-=dt*(.012+.017*c.g.m+pCost+rCost+stress*.11);
  if(c.g.p&&Math.random()<dt*.18){for(const o of cells){if(o!==c&&!o.g.p&&d2(c,o)<225&&Math.random()<.08){o.g.p=1;o.g.a=clamp(Math.max(o.g.a,c.g.a*.8),0,1);o.g.b=clamp(Math.max(o.g.b,c.g.b*.8),0,1);burst(o.x,o.y,'#d78cff',5);break}}}
  if(c.e>1.13&&cells.length+newborn.length<180){c.e*=.52;newborn.push(makeCell(c.x+rng(10,-10),c.y+rng(10,-10),c.g));if(Math.random()<.35)burst(c.x,c.y,'#7fffd4',4)}
  if(c.e<=0||c.age>rng(42,27)){c.dead=true;burst(c.x,c.y,'#ff6f91',3)}
 }
 cells.push(...newborn);for(let i=cells.length-1;i>=0;i--)if(cells[i].dead)cells.splice(i,1);
 for(const p of particles){p.x+=p.vx*dt*60;p.y+=p.vy*dt*60;p.vx*=.96;p.vy*=.96;p.life-=dt}for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
 generation+=newborn.length*.018;score+=newborn.length*.12;
 if(cells.length===0){seed(36);drugA=drugB=0;score=Math.floor(score*.72);toast('POPULATION BOTTLENECK','A remnant population reseeded the dish.');tone(90,.28,'sawtooth',.05)}
 updateUI();
}
function updateUI(){
 let avA=0,avB=0;const types=new Set();for(const c of cells){avA+=c.g.a;avB+=c.g.b;types.add(`${Math.round(c.g.a*4)}${Math.round(c.g.b*4)}${c.g.p}`)}const n=Math.max(1,cells.length);avA/=n;avB/=n;
 const diversity=clamp(types.size/18,0,1),target=drugA>drugB?avA:avB;ui.pop.textContent=cells.length;ui.gen.textContent=Math.max(1,Math.floor(generation));ui.score.textContent=Math.floor(score);ui.div.textContent=`DIVERSITY ${Math.round(diversity*100)}%`;ui.fill.style.width=`${Math.round(target*100)}%`;ui.adapt.textContent=`${Math.round(target*100)}%`;
 if(Math.max(drugA,drugB)<.16){ui.phase.textContent='STABLE MEDIUM';ui.phase.style.color='#d9e9f3'}else if(drugA>drugB){ui.phase.textContent='DRUG A PRESSURE';ui.phase.style.color='#ffce6b'}else{ui.phase.textContent='DRUG B PRESSURE';ui.phase.style.color='#ff8fb1'}
 if(score>best){best=Math.floor(score);localStorage.setItem('pf-best',best);ui.best.textContent=best}
}
function draw(){
 const g=ctx.createRadialGradient(W*.5,H*.42,0,W*.5,H*.5,Math.max(W,H)*.7);g.addColorStop(0,'#10253a');g.addColorStop(1,'#03070c');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.save();ctx.globalCompositeOperation='lighter';
 if(drugA>.02){const a=ctx.createLinearGradient(0,0,W,H);a.addColorStop(0,`rgba(255,190,80,${drugA*.12})`);a.addColorStop(1,'transparent');ctx.fillStyle=a;ctx.fillRect(0,0,W,H)}
 if(drugB>.02){const b=ctx.createLinearGradient(W,0,0,H);b.addColorStop(0,`rgba(255,70,130,${drugB*.10})`);b.addColorStop(1,'transparent');ctx.fillStyle=b;ctx.fillRect(0,0,W,H)}
 for(const f of food){const r=Math.max(5,f.r*f.q),gr=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,r);gr.addColorStop(0,'rgba(120,255,200,.22)');gr.addColorStop(1,'rgba(70,170,255,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(f.x,f.y,r,0,TAU);ctx.fill()}
 for(const c of cells){const rr=4.3+c.g.t*2,red=Math.round(80+175*c.g.b),green=Math.round(120+110*c.g.m),blue=Math.round(125+130*c.g.a);ctx.shadowBlur=12;ctx.shadowColor=`rgba(${red},${green},${blue},.65)`;ctx.fillStyle=`rgb(${red},${green},${blue})`;ctx.beginPath();ctx.ellipse(c.x,c.y,rr*(1.25+.08*Math.sin(c.pulse)),rr,c.ang,0,TAU);ctx.fill();ctx.shadowBlur=0;if(c.g.p){ctx.strokeStyle='#dc9cff';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(c.x,c.y,rr+2,0,TAU);ctx.stroke()}}
 for(const p of particles){ctx.globalAlpha=clamp(p.life,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,2,0,TAU);ctx.fill()}ctx.globalAlpha=1;ctx.restore();
 ctx.strokeStyle='#29445c';ctx.lineWidth=1.4;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(1,1,W-2,H-2,22);else ctx.rect(1,1,W-2,H-2);ctx.stroke();
}
function loop(t){const dt=Math.min(.035,(t-last)/1000||.016);last=t;acc+=dt;while(acc>.016){step(.016);acc-=.016}draw();requestAnimationFrame(loop)}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();applyMode((e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height)});
document.querySelectorAll('.btn').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;document.querySelectorAll('.btn').forEach(x=>x.classList.toggle('active',x===b));ui.hint.textContent=mode==='feed'?'Tap the dish to place a nutrient bloom.':mode==='a'?'Tap anywhere to apply Drug A selection pressure.':mode==='b'?'Tap anywhere to apply Drug B selection pressure.':'Tap anywhere to flush the medium and reduce stress.';tone(300,.035,'sine',.02)}));
seed();updateUI();requestAnimationFrame(loop);if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();