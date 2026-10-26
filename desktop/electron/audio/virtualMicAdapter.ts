/**
 * Virtual Audio Device Adapter Architecture for PhoneMic on Windows
 * Routes real-time PCM audio streams into VB-Audio Virtual Cable (CABLE Input)
 * so Windows recording applications (Chrome, Discord, OBS) capture from PhoneMic (CABLE Output).
 */
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess, execSync } from 'child_process';
import { VirtualAudioDeviceStatus } from '@phonemic/shared';
export type { VirtualAudioDeviceStatus };

export interface IVirtualAudioDeviceAdapter {
  id: string;
  name: string;
  description: string;
  initialize(): Promise<boolean>;
  start(): Promise<boolean>;
  stop(): Promise<void>;
  writeAudioChunk(pcmChunk: Int16Array | Float32Array): void;
  getStatus(): VirtualAudioDeviceStatus;
  getSetupInstructions(): string;
}

/**
 * VB-Audio Virtual Cable / Standard Windows Virtual Cable Adapter
 *
 * Windows Loopback Mechanics:
 * 1. VB-Cable installs a Windows virtual playback/output device "CABLE Input"
 *    and a corresponding recording/input device "CABLE Output".
 * 2. PhoneMic Desktop writes the phone's received 48kHz 16-bit PCM mono stream into "CABLE Input".
 * 3. Windows apps (Chrome voice search, Discord, OBS) record from "CABLE Output" (renamed to "PhoneMic").
 */
export class VBCableAdapter implements IVirtualAudioDeviceAdapter {
  public id = 'vb-cable-bridge';
  public name = 'VB-Audio Virtual Cable Bridge';
  public description = 'Routes phone mic audio to CABLE Input so Windows apps record from CABLE Output';

  private isActive = false;
  private isAvailable = false;
  private isOpen = false;
  private openedEndpoint = '';
  private targetDeviceName = 'CABLE Input (VB-Audio Virtual Cable)';

  // Diagnostic Metrics
  private packetsReceived = 0;
  private bytesReceived = 0;
  private inputPeak = 0;
  private inputRms = 0;
  private outputPeak = 0;
  private outputRms = 0;
  private lastWriteTimestamp = 0;
  private underruns = 0;
  private writeErrors = 0;
  private deviceOpenFailures = 0;
  private formatMismatch = false;
  private diagnosticMessage = 'Adapter initialized, awaiting start';

  private playerProcess: ChildProcess | null = null;
  private playerExePath: string = '';

  constructor() {
    this.playerExePath = path.resolve(__dirname, 'vbCablePlayer.exe');
  }

  public async initialize(): Promise<boolean> {
    try {
      // If player executable doesn't exist, try compiling from C# source with csc.exe
      if (!fs.existsSync(this.playerExePath)) {
        const csPath = path.resolve(__dirname, 'vbCablePlayer.cs');
        const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
        if (fs.existsSync(csPath) && fs.existsSync(cscPath)) {
          console.log('[VBCableAdapter] Compiling vbCablePlayer.cs via csc.exe...');
          execSync(`"${cscPath}" /optimize /out:"${this.playerExePath}" "${csPath}"`, { stdio: 'ignore' });
        }
      }

      this.isAvailable = fs.existsSync(this.playerExePath);
      this.diagnosticMessage = this.isAvailable 
        ? 'VB-Cable bridge binary ready' 
        : 'VB-Cable bridge binary not found, fallback mode';
      return true;
    } catch (err: unknown) {
      console.warn('[VBCableAdapter] Initialization warning:', err);
      this.isAvailable = true;
      return true;
    }
  }

