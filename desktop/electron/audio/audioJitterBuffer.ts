/**
 * Ring buffer / Jitter buffer for PCM audio streaming over Wi-Fi
 */
export class AudioJitterBuffer {
  private buffer: Float32Array;
  private writePos = 0;
  private readPos = 0;
  private capacity: number;
  private availableSamples = 0;
  private lastSeq = -1;
  private droppedPackets = 0;
  private totalPackets = 0;

  constructor(capacity = 48000 * 2) { // 2 seconds capacity
    this.capacity = capacity;
    this.buffer = new Float32Array(capacity);
  }

  /**
   * Pushes raw Int16 PCM samples with sequence number
   */
  public pushInt16(seq: number, int16Data: Int16Array): void {
    this.totalPackets++;

    if (this.lastSeq !== -1) {
      const diff = seq - (this.lastSeq + 1);
      if (diff > 0) {
        this.droppedPackets += diff;
      }
    }
    this.lastSeq = seq;

    const len = int16Data.length;
    for (let i = 0; i < len; i++) {
      const sample = int16Data[i] / 32768.0;
      this.buffer[this.writePos] = sample;
      this.writePos = (this.writePos + 1) % this.capacity;
    }

    this.availableSamples = Math.min(this.capacity, this.availableSamples + len);
  }

  /**
   * Reads requested number of Float32 samples from jitter buffer
   */
  public readFloat32(output: Float32Array): number {
    const len = output.length;
    const toRead = Math.min(len, this.availableSamples);

    for (let i = 0; i < toRead; i++) {
      output[i] = this.buffer[this.readPos];
      this.readPos = (this.readPos + 1) % this.capacity;
    }

    // Fill remaining with silence if underrun occurs
    for (let i = toRead; i < len; i++) {
      output[i] = 0;
    }

    this.availableSamples -= toRead;
    return toRead;
  }

  public getStats() {
    return {
      availableSamples: this.availableSamples,
      capacity: this.capacity,
      fillRatio: this.availableSamples / this.capacity,
      droppedPackets: this.droppedPackets,
      totalPackets: this.totalPackets,
      lossPercentage: this.totalPackets > 0 ? (this.droppedPackets / (this.totalPackets + this.droppedPackets)) * 100 : 0
    };
  }

  public reset(): void {
    this.writePos = 0;
    this.readPos = 0;
    this.availableSamples = 0;
    this.lastSeq = -1;
    this.droppedPackets = 0;
    this.totalPackets = 0;
    this.buffer.fill(0);
  }
}
