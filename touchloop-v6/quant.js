function renderTracks(){let el=$('tracks');$('trackCount').textContent=tracks.length+' '+(tracks.length===1?'Spur':'Spuren');if(!tracks.length){el.innerHTML='<div class="tracksEmpty">Noch keine Aufnahme</div>';return}el.innerHTML='';
 tracks.forEach(t=>{let d=document.createElement('div');d.className='track';let modeTxt=quantMode==='center'?'ZENTRIEREN':'1/'+quantDivision;let unitTxt=quantMode==='center'?' Klangbereiche':' Einsätze';let qtxt=t.processing?'Analyse läuft…':t.quantEnabled?(t.eventCount+unitTxt+' · '+modeTxt+' · '+Math.round(quantStrength*100)+'%'):'Originalaufnahme aktiv';
 d.innerHTML='<div class="trackTop"><div><div class="trackName">'+t.name+'</div><div class="trackMeta">'+(t.quantEnabled?'TIMING FIX AKTIV':'ORIGINAL')+'</div></div><button class="tiny '+(!t.muted?'playing':'')+'" data-act="mute">'+(t.muted?'▶':'Ⅱ')+'</button><button class="tiny del" data-act="del">×</button></div><div class="wave">'+waveform(activeBuffer(t))+'</div><div class="volRow"><span>LAUTST.</span><input class="range" data-act="vol" type="range" min="0" max="150" value="'+Math.round(t.volume*100)+'"><span>'+Math.round(t.volume*100)+'%</span></div><div class="qrow"><button class="qbtn '+(t.quantEnabled?'on':'')+'" data-act="quant">'+(t.quantEnabled?'TIMING FIX AN':'TIMING FIX AUS')+'</button><div class="qinfo">'+qtxt+'</div></div>'+(t.processing?'<div class="progress"><span style="width:'+Math.round(t.progress*100)+'%"></span></div><div class="progressText">'+Math.round(t.progress*100)+'%</div>':'');
 d.querySelector('[data-act=mute]').onclick=()=>{t.muted=!t.muted;if(t.gainNode)t.gainNode.gain.setTargetAtTime(t.muted?0:t.volume,ctx.currentTime,.01);renderTracks()};
 d.querySelector('[data-act=del]').onclick=()=>{stopTrackSource(t);tracks=tracks.filter(x=>x!==t);if(!tracks.length)stopAll();renderTracks();buttons()};
 let vr=d.querySelector('[data-act=vol]');vr.oninput=e=>{t.volume=+e.target.value/100;if(t.gainNode&&!t.muted)t.gainNode.gain.setTargetAtTime(t.volume,ctx.currentTime,.01);e.target.nextElementSibling.textContent=Math.round(t.volume*100)+'%'};
 d.querySelector('[data-act=quant]').onclick=()=>toggleQuant(t);el.appendChild(d)})}
async function toggleQuant(t){if(t.processing)return;if(t.quantEnabled){t.quantEnabled=false;restartOne(t);renderTracks();return}
 if(t.quantBuffer&&t.quantKey===qKey()){t.quantEnabled=true;restartOne(t);renderTracks();return}
 await processTrack(t);if(t.quantBuffer){t.quantEnabled=true;restartOne(t)}renderTracks()}
