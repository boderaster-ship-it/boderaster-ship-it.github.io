'use strict';
const $=id=>document.getElementById(id);
const S={
  bpm:100,bars:4,countIn:true,clean:true,phones:false,recTarget:0,
  ctx:null,master:null,compressor:null,playbackGain:null,playbackSource:null,arrangement:null,
  tracks:[],trackSeq:1,transportStart:0,running:false,rebuildToken:0,
  micStream:null,micSource:null,analyser:null,recNode:null,silent:null,recSession:null,
  armed:false,recording:false,meter:0,lastBeat:-1,micPermissionReady:false,
  worker:null,workerJobs:new Map(),processSeq:1
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const beatDur=()=>60/S.bpm;
const sectionDur=()=>S.bars*4*beatDur();
const stageCount=()=>Math.max(1,...S.tracks.map(t=>t.stage+1));
const totalDur=()=>sectionDur()*stageCount();
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),1900)}
function setState(cls,text){$('state').className=cls||'';$('stateT').textContent=text}
function micBadge(on){$('badge').className='badge '+(on?'live':'ready');$('badge').textContent=on?'MIC AKTIV':'MIC AUS'}
function fmt(sec){const m=Math.floor(sec/60),s=Math.floor(sec%60),d=Math.floor((sec%1)*10);return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+d}
function modeLabel(m){return m==='original'?'Original':m==='q4'?'1/4':m==='q8'?'1/8':m==='q16'?'1/16':'Zentrieren'}
function activeBuffer(t){return t.mode==='original'||!t.processed?t.original:t.processed}
function currentPhase(at){if(!S.running)return 0;const now=at==null?S.ctx.currentTime:at,d=totalDur();let p=(now-S.transportStart)%d;return p<0?p+d:p}
function currentStage(at){return Math.min(stageCount()-1,Math.floor(currentPhase(at)/sectionDur()))}
function buttons(){const has=S.tracks.length>0,busy=S.armed||S.recording;$('rec').disabled=has||busy;$('newTrack').disabled=!has||busy;$('play').disabled=!has||busy;$('clear').disabled=!has&&!busy;$('save').disabled=!has;$('playT').textContent=S.running?'STOP':'PLAY';$('playI').textContent=S.running?'■':'▶'}
function renderBars(){const el=$('barsSeg');el.innerHTML='';[1,2,4,8].forEach(n=>{const b=document.createElement('button');b.textContent=n;b.className=n===S.bars?'on':'';b.onclick=()=>{if(S.tracks.length)return toast('Takte nur vor der ersten Aufnahme ändern');S.bars=n;$('barsV').textContent=n;renderBars();renderBeatGrid();renderSequence()};el.appendChild(b)})}
function renderBeatGrid(){const el=$('beats');el.innerHTML='';for(let r=0;r<S.bars;r++){const row=document.createElement('div');row.className='bar';row.innerHTML='<div class="barN">'+(r+1)+'</div>';for(let j=0;j<4;j++){const c=document.createElement('div');c.className='beat';row.appendChild(c)}el.appendChild(row)}}
function stageTrackCount(stage){return S.tracks.filter(t=>t.stage===stage).length}
function canSelectTarget(stage){const sc=stageCount();if(stage<sc)return true;return stage===sc&&stage<3}
function updateSequenceActive(){const st=S.running?currentStage():-1;document.querySelectorAll('.seqSlot').forEach((x,i)=>x.classList.toggle('active',i===st))}
function renderSequence(){
  const sc=stageCount(),el=$('sequenceStrip');el.innerHTML='';
  for(let i=0;i<3;i++){
    const count=stageTrackCount(i),enabled=canSelectTarget(i),slot=document.createElement('button');slot.className='seqSlot '+(S.recTarget===i?'selected ':'')+(S.running&&currentStage()===i?'active ':'')+(enabled?'':'disabled');slot.disabled=!enabled;
    const label=count?count+' Spur'+(count===1?'':'en'):(i<sc?'leer':'neue Ebene');
    slot.innerHTML='<span class="seqNum">'+(i+1)+'</span><b>EBENE '+(i+1)+'</b><span>'+label+(S.recTarget===i?' · REC-ZIEL':'')+'</span>';
    slot.onclick=()=>{S.recTarget=i;renderSequence();toast('Aufnahmeziel: Ebene '+(i+1))};el.appendChild(slot)
  }
  $('sequenceTitle').textContent=sc+' Ebene'+(sc===1?'':'n')+' · '+(S.bars*sc)+' Takte';
  $('sequenceDuration').textContent='Gesamtlänge '+fmt(totalDur())
}
function waveform(buf){const a=buf.getChannelData(0),n=48,step=Math.max(1,Math.floor(a.length/n));let s='';for(let k=0;k<n;k++){let p=0,end=Math.min(a.length,(k+1)*step);for(let i=k*step;i<end;i++)p=Math.max(p,Math.abs(a[i]));s+='<i style="height:'+Math.max(3,Math.round(p*27))+'px"></i>'}return s}
function trackModeHtml(t){return ['original','q4','q8','q16','center'].map(m=>'<button class="modeBtn '+(m==='original'?'original ':'')+(t.mode===m?'on':'')+'" data-mode="'+m+'">'+modeLabel(m).toUpperCase()+'</button>').join('')}
function canMoveNext(t){if(t.stage>=2)return false;const same=stageTrackCount(t.stage);if(same<=1)return false;return t.stage<stageCount()}
function canMovePrev(t){return t.stage>0}
function renderTracks(){
  $('trackCount').textContent=S.tracks.length+' '+(S.tracks.length===1?'Spur':'Spuren');const root=$('tracks');root.innerHTML='';if(!S.tracks.length){root.innerHTML='<div class="tracksEmpty">Noch keine Aufnahme</div>';renderSequence();return}
  for(let stage=0;stage<stageCount();stage++){
    const group=document.createElement('div');group.className='stageGroup';const list=S.tracks.filter(t=>t.stage===stage);group.innerHTML='<div class="stageHead"><b>EBENE '+(stage+1)+'</b><span>'+list.length+' Spur'+(list.length===1?'':'en')+' · '+S.bars+' Takte</span></div>';
    list.forEach((t,idx)=>{
      const d=document.createElement('div');d.className='track';const status=t.processing?'Analyse / Timing läuft…':(t.mode==='original'?'Originalaufnahme':modeLabel(t.mode)+' · '+Math.round(t.strength*100)+'% · '+(t.eventCount||0)+' Klangblöcke');
      d.innerHTML='<div class="trackTop"><div><div class="trackName">'+t.name+'</div><div class="trackMeta">EBENE '+(t.stage+1)+' · '+status+'</div></div><button class="tiny '+(!t.muted?'playing':'')+'" data-act="mute">'+(t.muted?'▶':'Ⅱ')+'</button><button class="tiny del" data-act="del">×</button></div>'+ 
      '<div class="wave">'+waveform(activeBuffer(t))+'</div>'+ 
      '<div class="volRow"><span>LAUTST.</span><input class="range" data-act="vol" type="range" min="0" max="150" value="'+Math.round(t.volume*100)+'"><span>'+Math.round(t.volume*100)+'%</span></div>'+ 
      '<div class="structureBox"><div class="structureTitle"><b>ARRANGEMENT</b><span class="levelBadge">Ebene '+(t.stage+1)+'</span></div><div class="structureGrid"><button class="structBtn" data-act="up" '+(idx===0?'disabled':'')+'>↑ HOCH</button><button class="structBtn" data-act="down" '+(idx===list.length-1?'disabled':'')+'>↓ RUNTER</button><button class="structBtn" data-act="prev" '+(!canMovePrev(t)?'disabled':'')+'>← EBENE</button><button class="structBtn next" data-act="next" '+(!canMoveNext(t)?'disabled':'')+'>EBENE →</button><button class="structBtn copy" data-act="copy">⧉ DUPLIZIEREN</button></div></div>'+ 
      '<div class="timingBox"><div class="timingTitle"><b>TIMING DIESER SPUR</b><span class="timingStatus">'+status+'</span></div><div class="modeSeg">'+trackModeHtml(t)+'</div><div class="strengthRow '+(t.mode==='original'?'disabled':'')+'"><span>STÄRKE</span><input class="range" data-act="strength" type="range" min="0" max="100" value="'+Math.round(t.strength*100)+'" '+(t.mode==='original'?'disabled':'')+'><span>'+Math.round(t.strength*100)+'%</span></div>'+(t.processing?'<div class="progress"><span style="width:'+Math.round(t.progress*100)+'%"></span></div><div class="progressText">'+Math.round(t.progress*100)+'%</div>':'')+'</div>';
      d.querySelector('[data-act=mute]').onclick=async()=>{t.muted=!t.muted;renderTracks();await rebuildArrangement()};
      d.querySelector('[data-act=del]').onclick=()=>deleteTrack(t);
      d.querySelector('[data-act=vol]').onchange=async e=>{t.volume=+e.target.value/100;renderTracks();await rebuildArrangement()};
      d.querySelector('[data-act=vol]').oninput=e=>e.target.nextElementSibling.textContent=e.target.value+'%';
      d.querySelector('[data-act=up]').onclick=()=>moveWithin(t,-1);d.querySelector('[data-act=down]').onclick=()=>moveWithin(t,1);d.querySelector('[data-act=prev]').onclick=()=>moveStage(t,-1);d.querySelector('[data-act=next]').onclick=()=>moveStage(t,1);d.querySelector('[data-act=copy]').onclick=()=>duplicateTrack(t);
      d.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setTrackMode(t,b.dataset.mode));
      const sr=d.querySelector('[data-act=strength]');if(sr){sr.oninput=e=>{e.target.nextElementSibling.textContent=e.target.value+'%';t.strength=+e.target.value/100};sr.onchange=()=>processTrack(t)};
      group.appendChild(d)
    });root.appendChild(group)
  }
  renderSequence()
}
async function init(){
  try{
    S.ctx=new(window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});await S.ctx.audioWorklet.addModule('recorder-worklet.js');await S.ctx.resume();
    S.master=S.ctx.createGain();S.master.gain.value=1.35;S.playbackGain=S.ctx.createGain();S.compressor=S.ctx.createDynamicsCompressor();S.compressor.threshold.value=-6;S.compressor.knee.value=8;S.compressor.ratio.value=6;S.compressor.attack.value=.003;S.compressor.release.value=.18;S.playbackGain.connect(S.master);S.master.connect(S.compressor);S.compressor.connect(S.ctx.destination);
    S.worker=new Worker('dsp-worker.js');S.worker.onmessage=onWorkerMessage;
    $('ov').classList.add('hide');$('engine').textContent='AudioWorklet · READY';micBadge(false);requestAnimationFrame(frame);toast('Audio-Engine bereit')
  }catch(e){$('startErr').textContent='AudioWorklet konnte nicht gestartet werden: '+(e.message||e)}
}
function stopPlayback(){if(S.playbackSource){try{S.playbackSource.stop()}catch(e){}try{S.playbackSource.disconnect()}catch(e){}S.playbackSource=null}S.running=false;setState('','Gestoppt');buttons();renderSequence()}
function startPlayback(when,offset){if(!S.arrangement)return;const d=S.arrangement.duration,s=S.ctx.createBufferSource();s.buffer=S.arrangement;s.loop=true;s.connect(S.playbackGain);const off=((offset||0)%d+d)%d;s.start(when,off);if(S.playbackSource){try{S.playbackSource.stop(when+.01)}catch(e){}}S.playbackSource=s;S.transportStart=when-off;S.running=true;setState('playState','Sequenz läuft');buttons();renderSequence()}
function playToggle(){if(S.running)stopPlayback();else if(S.arrangement)startPlayback(S.ctx.currentTime+.04,0)}
async function rebuildArrangement(){
  if(!S.ctx||!S.tracks.length){S.arrangement=null;return}
  const token=++S.rebuildToken,wasRunning=S.running,phase=S.running?currentPhase():0,requestTime=S.ctx.currentTime,rate=S.ctx.sampleRate,dur=totalDur(),len=Math.max(1,Math.round(dur*rate));
  const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext,off=new OAC(1,len,rate);
  for(const t of S.tracks){if(t.muted||t.volume<=0)continue;const src=off.createBufferSource(),g=off.createGain();src.buffer=activeBuffer(t);g.gain.value=t.volume;src.connect(g);g.connect(off.destination);src.start(t.stage*sectionDur())}
  const rendered=await off.startRendering();if(token!==S.rebuildToken)return;
  const a=rendered.getChannelData(0);let pk=0;for(let i=0;i<a.length;i++)pk=Math.max(pk,Math.abs(a[i]));if(pk>.98){const sc=.98/pk;for(let i=0;i<a.length;i++)a[i]*=sc}
  S.arrangement=rendered;
  if(wasRunning){const elapsed=S.ctx.currentTime-requestTime,nowPhase=(phase+elapsed)%dur,when=S.ctx.currentTime+.035,offAtStart=(nowPhase+(when-S.ctx.currentTime))%dur;startPlayback(when,offAtStart)}
  renderSequence()
}
async function openMic(){
  await closeMic();
  S.micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1}});
  S.micSource=S.ctx.createMediaStreamSource(S.micStream);S.analyser=S.ctx.createAnalyser();S.analyser.fftSize=1024;S.recNode=new AudioWorkletNode(S.ctx,'touchloop-recorder',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],channelCount:1});S.silent=S.ctx.createGain();S.silent.gain.value=0;S.micSource.connect(S.analyser);S.micSource.connect(S.recNode);S.recNode.connect(S.silent);S.silent.connect(S.ctx.destination);S.recNode.port.onmessage=onRecorderMessage;micBadge(true)
}
async function closeMic(){if(S.recNode){try{S.recNode.port.postMessage({type:'abort'})}catch(e){}try{S.recNode.disconnect()}catch(e){}}if(S.micSource)try{S.micSource.disconnect()}catch(e){}if(S.silent)try{S.silent.disconnect()}catch(e){}if(S.micStream)S.micStream.getTracks().forEach(t=>t.stop());S.micStream=S.micSource=S.analyser=S.recNode=S.silent=null;micBadge(false);$('db').textContent='MIC AUS';$('fill').style.width='0%'}
function nextTargetStageStart(stage,now,minLead){const d=totalDur(),sd=sectionDur(),phase=currentPhase(now),target=stage*sd;let delta=(target-phase+d)%d;if(delta<minLead)delta+=d;return now+delta}
function scheduleCleanMute(start,end){if(!S.clean||S.phones||!S.tracks.length)return;const g=S.playbackGain.gain,now=S.ctx.currentTime,current=1;g.cancelScheduledValues(now);g.setValueAtTime(current,now);g.linearRampToValueAtTime(0,Math.max(now,start-.008));g.setValueAtTime(0,start);g.setValueAtTime(0,end);g.linearRampToValueAtTime(1,end+.018)}
function scheduleCountIn(start){if(!S.countIn)return;for(let i=4;i>0;i--){const t=start-i*beatDur();if(t>S.ctx.currentTime+.01)click(t,i===4)}}
function click(t,strong){const o=S.ctx.createOscillator(),g=S.ctx.createGain();o.frequency.value=strong?1180:820;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(strong?.18:.105,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+.045);o.connect(g);g.connect(S.ctx.destination);o.start(t);o.stop(t+.055)}
async function ensureMicPermission(){
  if(S.micPermissionReady)return;
  const test=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1}});
  test.getTracks().forEach(t=>t.stop());S.micPermissionReady=true;micBadge(false)
}
async function armRecord(first){
  if(S.armed||S.recording)return;if(!S.ctx)return;await S.ctx.resume();S.armed=true;buttons();
  try{await ensureMicPermission()}catch(e){S.armed=false;buttons();toast('Mikrofon nicht verfügbar');return}
  const pre=S.countIn?4*beatDur():0,now=S.ctx.currentTime+.05;let stage=first?0:Math.min(S.recTarget,Math.min(2,stageCount()));
  if(stage===stageCount()&&stage>0&&stageTrackCount(stage-1)===0)stage=stageCount()-1;
  let start;
  if(first){start=now+pre+.42}
  else if(S.running){start=nextTargetStageStart(stage,S.ctx.currentTime,pre+.42)}
  else{
    if(!S.arrangement)await rebuildArrangement();
    const playStart=S.ctx.currentTime+(stage===0?pre+.42:.42);start=playStart+stage*sectionDur();startPlayback(playStart,0)
  }
  const frames=Math.round(sectionDur()*S.ctx.sampleRate),id='r'+Date.now()+Math.random();S.recSession={id,chunks:[],frames,stage,first,start,armedToWorklet:false};
  scheduleCountIn(start);scheduleCleanMute(start,start+sectionDur());setState('armState','Bereit · Ebene '+(stage+1));
  const prepLead=.28,prepWait=Math.max(0,(start-S.ctx.currentTime-prepLead)*1000);
  setTimeout(async()=>{const r=S.recSession;if(!r||r.id!==id)return;try{await openMic();if(!S.recSession||S.recSession.id!==id)return;S.recNode.port.postMessage({type:'arm',id,startFrame:Math.round(start*S.ctx.sampleRate),lengthFrames:frames});r.armedToWorklet=true}catch(e){S.recSession=null;S.armed=S.recording=false;await closeMic();setState('','Bereit');buttons();toast('Mikrofon konnte nicht gestartet werden')}},prepWait);
  const wait=Math.max(0,(start-S.ctx.currentTime)*1000);setTimeout(()=>{if(S.recSession&&S.recSession.id===id){S.recording=true;setState('recState','Aufnahme · Ebene '+(stage+1));buttons()}},wait);buttons()
}
function onRecorderMessage(e){const m=e.data||{},r=S.recSession;if(!r||m.id!==r.id)return;if(m.type==='chunk')r.chunks.push(new Float32Array(m.data));else if(m.type==='done')finalizeRecording(r,m.frames)}
function concatChunks(chunks,frames){const out=new Float32Array(frames);let p=0;for(const c of chunks){const n=Math.min(c.length,frames-p);out.set(c.subarray(0,n),p);p+=n;if(p>=frames)break}return out}
function normalizeInput(a){let pk=0;for(const v of a)pk=Math.max(pk,Math.abs(v));const boost=pk>0?Math.min(5,.86/pk):1;if(boost>1.02)for(let i=0;i<a.length;i++)a[i]*=boost;return boost}
async function finalizeRecording(r,actual){
  if(!S.recSession||S.recSession.id!==r.id)return;S.recording=false;S.armed=false;const data=concatChunks(r.chunks,r.frames);S.recSession=null;await closeMic();normalizeInput(data);const b=S.ctx.createBuffer(1,data.length,S.ctx.sampleRate);b.copyToChannel(data,0);const t={id:'t'+Date.now()+Math.random(),name:'Spur '+S.trackSeq++,stage:r.stage,original:b,processed:null,mode:'original',strength:1,regions:null,eventCount:0,processing:false,progress:0,volume:1,muted:false,job:0};S.tracks.push(t);S.recTarget=t.stage;await rebuildArrangement();if(r.first&&!S.running)startPlayback(S.ctx.currentTime+.04,0);setState('playState','Sequenz läuft');renderTracks();buttons();toast(t.name+' aufgenommen · Ebene '+(t.stage+1))
}
function onWorkerMessage(e){const m=e.data||{},job=S.workerJobs.get(m.id);if(!job)return;if(m.type==='progress'){job.track.progress=m.value;renderTracks();return}S.workerJobs.delete(m.id);if(m.type==='error'){job.reject(new Error(m.message));return}job.resolve(m)}
function workerProcess(track){return new Promise((resolve,reject)=>{const id='p'+S.processSeq++,samples=track.original.getChannelData(0).slice();S.workerJobs.set(id,{resolve,reject,track});S.worker.postMessage({type:'process',id,samples:samples.buffer,sampleRate:track.original.sampleRate,bpm:S.bpm,mode:track.mode,strength:track.strength,regions:track.regions},[samples.buffer])})}
async function processTrack(t){
  if(t.mode==='original'){t.processed=null;t.processing=false;t.progress=0;renderTracks();await rebuildArrangement();return}
  if(t.processing)return;t.processing=true;t.progress=.02;const job=++t.job;renderTracks();
  try{const r=await workerProcess(t);if(job!==t.job)return;const a=new Float32Array(r.audio),b=S.ctx.createBuffer(1,a.length,t.original.sampleRate);b.copyToChannel(a,0);t.processed=b;t.regions=r.regions;t.eventCount=r.eventCount||0;t.progress=1;await sleep(80)}catch(e){toast('Timing-Analyse fehlgeschlagen');console.error(e)}finally{if(job===t.job){t.processing=false;renderTracks();await rebuildArrangement()}}
}
async function setTrackMode(t,m){if(t.processing)return;t.mode=m;renderTracks();await processTrack(t)}
function moveWithin(t,dir){const group=S.tracks.filter(x=>x.stage===t.stage),i=group.indexOf(t),j=i+dir;if(j<0||j>=group.length)return;const ai=S.tracks.indexOf(t),bi=S.tracks.indexOf(group[j]);[S.tracks[ai],S.tracks[bi]]=[S.tracks[bi],S.tracks[ai]];renderTracks()}
function compactStages(){if(!S.tracks.length)return;while(stageTrackCount(0)===0)S.tracks.forEach(x=>x.stage--);if(stageTrackCount(1)===0&&stageTrackCount(2)>0)S.tracks.forEach(x=>{if(x.stage===2)x.stage=1})}
async function moveStage(t,dir){let ns=t.stage+dir;if(ns<0||ns>2)return;if(dir>0&&stageTrackCount(t.stage)<=1)return toast('Diese Ebene braucht mindestens eine Spur. Erst duplizieren, dann verschieben.');t.stage=ns;compactStages();ns=t.stage;S.recTarget=Math.min(ns,stageCount()-1);renderTracks();await rebuildArrangement();toast(t.name+' → Ebene '+(ns+1))}
async function duplicateTrack(t){const c={id:'t'+Date.now()+Math.random(),name:'Spur '+S.trackSeq+++' Kopie',stage:t.stage,original:t.original,processed:t.processed,mode:t.mode,strength:t.strength,regions:t.regions?JSON.parse(JSON.stringify(t.regions)):null,eventCount:t.eventCount,processing:false,progress:0,volume:t.volume,muted:false,job:0};const i=S.tracks.indexOf(t);S.tracks.splice(i+1,0,c);renderTracks();await rebuildArrangement();toast('Spur dupliziert')}
async function deleteTrack(t){S.tracks=S.tracks.filter(x=>x!==t);if(!S.tracks.length){clearAll();return}compactStages();S.recTarget=Math.min(S.recTarget,stageCount()-1);renderTracks();await rebuildArrangement()}
async function clearAll(){S.recSession=null;S.armed=S.recording=false;await closeMic();if(S.playbackSource)try{S.playbackSource.stop()}catch(e){}S.playbackSource=null;S.running=false;S.tracks=[];S.arrangement=null;S.recTarget=0;setState('','Bereit');$('timer').textContent='00:00.0';$('pos').textContent='—';renderTracks();buttons();renderBeatGrid()}
function meter(){if(!S.analyser){S.meter*=.8;$('fill').style.width=S.meter+'%';return}const a=new Float32Array(S.analyser.fftSize);S.analyser.getFloatTimeDomainData(a);let ss=0;for(const v of a)ss+=v*v;const rms=Math.sqrt(ss/a.length),db=rms?20*Math.log10(rms):-100,p=Math.max(0,Math.min(100,(db+60)/60*100));S.meter=S.meter*.75+p*.25;$('fill').style.width=S.meter+'%';$('db').textContent=db<-60?'−∞ dB':db.toFixed(1)+' dB'}
function visuals(){if(!S.ctx)return;let p=-1;if(S.recording&&S.recSession)p=Math.max(0,S.ctx.currentTime-S.recSession.start);else if(S.running)p=currentPhase();if(p<0)return;$('timer').textContent=fmt(p);const sd=sectionDur(),stage=Math.min(stageCount()-1,Math.floor(p/sd)),local=p-stage*sd,bi=Math.min(S.bars*4-1,Math.floor(local/beatDur())),bar=Math.floor(bi/4),beat=bi%4;$('pos').textContent='Ebene '+(stage+1)+'/'+stageCount()+' · Takt '+(bar+1)+'/'+S.bars+' · Beat '+(beat+1)+'/4';if(bi!==S.lastBeat){S.lastBeat=bi;document.querySelectorAll('.beat').forEach((x,i)=>{x.classList.toggle('past',i<=bi);x.classList.toggle('now',i===bi)})}updateSequenceActive()}
function frame(){meter();visuals();requestAnimationFrame(frame)}
function wavBlob(buf){const rate=44100,n=Math.max(1,Math.round(buf.duration*rate)),src=buf.getChannelData(0),ratio=buf.sampleRate/rate,mix=new Float32Array(n);for(let i=0;i<n;i++){const p=i*ratio,j=Math.floor(p),f=p-j;mix[i]=(src[j]||0)*(1-f)+(src[Math.min(j+1,src.length-1)]||0)*f}const master=+$('master').value/100;let pk=0;for(let i=0;i<n;i++){mix[i]*=master;pk=Math.max(pk,Math.abs(mix[i]))}if(pk>.98){const sc=.98/pk;for(let i=0;i<n;i++)mix[i]*=sc}const ab=new ArrayBuffer(44+n*4),v=new DataView(ab),w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};w(0,'RIFF');v.setUint32(4,36+n*4,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,rate,true);v.setUint32(28,rate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*4,true);let o=44;for(let i=0;i<n;i++){const s=Math.max(-1,Math.min(1,mix[i])),q=s<0?s*32768:s*32767;v.setInt16(o,q,true);v.setInt16(o+2,q,true);o+=4}return new Blob([v],{type:'audio/wav'})}
async function save(){await rebuildArrangement();if(!S.arrangement)return;const blob=wavBlob(S.arrangement),file=new File([blob],`TouchLoop_${S.bpm}BPM_${S.bars*stageCount()}bars.wav`,{type:'audio/wav'});try{if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))return await navigator.share({title:'TouchLoop 9',files:[file]})}catch(e){if(e.name==='AbortError')return}const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(u),3000)}
$('start').onclick=init;$('rec').onclick=()=>armRecord(true);$('newTrack').onclick=()=>armRecord(false);$('play').onclick=playToggle;$('clear').onclick=clearAll;$('save').onclick=save;
$('bpm').oninput=e=>{if(S.tracks.length){e.target.value=S.bpm;return toast('BPM nur vor der ersten Aufnahme ändern')}S.bpm=+e.target.value;$('bpmV').textContent=S.bpm;renderSequence()};$('minus').onclick=()=>{if(!S.tracks.length&&S.bpm>50){S.bpm--;$('bpm').value=S.bpm;$('bpmV').textContent=S.bpm}};$('plus').onclick=()=>{if(!S.tracks.length&&S.bpm<180){S.bpm++;$('bpm').value=S.bpm;$('bpmV').textContent=S.bpm}};
$('count').onclick=()=>{S.countIn=!S.countIn;$('count').classList.toggle('on',S.countIn);$('count').textContent=S.countIn?'1 Takt Count-in':'Count-in aus'};$('clean').onclick=()=>{S.clean=!S.clean;$('clean').classList.toggle('on',S.clean);$('clean').textContent=S.clean?'✓ Clean Record':'Clean Record aus'};$('phones').onclick=()=>{S.phones=!S.phones;$('phones').classList.toggle('on',S.phones);$('phones').textContent=S.phones?'✓ Kopfhörer-Modus':'Kopfhörer-Modus'};
$('master').oninput=e=>{const v=+e.target.value/100;$('masterV').textContent=Math.round(v*100)+'%';if(S.master)S.master.gain.setTargetAtTime(v,S.ctx.currentTime,.01)};
document.addEventListener('visibilitychange',async()=>{if(document.hidden&&(S.armed||S.recording)){S.recSession=null;S.armed=S.recording=false;await closeMic();toast('Aufnahme abgebrochen: App war im Hintergrund')}else if(!document.hidden&&S.ctx&&S.ctx.state==='suspended')try{await S.ctx.resume()}catch(e){}});
renderBars();renderBeatGrid();renderTracks();renderSequence();buttons();
