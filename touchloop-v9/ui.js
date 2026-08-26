function clearAll() {
  closeMic();
  if (capture.startTimer) clearTimeout(capture.startTimer);
  if (capture.micTimer) clearTimeout(capture.micTimer);
  capture.busy = false;
  stopTransport(false);
  tracks = [];
  trackSeq = 1;
  setState('', 'Bereit');
  $('timer').textContent = '00:00.0';
  $('pos').textContent = '—';
  document.querySelectorAll('.beat').forEach((x) => { x.className = 'beat'; });
  renderAll();
}

function meter() {
  if (!micAnalyser) {
    meterSmooth *= 0.8;
    $('fill').style.width = `${meterSmooth}%`;
    return;
  }
  const a = new Float32Array(micAnalyser.fftSize);
  micAnalyser.getFloatTimeDomainData(a);
  let sum = 0;
  for (const v of a) sum += v * v;
  const rms = Math.sqrt(sum / a.length);
  const db = rms ? 20 * Math.log10(rms) : -100;
  const p = Math.max(0, Math.min(100, (db + 60) / 60 * 100));
  meterSmooth = meterSmooth * 0.72 + p * 0.28;
  $('fill').style.width = `${meterSmooth}%`;
  $('db').textContent = db < -60 ? '−∞ dB' : `${db.toFixed(1)} dB`;
}

function visuals() {
  if (!ctx) return;
  let p;
  if (capture.busy && ctx.currentTime >= capture.startTime && ctx.currentTime <= capture.endTime) {
    p = ctx.currentTime - capture.startTime;
  } else if (transport.running) {
    p = transportPhase();
  } else return;

  $('timer').textContent = secondsText(transport.running ? transportPhase() : p);
  const D = baseDur();
  const stage = transport.running ? Math.min(stageCount() - 1, Math.floor(transportPhase() / D)) : 0;
  const local = transport.running ? transportPhase() - stage * D : p;
  const beatIndex = Math.max(0, Math.min(bars * 4 - 1, Math.floor(local / beatDur())));
  const bar = Math.floor(beatIndex / 4);
  const beat = beatIndex % 4;
  $('pos').textContent = `Ebene ${stage + 1}/${stageCount()} · Takt ${bar + 1}/${bars} · Beat ${beat + 1}/4`;

  if (beatIndex !== lastBeatVisual) {
    lastBeatVisual = beatIndex;
    document.querySelectorAll('.beat').forEach((x, i) => {
      x.classList.toggle('past', i <= beatIndex);
      x.classList.toggle('now', i === beatIndex);
    });
  }
  if (stage !== lastStageVisual) {
    lastStageVisual = stage;
    document.querySelectorAll('.seqSlot').forEach((x) => x.classList.toggle('active', Number(x.dataset.stage) === stage));
  }
}

function frame() {
  meter();
  visuals();
  requestAnimationFrame(frame);
}

function wavBlob() {
  const rate = 44100;
  const stageSamples = Math.round(baseDur() * rate);
  const totalSamples = stageSamples * stageCount();
  const mix = new Float32Array(totalSamples);

  for (const track of tracks) {
    if (track.muted) continue;
    const b = activeBuffer(track);
    const a = b.getChannelData(0);
    const ratio = b.sampleRate / rate;
    const offset = track.stage * stageSamples;
    for (let i = 0; i < stageSamples; i++) {
      const p = i * ratio;
      const j = Math.floor(p);
      const f = p - j;
      const v = (a[j] || 0) * (1 - f) + (a[Math.min(j + 1, a.length - 1)] || 0) * f;
      mix[offset + i] += v * track.volume;
    }
  }

  const mv = masterValue();
  let peak = 0;
  for (let i = 0; i < mix.length; i++) {
    mix[i] *= mv;
    peak = Math.max(peak, Math.abs(mix[i]));
  }
  if (peak > 0.98) {
    const s = 0.98 / peak;
    for (let i = 0; i < mix.length; i++) mix[i] *= s;
  }

  const ab = new ArrayBuffer(44 + totalSamples * 4);
  const v = new DataView(ab);
  const write = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  write(0, 'RIFF');
  v.setUint32(4, 36 + totalSamples * 4, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 2, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 4, true);
  v.setUint16(32, 4, true);
  v.setUint16(34, 16, true);
  write(36, 'data');
  v.setUint32(40, totalSamples * 4, true);
  let o = 44;
  for (let i = 0; i < totalSamples; i++) {
    const s = Math.max(-1, Math.min(1, mix[i]));
    const q = s < 0 ? s * 32768 : s * 32767;
    v.setInt16(o, q, true);
    v.setInt16(o + 2, q, true);
    o += 4;
  }
  return new Blob([v], { type: 'audio/wav' });
}

async function save() {
  const blob = wavBlob();
  const file = new File([blob], `TouchLoop_${bpm}BPM_${bars}bars_${stageCount()}levels.wav`, { type: 'audio/wav' });
  try {
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ title: 'TouchLoop 9', files: [file] });
      return;
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

$('start').onclick = initAudio;
$('rec').onclick = () => armRecording(true);
$('newTrack').onclick = () => armRecording(false);
$('play').onclick = () => transport.running ? stopTransport() : startTransportAtPhase(0);
$('clear').onclick = clearAll;
$('save').onclick = save;

$('bpm').oninput = (e) => {
  if (tracks.length) { e.target.value = bpm; return toast('BPM nur ohne vorhandene Spuren ändern'); }
  bpm = Number(e.target.value);
  $('bpmV').textContent = bpm;
};
$('minus').onclick = () => {
  if (!tracks.length && bpm > 50) { bpm--; $('bpm').value = bpm; $('bpmV').textContent = bpm; }
};
$('plus').onclick = () => {
  if (!tracks.length && bpm < 180) { bpm++; $('bpm').value = bpm; $('bpmV').textContent = bpm; }
};
$('count').onclick = () => {
  countIn = !countIn;
  $('count').classList.toggle('on', countIn);
  $('count').textContent = countIn ? '1 Takt Count-in' : 'Count-in aus';
};
$('clean').onclick = () => {
  cleanRecord = !cleanRecord;
  $('clean').classList.toggle('on', cleanRecord);
  $('clean').textContent = cleanRecord ? '✓ Clean Record' : 'Clean Record aus';
};
$('phones').onclick = () => {
  headphoneMode = !headphoneMode;
  $('phones').classList.toggle('on', headphoneMode);
  $('phones').textContent = headphoneMode ? '✓ Kopfhörer-Modus' : 'Kopfhörer-Modus';
};
$('master').oninput = (e) => {
  const v = Number(e.target.value) / 100;
  $('masterV').textContent = `${Math.round(v * 100)}%`;
  if (masterGain) masterGain.gain.setTargetAtTime(v, ctx.currentTime, 0.01);
};

document.addEventListener('visibilitychange', async () => {
  if (!document.hidden && ctx && ctx.state === 'suspended') {
    try { await ctx.resume(); } catch (_) {}
  }
});

window.addEventListener('pagehide', () => {
  closeMic();
  stopTransport(false);
});

renderBars();
renderBeats();
renderSequence();
renderTracks();
buttons();
