export interface AudioConfig {
  sampleRate: number;      // e.g. 48000
  channelCount: number;    // 1 (mono)
  bufferSize: number;      // e.g. 1024 samples
  bitDepth: 16;            // Int16 PCM
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 48000,
  channelCount: 1,
  bufferSize: 1024,
  bitDepth: 16
};

export interface PairingPayload {
  ip: string;
  port: number;
  protocol: 'ws' | 'wss';
  pin: string;
  token?: string;
  url: string;
}

export type ConnectionState = 
  | 'idle'
  | 'connecting'
  | 'pairing'
  | 'connected'
  | 'streaming'
  | 'paused'
  | 'disconnected'
  | 'error';

export interface DeviceInfo {
  id: string;
  name: string;
  ip: string;
  userAgent?: string;
  connectedAt: number;
  batteryLevel?: number;
  isStreaming: boolean;
  isMuted: boolean;
  latencyMs: number;
  sampleRate: number;
  volumePeak: number;
}

export type WSClientMessage =
  | { type: 'pair_request'; pin: string; deviceName: string; audioConfig?: Partial<AudioConfig> }
  | { type: 'start_stream' }
  | { type: 'stop_stream' }
  | { type: 'mute'; muted: boolean }
  | { type: 'ping'; timestamp: number }
  | { type: 'client_stats'; batteryLevel?: number; audioPeak?: number };

export type WSServerMessage =
  | { type: 'pair_response'; success: boolean; token?: string; error?: string; audioConfig: AudioConfig }
  | { type: 'stream_state'; streaming: boolean; muted: boolean }
  | { type: 'pong'; timestamp: number; serverTime: number }
  | { type: 'device_disconnected'; reason?: string }
  | { type: 'error'; code: string; message: string };

export interface AudioStats {
  bytesReceived: number;
  packetsReceived: number;
  packetLoss: number;
  latencyMs: number;
  peakDb: number;
  rms: number;
  bufferHealth: number; // 0 to 100%
}

export interface NetworkAddressItem {
  name: string;
  address: string;
  isWireless: boolean;
}

export interface ServerInfo {
  addresses: NetworkAddressItem[];
  selectedAddress: string;
  port: number;
  protocol: 'http' | 'https';
  pin: string;
  qrPayload: string;
  phoneWebUrl: string;
}

export interface AudioPacketTelemetry {
  seq: number;
  timestamp: number;
  latencyMs: number;
  peak: number;
  rms: number;
  db: number;
  pcmData: number[]; // Serialized Int16 samples for Web Audio playback in renderer
}

export interface VirtualAudioDeviceStatus {
  isAvailable: boolean;
  isActive: boolean;
  adapterId: string;
  deviceName: string;
  targetDeviceName: string;
  sampleRate: number;
  channelCount: number;
  routedPackets: number;
  error?: string;

  // Real-time audio pipeline diagnostic metrics
  isOpen?: boolean;
  openedEndpoint?: string;
  routedBytes?: number;
  inputPeak?: number;
  inputRms?: number;
  outputPeak?: number;
  outputRms?: number;
  isWritingContinuously?: boolean;
  lastWriteTimestamp?: number;
  underruns?: number;
  writeErrors?: number;
  formatMismatch?: boolean;
  diagnosticMessage?: string;
}

export interface PhoneMicDesktopAPI {
  getServerInfo: () => Promise<ServerInfo>;
  getActiveDevice?: () => Promise<DeviceInfo | null>;
  regeneratePin: () => Promise<string>;
  selectIPAddress: (ip: string) => Promise<ServerInfo>;
  getVirtualMicStatus: () => Promise<VirtualAudioDeviceStatus>;
  getVirtualMicInstructions: () => Promise<string>;
  openExternalUrl: (url: string) => Promise<void>;
  onAudioData: (callback: (telemetry: AudioPacketTelemetry) => void) => () => void;
  onDeviceConnected: (callback: (device: DeviceInfo) => void) => () => void;
  onDeviceDisconnected: (callback: (deviceId: string) => void) => () => void;
  onDeviceStateUpdated: (callback: (device: DeviceInfo) => void) => () => void;
  onLog: (callback: (log: string) => void) => () => void;
}
