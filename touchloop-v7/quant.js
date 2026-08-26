function percentile(arr,p){if(!arr.length)return 0;let c=Array.from(arr).sort((a,b)=>a-b),i=Math.min(c.length-1,Math.floor((c.length-1)*p));return c[i]}
function nearestZero(a,pos,rad){let best=Math.max(0,Math.min(a.length-1,pos)),bv=Math.abs(a[best]);for(let i=Math.max(1,pos-rad);i<Math.min(a.length-1,pos+rad);i++){let v=Math.abs(a[i]);if(v<bv){bv=v;best=i}if(a[i]===0||a[i-1]*a[i]<=0)return i}return best}
function normalizeProcessed(out){let pk=0;for(let v of out)pk=Math.max(pk,Math.abs(v));if(pk>.98){let sc=.98/pk;for(let i=0;i<out.length;i++)out[i]*=sc}}
function trackKey(t){return t.mode+'@'+t.strength.toFixed(3)}
async function ensureRegions(t){
 if(t.analysisDone&&t.regions)return t.regions;
 t.processing=true;t.progress=.02;renderTracks();await sleep(15);
 let a=t.originalBuffer.getChannelData(0),sr=t.originalBuffer.sampleRate,hop=Math.max(48,Math.round(sr*.005)),frames=Math.ceil(a.length/hop),env=new Float32Array(frames);
 for(let f=0;f<frames;f++){
  let st=f*hop,en=Math.min(a.length,st+hop),ss=0;for(let i=st;i<en;i++)ss+=a[i]*a[i];env[f]=Math.sqrt(ss/Math.max(1,en-st));
  if((f&127)===0){t.progress=.05+.38*f/frames;renderTracks();await sleep(0)}
 }
 let sm=new Float32Array(frames);
 for(let f=0;f<frames;f++){let sum=0,c=0;for(let j=-2;j<=2;j++){let k=f+j;if(k>=0&&k<frames){sum+=env[k];c++}}sm[f]=sum/c}
 let floor=percentile(sm,.20),p82=percentile(sm,.82),peak=0;for(let v of sm)if(v>peak)peak=v;
 let gate=Math.max(.0022,floor*2.05,p82*.14,peak*.042),active=new Uint8Array(frames);
 for(let f=0;f<frames;f++)if(sm[f]>=gate)active[f]=1;
 let bridgeFrames=Math.max(1,Math.round(.095*sr/hop)),last=-99999;
 for(let f=0;f<frames;f++)if(active[f]){if(f-last<=bridgeFrames+1)for(let k=last+1;k<f;k++)if(k>=0)active[k]=1;last=f}
 let raw=[],f=0,minFrames=Math.max(1,Math.round(.035*sr/hop));
 while(f<frames){while(f<frames&&!active[f])f++;if(f>=frames)break;let a0=f;while(f<frames&&active[f])f++;let a1=f-1;if(a1-a0+1>=minFrames)raw.push([a0,a1])}
 let pre=Math.round(sr*.014),post=Math.round(sr*.020),regions=[];
 for(let r of raw){let st=Math.max(0,r[0]*hop-pre),en=Math.min(a.length,(r[1]+1)*hop+post);st=nearestZero(a,st,Math.round(sr*.003));en=nearestZero(a,en,Math.round(sr*.003));if(en>st)regions.push({st,en})}
 let merged=[],mergeGap=Math.round(sr*.055);
 for(let r of regions){let p=merged[merged.length-1];if(p&&r.st-p.en<=mergeGap)p.en=r.en;else merged.push({st:r.st,en:r.en})}
 t.regions=merged;t.analysisDone=true;t.eventCount=merged.length;t.progress=.50;renderTracks();await sleep(0);return merged
}
function circularAdd(out,a,st,en,dst,sr){
 let len=en-st,fade=Math.max(8,Math.round(sr*.0035)),N=out.length;
 for(let j=0;j<len;j++){let di=((dst+j)%N+N)%N,w=1;if(j<fade)w=j/fade;else if(len-j<fade)w=(len-j)/fade;out[di]+=a[st+j]*Math.max(0,Math.min(1,w))}
}
function nearestGridTarget(sample,mode,sr){let div=mode==='q4'?4:mode==='q8'?8:16,grid=sr*(60/bpm)*(4/div);return Math.round(sample/grid)*grid}
function targetBeatForRegion(st,en,bs,totalBeats){let center=(st+en)/2,b=Math.floor(center/bs);return Math.max(0,Math.min(totalBeats-1,b))}
async function buildProcessed(t){
 if(t.mode==='original'){t.processedBuffer=null;t.processedKey=null;restartOne(t);renderTracks();return}
 let regions=await ensureRegions(t),key=trackKey(t),a=t.originalBuffer.getChannelData(0),sr=t.originalBuffer.sampleRate,out=new Float32Array(a.length),bs=Math.round(beatDur()*sr),totalBeats=Math.max(1,Math.round(a.length/bs));
 for(let i=0;i<regions.length;i++){
  let r=regions[i],srcCenter=(r.st+r.en)/2,target,shift;
  if(t.mode==='center'){let beat=targetBeatForRegion(r.st,r.en,bs,totalBeats);target=(beat+.5)*bs;shift=Math.round((target-srcCenter)*t.strength)}
  else{target=nearestGridTarget(r.st,t.mode,sr);shift=Math.round((target-r.st)*t.strength)}
  circularAdd(out,a,r.st,r.en,r.st+shift,sr);
  if(t.processing&&(i&7)===0){t.progress=.52+.43*(i+1)/Math.max(1,regions.length);renderTracks();await sleep(0)}
 }
 normalizeProcessed(out);let b=ctx.createBuffer(1,out.length,sr);b.copyToChannel(out,0);t.processedBuffer=b;t.processedKey=key;t.progress=1;
 if(t.processing){renderTracks();await sleep(80);t.processing=false}
 restartOne(t);renderTracks()
}
async function setTrackMode(t,mode){
 if(t.processing)return;t.mode=mode;
 if(mode==='original'){t.processedBuffer=null;t.processedKey=null;restartOne(t);renderTracks();return}
 t.processing=!t.analysisDone;t.progress=t.analysisDone?1:.02;renderTracks();await buildProcessed(t);toast(t.name+': '+modeLabel(t.mode)+' · '+Math.round(t.strength*100)+'%')
}
function scheduleStrength(t,value){t.strength=value;if(t.debounce)clearTimeout(t.debounce);renderTracks();if(t.mode==='original')return;t.debounce=setTimeout(async()=>{if(t.processing)return;await buildProcessed(t)},180)}
function modeLabel(mode){return mode==='original'?'Original':mode==='q4'?'1/4':mode==='q8'?'1/8':mode==='q16'?'1/16':'Zentrieren'}
