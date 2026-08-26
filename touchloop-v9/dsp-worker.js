function percentile(arr,p){if(!arr.length)return 0;const c=Array.from(arr).sort((a,b)=>a-b),i=Math.min(c.length-1,Math.floor((c.length-1)*p));return c[i]}
function nearestZero(a,pos,rad){let best=Math.max(0,Math.min(a.length-1,pos)),bv=Math.abs(a[best]);for(let i=Math.max(1,pos-rad);i<Math.min(a.length-1,pos+rad);i++){const v=Math.abs(a[i]);if(v<bv){bv=v;best=i}if(a[i]===0||a[i-1]*a[i]<=0)return i}return best}
function progress(id,v){postMessage({type:'progress',id,value:v})}
function detectRegions(a,sr,id){
  const hop=Math.max(48,Math.round(sr*.005)),frames=Math.ceil(a.length/hop),env=new Float32Array(frames);
  for(let f=0;f<frames;f++){
    const st=f*hop,en=Math.min(a.length,st+hop);let ss=0;
    for(let i=st;i<en;i++)ss+=a[i]*a[i];
    env[f]=Math.sqrt(ss/Math.max(1,en-st));
    if((f&127)===0)progress(id,.05+.35*f/Math.max(1,frames));
  }
  const sm=new Float32Array(frames);
  for(let f=0;f<frames;f++){let s=0,c=0;for(let j=-2;j<=2;j++){const k=f+j;if(k>=0&&k<frames){s+=env[k];c++}}sm[f]=s/Math.max(1,c)}
  const floor=percentile(sm,.20),p82=percentile(sm,.82);let peak=0;for(const v of sm)if(v>peak)peak=v;
  const gate=Math.max(.0022,floor*2.05,p82*.14,peak*.042),active=new Uint8Array(frames);
  for(let f=0;f<frames;f++)if(sm[f]>=gate)active[f]=1;
  const bridge=Math.max(1,Math.round(.095*sr/hop));let last=-99999;
  for(let f=0;f<frames;f++)if(active[f]){if(f-last<=bridge+1)for(let k=last+1;k<f;k++)if(k>=0)active[k]=1;last=f}
  const raw=[];let f=0;const minFrames=Math.max(1,Math.round(.035*sr/hop));
  while(f<frames){while(f<frames&&!active[f])f++;if(f>=frames)break;const a0=f;while(f<frames&&active[f])f++;const a1=f-1;if(a1-a0+1>=minFrames)raw.push([a0,a1])}
  const pre=Math.round(sr*.014),post=Math.round(sr*.020),regions=[];
  for(const r of raw){let st=Math.max(0,r[0]*hop-pre),en=Math.min(a.length,(r[1]+1)*hop+post);st=nearestZero(a,st,Math.round(sr*.003));en=nearestZero(a,en,Math.round(sr*.003));if(en>st)regions.push({st,en})}
  const merged=[],mergeGap=Math.round(sr*.055);
  for(const r of regions){const prev=merged[merged.length-1];if(prev&&r.st-prev.en<=mergeGap)prev.en=r.en;else merged.push({st:r.st,en:r.en})}
  progress(id,.48);return merged;
}
function circularAdd(out,a,st,en,dst,sr){
  const len=en-st,fade=Math.max(8,Math.round(sr*.0035)),N=out.length;
  for(let j=0;j<len;j++){const di=((dst+j)%N+N)%N;let w=1;if(j<fade)w=j/fade;else if(len-j<fade)w=(len-j)/fade;out[di]+=a[st+j]*Math.max(0,Math.min(1,w))}
}
function normalize(out){let pk=0;for(const v of out)pk=Math.max(pk,Math.abs(v));if(pk>.98){const sc=.98/pk;for(let i=0;i<out.length;i++)out[i]*=sc}}
function render(a,sr,bpm,mode,strength,regions,id){
  const out=new Float32Array(a.length),beat=sr*60/bpm;
  for(let i=0;i<regions.length;i++){
    const r=regions[i],srcCenter=(r.st+r.en)/2;let target;
    if(mode==='center') target=(Math.floor(srcCenter/beat)+.5)*beat;
    else {const div=mode==='q4'?4:mode==='q8'?8:16,grid=sr*(60/bpm)*(4/div);target=Math.round(r.st/grid)*grid;}
    const anchor=mode==='center'?srcCenter:r.st,shift=Math.round((target-anchor)*strength);
    circularAdd(out,a,r.st,r.en,r.st+shift,sr);
    if((i&7)===0)progress(id,.50+.46*(i+1)/Math.max(1,regions.length));
  }
  normalize(out);return out;
}
onmessage=(e)=>{
  const m=e.data||{};if(m.type!=='process')return;
  try{
    const a=new Float32Array(m.samples),sr=m.sampleRate;
    const regions=m.regions&&m.regions.length?m.regions:detectRegions(a,sr,m.id);
    const out=render(a,sr,m.bpm,m.mode,m.strength,regions,m.id);
    postMessage({type:'done',id:m.id,audio:out.buffer,regions,eventCount:regions.length},[out.buffer]);
  }catch(err){postMessage({type:'error',id:m.id,message:String(err&&err.message||err)})}
};
