import { createHttpServer } from './httpServer.js';
import { PhoneMicWSServer } from './wsServer.js';
import { getLocalIPAddresses, getPrimaryLANIP } from './networkUtils.js';
import { DEFAULT_PORT, sanitizeHostAndPort } from '@phonemic/shared';

const SERVER_PORT = DEFAULT_PORT;
const USE_HTTPS = true;

const rawPrimaryIP = getPrimaryLANIP();
const primaryIP = sanitizeHostAndPort(rawPrimaryIP, SERVER_PORT).host;
const addresses = getLocalIPAddresses();

console.log('====================================================');
console.log('   🎙️ PhoneMic Server (Standalone / Local Mode)   ');
console.log('====================================================\n');

const serverInstance = createHttpServer({
  port: SERVER_PORT,
  useHttps: USE_HTTPS,
  pin: '0000'
});

const wsServer = new PhoneMicWSServer({
  server: serverInstance.server,
  onAudioChunk: (chunk) => {
    if (chunk.seq % 50 === 0) {
      console.log(`[Audio Streaming] Seq: #${chunk.seq} | Latency: ${chunk.latencyMs}ms | Peak: ${chunk.peak.toFixed(2)} | dB: ${chunk.db.toFixed(1)} dB`);
    }
  },
  onClientConnected: (device) => {
    console.log(`\n✅ Phone connected & paired successfully: ${device.name} (${device.ip})`);
  },
  onClientDisconnected: (id) => {
    console.log(`\n❌ Phone disconnected: ${id}`);
  },
  onLog: (msg) => {
    console.log(`[Server] ${msg}`);
  }
});

const pin = wsServer.getPIN();
const proto = USE_HTTPS ? 'https' : 'http';
const wsProto = USE_HTTPS ? 'wss' : 'ws';
const pairingUrl = `${proto}://${primaryIP}:${SERVER_PORT}/?ip=${primaryIP}&port=${SERVER_PORT}&pin=${pin}&proto=${wsProto}`;

serverInstance.server.listen(SERVER_PORT, '0.0.0.0', () => {
  console.log(`Primary Network IP (USB Tethering / LAN): ${primaryIP}`);
  console.log(`Available Network Interfaces:`);
  addresses.forEach(a => console.log(`  - ${a.name}: ${a.address} ${a.isWireless ? '(Wi-Fi)' : ''}`));
  console.log(`\n🔐 Pairing PIN: ${pin}`);
  console.log(`📱 Connect your Android phone to:`);
  console.log(`   👉 ${pairingUrl}\n`);
  console.log(`Server listening on port ${SERVER_PORT} over ${proto.toUpperCase()} (0.0.0.0)`);
  console.log('====================================================\n');
});
