import { LEVELS, DIR } from './levels.js';
const V=a=>({x:a[0],y:a[1],z:a[2]});
const add=(a,b,s=1)=>({x:a.x+b.x*s,y:a.y+b.y*s,z:a.z+b.z*s});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const len=a=>Math.hypot(a.x,a.y,a.z);
const norm=a=>{const l=len(a)||1;return{x:a.x/l,y:a.y/l,z:a.z/l}};
const dist=(a,b)=>len(sub(a,b));
const dir=k=>V(DIR[k]);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function sphereAABB(p,r,c,size){const h={x:size[0]/2,y:size[1]/2,z:size[2]/2};const q={x:clamp(p.x,c.x-h.x,c.x+h.x),y:clamp(p.y,c.y-h.y,c.y+h.y),z:clamp(p.z,c.z-h.z,c.z+h.z)};return dist(p,q)<r}
function sim(level, maxT=15){
 let core=V(level.launcher.pos), vel=add({x:0,y:0,z:0},norm(dir(level.launcher.dir)),level.launcher.speed), t=0;
 const surfaces=(level.surfaces||[]).map(s=>({cfg:s,pos:V(s.pos),rule:{...s.solution},cd:0,docking:false,docked:false}));
 const gates=(level.gates||[]).map(g=>({cfg:g,pos:V(g.pos),open:false}));
 const beacons=(level.beacons||[]).map(b=>({cfg:b,pos:V(b.pos),active:false}));
 const deps=new Set(); const events=[]; const dt=1/240;
 const openGates=()=>{for(const g of gates)if(!g.open&&g.cfg.deps.every(d=>deps.has(d))){g.open=true;events.push([t,'gate-open',g.cfg.id])}};
 for(let step=0;t<maxT;step++,t+=dt){
  core=add(core,vel,dt);
  for(const b of beacons){if(!b.active&&dist(core,b.pos)<b.cfg.r){b.active=true;deps.add(b.cfg.id);events.push([t,'relay',b.cfg.id]);openGates()}}
  for(const s of surfaces){
   if(s.cd>0)s.cd-=dt;
   if(s.docking&&!s.docked){const target=V(s.cfg.socket.pos),d=sub(target,s.pos),dlen=len(d),stepLen=Math.min(dlen,dt*18.0);s.pos=add(s.pos,norm(d),stepLen);if(dlen<.08){s.pos=target;s.docked=true;s.docking=false;deps.add(s.cfg.socket.id);events.push([t,'dock',s.cfg.id]);openGates()}}
  }
  for(const h of level.hazards||[])if(sphereAABB(core,.28,V(h.pos),h.size))return{ok:false,t,why:'hazard',events,core};
  for(const g of gates)if(!g.open&&sphereAABB(core,.29,g.pos,g.cfg.size))return{ok:false,t,why:`sealed-${g.cfg.id}`,events,core,gate:g.pos,size:g.cfg.size};
  for(const s of surfaces){if(s.cd>0)continue;if(!sphereAABB(core,.29,s.pos,s.cfg.size))continue;s.cd=.28;const d=dir(s.rule.dir),speed=Math.max(level.launcher.speed,len(vel));events.push([t,'impact',s.cfg.id,s.rule.receiver,s.rule.dir]);if(s.rule.receiver==='core'){
    vel=add({x:0,y:0,z:0},d,speed);
    const support=Math.abs(d.x)*s.cfg.size[0]/2+Math.abs(d.y)*s.cfg.size[1]/2+Math.abs(d.z)*s.cfg.size[2]/2;
    core=add(s.pos,d,support+.40);
   }else{
    if(s.cfg.socket)s.docking=true;
    core=add(core,norm(vel),.55);
   }
  }
  if(dist(core,V(level.goal.pos))<level.goal.r)return{ok:true,t,events,core};
  const pts=[level.launcher.pos,level.goal.pos,...(level.surfaces||[]).map(x=>x.pos),...(level.gates||[]).map(x=>x.pos),...(level.beacons||[]).map(x=>x.pos),...(level.sockets||[]).map(x=>x.pos)].map(V);const center=pts.reduce((a,p)=>add(a,p),{x:0,y:0,z:0});center.x/=pts.length;center.y/=pts.length;center.z/=pts.length;
  if(dist(core,center)>28||core.y<-7||core.y>12)return{ok:false,t,why:'left-chamber',events,core};
 }
 return{ok:false,t,why:'timeout',events,core};
}
let bad=0;
for(const l of LEVELS){const r=sim(l);console.log(`${String(l.id).padStart(2,'0')} ${l.name.padEnd(18)} ${r.ok?'PASS':'FAIL'} ${r.t.toFixed(2)}s ${r.why||''}`);if(!r.ok){bad++;console.log('  last events:',r.events.slice(-8));console.log('  core:',r.core,'gate:',r.gate,'size:',r.size)}}
if(bad){console.error(`\n${bad} level(s) failed.`);process.exit(1)}
console.log('\nAll authored solution routes pass runtime-equivalent simulation.');
