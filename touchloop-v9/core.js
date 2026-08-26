'use strict';

const $ = (id) => document.getElementById(id);
const MAX_STAGES = 3;
const LOOKAHEAD_SECONDS = 0.20;
const SCHEDULER_MS = 25;

let bpm = 100;
let bars = 4;
let countIn = true;
let cleanRecord = true;
let headphoneMode = false;
let micPermissionWarmed = false;

let ctx = null;
let masterGain = null;
let compressor = null;
let cueGain = null;
let micStream = null;
let micSource = null;
let micAnalyser = null;
let recorderNode = null;
let recorderKeepAlive = null;
let workletReady = false;

let tracks = [];
let trackSeq = 1;
let meterSmooth = 0;
let lastBeatVisual = -1;
let lastStageVisual = -1;

const transport = {
  running: false,
  origin: 0,
  nextStageIndex: 0,
  timer: null,
  sources: new Set(),
};

const capture = {
  busy: false,
  startTime: 0,
  endTime: 0,
  startTimer: null,
  micTimer: null,
  targetFrames: 0,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const beatDur = () => 60 / bpm;
const baseDur = () => bars * 4 * beatDur();
const baseFrames = () => Math.round(baseDur() * ctx.sampleRate);
const stageCount = () => Math.max(1, ...tracks.map((t) => t.stage + 1));
const sequenceDur = () => baseDur() * stageCount();
const masterValue = () => Number($('master').value) / 100;

function toast(text, ms = 1900) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => $('toast').classList.remove('show'), ms);
}

function setState(kind, text) {
  $('state').className = kind || '';
  $('stateT').textContent = text;
}

function setMicBadge(live) {
  $('badge').className = `badge ${live ? 'live' : 'ready'}`;
  $('badge').textContent = live ? 'MIC AKTIV' : 'MIC AUS';
}

function secondsText(s) {
  const total = Math.max(0, s);
  const m = Math.floor(total / 60);
  const sec = total - m * 60;
  return `${String(m).padStart(2, '0')}:${sec.toFixed(1).padStart(4, '0')}`;
}

function ensureTrackGain(track) {
  if (!track.gainNode) {
    track.gainNode = ctx.createGain();
    track.gainNode.connect(masterGain);
  }
  track.gainNode.gain.setValueAtTime(track.muted ? 0 : track.volume, ctx.currentTime);
  return track.gainNode;
}

function activeBuffer(track) {
  return track.mode !== 'original' && track.processedBuffer ? track.processedBuffer : track.originalBuffer;
}

function sortedStageTracks(stage) {
  return tracks
    .filter((t) => t.stage === stage)
    .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
}

function normalizeOrders() {
  for (let s = 0; s < MAX_STAGES; s++) {
    sortedStageTracks(s).forEach((t, i) => { t.order = i; });
  }
}

function normalizeStages() {
  const occupied = [];
  for (let s = 0; s < MAX_STAGES; s++) {
    if (tracks.some((t) => t.stage === s)) occupied.push(s);
  }
  const map = new Map(occupied.map((oldStage, i) => [oldStage, i]));
  tracks.forEach((t) => { if (map.has(t.stage)) t.stage = map.get(t.stage); });
  normalizeOrders();
}

function renderBars() {
  const el = $('barsSeg');
  el.innerHTML = '';
  [1, 2, 4, 8].forEach((n) => {
    const b = document.createElement('button');
    b.textContent = String(n);
    b.className = n === bars ? 'on' : '';
    b.onclick = () => {
      if (tracks.length || capture.busy) return toast('Takte nur ohne vorhandene Spuren ändern');
      bars = n;
      $('barsV').textContent = n;
      renderBars();
      renderBeats();
      renderSequence();
    };
    el.appendChild(b);
  });
}

function renderBeats() {
  const el = $('beats');
  el.innerHTML = '';
  for (let r = 0; r < bars; r++) {
    const row = document.createElement('div');
    row.className = 'bar';
    const n = document.createElement('div');
    n.className = 'barN';
    n.textContent = String(r + 1);
    row.appendChild(n);
    for (let j = 0; j < 4; j++) {
      const c = document.createElement('div');
      c.className = 'beat';
      row.appendChild(c);
    }
    el.appendChild(row);
  }
}

function renderSequence() {
  const count = stageCount();
  const strip = $('sequenceStrip');
  strip.style.gridTemplateColumns = `repeat(${count}, 1fr)`;
  strip.innerHTML = '';
  for (let s = 0; s < count; s++) {
    const box = document.createElement('div');
    box.className = 'seqSlot';
    box.dataset.stage = String(s);
    const names = sortedStageTracks(s).map((t) => t.name);
    box.innerHTML = `<div class="seqNum">${s + 1}</div><b>EBENE ${s + 1}</b><span>${names.length ? names.join(' + ') : 'leer'}</span>`;
    strip.appendChild(box);
  }
  $('sequenceTitle').textContent = `${count} ${count === 1 ? 'Ebene' : 'Ebenen'} · ${tracks.length} ${tracks.length === 1 ? 'Spur' : 'Spuren'}`;
  $('sequenceDuration').textContent = `Gesamtlänge ${secondsText(sequenceDur())}`;
}