async function reprocessEnabled(){let enabled=tracks.filter(t=>t.quantEnabled);if(!enabled.length)return;for(let t of enabled){t.quantEnabled=false;await processTrack(t);if(t.quantBuffer)t.quantEnabled=true;restartOne(t)}renderTracks()}
function percentile(arr,p){if(!arr.length)return 0;let c=Array.from(arr).sort((a,b)=>a-b),i=Math.min(c.length-1,Math.floor((c.length-1)*p));return c[i]}
function nearestZero(a,pos,rad){let best=Math.max(0,Math.min(a.length-1,pos)),bv=Math.abs(a[best]);for(let i=Math.max(1,pos-rad);i<Math.min(a.length-1,pos+rad);i++){let v=Math.abs(a[i]);if(v<bv){bv=v;best=i}if(a[i]===0||a[i-1]*a[i]<=0)return i}return best}
async function detectOnsets(a,sr,t){let hop=Math.max(64,Math.round(sr*.008)),frames=Math.ceil(a.length/hop),env=new Float32Array(frames),hf=new Float32Array(frames);for(let f=0;f<frames;f++){let se=0,sh=0,st=f*hop,en=Math.min(a.length,st+hop),prev=st>0?a[st-1]:0;for(let i=st;i<en;i++){let v=a[i],d=v-prev;se+=v*v;sh+=d*d;prev=v}env[f]=Math.sqrt(se/Math.max(1,en-st));hf[f]=Math.sqrt(sh/Math.max(1,en-st));if((f&127)===0){t.progress=.06+.22*f/frames;renderTracks();await sleep(0)}}let sm=new Float32Array(frames),hm=new Float32Array(frames);for(let i=0;i<frames;i++){let se=0,sh=0,c=0;for(let j=-2;j<=2;j++){let k=i+j;if(k>=0&&k<frames){se+=env[k];sh+=hf[k];c++}}sm[i]=se/c;hm[i]=sh/c}
 let score=new Float32Array(frames);for(let i=4;i<frames;i++){let eb=(sm[i-1]+sm[i-2]+sm[i-3]+sm[i-4])/4,hb=(hm[i-1]+hm[i-2]+hm[i-3]+hm[i-4])/4;score[i]=Math.max(0,sm[i]-eb)+.32*Math.max(0,hm[i]-hb)}
 let floor=percentile(sm,.28),q78=percentile(score,.78),mx=0;for(let v of score)mx=Math.max(mx,v);let thr=Math.max(q78*.58,mx*.055,.0012),gridSec=(60/bpm)*(4/quantDivision),minGap=Math.round(Math.max(.045,gridSec*.22)*sr),raw=[];
 for(let i=3;i<frames-3;i++){let attack=score[i]>=thr&&score[i]>=score[i-1]&&score[i]>=score[i+1]&&sm[i]>Math.max(.0035,floor*1.55);let gate=sm[i]>Math.max(.006,floor*2.1)&&sm[i-1]<=Math.max(.005,floor*1.7);if(attack||gate)raw.push({p:i*hop,s:score[i]+(gate?.02:0)})}
 raw.sort((x,y)=>x.p-y.p);let cand=[];for(let c of raw){if(!cand.length||c.p-cand[cand.length-1].p>=minGap)cand.push(c);else if(c.s>cand[cand.length-1].s)cand[cand.length-1]=c}
 if(cand.length<2){let gate=Math.max(.006,floor*1.9);for(let i=2;i<frames-2;i++){if(sm[i]>gate&&sm[i]>sm[i-1]*1.08&&sm[i]>=sm[i+1]){let p=i*hop;if(!cand.some(c=>Math.abs(c.p-p)<minGap))cand.push({p,s:score[i]})}}cand.sort((x,y)=>x.p-y.p)}
 t.progress=.43;renderTracks();await sleep(0);return cand.slice(0,512).map(x=>x.p)}
async function quantizeSlices(a,sr,onsets,t){let out=new Float32Array(a.length);if(!onsets.length)return new Float32Array(a);let grid=sr*(60/bpm)*(4/quantDivision),fade=Math.max(16,Math.round(sr*.006)),pre=Math.round(sr*.010),starts=onsets.map(p=>Math.max(0,p-pre));starts[0]=Math.min(starts[0],onsets[0]);if(starts[0]>0)out.set(a.subarray(0,starts[0]),0);
 for(let e=0;e<onsets.length;e++){let onset=onsets[e],st=starts[e],en=e+1<onsets.length?starts[e+1]:a.length,target=Math.round(onset/grid)*grid,shift=Math.round((target-onset)*quantStrength),dst=st+shift,len=en-st;if(len<=0)continue;let zst=nearestZero(a,st,Math.round(sr*.003)),adjust=zst-st;st=zst;dst+=adjust;len=en-st;
  for(let j=0;j<len;j++){let si=st+j,di=dst+j;if(di<0||di>=out.length||si>=a.length)continue;let w=1;if(j<fade)w=j/fade;else if(len-j<fade)w=(len-j)/fade;out[di]+=a[si]*Math.max(0,Math.min(1,w))}
  if((e&7)===0){t.progress=.48+.45*(e+1)/onsets.length;renderTracks();await sleep(0)}
 }
 let pk=0;for(let v of out)pk=Math.max(pk,Math.abs(v));if(pk>.98){let sc=.98/pk;for(let i=0;i<out.length;i++)out[i]*=sc}return out}

