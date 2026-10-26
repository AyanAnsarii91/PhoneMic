import http from 'http';
import https from 'https';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import {
  WSClientMessage,
  WSServerMessage,
  DEFAULT_AUDIO_CONFIG,
  DeviceInfo,
  AUDIO_HEADER_SIZE
} from '@phonemic/shared';

export interface PhoneMicWSServerOptions {
  server: http.Server | https.Server;
  initialPin?: string;
  onAudioChunk?: (chunk: {
    seq: number;
    timestamp: number;
    latencyMs: number;
    pcmBuffer: Buffer;
    peak: number;
    rms: number;
    db: number;
  }) => void;
  onClientConnected?: (device: DeviceInfo) => void;
  onClientDisconnected?: (deviceId: string) => void;
  onClientStateUpdated?: (device: DeviceInfo) => void;
  onLog?: (log: string) => void;
}

export class PhoneMicWSServer {
  private wss: WebSocketServer;
  private currentPin: string;
  private activeClients: Map<WebSocket, DeviceInfo> = new Map();
  private options: PhoneMicWSServerOptions;

  constructor(options: PhoneMicWSServerOptions) {
    this.options = options;
    this.currentPin = options.initialPin || this.generatePIN();

    this.wss = new WebSocketServer({
      server: options.server,
      path: '/ws'
    });

    this.setupListeners();
  }

  public getPIN(): string {
    return this.currentPin;
  }

  public regeneratePIN(): string {
    this.currentPin = this.generatePIN();
    this.options.onLog?.(`New pairing PIN generated: ${this.currentPin}`);
    return this.currentPin;
  }

  private generatePIN(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  public getActiveDevice(): DeviceInfo | null {
    const first = this.activeClients.values().next();
    return first.done ? null : first.value;
  }

  private setupListeners(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientIp = req.socket.remoteAddress || 'unknown';
      const deviceId = crypto.randomUUID();
      this.options.onLog?.(`Incoming WebSocket connection from ${clientIp}`);

      let isPaired = false;
      let currentDevice: DeviceInfo | null = null;

      ws.on('message', (data: Buffer | ArrayBuffer, isBinary: boolean) => {
        // Handle Binary Audio Stream
        if (isBinary) {
          if (!isPaired) {
            // Drop unauthenticated audio packets
            return;
          }

          const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
          if (buf.length < AUDIO_HEADER_SIZE) return;

          // Parse 12-byte header
          const seq = buf.readUInt32LE(0);
          const sentAt = buf.readDoubleLE(4);
          const latencyMs = Math.max(1, Date.now() - sentAt);

          // PCM 16-bit payload
          const pcmPayload = buf.subarray(AUDIO_HEADER_SIZE);
          const sampleCount = pcmPayload.length / 2;

          let peak = 0;
          let sumSquares = 0;

          for (let i = 0; i < sampleCount; i++) {
            const intVal = pcmPayload.readInt16LE(i * 2);
            const sample = intVal / 32768.0;
            const abs = Math.abs(sample);
            if (abs > peak) peak = abs;
            sumSquares += sample * sample;
          }

          const rms = Math.sqrt(sumSquares / Math.max(1, sampleCount));
          const db = rms > 0.0001 ? Math.max(-60, 20 * Math.log10(rms)) : -60;

          if (currentDevice) {
            currentDevice.latencyMs = latencyMs;
            currentDevice.volumePeak = peak;
          }

          this.options.onAudioChunk?.({
            seq,
            timestamp: sentAt,
            latencyMs,
            pcmBuffer: pcmPayload,
            peak,
            rms,
            db
          });

          return;
        }

        // Handle JSON Control Messages
        try {
          const text = data.toString('utf-8');
          const msg: WSClientMessage = JSON.parse(text);

          if (msg.type === 'pair_request') {
            if (msg.pin === this.currentPin) {
              isPaired = true;
              const sessionToken = crypto.randomBytes(16).toString('hex');

              currentDevice = {
                id: deviceId,
                name: msg.deviceName || 'Android Device',
                ip: clientIp,
                userAgent: req.headers['user-agent'],
                connectedAt: Date.now(),
                isStreaming: false,
                isMuted: false,
                latencyMs: 0,
                sampleRate: DEFAULT_AUDIO_CONFIG.sampleRate,
                volumePeak: 0
              };

              this.activeClients.set(ws, currentDevice);
              this.options.onLog?.(`Device paired successfully: ${currentDevice.name} (${clientIp})`);
              this.options.onClientConnected?.(currentDevice);

              const response: WSServerMessage = {
                type: 'pair_response',
                success: true,
                token: sessionToken,
                audioConfig: DEFAULT_AUDIO_CONFIG
              };
              ws.send(JSON.stringify(response));
            } else {
              this.options.onLog?.(`Failed pairing attempt from ${clientIp}: Invalid PIN`);
              const response: WSServerMessage = {
                type: 'pair_response',
                success: false,
                error: 'Invalid pairing PIN. Check the PC screen.',
                audioConfig: DEFAULT_AUDIO_CONFIG
              };
              ws.send(JSON.stringify(response));
            }
          } else if (msg.type === 'ping') {
            const pong: WSServerMessage = {
              type: 'pong',
              timestamp: msg.timestamp,
              serverTime: Date.now()
            };
            ws.send(JSON.stringify(pong));
          } else if (msg.type === 'start_stream') {
            if (currentDevice) {
              currentDevice.isStreaming = true;
              this.options.onClientStateUpdated?.(currentDevice);
              this.options.onLog?.(`Audio streaming started by ${currentDevice.name}`);
            }
          } else if (msg.type === 'stop_stream') {
            if (currentDevice) {
              currentDevice.isStreaming = false;
              this.options.onClientStateUpdated?.(currentDevice);
              this.options.onLog?.(`Audio streaming stopped by ${currentDevice.name}`);
            }
          } else if (msg.type === 'mute') {
            if (currentDevice) {
              currentDevice.isMuted = msg.muted;
              this.options.onClientStateUpdated?.(currentDevice);
            }
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      });

      ws.on('close', () => {
        if (currentDevice) {
          this.options.onLog?.(`Device disconnected: ${currentDevice.name}`);
          this.options.onClientDisconnected?.(currentDevice.id);
          this.activeClients.delete(ws);
        }
      });

      ws.on('error', (err) => {
        console.error('WebSocket client error:', err);
      });
    });
  }

  public close(): void {
    this.wss.close();
  }
}
