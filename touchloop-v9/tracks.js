function stopTrackSources(track) {
  for (const source of Array.from(track.liveSources)) {
    try { source.stop(); } catch (_) {}
    transport.sources.delete(source);
  }
  track.liveSources.clear();
}

function structuralEdit(mutator) {
  const wasRunning = transport.running;
  const oldPhase = wasRunning ? transportPhase() : 0;
  mutator();
  normalizeStages();
  renderAll();
  if (wasRunning) startTransportAtPhase(Math.min(oldPhase, sequenceDur() - 0.001));
}

function moveWithinStage(track, direction) {
  structuralEdit(() => {
    const list = sortedStageTracks(track.stage);
    const i = list.indexOf(track);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= list.length) return;
    const tmp = list[i].order;
    list[i].order = list[j].order;
    list[j].order = tmp;
  });
}

function moveStage(track, direction) {
  const target = track.stage + direction;
  if (target < 0 || target >= MAX_STAGES) return;
  if (direction > 0 && sortedStageTracks(track.stage).length <= 1) {
    return toast('Dupliziere die Spur zuerst, damit die aktuelle Ebene nicht leer wird');
  }
  structuralEdit(() => {
    track.stage = target;
    track.order = sortedStageTracks(target).length;
  });
}

function duplicateTrack(track) {
  structuralEdit(() => {
    const copy = newTrackObject(track.originalBuffer, `${track.name} Kopie`);
    copy.processedBuffer = track.processedBuffer;
    copy.processedKey = track.processedKey;
    copy.mode = track.mode;
    copy.strength = track.strength;
    copy.regions = track.regions;
    copy.analysisDone = track.analysisDone;
    copy.eventCount = track.eventCount;
    copy.volume = track.volume;
    copy.stage = track.stage;
    copy.order = track.order + 0.5;
    tracks.push(copy);
  });
  toast(`${track.name} dupliziert`);
}

function deleteTrack(track) {
  structuralEdit(() => {
    stopTrackSources(track);
    tracks = tracks.filter((t) => t !== track);
  });
  if (!tracks.length) stopTransport();
}

function waveform(buffer) {
  const a = buffer.getChannelData(0);
  const n = 48;
  const step = Math.max(1, Math.floor(a.length / n));
  let html = '';
  for (let k = 0; k < n; k++) {
    let peak = 0;
    const end = Math.min(a.length, (k + 1) * step);
    for (let i = k * step; i < end; i++) peak = Math.max(peak, Math.abs(a[i]));
    html += `<i style="height:${Math.max(3, Math.round(peak * 27))}px"></i>`;
  }
  return html;
}

