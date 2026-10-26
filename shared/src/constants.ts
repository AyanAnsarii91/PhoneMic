export const APP_NAME = 'PhoneMic';
export const DEFAULT_PORT = 8990;
export const AUDIO_HEADER_SIZE = 12; // 4 bytes seq + 8 bytes float64 timestamp
export const DEFAULT_PIN_LENGTH = 4;
export const RECONNECT_INTERVAL_MS = 2500;
export const MAX_RECONNECT_ATTEMPTS = 10;
export const PING_INTERVAL_MS = 3000;
export const AUDIO_PACKET_MAGIC = 0x504D4943; // 'PMIC' in ASCII if needed
