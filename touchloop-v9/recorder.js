function micConstraints() {
  return {
    echoCancellation: !(cleanRecord || headphoneMode),
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
  };
}

async function warmMicrophonePermission() {
  if (micPermissionWarmed) return;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: micConstraints() });
  stream.getTracks().forEach((t) => t.stop());
  micPermissionWarmed = true;
}

async function openMicAndArm(startTime, targetFrames) {
  if (!workletReady) throw new Error('AudioWorklet nicht bereit');
  await closeMic();
  micStream = await navigator.mediaDevices.getUserMedia({ audio: micConstraints() });
  micSource = ctx.createMediaStreamSource(micStream);
  micAnalyser = ctx.createAnalyser();
  micAnalyser.fftSize = 1024;
  micSource.connect(micAnalyser);

  recorderNode = new AudioWorkletNode(ctx, 'touchloop-recorder-v9', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    channelCount: 1,
    channelCountMode: 'explicit',
  });
  recorderKeepAlive = ctx.createGain();
  recorderKeepAlive.gain.value = 0;
  micSource.connect(recorderNode);
  recorderNode.connect(recorderKeepAlive);
  recorderKeepAlive.connect(ctx.destination);

  recorderNode.port.onmessage = (event) => {
    const data = event.data || {};
    if (data.type === 'complete' && data.pcm) {
      const pcm = new Float32Array(data.pcm);
      finishRecording(pcm, data.sampleRate || ctx.sampleRate).catch((err) => {
        console.error(err);
        capture.busy = false;
        closeMic();
        buttons();
        toast('Aufnahme konnte nicht abgeschlossen werden');
      });
    }
  };

  const startFrame = Math.round(startTime * ctx.sampleRate);
  recorderNode.port.postMessage({ type: 'arm', startFrame, targetFrames });
  setMicBadge(true);
}

async function closeMic() {
  if (capture.micTimer) { clearTimeout(capture.micTimer); capture.micTimer = null; }
  if (recorderNode) {
    try { recorderNode.port.postMessage({ type: 'cancel' }); } catch (_) {}
    try { recorderNode.disconnect(); } catch (_) {}
  }
  if (micSource) { try { micSource.disconnect(); } catch (_) {} }
  if (recorderKeepAlive) { try { recorderKeepAlive.disconnect(); } catch (_) {} }
  if (micStream) micStream.getTracks().forEach((t) => t.stop());
  recorderNode = null;
  micSource = null;
  micAnalyser = null;
  recorderKeepAlive = null;
  micStream = null;
  setMicBadge(false);
  $('db').textContent = 'MIC AUS';
  $('fill').style.width = '0%';
}

function scheduleCleanMute(startTime, endTime) {
  if (!cleanRecord || headphoneMode || !tracks.length) return;
  const v = masterValue();
  masterGain.gain.cancelScheduledValues(ctx.currentTime);
  masterGain.gain.setValueAtTime(v, ctx.currentTime);
  const down = Math.max(ctx.currentTime, startTime - 0.018);
  masterGain.gain.setValueAtTime(v, down);
  masterGain.gain.linearRampToValueAtTime(0, startTime);
  masterGain.gain.setValueAtTime(0, Math.max(startTime, endTime - 0.012));
  masterGain.gain.linearRampToValueAtTime(v, endTime + 0.012);
}

async function armRecording(first) {
  if (capture.busy) return;
  capture.busy = true;
  buttons();
  setState('armState', 'Mikrofon-Berechtigung…');

  try {
    await warmMicrophonePermission();
  } catch (err) {
    capture.busy = false;
    buttons();
    setState('', 'Mikrofon nicht verfügbar');
    return toast('Mikrofonzugriff wurde nicht erlaubt');
  }

  const pre = countIn ? 4 * beatDur() : 0;
  const now = ctx.currentTime;
  let startTime;

  if (first || !tracks.length) {
    startTime = now + pre + 0.55;
  } else {
    if (!transport.running) startTransportAtPhase(0);
    startTime = nextCycleBoundary(ctx.currentTime + pre + 0.75);
  }

  capture.startTime = startTime;
  capture.endTime = startTime + baseDur();
  capture.targetFrames = baseFrames();
  scheduleCountIn(startTime);
  scheduleCleanMute(capture.startTime, capture.endTime);

  setState('armState', countIn ? 'Count-in…' : 'Aufnahme vorbereitet…');
  const micLead = 0.30;
  const openDelayMs = Math.max(0, (startTime - micLead - ctx.currentTime) * 1000);
  capture.micTimer = setTimeout(async () => {
    try {
      await openMicAndArm(capture.startTime, capture.targetFrames);
      if (ctx.currentTime > capture.startTime - 0.035) {
        const oldStart = capture.startTime;
        const newStart = tracks.length && transport.running
          ? nextCycleBoundary(ctx.currentTime + 0.40)
          : ctx.currentTime + 0.40;
        capture.startTime = newStart;
        capture.endTime = newStart + baseDur();
        recorderNode.port.postMessage({ type: 'cancel' });
        recorderNode.port.postMessage({ type: 'arm', startFrame: Math.round(newStart * ctx.sampleRate), targetFrames: capture.targetFrames });
        if (Math.abs(newStart - oldStart) > 0.05) {
          scheduleCountIn(newStart);
          scheduleCleanMute(newStart, capture.endTime);
          toast('Mikrofonstart neu synchronisiert');
        }
      }
      const stateDelay = Math.max(0, (capture.startTime - ctx.currentTime) * 1000);
      capture.startTimer = setTimeout(() => setState('recState', 'Aufnahme · Ebene 1'), stateDelay);
    } catch (err) {
      console.error(err);
      capture.busy = false;
      await closeMic();
      setState('', 'Mikrofonfehler');
      buttons();
      toast('Mikrofon konnte nicht gestartet werden');
    }
  }, openDelayMs);
}

function normalizeNewRecording(data) {
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  const boost = peak > 0 ? Math.min(5, 0.86 / peak) : 1;
  if (boost > 1.03) {
    for (let i = 0; i < data.length; i++) data[i] = Math.max(-0.98, Math.min(0.98, data[i] * boost));
  }
  return boost;
}

function makeAudioBuffer(data, sampleRate) {
  normalizeNewRecording(data);
  const buffer = ctx.createBuffer(1, data.length, sampleRate);
  buffer.copyToChannel(data, 0);
  return buffer;
}

function newTrackObject(buffer, name = null) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `t${Date.now()}${Math.random()}`,
    name: name || `Spur ${trackSeq++}`,
    originalBuffer: buffer,
    processedBuffer: null,
    processedKey: null,
    mode: 'original',
    strength: 1,
    regions: null,
    analysisDone: false,
    processing: false,
    progress: 0,
    eventCount: 0,
    muted: false,
    volume: 1,
    gainNode: null,
    liveSources: new Set(),
    stage: 0,
    order: sortedStageTracks(0).length,
    createdAt: Date.now() + Math.random(),
    debounce: null,
  };
}

async function finishRecording(pcm, sampleRate) {
  if (capture.startTimer) { clearTimeout(capture.startTimer); capture.startTimer = null; }
  await closeMic();
  const buffer = makeAudioBuffer(pcm, sampleRate);
  const track = newTrackObject(buffer);
  tracks.push(track);
  normalizeOrders();
  capture.busy = false;

  if (!transport.running) startTransportAtPhase(0);
  renderAll();
  setState('playState', 'Sequenz läuft');
  toast(`${track.name} aufgenommen · Ebene 1`);
}
