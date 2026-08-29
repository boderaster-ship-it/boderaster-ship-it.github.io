(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const c=$('#world'),ctx=c.getContext('2d'),chart=$('#chart'),cx=chart.getContext('2d');
let W=0,H=0,D=1,ground=0,started=false,paused=false,speed=1,tool='rain',year=1,yearClock=0,nextId=1,nextLine=1,selected=null,toastTimer=0,ended=false;
const plants=[],seeds=[],rocks=[],history=[]; const NX=52,NY=38; let water=new Float32Array(NX*NY),nut=new Float32Array(NX*NY);
const G=['height','leaf','rootSpread','rootDepth','seedMass','shadeTol','efficiency','drought'];
const GN={height:'Height drive',leaf:'Leaf area',rootSpread:'Root spread',rootDepth:'Root depth',seedMass:'Seed mass',shadeTol:'Shade tolerance',efficiency:'Efficiency',drought:'Drought tolerance'};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),rnd=(a=1,b=0)=>b+Math.random()*(a-b); function gauss(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(6.283*v)}
function resize(){const r=c.getBoundingClientRect();D=Math.min(2,devicePixelRatio||1);W=r.width;H=r.height;ground=H*.36;c.width=W*D;c.height=H*D;ctx.setTransform(D,0,0,D,0,0);chart.width=Math.max(280,chart.clientWidth*D);chart.height=110*D;cx.setTransform(D,0,0,D,0,0)} addEventListener('resize',resize);
function sound(kind){try{const A=window._ac||(window._ac=new (AudioContext||webkitAudioContext)()),o=A.createOscillator(),g=A.createGain(),t=A.currentTime;o.connect(g);g.connect(A.destination);o.type='sine';o.frequency.value=kind==='seed'?520:kind==='year'?300:190;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.035,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.16);o.start();o.stop(t+.18)}catch(e){}}
function genes(base){const g={};G.forEach(k=>g[k]=clamp(base?base[k]+gauss()*.035:rnd(.72,.28),.05,.95));return g}
function initField(){water=new Float32Array(NX*NY);nut=new Float32Array(NX*NY);for(let y=0;y<NY;y++)for(let x=0;x<NX;x++){const i=y*NX+x;water[i]=clamp(.35+rnd(.22)+y/NY*.15);nut[i]=clamp(.28+rnd(.28)+(Math.sin(x*.53)+1)*.06)}}
function soilCell(x,y){const gx=clamp(Math.floor(x/W*NX),0,NX-1),gy=clamp(Math.floor((y-ground)/(H-ground)*NY),0,NY-1);return gy*NX+gx}
function makePlant(x,g=genes(),line=nextLine++,parent=0,generation=0){return{id:nextId++,line,parent,generation,x,y:ground,age:0,energy:34,biomass:1,stem:4,alive:true,g,leaves:[],roots:[{x,y:ground+2,a:Math.PI/2,len:2}],rootTips:[{x,y:ground+2,a:Math.PI/2}],seedClock:0,fitness:0,offspring:0}}
function founder(x){plants.push(makePlant(x))}
function reset(){plants.length=seeds.length=rocks.length=history.length=0;nextId=1;nextLine=1;year=1;yearClock=0;selected=null;ended=false;initField();for(let i=0;i<10;i++)founder((i+.5)*W/10+rnd(10,-10));updateUI()}
function lightAt(x,y,self){let shade=0;for(const p of plants){if(!p.alive||p===self)continue;for(const l of p.leaves){if(l.y<y&&Math.abs(l.x-x)<l.r*1.2)shade+=l.r*.018}}return Math.exp(-shade)}
function blocked(x,y){return rocks.some(r=>{const dx=x-r.x,dy=y-r.y;return dx*dx+dy*dy<r.r*r})}
function growPlant(p,dt){
  p.age+=dt; p.seedClock+=dt; if(!p.alive)return;
  let photo=0;
  for(const l of p.leaves){
    const L=lightAt(l.x,l.y,p);
    photo+=l.r*.022*(.3+.7*L)*(.55+.45*p.g.shadeTol);
  }
  let uptakeW=0,uptakeN=0;
  for(const t of p.rootTips){
    if(t.y<ground)continue;
    const i=soilCell(t.x,t.y);
    const w=Math.min(water[i],(.018+.035*p.g.efficiency)*dt);
    const n=Math.min(nut[i],(.012+.03*p.g.efficiency)*dt);
    water[i]-=w; nut[i]-=n; uptakeW+=w*22; uptakeN+=n*25;
  }
  const waterFactor=clamp(uptakeW*(.55+.65*p.g.drought));
  const mineralFactor=clamp(uptakeN);
  const gain=photo*Math.min(waterFactor,mineralFactor)*dt*5;
  const cost=(.12+p.stem*.0025+p.leaves.length*.012+p.roots.length*.006)*dt*(1.25-.45*p.g.efficiency);
  p.energy+=gain-cost; p.fitness+=Math.max(0,gain-cost)*.02;
  if(p.energy<0||p.age>80+rnd(12)){kill(p);return;}
  const growBudget=Math.max(0,p.energy-18);
  if(growBudget>1){
    const hNeed=p.g.height*.55;
    const rootNeed=(p.g.rootDepth+p.g.rootSpread)*.25;
    if(Math.random()<dt*(.45+hNeed)){
      p.stem+=dt*(1.5+3.2*p.g.height); p.energy-=.42*dt*(1+p.g.height);
      if(p.leaves.length<24&&Math.random()<dt*(.3+.55*p.g.leaf)){
        const side=(p.leaves.length%2?1:-1),ly=ground-p.stem*rnd(.95,.45);
        p.leaves.push({x:p.x+side*rnd(5+p.g.leaf*14,2),y:ly,r:2.8+p.g.leaf*6});
      }
    }
    if(Math.random()<dt*(.32+rootNeed)){
      const tip=p.rootTips[Math.floor(Math.random()*p.rootTips.length)];
      if(tip){
        const spread=(p.g.rootSpread-.5)*1.2,depth=.55+p.g.rootDepth*.8,ang=Math.atan2(depth,spread+gauss()*.7);
        const len=3+rnd(5),nx=tip.x+Math.cos(ang)*len,ny=tip.y+Math.sin(ang)*len;
        if(nx>2&&nx<W-2&&ny<H-2&&!blocked(nx,ny)){
          p.roots.push({x:tip.x,y:tip.y,x2:nx,y2:ny}); tip.x=nx; tip.y=ny;
          if(p.rootTips.length<10&&Math.random()<.07+p.g.rootSpread*.08)p.rootTips.push({x:nx,y:ny,a:ang+(Math.random()<.5?-1:1)*rnd(.8,.25)});
        }
      }
      p.energy-=.2*dt;
    }
  }
  if(plants.length<180&&p.age>10&&p.energy>52&&p.seedClock>4+rnd(4)){
    p.seedClock=0; const n=1+(p.g.seedMass<.45?1:0);
    for(let k=0;k<n;k++){
      const dispersal=(1-p.g.seedMass)*W*.18;
      seeds.push({x:clamp(p.x+gauss()*dispersal,4,W-4),y:ground-8,vx:gauss()*7,vy:-8-rnd(9),g:mutate(p.g),line:p.line,parent:p.id,generation:p.generation+1,life:0});
      p.energy-=9+13*p.g.seedMass; p.offspring++; sound('seed');
    }
  }
}
function mutate(g){const o={};G.forEach(k=>{let v=g[k]+gauss()*.035;if(Math.random()<.06)v+=gauss()*.12;o[k]=clamp(v,.03,.97)});return o}
function kill(p){p.alive=false;for(const t of p.rootTips){const i=soilCell(t.x,t.y);nut[i]=clamp(nut[i]+.18)}if(selected===p)selected=null}
function fieldStep(dt){for(let i=0;i<water.length;i++){water[i]=clamp(water[i]+.00016*dt);nut[i]=clamp(nut[i]+.00005*dt)}for(const s of seeds){s.life+=dt;s.vy+=18*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;if(s.y>=ground){s.y=ground;s.landed=true}}for(let i=seeds.length-1;i>=0;i--){const s=seeds[i];if(s.landed){if(!blocked(s.x,ground+4)&&Math.random()<.82){plants.push(makePlant(s.x,s.g,s.line,s.parent,s.generation))}seeds.splice(i,1)}else if(s.life>5)seeds.splice(i,1)}
for(let i=plants.length-1;i>=0;i--)if(!plants[i].alive&&plants[i].age>0){plants[i].decay=(plants[i].decay||0)+dt;if(plants[i].decay>4)plants.splice(i,1)}}
function yearTick(){year++;sound('year');const alive=plants.filter(p=>p.alive);history.push({year,pop:alive.length,height:avg('height'),leaf:avg('leaf'),root:avg('rootDepth'),div:diversity()});if(history.length>120)history.shift();if(year%8===0)rainNatural();if(year>=120&&!ended){ended=true;paused=true;const d=Math.round(diversity()*100),maxGen=Math.max(0,...alive.map(p=>p.generation));$('#endText').textContent=`${alive.length} Pflanzen überlebten. ${new Set(alive.map(p=>p.line)).size} Abstammungslinien existieren noch; die tiefste Linie erreichte Generation ${maxGen}. Genetische Diversität: ${d}%.`;$('#end').classList.remove('hidden')}}
function rainNatural(){for(let n=0;n<90;n++){const i=Math.floor(Math.random()*water.length);water[i]=clamp(water[i]+rnd(.18,.05))}}
function avg(k){const a=plants.filter(p=>p.alive);return a.length?a.reduce((s,p)=>s+p.g[k],0)/a.length:0}
function diversity(){const a=plants.filter(p=>p.alive);if(a.length<2)return 0;let v=0;for(const k of G){const m=a.reduce((s,p)=>s+p.g[k],0)/a.length;v+=Math.sqrt(a.reduce((s,p)=>s+(p.g[k]-m)**2,0)/a.length)}return clamp(v/G.length*4)}
function sim(dt){dt*=speed;yearClock+=dt;if(yearClock>=5){yearClock-=5;yearTick()}fieldStep(dt);for(const p of [...plants])growPlant(p,dt);if(plants.filter(p=>p.alive).length===0&&!ended){for(let i=0;i<4;i++)founder(rnd(W-30,30));toast('EXTINCTION — NEW COLONISTS ARRIVED')}updateUI()}
function draw(){ctx.clearRect(0,0,W,H);const sky=ctx.createLinearGradient(0,0,0,ground);sky.addColorStop(0,'#b8d7c4');sky.addColorStop(1,'#e7dfb7');ctx.fillStyle=sky;ctx.fillRect(0,0,W,ground);const soil=ctx.createLinearGradient(0,ground,0,H);soil.addColorStop(0,'#72533a');soil.addColorStop(1,'#2e251e');ctx.fillStyle=soil;ctx.fillRect(0,ground,W,H-ground);
for(let gy=0;gy<NY;gy+=2)for(let gx=0;gx<NX;gx+=2){const i=gy*NX+gx,x=(gx+.5)/NX*W,y=ground+(gy+.5)/NY*(H-ground);ctx.fillStyle=`rgba(101,190,205,${water[i]*.12})`;ctx.fillRect(x,y,4,4);ctx.fillStyle=`rgba(232,196,105,${nut[i]*.11})`;ctx.fillRect(x+2,y+2,3,3)}
ctx.strokeStyle='rgba(255,255,255,.09)';ctx.beginPath();ctx.moveTo(0,ground);ctx.lineTo(W,ground);ctx.stroke();
for(const r of rocks){ctx.fillStyle='#3c3a34';ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,6.283);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.08)';ctx.stroke()}
for(const p of plants){if(!p.alive)continue;const hue=82+p.g.shadeTol*38;ctx.strokeStyle=`hsl(${hue} 28% ${24+p.g.efficiency*12}%)`;ctx.lineWidth=1.1;ctx.beginPath();for(const r of p.roots){ctx.moveTo(r.x,r.y);ctx.lineTo(r.x2??r.x,r.y2??r.y)}ctx.stroke();ctx.strokeStyle=`hsl(${75+p.line%8*8} 38% 29%)`;ctx.lineWidth=1.5+p.g.height*1.7;ctx.beginPath();ctx.moveTo(p.x,ground);ctx.lineTo(p.x,ground-p.stem);ctx.stroke();for(const l of p.leaves){ctx.fillStyle=`hsla(${hue} 48% ${34+p.g.leaf*14}% / .88)`;ctx.beginPath();ctx.ellipse(l.x,l.y,l.r*1.3,l.r*.55,(l.x-p.x)*.03,0,6.283);ctx.fill()}ctx.fillStyle='#d8e6a0';ctx.beginPath();ctx.arc(p.x,ground-p.stem,1.7,0,6.283);ctx.fill();if(selected===p){ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(p.x,ground-p.stem*.55,12+p.g.leaf*8,0,6.283);ctx.stroke();ctx.setLineDash([])}}
for(const s of seeds){ctx.fillStyle='#e6d89a';ctx.beginPath();ctx.arc(s.x,s.y,2.2+s.g.seedMass*1.5,0,6.283);ctx.fill()} }
function updateUI(){const alive=plants.filter(p=>p.alive);$('#year').textContent=year;$('#pop').textContent=alive.length;$('#lines').textContent=new Set(alive.map(p=>p.line)).size;$('#waterMetric').textContent=Math.round(water.reduce((a,b)=>a+b,0)/water.length*100)+'%';$('#nutMetric').textContent=Math.round(nut.reduce((a,b)=>a+b,0)/nut.length*100)+'%';$('#divMetric').textContent=Math.round(diversity()*100)+'%';$('#oldMetric').textContent=alive.length?Math.min(...alive.map(p=>p.line)):'—';if($('#sheet').classList.contains('open')){renderPlant();renderPopulation()}}
function renderPlant(){const box=$('#plantTab');if(!selected||!selected.alive){box.innerHTML='<p class="muted">Tippe eine lebende Pflanze im Garten an.</p>';return}const p=selected;$('#sheetTitle').textContent=`Line ${p.line} · Plant ${p.id}`;box.innerHTML=G.map(k=>`<div class="geneRow"><span>${GN[k]}</span><div class="bar"><i style="width:${p.g[k]*100}%"></i></div><b>${Math.round(p.g[k]*100)}</b></div>`).join('')+`<div class="lineage">Generation <b>${p.generation}</b> · Age ${p.age.toFixed(1)}y · Energy ${Math.round(p.energy)} · Offspring ${p.offspring}<br>Parent ID: ${p.parent||'founder'} · Stem ${Math.round(p.stem)} px · Root segments ${p.roots.length}</div>`}
function renderPopulation(){const a=plants.filter(p=>p.alive),wrap=$('#traitBars');wrap.innerHTML=G.slice(0,6).map(k=>`<div class="traitMini"><span>${GN[k]}</span><div><i style="width:${avg(k)*100}%"></i></div><b>${Math.round(avg(k)*100)}</b></div>`).join('');const w=chart.clientWidth,h=110;cx.clearRect(0,0,w,h);cx.strokeStyle='rgba(255,255,255,.12)';cx.beginPath();for(let y=20;y<h;y+=22){cx.moveTo(0,y);cx.lineTo(w,y)}cx.stroke();if(history.length>1){const max=Math.max(10,...history.map(x=>x.pop));cx.strokeStyle='#d8f28c';cx.lineWidth=2;cx.beginPath();history.forEach((d,i)=>{const x=i/(history.length-1)*w,y=h-8-d.pop/max*(h-18);i?cx.lineTo(x,y):cx.moveTo(x,y)});cx.stroke()}cx.fillStyle='#9fab92';cx.font='9px system-ui';cx.fillText('population history',8,12)}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1400)}
function worldPos(e){const r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function applyTool(x,y){if(tool==='rain'){for(let gy=0;gy<NY;gy++)for(let gx=0;gx<NX;gx++){const px=(gx+.5)/NX*W,py=ground+(gy+.5)/NY*(H-ground),d=Math.hypot(px-x,py-y);if(d<55)water[gy*NX+gx]=clamp(water[gy*NX+gx]+(1-d/55)*.32)}toast('RAIN SOAKED INTO THE SOIL')}else if(tool==='nutrient'){if(y<ground)y=ground+8;for(let gy=0;gy<NY;gy++)for(let gx=0;gx<NX;gx++){const px=(gx+.5)/NX*W,py=ground+(gy+.5)/NY*(H-ground),d=Math.hypot(px-x,py-y);if(d<42)nut[gy*NX+gx]=clamp(nut[gy*NX+gx]+(1-d/42)*.45)}toast('MINERAL VEIN CREATED')}else if(tool==='rock'){if(y<ground+10)y=ground+18;rocks.push({x,y,r:rnd(18,11)});toast('ROOT BARRIER PLACED')}else if(tool==='seed'){const p=makePlant(clamp(x,8,W-8));plants.push(p);toast('NEW FOUNDER LINE DROPPED');sound('seed')}}
c.addEventListener('pointerdown',e=>{if(!started)return;const {x,y}=worldPos(e);if($('#sheet').classList.contains('open')&&!$('#plantTab').classList.contains('hidden')){selectAt(x,y);return;}applyTool(x,y)});
function selectAt(x,y){let best=null,bd=28;for(const p of plants){if(!p.alive)continue;const py=ground-p.stem*.55,d=Math.hypot(p.x-x,py-y);if(d<bd){bd=d;best=p}}if(best){selected=best;openSheet('plant');renderPlant()}}
c.addEventListener('dblclick',e=>{const{x,y}=worldPos(e);selectAt(x,y)});
$$('.tool').forEach(b=>b.addEventListener('click',()=>{$$('.tool').forEach(x=>x.classList.remove('active'));b.classList.add('active');tool=b.dataset.tool}));
$$('.speed').forEach(b=>b.addEventListener('click',()=>{$$('.speed').forEach(x=>x.classList.remove('on'));b.classList.add('on');speed=+b.dataset.speed}));
$('#pause').addEventListener('click',()=>{paused=!paused;$('#pause').textContent=paused?'▶':'Ⅱ'});$('#analysisBtn').addEventListener('click',()=>openSheet(selected?'plant':'population'));$('#closeSheet').addEventListener('click',()=>$('#sheet').classList.remove('open'));
$$('.tab').forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.tab)));function openSheet(tab){$('#sheet').classList.add('open');openTab(tab)}function openTab(tab){$$('.tab').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));['plant','population','soil'].forEach(k=>$('#'+k+'Tab').classList.toggle('hidden',k!==tab));if(tab==='population')renderPopulation();if(tab==='plant')renderPlant()}
$('#start').addEventListener('click',()=>{resize();reset();started=true;$('#intro').classList.add('hidden');toast('120-YEAR EXPERIMENT BEGINS')});$('#restart').addEventListener('click',()=>{resize();reset();paused=false;started=true;$('#end').classList.add('hidden');toast('NEW WORLD SEEDED')});
let last=performance.now(),acc=0;function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(started&&!paused&&!ended){acc+=dt;while(acc>.035){sim(.035);acc-=.035}}draw();requestAnimationFrame(loop)}resize();draw();requestAnimationFrame(loop);
})();
