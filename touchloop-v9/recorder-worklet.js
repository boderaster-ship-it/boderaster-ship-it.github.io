class TouchLoopRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.armed = false;
    this.startFrame = 0;
    this.targetFrames = 0;
    this.writeIndex = 0;
    this.buffer = null;
    this.port.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === 'arm') {
        this.startFrame = Math.max(0, Math.floor(data.startFrame || 0));
        this.targetFrames = Math.max(1, Math.floor(data.targetFrames || 1));
        this.writeIndex = 0;
        this.buffer = new Float32Array(this.targetFrames);
        this.armed = true;
        this.port.postMessage({ type: 'armed', startFrame: this.startFrame, targetFrames: this.targetFrames });
      } else if (data.type === 'cancel') {
        this.armed = false;
        this.buffer = null;
        this.writeIndex = 0;
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (output) {
      for (const channel of output) channel.fill(0);
    }
    if (!this.armed || !this.buffer) return true;

    const input = inputs[0];
    const channel = input && input[0];
    const quantumFrames = channel ? channel.length : 128;
    const quantumStart = currentFrame;
    const quantumEnd = quantumStart + quantumFrames;

    if (quantumEnd <= this.startFrame) return true;

    let sourceIndex = Math.max(0, this.startFrame - quantumStart);
    while (sourceIndex < quantumFrames && this.writeIndex < this.targetFrames) {
      this.buffer[this.writeIndex++] = channel ? channel[sourceIndex] : 0;
      sourceIndex++;
    }

    if (this.writeIndex >= this.targetFrames) {
      const completed = this.buffer;
      this.armed = false;
      this.buffer = null;
      this.writeIndex = 0;
      this.port.postMessage(
        { type: 'complete', pcm: completed.buffer, sampleRate },
        [completed.buffer]
      );
    }
    return true;
  }
}

registerProcessor('touchloop-recorder-v9', TouchLoopRecorderProcessor);
