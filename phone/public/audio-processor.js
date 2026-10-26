/**
 * PhoneMic AudioWorkletProcessor
 * Runs on the audio rendering thread for ultra-low latency & zero audio dropouts.
 */
class PhoneMicAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 1024;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.isMuted = false;

    this.port.onmessage = (event) => {
      if (event.data && typeof event.data.muted === 'boolean') {
        this.isMuted = event.data.muted;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) {
      return true;
    }

    const channelData = input[0];
    const len = channelData.length;

    let peak = 0;
    let sumSquares = 0;

    for (let i = 0; i < len; i++) {
      const sample = this.isMuted ? 0 : channelData[i];
      this.buffer[this.bufferIndex++] = sample;

      const abs = Math.abs(sample);
      if (abs > peak) peak = abs;
      sumSquares += sample * sample;

      // When our chunk buffer is full (1024 samples ~ 21ms at 48kHz)
      if (this.bufferIndex >= this.bufferSize) {
        // Convert Float32 (-1.0 to 1.0) to 16-bit signed PCM (-32768 to 32767)
        const int16Data = new Int16Array(this.bufferSize);
        for (let j = 0; j < this.bufferSize; j++) {
          const s = Math.max(-1, Math.min(1, this.buffer[j]));
          int16Data[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        const rms = Math.sqrt(sumSquares / this.bufferSize);

        // Send to main thread
        this.port.postMessage({
          type: 'audio_chunk',
          pcm: int16Data.buffer,
          peak: peak,
          rms: rms
        }, [int16Data.buffer]);

        this.bufferIndex = 0;
        peak = 0;
        sumSquares = 0;
      }
    }

    return true;
  }
}

registerProcessor('phone-mic-processor', PhoneMicAudioProcessor);
