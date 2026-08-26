function modeLabel(mode) {
  return mode === 'original' ? 'Original' : mode === 'q4' ? '1/4' : mode === 'q8' ? '1/8' : mode === 'q16' ? '1/16' : 'Zentrieren';
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const c = Array.from(arr).sort((a, b) => a - b);
  return c[Math.min(c.length - 1, Math.floor((c.length - 1) * p))];
}

function nearestZero(a, pos, radius) {
  let best = Math.max(0, Math.min(a.length - 1, pos));
  let bestV = Math.abs(a[best]);
  for (let i = Math.max(1, pos - radius); i < Math.min(a.length - 1, pos + radius); i++) {
    const v = Math.abs(a[i]);
    if (v < bestV) { bestV = v; best = i; }
    if (a[i] === 0 || a[i - 1] * a[i] <= 0) return i;
  }
  return best;
}

async function ensureRegions(track) {
  if (track.analysisDone && track.regions) return track.regions;
  track.processing = true;
  track.progress = 0.02;
  renderTracks();
  await sleep(10);
  const a = track.originalBuffer.getChannelData(0);
  const sr = track.originalBuffer.sampleRate;
  const hop = Math.max(48, Math.round(sr * 0.005));
  const frames = Math.ceil(a.length / hop);
  const env = new Float32Array(frames);

  for (let f = 0; f < frames; f++) {
    const st = f * hop;
    const en = Math.min(a.length, st + hop);
    let sum = 0;
    for (let i = st; i < en; i++) sum += a[i] * a[i];
    env[f] = Math.sqrt(sum / Math.max(1, en - st));
    if ((f & 63) === 0) {
      track.progress = 0.05 + 0.38 * f / frames;
      renderTracks();
      await sleep(0);
    }
  }

  const sm = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0, count = 0;
    for (let j = -2; j <= 2; j++) {
      const k = f + j;
      if (k >= 0 && k < frames) { sum += env[k]; count++; }
    }
    sm[f] = sum / count;
  }

  const floor = percentile(sm, 0.20);
  const p82 = percentile(sm, 0.82);
  let peak = 0;
  for (const v of sm) peak = Math.max(peak, v);
  const gate = Math.max(0.0022, floor * 2.05, p82 * 0.14, peak * 0.042);
  const active = new Uint8Array(frames);
  for (let f = 0; f < frames; f++) if (sm[f] >= gate) active[f] = 1;

  const bridgeFrames = Math.max(1, Math.round(0.095 * sr / hop));
  let last = -99999;
  for (let f = 0; f < frames; f++) {
    if (!active[f]) continue;
    if (f - last <= bridgeFrames + 1) {
      for (let k = last + 1; k < f; k++) if (k >= 0) active[k] = 1;
    }
    last = f;
  }

  const raw = [];
  const minFrames = Math.max(1, Math.round(0.035 * sr / hop));
  let f = 0;
  while (f < frames) {
    while (f < frames && !active[f]) f++;
    if (f >= frames) break;
    const a0 = f;
    while (f < frames && active[f]) f++;
    const a1 = f - 1;
    if (a1 - a0 + 1 >= minFrames) raw.push([a0, a1]);
  }

  const pre = Math.round(sr * 0.014);
  const post = Math.round(sr * 0.020);
  const regions = [];
  for (const r of raw) {
    let st = Math.max(0, r[0] * hop - pre);
    let en = Math.min(a.length, (r[1] + 1) * hop + post);
    st = nearestZero(a, st, Math.round(sr * 0.003));
    en = nearestZero(a, en, Math.round(sr * 0.003));
    if (en > st) regions.push({ st, en });
  }

  const merged = [];
  const mergeGap = Math.round(sr * 0.055);
  for (const r of regions) {
    const prev = merged[merged.length - 1];
    if (prev && r.st - prev.en <= mergeGap) prev.en = r.en;
    else merged.push({ st: r.st, en: r.en });
  }

  track.regions = merged;
  track.analysisDone = true;
  track.eventCount = merged.length;
  track.progress = 0.50;
  renderTracks();
  await sleep(0);
  return merged;
}

function circularAdd(out, a, st, en, dst, sr) {
  const len = en - st;
  const fade = Math.max(8, Math.round(sr * 0.0035));
  const N = out.length;
  for (let j = 0; j < len; j++) {
    const di = ((dst + j) % N + N) % N;
    let w = 1;
    if (j < fade) w = j / fade;
    else if (len - j < fade) w = (len - j) / fade;
    out[di] += a[st + j] * Math.max(0, Math.min(1, w));
  }
}

function normalizeProcessed(out) {
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (peak > 0.98) {
    const scale = 0.98 / peak;
    for (let i = 0; i < out.length; i++) out[i] *= scale;
  }
}

function nearestGridTarget(sample, mode, sr) {
  const div = mode === 'q4' ? 4 : mode === 'q8' ? 8 : 16;
  const grid = sr * beatDur() * (4 / div);
  return Math.round(sample / grid) * grid;
}

async function buildProcessed(track) {
  if (track.mode === 'original') {
    track.processedBuffer = null;
    track.processedKey = null;
    if (transport.running) restartTransportPreservingPhase();
    renderTracks();
    return;
  }

  const regions = await ensureRegions(track);
  const key = `${track.mode}@${track.strength.toFixed(3)}`;
  const a = track.originalBuffer.getChannelData(0);
  const sr = track.originalBuffer.sampleRate;
  const out = new Float32Array(a.length);
  const beatSamples = Math.round(beatDur() * sr);

  for (let i = 0; i < regions.length; i++) {
    const r = regions[i];
    const center = (r.st + r.en) / 2;
    let target;
    let shift;
    if (track.mode === 'center') {
      const beat = Math.max(0, Math.min(bars * 4 - 1, Math.floor(center / beatSamples)));
      target = (beat + 0.5) * beatSamples;
      shift = Math.round((target - center) * track.strength);
    } else {
      target = nearestGridTarget(r.st, track.mode, sr);
      shift = Math.round((target - r.st) * track.strength);
    }
    circularAdd(out, a, r.st, r.en, r.st + shift, sr);
    if ((i & 7) === 0) {
      track.progress = 0.52 + 0.43 * (i + 1) / Math.max(1, regions.length);
      renderTracks();
      await sleep(0);
    }
  }

  normalizeProcessed(out);
  const b = ctx.createBuffer(1, out.length, sr);
  b.copyToChannel(out, 0);
  track.processedBuffer = b;
  track.processedKey = key;
  track.progress = 1;
  if (track.processing) {
    renderTracks();
    await sleep(60);
    track.processing = false;
  }
  if (transport.running) restartTransportPreservingPhase();
  renderTracks();
}

async function setTrackMode(track, mode) {
  if (track.processing) return;
  track.mode = mode;
  if (mode === 'original') {
    track.processedBuffer = null;
    track.processedKey = null;
    if (transport.running) restartTransportPreservingPhase();
    renderTracks();
    return;
  }
  track.processing = !track.analysisDone;
  track.progress = track.analysisDone ? 0.52 : 0.02;
  renderTracks();
  await buildProcessed(track);
  toast(`${track.name}: ${modeLabel(track.mode)} · ${Math.round(track.strength * 100)}%`);
}

function scheduleStrength(track, value) {
  track.strength = value;
  if (track.debounce) clearTimeout(track.debounce);
  renderTracks();
  if (track.mode === 'original') return;
  track.debounce = setTimeout(async () => {
    if (!track.processing) await buildProcessed(track);
  }, 220);
}
