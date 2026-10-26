import { AUDIO_HEADER_SIZE } from '@phonemic/shared';

/**
 * Converts Float32Array audio samples (-1.0 to 1.0) to 16-bit Signed Little Endian PCM
 */
export function floatToInt16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

/**
 * Encodes sequence number (uint32) and timestamp (float64) into the audio buffer
 * Total header = 12 bytes
 */
export function packAudioPacket(seq: number, timestamp: number, pcmData: ArrayBuffer): ArrayBuffer {
  const packet = new Uint8Array(AUDIO_HEADER_SIZE + pcmData.byteLength);
  const view = new DataView(packet.buffer);

  // 0-3: Sequence number (uint32)
  view.setUint32(0, seq, true);

  // 4-11: Timestamp in ms (float64)
  view.setFloat64(4, timestamp, true);

  // 12+: PCM payload
  packet.set(new Uint8Array(pcmData), AUDIO_HEADER_SIZE);

  return packet.buffer;
}

/**
 * Calculates Peak (0.0 to 1.0) and RMS from Float32 samples
 */
export function calculateLevels(samples: Float32Array): { peak: number; rms: number; db: number } {
  let peak = 0;
  let sumSquares = 0;
  const len = samples.length;

  for (let i = 0; i < len; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
    sumSquares += samples[i] * samples[i];
  }

  const rms = Math.sqrt(sumSquares / len);
  // Convert RMS to decibels: 20 * log10(rms), clamped between -60dB and 0dB
  const db = rms > 0.0001 ? Math.max(-60, 20 * Math.log10(rms)) : -60;

  return { peak, rms, db };
}