function buttons() {
  const has = tracks.length > 0;
  $('rec').disabled = has || capture.busy;
  $('newTrack').disabled = !has || capture.busy;
  $('play').disabled = !has || capture.busy;
  $('clear').disabled = !has && !capture.busy;
  $('save').disabled = !has || capture.busy;
  $('playT').textContent = transport.running ? 'STOP' : 'PLAY';
  $('playI').textContent = transport.running ? '■' : '▶';
}

async function initAudio() {
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    await ctx.resume();
    if (!ctx.audioWorklet) throw new Error('AudioWorklet fehlt');
    await ctx.audioWorklet.addModule('./recorder-worklet.js');
    workletReady = true;

    masterGain = ctx.createGain();
    masterGain.gain.value = 1.35;
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -6;
    compressor.knee.value = 8;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.18;
    cueGain = ctx.createGain();
    cueGain.gain.value = 1;

    masterGain.connect(compressor);
    compressor.connect(ctx.destination);
    cueGain.connect(ctx.destination);

    $('ov').classList.add('hide');
    setMicBadge(false);
    const latencyMs = Math.round(((ctx.baseLatency || 0) + (ctx.outputLatency || 0)) * 1000);
    $('engine').textContent = `AudioWorklet · ${Math.round(ctx.sampleRate / 100) / 10} kHz${latencyMs ? ` · ~${latencyMs} ms` : ''}`;
    requestAnimationFrame(frame);
  } catch (err) {
    $('startErr').textContent = `Audio-Engine konnte nicht starten: ${err.message || err}`;
  }
}

function addSourceToTrack(track, source) {
  transport.sources.add(source);
  track.liveSources.add(source);
  source.onended = () => {
    transport.sources.delete(source);
    track.liveSources.delete(source);
    try { source.disconnect(); } catch (_) {}
  };
}

function scheduleTrack(track, when, offset) {
  if (track.muted) return;
  const buffer = activeBuffer(track);
  const duration = Math.max(0, Math.min(baseDur() - offset, buffer.duration - offset));
  if (duration <= 0.001) return;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ensureTrackGain(track));
  addSourceToTrack(track, source);
  source.start(when, Math.max(0, offset), duration);
}

function scheduleStage(absStageIndex, when, offset = 0) {
  const count = stageCount();
  const stage = ((absStageIndex % count) + count) % count;
  sortedStageTracks(stage).forEach((track) => scheduleTrack(track, when, offset));
}

function stopScheduledSources() {
  for (const source of Array.from(transport.sources)) {
    try { source.stop(); } catch (_) {}
    try { source.disconnect(); } catch (_) {}
  }
  transport.sources.clear();
  tracks.forEach((t) => t.liveSources.clear());
}

function transportPhase(at = ctx.currentTime) {
  if (!transport.running || !tracks.length) return 0;
  const dur = sequenceDur();
  let p = (at - transport.origin) % dur;
  if (p < 0) p += dur;
  return p;
}

function schedulerTick() {
  if (!transport.running || !tracks.length) return;
  const D = baseDur();
  const horizon = ctx.currentTime + LOOKAHEAD_SECONDS;
  let guard = 0;
  while (transport.origin + transport.nextStageIndex * D < horizon && guard++ < 16) {
    const when = transport.origin + transport.nextStageIndex * D;
    if (when >= ctx.currentTime - 0.005) scheduleStage(transport.nextStageIndex, Math.max(when, ctx.currentTime), 0);
    transport.nextStageIndex += 1;
  }
}

function startTransportAtPhase(phase = 0) {
  if (!tracks.length) return;
  stopTransport(false);
  const D = baseDur();
  const dur = sequenceDur();
  phase = ((phase % dur) + dur) % dur;
  const stage = Math.floor(phase / D);
  const localOffset = phase - stage * D;
  const when = ctx.currentTime + 0.075;
  transport.origin = when - phase;
  transport.running = true;
  scheduleStage(stage, when, localOffset);
  transport.nextStageIndex = stage + 1;
  transport.timer = setInterval(schedulerTick, SCHEDULER_MS);
  schedulerTick();
  setState('playState', 'Sequenz läuft');
  buttons();
}

function stopTransport(updateState = true) {
  if (transport.timer) clearInterval(transport.timer);
  transport.timer = null;
  transport.running = false;
  stopScheduledSources();
  if (updateState) setState('', tracks.length ? 'Gestoppt' : 'Bereit');
  buttons();
}

function restartTransportPreservingPhase(oldPhase = null) {
  if (!transport.running) return;
  const p = oldPhase == null ? transportPhase() : oldPhase;
  startTransportAtPhase(Math.min(p, Math.max(0, sequenceDur() - 0.001)));
}

function nextCycleBoundary(afterTime) {
  if (!transport.running) return afterTime;
  const dur = sequenceDur();
  let n = transport.origin;
  while (n < afterTime) n += dur;
  return n;
}

function click(at, strong) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = strong ? 1160 : 830;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(strong ? 0.18 : 0.10, at + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.045);
  osc.connect(gain);
  gain.connect(cueGain);
  osc.start(at);
  osc.stop(at + 0.055);
}

function scheduleCountIn(captureStart) {
  if (!countIn) return;
  const d = beatDur();
  const first = captureStart - 4 * d;
  for (let i = 0; i < 4; i++) click(first + i * d, i === 0);
}
