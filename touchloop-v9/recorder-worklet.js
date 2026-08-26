class TouchLoopRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.armed = false;
    this.id = null;
    this.startFrame = 0;
    this.endFrame = 0;
    this.recorded = 0;
    this.chunkSize = 4096;
    this.chunk = new Float32Array(this.chunkSize);
    this.chunkPos = 0;
    this.port.onmessage = (e) => {
      const m = e.data || {};
      if (m.type === 'arm') {
        this.id = m.id;
        this.startFrame = Math.max(0, Math.round(m.startFrame));
        this.endFrame = this.startFrame + Math.max(1, Math.round(m.lengthFrames));
        this.recorded = 0;
        this.chunk = new Float32Array(this.chunkSize);
        this.chunkPos = 0;
        this.armed = true;
      } else if (m.type === 'abort') {
        this.armed = false;
        this.id = null;
        this.chunkPos = 0;
      }
    };
  }
  flush() {
    if (!this.chunkPos || !this.id) return;
    const out = this.chunk.slice(0, this.chunkPos);
    this.port.postMessage({ type: 'chunk', id: this.id, data: out.buffer }, [out.buffer]);
    this.chunk = new Float32Array(this.chunkSize);
    this.chunkPos = 0;
  }
  finish() {
    if (!this.armed) return;
    const id = this.id;
    this.flush();
    this.armed = false;
    this.id = null;
    this.port.postMessage({ type: 'done', id, frames: this.recorded });
  }
  process(inputs, outputs) {
    const input = inputs[0] && inputs[0][0];
    const output = outputs[0] && outputs[0][0];
    if (output) output.fill(0);
    if (!this.armed || !input) return true;
    const blockStart = currentFrame;
    const blockEnd = blockStart + input.length;
    if (blockEnd <= this.startFrame) return true;
    if (blockStart >= this.endFrame) { this.finish(); return true; }
    const from = Math.max(0, this.startFrame - blockStart);
    const to = Math.min(input.length, this.endFrame - blockStart);
    for (let i = from; i < to; i++) {
      this.chunk[this.chunkPos++] = input[i];
      this.recorded++;
      if (this.chunkPos === this.chunkSize) this.flush();
    }
    if (blockEnd >= this.endFrame) this.finish();
    return true;
  }
}
registerProcessor('touchloop-recorder', TouchLoopRecorder);
