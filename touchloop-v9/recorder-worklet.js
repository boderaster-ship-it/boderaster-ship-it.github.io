class TouchLoopRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.job = null;
    this.port.onmessage = (event) => {
      const m = event.data || {};
      if (m.type === 'arm') {
        const frames = Math.max(1, Math.floor(m.frames || 0));
        this.job = {
          id: m.id,
          startFrame: Math.max(0, Math.floor(m.startFrame || 0)),
          frames,
          written: 0,
          data: new Float32Array(frames)
        };
      } else if (m.type === 'cancel') {
        this.job = null;
      }
    };
  }

  process(inputs, outputs) {
    const out = outputs[0];
    if (out) {
      for (let c = 0; c < out.length; c++) out[c].fill(0);
    }

    const job = this.job;
    const input = inputs[0] && inputs[0][0];
    if (!job || !input || input.length === 0) return true;

    const blockStart = currentFrame;
    const blockEnd = blockStart + input.length;
    const recordStart = job.startFrame;
    const recordEnd = recordStart + job.frames;

    if (blockEnd <= recordStart || blockStart >= recordEnd) return true;

    const copyStart = Math.max(blockStart, recordStart);
    const copyEnd = Math.min(blockEnd, recordEnd);
    const srcOffset = copyStart - blockStart;
    const dstOffset = copyStart - recordStart;
    const count = copyEnd - copyStart;

    if (count > 0) {
      job.data.set(input.subarray(srcOffset, srcOffset + count), dstOffset);
      job.written = Math.max(job.written, dstOffset + count);
    }

    if (copyEnd >= recordEnd) {
      const payload = job.data.buffer;
      const id = job.id;
      this.job = null;
      this.port.postMessage({ type: 'complete', id, frames: job.frames, buffer: payload }, [payload]);
    }
    return true;
  }
}

registerProcessor('touchloop-recorder', TouchLoopRecorderProcessor);