async function centerByBeat(a,sr,t){
 let out=new Float32Array(a.length),bs=Math.round(beatDur()*sr),total=Math.ceil(a.length/bs),regions=0;
 let globalHop=Math.max(64,Math.round(sr*.006)),allEnv=[];
 for(let st=0;st<a.length;st+=globalHop){let en=Math.min(a.length,st+globalHop),ss=0;for(let i=st;i<en;i++)ss+=a[i]*a[i];allEnv.push(Math.sqrt(ss/Math.max(1,en-st)))}
 let globalFloor=percentile(allEnv,.22);
 for(let b=0;b<total;b++){
  let beatSt=b*bs,beatEn=Math.min(a.length,beatSt+bs),hop=Math.max(48,Math.round(sr*.005)),frames=Math.max(1,Math.ceil((beatEn-beatSt)/hop)),env=new Float32Array(frames);
  for(let f=0;f<frames;f++){let st=beatSt+f*hop,en=Math.min(beatEn,st+hop),ss=0;for(let i=st;i<en;i++)ss+=a[i]*a[i];env[f]=Math.sqrt(ss/Math.max(1,en-st))}
  let localFloor=percentile(env,.22),peak=0;for(let v of env)if(v>peak)peak=v;
  let gate=Math.max(.0025,globalFloor*1.9,localFloor*2.0,peak*.085);
  let active=new Uint8Array(frames);
  for(let f=0;f<frames;f++)if(env[f]>=gate)active[f]=1;
  let maxGap=Math.max(1,Math.round(.045*sr/hop));
  let last=-9999;for(let f=0;f<frames;f++){if(active[f]){if(f-last<=maxGap+1)for(let k=last+1;k<f;k++)if(k>=0)active[k]=1;last=f}}
  let first=-1,end=-1;for(let f=0;f<frames;f++){if(active[f]){if(first<0)first=f;end=f}}
  if(first<0||end<first||peak<.003){t.progress=.46+.45*(b+1)/total;renderTracks();if((b&1)===0)await sleep(0);continue}
  let pre=Math.round(sr*.014),post=Math.round(sr*.018),st=Math.max(beatSt,beatSt+first*hop-pre),en=Math.min(beatEn,beatSt+(end+1)*hop+post);
  if(en-st<Math.round(sr*.035)){t.progress=.46+.45*(b+1)/total;renderTracks();if((b&1)===0)await sleep(0);continue}
  st=nearestZero(a,st,Math.round(sr*.003));en=nearestZero(a,en,Math.round(sr*.003));if(en<=st)continue;
  let srcCenter=(st+en)/2,targetCenter=(beatSt+beatEn)/2,shift=Math.round((targetCenter-srcCenter)*quantStrength);
  let dst=st+shift,len=en-st;
  if(dst<beatSt)dst=beatSt;
  if(dst+len>beatEn)dst=beatEn-len;
  let fade=Math.max(16,Math.round(sr*.006));
  for(let j=0;j<len;j++){let si=st+j,di=dst+j;if(di<beatSt||di>=beatEn||si>=a.length)continue;let w=1;if(j<fade)w=j/fade;else if(len-j<fade)w=(len-j)/fade;out[di]+=a[si]*Math.max(0,Math.min(1,w))}
  regions++;
  t.progress=.46+.45*(b+1)/total;renderTracks();if((b&1)===0)await sleep(0)
 }
 let pk=0;for(let v of out)pk=Math.max(pk,Math.abs(v));if(pk>.98){let sc=.98/pk;for(let i=0;i<out.length;i++)out[i]*=sc}
 return {audio:out,count:regions}
}

async function processTrack(t){t.processing=true;t.progress=.02;renderTracks();await sleep(20);let a=t.originalBuffer.getChannelData(0),sr=t.originalBuffer.sampleRate,q,count=0;if(quantMode==='center'){t.progress=.18;renderTracks();await sleep(0);let r=await centerByBeat(a,sr,t);q=r.audio;count=r.count}else{let on=t.analysisOnsets;if(!on){on=await detectOnsets(a,sr,t);t.analysisOnsets=on}else{t.progress=.46;renderTracks();await sleep(0)}q=await quantizeSlices(a,sr,on,t);count=on.length}let b=ctx.createBuffer(1,q.length,sr);b.copyToChannel(q,0);t.quantBuffer=b;t.quantKey=qKey();t.eventCount=count;t.progress=1;renderTracks();await sleep(100);t.processing=false;renderTracks();toast(t.name+': '+(quantMode==='center'?count+' Klangbereiche zentriert':count+' Einsätze korrigiert'))}
