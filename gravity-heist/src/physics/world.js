import{CFG}from'../config.js';
export const DIR={left:{x:-1,y:0},right:{x:1,y:0},up:{x:0,y:-1},down:{x:0,y:1}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class PhysicsWorld{
constructor(){this.gravity={x:0,y:CFG.gravity};this.target={x:0,y:CFG.gravity};this.bodies=[];this.solids=[]}
add(b){this.bodies.push({...b,vx:b.vx||0,vy:b.vy||0,r:b.r||16,restitution:b.restitution??.28,dynamic:b.dynamic!==false});return this.bodies.at(-1)}
setSolids(solids=[]){this.solids=solids.map(s=>({...s}))}
setGravity(dir){const v=DIR[dir];if(!v)return;this.target.x=v.x*CFG.gravity;this.target.y=v.y*CFG.gravity}
step(dt){const k=1-Math.exp(-CFG.gravityBlend*dt);this.gravity.x+=(this.target.x-this.gravity.x)*k;this.gravity.y+=(this.target.y-this.gravity.y)*k;const{w,h,pad}=CFG.world;for(const b of this.bodies){if(!b.dynamic)continue;b.vx+=this.gravity.x*dt;b.vy+=this.gravity.y*dt;const drag=Math.pow(.996,dt*60);b.vx*=drag;b.vy*=drag;b.x+=b.vx*dt;b.y+=b.vy*dt;this.bounds(b,w,h,pad);for(let pass=0;pass<2;pass++)for(const s of this.solids)this.resolveCircleRect(b,s);if(Math.abs(b.vx)<3)b.vx=0;if(Math.abs(b.vy)<3)b.vy=0}}
bounds(b,w,h,pad){if(b.x-b.r<pad){b.x=pad+b.r;b.vx=Math.abs(b.vx)*b.restitution}if(b.x+b.r>w-pad){b.x=w-pad-b.r;b.vx=-Math.abs(b.vx)*b.restitution}if(b.y-b.r<pad){b.y=pad+b.r;b.vy=Math.abs(b.vy)*b.restitution}if(b.y+b.r>h-pad){b.y=h-pad-b.r;b.vy=-Math.abs(b.vy)*b.restitution}}
resolveCircleRect(b,s){const nx=clamp(b.x,s.x,s.x+s.w),ny=clamp(b.y,s.y,s.y+s.h),dx=b.x-nx,dy=b.y-ny,d2=dx*dx+dy*dy;if(d2>=b.r*b.r)return false;let ax,ay,pen;if(d2>.0001){const d=Math.sqrt(d2);ax=dx/d;ay=dy/d;pen=b.r-d}else{const l=Math.abs(b.x-s.x),r=Math.abs(s.x+s.w-b.x),t=Math.abs(b.y-s.y),bt=Math.abs(s.y+s.h-b.y),m=Math.min(l,r,t,bt);if(m===l){ax=-1;ay=0;pen=b.r+l}else if(m===r){ax=1;ay=0;pen=b.r+r}else if(m===t){ax=0;ay=-1;pen=b.r+t}else{ax=0;ay=1;pen=b.r+bt}}b.x+=ax*pen;b.y+=ay*pen;const vn=b.vx*ax+b.vy*ay;if(vn<0){b.vx-=vn*(1+b.restitution)*ax;b.vy-=vn*(1+b.restitution)*ay}return true}}
