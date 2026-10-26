import { createHttpServer } from './httpServer.js';
import { PhoneMicWSServer } from './wsServer.js';
import { getLocalIPAddresses, getPrimaryLANIP } from './networkUtils.js';
import { VirtualMicManager } from '../audio/virtualMicAdapter.js';
import { DEFAULT_PORT, sanitizeHostAndPort } from '@phonemic/shared';

const SERVER_PORT = DEFAULT_PORT;
const USE_HTTPS = true;

const rawPrimaryIP = getPrimaryLANIP();
const primaryIP = sanitizeHostAndPort(rawPrimaryIP, SERVER_PORT).host;
const addresses = getLocalIPAddresses();

console.log('====================================================');
console.log('   🎙️ PhoneMic Server (Standalone / Local Mode)   ');
console.log('====================================================\n');

const virtualMicManager = new VirtualMicManager();

// Initialize Windows Virtual Audio Adapter (VB-Audio CABLE Input)
virtualMicManager.getActiveAdapter().initialize().then(() => {
  virtualMicManager.getActiveAdapter().start().then((started) => {
    const status = virtualMicManager.getStatus();
    if (started && status.isOpen) {
      console.log(`✅ PhoneMic Virtual Audio Adapter ACTIVE -> Writing to: ${status.openedEndpoint}`);
    } else {
      console.warn(`⚠️ PhoneMic Virtual Audio Adapter standby (${status.diagnosticMessage})`);
    }
  });
});

let wsServer: PhoneMicWSServer;
const serverInstance = createHttpServer({
  port: SERVER_PORT,
  useHttps: USE_HTTPS,
  getPin: () => (wsServer ? wsServer.getPIN() : '0000'),
  getActiveDevice: () => (wsServer ? wsServer.getActiveDevice() : null),
  getVirtualMicStatus: () => virtualMicManager.getStatus()
});

wsServer = new PhoneMicWSServer({
  server: serverInstance.server,
  onAudioChunk: (chunk) => {
    // 1. Extract 16-bit PCM samples
    const sampleCount = chunk.pcmBuffer.length / 2;
    const int16Samples = new Int16Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      int16Samples[i] = chunk.pcmBuffer.readInt16LE(i * 2);
    }

    // 2. Stream audio directly to VB-Audio CABLE Input
    virtualMicManager.getActiveAdapter().writeAudioChunk(int16Samples);

    if (chunk.seq % 50 === 0) {
      const status = virtualMicManager.getStatus();
      const endpoint = status.openedEndpoint || 'CABLE Input';
      const routingStatus = status.isOpen && status.isWritingContinuously ? 'ACTIVE' : 'FAILING';
      console.log(`[Audio Streaming] Seq: #${chunk.seq} | Latency: ${chunk.latencyMs}ms | In Peak: ${chunk.peak.toFixed(3)} | Out Peak: ${(status.outputPeak || 0).toFixed(3)} | VB-CABLE: ${routingStatus} (${endpoint})`);
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

process.on('SIGINT', async () => {
  console.log('\nStopping PhoneMic Standalone Server...');
  await virtualMicManager.getActiveAdapter().stop();
  wsServer.close();
  serverInstance.server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await virtualMicManager.getActiveAdapter().stop();
  wsServer.close();
  serverInstance.server.close();
  process.exit(0);
});
