const WORLD_W=1000,WORLD_H=560;
const DEPTH={wall:42,spine:62,bridge:24,shelf:30,'vector-door':54,default:34};
const face=(out,a,b,c,d,n,shade)=>{for(const p of[a,b,c,a,c,d])out.push(p[0],p[1],p[2],n[0],n[1],n[2],shade)};
export function solidDepth(kind='default'){return DEPTH[kind]||DEPTH.default}
export function buildSceneGeometry(solids=[]){const out=[];for(const s of solids){if(!s||!Number.isFinite(s.x+s.y+s.w+s.h))continue;const z=solidDepth(s.kind),x0=s.x,x1=s.x+s.w,y0=s.y,y1=s.y+s.h;const a=[x0,y0,0],b=[x1,y0,0],c=[x1,y1,0],d=[x0,y1,0],A=[x0,y0,z],B=[x1,y0,z],C=[x1,y1,z],D=[x0,y1,z];face(out,A,B,C,D,[0,0,1],1);face(out,a,d,c,b,[0,0,-1],.42);face(out,a,A,D,d,[-1,0,0],.64);face(out,b,c,C,B,[1,0,0],.78);face(out,a,b,B,A,[0,-1,0],.72);face(out,d,D,C,c,[0,1,0],.52)}return new Float32Array(out)}
export function geometryStats(solids=[]){const data=buildSceneGeometry(solids);let maxZ=0;for(let i=2;i<data.length;i+=7)maxZ=Math.max(maxZ,data[i]);return{solids:solids.length,vertices:data.length/7,triangles:data.length/21,maxDepth:maxZ,finite:Array.from(data).every(Number.isFinite),world:[WORLD_W,WORLD_H]}}
export const GEOMETRY_STRIDE=7;