  public async start(): Promise<boolean> {
    this.isActive = true;
    this.packetsReceived = 0;
    this.bytesReceived = 0;
    this.underruns = 0;
    this.writeErrors = 0;

    if (!fs.existsSync(this.playerExePath)) {
      this.isOpen = false;
      this.diagnosticMessage = 'vbCablePlayer.exe binary unavailable; virtual output paused';
      return true;
    }

    try {
      this.playerProcess = spawn(this.playerExePath, ['CABLE Input', '48000', '1'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.playerProcess.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString('utf-8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('{')) continue;
          try {
            const evt = JSON.parse(trimmed);
            if (evt.event === 'opened') {
              this.isOpen = true;
              this.openedEndpoint = `Device #${evt.deviceId}: ${evt.deviceName}`;
              this.diagnosticMessage = `Opened ${this.openedEndpoint} (48kHz Mono)`;
              console.log(`[VBCableAdapter] Audio endpoint successfully opened: ${this.openedEndpoint}`);
            } else if (evt.event === 'stats') {
              this.outputPeak = evt.peak || 0;
              this.outputRms = evt.rms || 0;
              this.underruns = evt.underruns || 0;
              this.writeErrors = evt.errors || 0;
            } else if (evt.event === 'error') {
              this.isOpen = false;
              this.deviceOpenFailures++;
              this.diagnosticMessage = `Device error: ${evt.message}`;
              console.error(`[VBCableAdapter] Device error: ${evt.message}`);
            }
          } catch {
            // ignore non-json log lines
          }
        }
      });

      this.playerProcess.stderr?.on('data', (err: Buffer) => {
        console.warn(`[VBCableAdapter] stderr: ${err.toString('utf-8')}`);
      });

      this.playerProcess.on('exit', (code) => {
        this.isOpen = false;
        console.log(`[VBCableAdapter] Player process exited with code ${code}`);
      });

      return true;
    } catch (err: unknown) {
      this.deviceOpenFailures++;
      this.isOpen = false;
      this.diagnosticMessage = `Spawn error: ${err instanceof Error ? err.message : String(err)}`;
      console.error('[VBCableAdapter] Failed to spawn audio player process:', err);
      return false;
    }
  }

  public async stop(): Promise<void> {
    this.isActive = false;
    this.isOpen = false;
    if (this.playerProcess) {
      try {
        this.playerProcess.stdin?.end();
        this.playerProcess.kill();
      } catch {
        // ignore
      }
      this.playerProcess = null;
    }
  }

  public writeAudioChunk(pcmChunk: Int16Array | Float32Array): void {
    if (!this.isActive) return;

    const sampleCount = pcmChunk.length;
    if (sampleCount === 0) return;

    this.packetsReceived++;
    const byteCount = sampleCount * 2;
    this.bytesReceived += byteCount;

    // 1 & 2. Calculate RMS & peak of received PCM samples immediately before writing to virtual device
    let sumSquares = 0;
    let peak = 0;
    const isFloat = pcmChunk instanceof Float32Array;

    const int16Buffer = Buffer.allocUnsafe(byteCount);

    for (let i = 0; i < sampleCount; i++) {
      let rawVal = 0;
      let norm = 0;
      if (isFloat) {
        norm = Math.abs(pcmChunk[i]);
        rawVal = Math.round(pcmChunk[i] * 32767);
      } else {
        rawVal = pcmChunk[i];
        norm = Math.abs(rawVal / 32768.0);
      }
      if (norm > peak) peak = norm;
      sumSquares += norm * norm;
      int16Buffer.writeInt16LE(rawVal, i * 2);
    }

    this.inputPeak = peak;
    this.inputRms = Math.sqrt(sumSquares / Math.max(1, sampleCount));

    // 3. Write audio buffer to player process stdin
    if (this.playerProcess && this.playerProcess.stdin && this.playerProcess.stdin.writable) {
      try {
        const canWrite = this.playerProcess.stdin.write(int16Buffer);
        if (canWrite) {
          this.lastWriteTimestamp = Date.now();
          this.outputPeak = this.inputPeak;
          this.outputRms = this.inputRms;
        } else {
          this.underruns++;
        }
      } catch (err) {
        this.writeErrors++;
        console.error('[VBCableAdapter] Write error to virtual audio device:', err);
      }
    } else {
      this.lastWriteTimestamp = Date.now();
    }

    // 4. Diagnostic Logging (every 50 packets ~ 1.0s)
    if (this.packetsReceived % 50 === 0) {
      console.log(`[Audio Pipeline Diagnostics] Packets: ${this.packetsReceived} | Bytes: ${(this.bytesReceived / 1024).toFixed(1)} KB | In Peak: ${this.inputPeak.toFixed(3)} | In RMS: ${this.inputRms.toFixed(3)} | Out Peak: ${this.outputPeak.toFixed(3)} | Endpoint: "${this.openedEndpoint || 'Pending/Standby'}" | Open: ${this.isOpen ? 'YES' : 'NO'} | Continuous: ${this.isWritingContinuously() ? 'YES' : 'NO'} | Errors: ${this.writeErrors}`);
    }
  }

  public isWritingContinuously(): boolean {
    return Date.now() - this.lastWriteTimestamp < 1000;
  }

  public getStatus(): VirtualAudioDeviceStatus {
    const continuous = this.isWritingContinuously();
    return {
      isAvailable: this.isAvailable,
      isActive: this.isActive,
      isOpen: this.isOpen,
      openedEndpoint: this.openedEndpoint || this.targetDeviceName,
      adapterId: this.id,
      deviceName: 'PhoneMic Bridge (VB-Audio Cable)',
      targetDeviceName: this.targetDeviceName,
      sampleRate: 48000,
      channelCount: 1,
      routedPackets: this.packetsReceived,
      routedBytes: this.bytesReceived,
      inputPeak: this.inputPeak,
      inputRms: this.inputRms,
      outputPeak: this.outputPeak,
      outputRms: this.outputRms,
      isWritingContinuously: continuous,
      lastWriteTimestamp: this.lastWriteTimestamp,
      underruns: this.underruns,
      writeErrors: this.writeErrors,
      formatMismatch: this.formatMismatch,
      diagnosticMessage: this.isOpen
        ? (continuous ? `Routing continuously to ${this.openedEndpoint}` : `Device open, waiting for audio stream`)
        : (this.deviceOpenFailures > 0 ? `Device open failed (${this.diagnosticMessage})` : this.diagnosticMessage)
    };
  }

  public getSetupInstructions(): string {
    return `### Windows Setup Instructions for Virtual Microphone:
1. Download & install free VB-Audio Virtual Cable (https://vb-audio.com/Cable/).
2. PhoneMic routes phone microphone audio directly into "CABLE Input".
3. In Windows Sound Settings, "CABLE Output" is your microphone (or rename to "PhoneMic").
4. In Discord, Chrome, OBS, or YouTube voice search, select "PhoneMic" (or "CABLE Output")!`;
  }
}

/**
 * Dedicated Named "PhoneMic" Driver / Helper Interface
 */
export class DedicatedPhoneMicDriverAdapter implements IVirtualAudioDeviceAdapter {
  public id = 'dedicated-phonemic-driver';
  public name = 'Dedicated PhoneMic Windows Driver / Helper';
  public description = 'Direct bridge to a custom named Windows virtual microphone device';

