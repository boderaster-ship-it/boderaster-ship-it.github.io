async function armRecord(first){if(recording||armed)return;armed=true;buttons();try{await openMic()}catch(e){armed=false;buttons();closeMic();return toast('Mikrofon nicht verfügbar')}
 let pre=countIn?4*beatDur():0,now=ctx.currentTime+.12;
 if(first){captureStart=now+pre;if(countIn)for(let i=0;i<4;i++)click(now+i*beatDur(),i===0)}
 else if(transportRunning){captureStart=nextBoundaryAfter(ctx.currentTime+pre+.12);if(countIn){let c=captureStart-4*beatDur();for(let i=0;i<4;i++)click(c+i*beatDur(),i===0)}}
 else{captureStart=now+pre;if(countIn)for(let i=0;i<4;i++)click(now+i*beatDur(),i===0);startAll(captureStart,0)}
 captureTarget=Math.round(loopDur()*ctx.sampleRate);captureIndex=0;captureData=new Float32Array(captureTarget);
 if(cleanRecord&&!headphoneMode&&tracks.length){let ms=Math.max(0,(captureStart-ctx.currentTime)*1000);setTimeout(()=>setCleanMute(true),ms)}
 setState('armState',countIn?'Count-in…':'Aufnahme bereit…');
 let wait=Math.max(0,(captureStart-ctx.currentTime)*1000);setTimeout(()=>{if(!armed)return;recording=true;setState('recState','Aufnahme');buttons()},wait)
}
function normalizeBuffer(data){let peak=0;for(let v of data)peak=Math.max(peak,Math.abs(v));let boost=peak>0?Math.min(5,.88/peak):1;if(boost>1.03)for(let i=0;i<data.length;i++)data[i]*=boost;return boost}
function makeBuffer(data){normalizeBuffer(data);let b=ctx.createBuffer(1,data.length,ctx.sampleRate);b.copyToChannel(data,0);return b}
function finishRecording(data){closeMic();if(cleanMuted)setCleanMute(false);let b=makeBuffer(data),t={id:'t'+Date.now()+Math.random(),name:'Spur '+trackSeq++,originalBuffer:b,quantBuffer:null,quantEnabled:false,quantKey:null,analysisOnsets:null,processing:false,progress:0,eventCount:0,muted:false,volume:1,gainNode:null,source:null};tracks.push(t);
 if(!transportRunning)startAll(ctx.currentTime+.05,0);else startTrack(t,ctx.currentTime+.025,phase());
 setState('playState','Loop läuft');renderTracks();buttons();toast(t.name+' aufgenommen · Original unverändert')}
function waveform(buf){let a=buf.getChannelData(0),n=48,step=Math.max(1,Math.floor(a.length/n)),s='';for(let k=0;k<n;k++){let p=0,end=Math.min(a.length,(k+1)*step);for(let i=k*step;i<end;i++)p=Math.max(p,Math.abs(a[i]));s+='<i style="height:'+Math.max(3,Math.round(p*27))+'px"></i>'}return s}
