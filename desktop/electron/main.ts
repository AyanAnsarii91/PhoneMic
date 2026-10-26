import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { createHttpServer, ServerInstance } from './server/httpServer';
import { PhoneMicWSServer } from './server/wsServer';
import { getLocalIPAddresses, getPrimaryLANIP } from './server/networkUtils';
import { VirtualMicManager } from './audio/virtualMicAdapter';
import { DEFAULT_PORT, sanitizeHostAndPort } from '@phonemic/shared';

let mainWindow: BrowserWindow | null = null;
let serverInstance: ServerInstance | null = null;
let wsServer: PhoneMicWSServer | null = null;
const virtualMicManager = new VirtualMicManager();

let selectedIP = '';
const SERVER_PORT = DEFAULT_PORT;
const USE_HTTPS = true; // HTTPS ensures phone mobile browsers grant getUserMedia mic permissions!

function constructServerInfo() {
  const addresses = getLocalIPAddresses();
  if (!selectedIP && addresses.length > 0) {
    selectedIP = addresses[0].address;
  } else if (!selectedIP) {
    selectedIP = '127.0.0.1';
  }

  // Ensure IP is clean without port
  const sanitized = sanitizeHostAndPort(selectedIP, SERVER_PORT);
  selectedIP = sanitized.host;

  const pin = wsServer ? wsServer.getPIN() : '0000';
  const proto = USE_HTTPS ? 'https' : 'http';
  const wsProto = USE_HTTPS ? 'wss' : 'ws';

  // URL for phone client: If phone Vite dev server is running on 5173, or directly from desktop server on 8990!
  const phoneWebUrl = `${proto}://${selectedIP}:${SERVER_PORT}/?ip=${selectedIP}&port=${SERVER_PORT}&pin=${pin}&proto=${wsProto}`;
  const qrPayload = phoneWebUrl;

  return {
    addresses,
    selectedAddress: selectedIP,
    port: SERVER_PORT,
    protocol: (USE_HTTPS ? 'https' : 'http') as 'http' | 'https',
    pin,
    qrPayload,
    phoneWebUrl
  };
}

function sendToWindow(channel: string, ...args: unknown[]) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

function startServers() {
  selectedIP = getPrimaryLANIP();

  // Create HTTP/HTTPS Server
  serverInstance = createHttpServer({
    port: SERVER_PORT,
    useHttps: USE_HTTPS,
    getPin: () => (wsServer ? wsServer.getPIN() : '0000')
  });

  // Create WebSocket Server
  wsServer = new PhoneMicWSServer({
    server: serverInstance.server,
    onAudioChunk: (chunk) => {
      // Convert buffer to number array for IPC transport
      const sampleCount = chunk.pcmBuffer.length / 2;
      const samples: number[] = new Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) {
        samples[i] = chunk.pcmBuffer.readInt16LE(i * 2);
      }

      sendToWindow('audio-telemetry', {
        seq: chunk.seq,
        timestamp: chunk.timestamp,
        latencyMs: chunk.latencyMs,
        peak: chunk.peak,
        rms: chunk.rms,
        db: chunk.db,
        pcmData: samples
      });
    },
    onClientConnected: (device) => {
      sendToWindow('device-connected', device);
    },
    onClientDisconnected: (deviceId) => {
      sendToWindow('device-disconnected', deviceId);
    },
    onClientStateUpdated: (device) => {
      sendToWindow('device-state-updated', device);
    },
    onLog: (log) => {
      sendToWindow('server-log', `[${new Date().toLocaleTimeString()}] ${log}`);
    }
  });

  serverInstance.server.listen(SERVER_PORT, '0.0.0.0', () => {
    console.log(`PhoneMic server listening on port ${SERVER_PORT} (HTTPS: ${USE_HTTPS})`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#07090e',
    title: 'PhoneMic Desktop - Wireless Microphone Bridge',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // In development, load from Vite dev server or build
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-server-info', async () => {
  return constructServerInfo();
});

ipcMain.handle('regenerate-pin', async () => {
  if (wsServer) {
    return wsServer.regeneratePIN();
  }
  return '0000';
});

ipcMain.handle('select-ip', async (_, ip: string) => {
  const s = sanitizeHostAndPort(ip, SERVER_PORT);
  selectedIP = s.host;
  return constructServerInfo();
});

ipcMain.handle('get-virtual-mic-status', async () => {
  return virtualMicManager.getStatus();
});

ipcMain.handle('get-virtual-mic-instructions', async () => {
  return virtualMicManager.getSetupInstructions();
});

ipcMain.handle('open-external-url', async (_, url: string) => {
  await shell.openExternal(url);
});

app.whenReady().then(() => {
  startServers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverInstance) {
    serverInstance.server.close();
  }
  if (wsServer) {
    wsServer.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