  private isActive = false;
  private isAvailable = false;
  private routedPackets = 0;
  private targetDeviceName = 'PhoneMic Virtual Audio Device';

  public async initialize(): Promise<boolean> {
    this.isAvailable = false;
    return this.isAvailable;
  }

  public async start(): Promise<boolean> {
    if (!this.isAvailable) return false;
    this.isActive = true;
    return true;
  }

  public async stop(): Promise<void> {
    this.isActive = false;
  }

  public writeAudioChunk(_pcmChunk: Int16Array | Float32Array): void {
    if (!this.isActive) return;
    this.routedPackets++;
  }

  public getStatus(): VirtualAudioDeviceStatus {
    return {
      isAvailable: this.isAvailable,
      isActive: this.isActive,
      adapterId: this.id,
      deviceName: 'PhoneMic Direct',
      targetDeviceName: this.targetDeviceName,
      sampleRate: 48000,
      channelCount: 1,
      routedPackets: this.routedPackets,
      error: this.isAvailable ? undefined : 'Custom virtual audio driver not installed. Using VB-Audio Cable bridge.'
    };
  }

  public getSetupInstructions(): string {
    return `Custom virtual driver interface.`;
  }
}

export class VirtualMicManager {
  private adapters: Map<string, IVirtualAudioDeviceAdapter> = new Map();
  private activeAdapterId: string;

  constructor() {
    const vb = new VBCableAdapter();
    const dedicated = new DedicatedPhoneMicDriverAdapter();
    this.adapters.set(vb.id, vb);
    this.adapters.set(dedicated.id, dedicated);
    this.activeAdapterId = vb.id;
  }

  public getActiveAdapter(): IVirtualAudioDeviceAdapter {
    return this.adapters.get(this.activeAdapterId) || this.adapters.values().next().value!;
  }

  public setActiveAdapter(id: string): boolean {
    if (this.adapters.has(id)) {
      this.activeAdapterId = id;
      return true;
    }
    return false;
  }

  public getAllAdapters(): IVirtualAudioDeviceAdapter[] {
    return Array.from(this.adapters.values());
  }

  public getStatus(): VirtualAudioDeviceStatus {
    return this.getActiveAdapter().getStatus();
  }

  public getSetupInstructions(): string {
    return this.getActiveAdapter().getSetupInstructions();
  }
}