function renderTracks() {
  const el = $('tracks');
  $('trackCount').textContent = `${tracks.length} ${tracks.length === 1 ? 'Spur' : 'Spuren'}`;
  if (!tracks.length) {
    el.innerHTML = '<div class="tracksEmpty">Noch keine Aufnahme</div>';
    return;
  }
  el.innerHTML = '';

  for (let stage = 0; stage < stageCount(); stage++) {
    const group = document.createElement('div');
    group.className = 'stageGroup';
    const list = sortedStageTracks(stage);
    group.innerHTML = `<div class="stageHead"><b>EBENE ${stage + 1}</b><span>${list.length} ${list.length === 1 ? 'Spur' : 'Spuren'} · gleichzeitig</span></div>`;

    list.forEach((track, localIndex) => {
      const card = document.createElement('div');
      card.className = 'track';
      const analyzed = track.analysisDone ? `${track.eventCount} Klangblöcke erkannt` : 'Noch nicht analysiert';
      const timingStatus = track.processing
        ? 'Analyse läuft…'
        : track.mode === 'original'
          ? 'Originalaufnahme aktiv'
          : `${modeLabel(track.mode)} · ${Math.round(track.strength * 100)}% · ${analyzed}`;
      const canNext = stage < MAX_STAGES - 1 && list.length > 1;
      const canPrev = stage > 0;

      card.innerHTML = `
        <div class="trackTop">
          <div><div class="trackName">${track.name}</div><div class="trackMeta">EBENE ${stage + 1} · POSITION ${localIndex + 1}</div></div>
          <button class="tiny ${!track.muted ? 'playing' : ''}" data-act="mute">${track.muted ? '▶' : 'Ⅱ'}</button>
          <button class="tiny del" data-act="del">×</button>
        </div>
        <div class="wave">${waveform(activeBuffer(track))}</div>
        <div class="volRow"><span>LAUTST.</span><input class="range" data-act="vol" type="range" min="0" max="150" value="${Math.round(track.volume * 100)}"><span>${Math.round(track.volume * 100)}%</span></div>
        <div class="structureBox">
          <div class="structureTitle"><b>STRUKTUR</b><span class="levelBadge">Ebene ${stage + 1}</span></div>
          <div class="structureGrid">
            <button class="structBtn" data-act="up" ${localIndex === 0 ? 'disabled' : ''}>↑ HOCH</button>
            <button class="structBtn" data-act="down" ${localIndex === list.length - 1 ? 'disabled' : ''}>↓ RUNTER</button>
            <button class="structBtn primary" data-act="prev" ${!canPrev ? 'disabled' : ''}>← EBENE</button>
            <button class="structBtn next" data-act="next" ${!canNext ? 'disabled' : ''}>EBENE →</button>
            <button class="structBtn copy" data-act="copy">⧉ DUPLIZIEREN</button>
          </div>
        </div>
        <div class="timingBox">
          <div class="timingTitle"><b>TIMING DIESER SPUR</b><span class="timingStatus">${timingStatus}</span></div>
          <div class="modeSeg">
            ${['original', 'q4', 'q8', 'q16', 'center'].map((m) => `<button class="modeBtn ${m === 'original' ? 'original ' : ''}${track.mode === m ? 'on' : ''}" data-mode="${m}">${modeLabel(m).toUpperCase()}</button>`).join('')}
          </div>
          <div class="strengthRow ${track.mode === 'original' ? 'disabled' : ''}"><span>STÄRKE</span><input class="range" data-act="strength" type="range" min="0" max="100" value="${Math.round(track.strength * 100)}" ${track.mode === 'original' ? 'disabled' : ''}><span>${Math.round(track.strength * 100)}%</span></div>
          <div class="analysisInfo">${track.analysisDone ? 'Analyse gespeichert · Moduswechsel verwendet dieselben Klangblöcke.' : 'Beim ersten Timing-Modus wird die Spur einmal analysiert. Ganze Wörter/Töne bleiben zusammen.'}</div>
          ${track.processing ? `<div class="progress"><span style="width:${Math.round(track.progress * 100)}%"></span></div><div class="progressText">${Math.round(track.progress * 100)}%</div>` : ''}
        </div>`;

      card.querySelector('[data-act=mute]').onclick = () => {
        track.muted = !track.muted;
        ensureTrackGain(track).gain.setTargetAtTime(track.muted ? 0 : track.volume, ctx.currentTime, 0.008);
        renderTracks();
      };
      card.querySelector('[data-act=del]').onclick = () => deleteTrack(track);
      card.querySelector('[data-act=up]').onclick = () => moveWithinStage(track, -1);
      card.querySelector('[data-act=down]').onclick = () => moveWithinStage(track, 1);
      card.querySelector('[data-act=prev]').onclick = () => moveStage(track, -1);
      card.querySelector('[data-act=next]').onclick = () => moveStage(track, 1);
      card.querySelector('[data-act=copy]').onclick = () => duplicateTrack(track);

      const vol = card.querySelector('[data-act=vol]');
      vol.oninput = (e) => {
        track.volume = Number(e.target.value) / 100;
        ensureTrackGain(track).gain.setTargetAtTime(track.muted ? 0 : track.volume, ctx.currentTime, 0.008);
        e.target.nextElementSibling.textContent = `${Math.round(track.volume * 100)}%`;
      };
      card.querySelectorAll('[data-mode]').forEach((btn) => { btn.onclick = () => setTrackMode(track, btn.dataset.mode); });
      const strength = card.querySelector('[data-act=strength]');
      if (strength) strength.oninput = (e) => {
        const value = Number(e.target.value) / 100;
        e.target.nextElementSibling.textContent = `${Math.round(value * 100)}%`;
        scheduleStrength(track, value);
      };

      group.appendChild(card);
    });
    el.appendChild(group);
  }
}

function renderAll() {
  renderSequence();
  renderTracks();
  buttons();
}
