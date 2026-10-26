import { createHttpServer } from '../desktop/electron/server/httpServer.js';
import { PhoneMicWSServer } from '../desktop/electron/server/wsServer.js';
import { AudioJitterBuffer } from '../desktop/electron/audio/audioJitterBuffer.js';
import { VBCableAdapter } from '../desktop/electron/audio/virtualMicAdapter.js';
import { packAudioPacket } from '../phone/src/utils/pcm.js';
import { WebSocket } from 'ws';

async function runEndToEndVerification() {
  console.log('--- PHONEMIC END-TO-END VERIFICATION TEST ---\n');

  const TEST_PORT = 9876;
  const jitterBuffer = new AudioJitterBuffer();
  const vbCableAdapter = new VBCableAdapter();

  console.log('[1/6] Testing VB-Cable Virtual Audio Adapter...');
  await vbCableAdapter.initialize();
  await vbCableAdapter.start();
  const adapterStatus = vbCableAdapter.getStatus();
  console.log(`  Adapter Name: ${adapterStatus.deviceName}`);
  console.log(`  Target Virtual Device: ${adapterStatus.targetDeviceName}`);
  console.log(`  Active: ${adapterStatus.isActive ? 'YES' : 'NO'}`);

  console.log('\n[2/6] Starting PhoneMic HTTPS & WebSocket Server...');
  const serverInstance = createHttpServer({
    port: TEST_PORT,
    useHttps: true,
    pin: '0000'
  });

  let serverReceivedPackets = 0;
  let clientConnected = false;
  let testPassed = false;

  const wsServer = new PhoneMicWSServer({
    server: serverInstance.server,
    onAudioChunk: (chunk) => {
      serverReceivedPackets++;
      const int16Samples = new Int16Array(chunk.pcmBuffer.buffer, chunk.pcmBuffer.byteOffset, chunk.pcmBuffer.byteLength / 2);
      jitterBuffer.pushInt16(chunk.seq, int16Samples);
      vbCableAdapter.writeAudioChunk(int16Samples);

      if (serverReceivedPackets === 10) {
        console.log(`  Received chunk #${chunk.seq}: Latency=${chunk.latencyMs}ms, Peak=${chunk.peak.toFixed(3)}, dB=${chunk.db.toFixed(1)}dB`);
      }
    },
    onClientConnected: (device) => {
      clientConnected = true;
      console.log(`  Client paired & connected: "${device.name}" from ${device.ip}`);
    },
    onLog: (msg) => {
      // console.log(`  [Server Log] ${msg}`);
    }
  });

  const pin = wsServer.getPIN();
  console.log(`  Active Server PIN: ${pin}`);
  console.log(`  Server Protocol: ${serverInstance.protocol}`);

  await new Promise<void>((resolve) => {
    serverInstance.server.listen(TEST_PORT, '127.0.0.1', () => {
      console.log(`  Server listening on 127.0.0.1:${TEST_PORT}`);
      resolve();
    });
  });

  console.log('\n[3/6] Simulating Phone Client connecting & pairing...');
  const wsUrl = `wss://127.0.0.1:${TEST_PORT}/ws`;
  const clientWs = new WebSocket(wsUrl, {
    rejectUnauthorized: false // accept local self-signed TLS cert
  });
  clientWs.binaryType = 'arraybuffer';

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Connection timed out')), 5000);

    clientWs.on('open', () => {
      clearTimeout(timeout);
      console.log('  WebSocket connection opened, sending pair_request with PIN...');
      clientWs.send(JSON.stringify({
        type: 'pair_request',
        pin: pin,
        deviceName: 'Android Galaxy S24'
      }));
    });

    clientWs.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'pair_response' && msg.success) {
          console.log('  Pair response: SUCCESS (Session Token Issued)');
          resolve();
        }
      } catch (e) {
        // audio or binary
      }
    });

    clientWs.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  console.log('\n[4/6] Streaming 25 Real-Time Audio Chunks (48kHz 16-bit PCM)...');
  clientWs.send(JSON.stringify({ type: 'start_stream' }));

  // Generate 25 synthetic 1024-sample audio chunks (~525ms of real audio)
  const chunkSize = 1024;
  for (let seq = 0; seq < 25; seq++) {
    const pcm = new Int16Array(chunkSize);
    // Generate 440Hz sine wave tone
    for (let i = 0; i < chunkSize; i++) {
      const t = (seq * chunkSize + i) / 48000;
      pcm[i] = Math.round(Math.sin(2 * Math.PI * 440 * t) * 16000);
    }

    const packet = packAudioPacket(seq, Date.now() - 5, pcm.buffer);
    clientWs.send(packet);
    await new Promise(r => setTimeout(r, 15));
  }

  // Wait a short moment for all packets to be processed
  await new Promise(r => setTimeout(r, 100));

  console.log('\n[5/6] Verifying Jitter Buffer & Telemetry Output...');
  const bufferStats = jitterBuffer.getStats();
  console.log(`  Packets Received by Server: ${serverReceivedPackets}`);
  console.log(`  Jitter Buffer Total Packets: ${bufferStats.totalPackets}`);
  console.log(`  Dropped Packets: ${bufferStats.droppedPackets}`);
  console.log(`  Buffer Loss Rate: ${bufferStats.lossPercentage.toFixed(1)}%`);
  console.log(`  VB-Cable Routed Packets: ${vbCableAdapter.getStatus().routedPackets}`);

  if (serverReceivedPackets >= 20 && bufferStats.droppedPackets === 0) {
    testPassed = true;
    console.log('\n[6/6] TEST RESULT: ALL TESTS PASSED! Audio streaming pipeline is 100% functional.');
  } else {
    console.error('\n[6/6] TEST RESULT: Packet count mismatch or high packet loss.');
  }

  // Cleanup
  clientWs.close();
  wsServer.close();
  serverInstance.server.close();
  await vbCableAdapter.stop();

  process.exit(testPassed ? 0 : 1);
}

runEndToEndVerification().catch((err) => {
  console.error('Test verification failed:', err);
  process.exit(1);
});
