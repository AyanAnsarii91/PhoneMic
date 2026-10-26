# 🎙️ PhoneMic — Wireless Mobile Microphone for Windows PC

> Transform your Android phone (or any mobile browser) into a high-fidelity, ultra-low-latency wireless microphone for Windows — **no Android Studio, Kotlin, or APK installation required**.

---

## 🌟 Highlights

- **Zero Mobile App Installation**: Runs directly in Google Chrome or mobile browser via a responsive React + Vite PWA.
- **Ultra-Low Latency Audio Transport**: Uses high-priority `AudioWorkletProcessor` (with `ScriptProcessorNode` fallback) streaming raw 48 kHz 16-bit PCM packets over local Wi-Fi WebSocket.
- **Fast & Secure QR Pairing**: Point your phone camera at the PC screen to pair instantly. Guarded by a dynamic 4-digit PIN and session tokens so only paired devices can stream audio.
- **Real-Time Visual Audio Feedback**: Hardware-style VU decibel meters with peak hold, RMS fill, clipping alerts, and latency telemetry on both phone and PC.
- **Live PC Audio Monitoring**: Listen to your phone mic in your headphones or speakers with 1-click test tone verification.
- **Windows Virtual Microphone Bridge**: Clean `IVirtualAudioDeviceAdapter` architecture routing phone audio into Windows applications (Discord, Google Chrome, OBS Studio, YouTube Voice Search, Audacity, Premiere Pro).
- **Offline / Pure LAN Operation**: Operates entirely over your local Wi-Fi network without third-party cloud servers.

---

## 📐 System Architecture

```
┌─────────────────────────────────┐                 ┌──────────────────────────────────────┐
│       Android Phone Browser     │                 │       Windows PC (Electron App)      │
│                                 │                 │                                      │
│  [getUserMedia / Mic Input]     │                 │   [Local HTTPS & WebSocket Server]   │
│               │                 │                 │                  │                   │
│   [AudioWorklet: 48kHz Int16]   │                 │       [PIN Security Validator]       │
│               │                 │                 │                  │                   │
│      [Live VU Level Meter]      │                 │      [Jitter Ring Buffer (40ms)]     │
│               │                 │   Wi-Fi LAN     │                  │                   │
│    [WebSocket Binary Packet]    │ ──────────────> │    [Desktop VU Meter & Telemetry]    │
│  - 4-byte Sequence ID           │    WebSocket    │                  │                   │
│  - 8-byte Timestamp (ms)        │    (80-96 KB/s) │     [PC Audio Output / Monitor]      │
│  - 1024-sample PCM Payload      │                 │                  │                   │
└─────────────────────────────────┘                 └──────────────────┼───────────────────┘
                                                                       │ setSinkId
                                                                       ▼
                                                    ┌──────────────────────────────────────┐
                                                    │ Windows Virtual Audio Device Bridge  │
                                                    │  (IVirtualAudioDeviceAdapter)        │
                                                    │                                      │
                                                    │  [CABLE Input (VB-Audio Driver)]     │
                                                    │                  │ (Windows Kernel)  │
                                                    │                  ▼                   │
                                                    │  [CABLE Output / "PhoneMic" Device]  │
                                                    └──────────────────┼───────────────────┘
                                                                       │
                                        ┌──────────────────────────────┼──────────────────────────────┐
                                        ▼                              ▼                              ▼
                                 [Discord Voice]               [OBS Studio]              [Chrome / YouTube]
```

---

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js**: v18+ (tested on Node v20/v22/v26)
- **Windows 10 / 11**
- Both PC and Android phone connected to the **same Wi-Fi router / local network**.

### 1. Installation

Clone or open the workspace and install all workspace dependencies:

```bash
git clone https://github.com/your-username/PhoneMic.git
cd PhoneMic

# Install dependencies across all workspaces (phone, desktop, shared)
npm install
```

### 2. Run Automated Verification Test

Run the built-in end-to-end integration test to verify the audio pipeline:

```bash
npm test
```

Expected output:
```
--- PHONEMIC END-TO-END VERIFICATION TEST ---
[1/6] Testing VB-Cable Virtual Audio Adapter... Active: YES
[2/6] Starting PhoneMic HTTPS & WebSocket Server...
[3/6] Simulating Phone Client connecting & pairing... SUCCESS
[4/6] Streaming 25 Real-Time Audio Chunks (48kHz 16-bit PCM)...
[5/6] Verifying Jitter Buffer & Telemetry Output... Loss Rate: 0.0%
[6/6] TEST RESULT: ALL TESTS PASSED! Audio streaming pipeline is 100% functional.
```

### 3. Start Development Mode

To start both the Phone PWA and the Electron Desktop app concurrently:

```bash
npm start
```

Or run individual apps in separate terminals:

```bash
# Terminal 1: Phone Web App (port 5173)
npm run dev:phone

# Terminal 2: Electron Desktop App (port 5174 + Electron window)
npm run dev:desktop
```

---

## 📱 Mobile Browser Microphone Permissions (HTTPS / LAN)

### Why is this necessary?
Modern mobile browsers (Google Chrome on Android, Safari on iOS) enforce strict security: **the `navigator.mediaDevices.getUserMedia()` API is completely disabled on insecure HTTP connections unless accessing `localhost`**. When accessing a local LAN IP (e.g. `http://192.168.1.50:8990`), Chrome blocks the microphone.

PhoneMic provides **two seamless solutions**:

### Solution A: Built-in HTTPS with Self-Signed Certificate (Default & Recommended)
PhoneMic Desktop automatically generates a local TLS certificate on the fly and serves both the pairing web app and WebSocket over HTTPS/WSS (`https://<PC-IP>:8990`).
1. Scan the QR code or open the `https://<PC-IP>:8990` URL on your phone.
2. Chrome will display *"Your connection is not private"* (because the certificate was generated locally by your PC).
3. Tap **Advanced** → **Proceed to `<PC-IP>` (unsafe)**.
4. When prompted, tap **Allow** for Microphone access.
5. Your phone will immediately start streaming audio!

### Solution B: Chrome Insecure Origin Flag (Alternative for HTTP)
If you prefer standard HTTP without certificate prompts:
1. On your Android phone, open Chrome and navigate to:
   ```
   chrome://flags/#unsafely-treat-insecure-origin-as-secure
   ```
2. In the text box, enter your PC's IP and port, for example:
   ```
   http://192.168.1.50:8990
   ```
3. Set the dropdown to **Enabled** and tap **Relaunch** at the bottom.
4. Now Chrome will treat your PC as a secure origin and grant microphone access freely over plain HTTP.

---

## 🎧 Routing into Windows Apps ("PhoneMic" Virtual Microphone)

Electron and React run in userland and cannot directly create a Windows kernel audio device driver on their own. PhoneMic solves this cleanly and reliably by integrating with a virtual audio cable adapter.

### Step 1: Install VB-Audio Virtual Cable (Free)
1. Download the free Windows driver from [VB-Audio Cable](https://vb-audio.com/Cable/).
2. Extract the ZIP and run `VBCABLE_Setup_x64.exe` as Administrator.
3. Click **Install Driver** (no restart required, takes 10 seconds).

### Step 2: Configure PhoneMic Desktop
1. In the **PC Audio Output & Monitoring** panel of PhoneMic Desktop, change the output device from *Default* to:
   ```
   CABLE Input (VB-Audio Virtual Cable)
   ```
2. Enable **MONITORING ACTIVE**.

### Step 3: (Optional) Rename to "PhoneMic" in Windows
1. Press `Win + R`, type `mmsys.cpl` and press Enter to open Windows Sound Control Panel.
2. Select the **Recording** tab.
3. Right-click **CABLE Output** → **Properties**.
4. Rename it to **PhoneMic** and click **OK**.

### Step 4: Select PhoneMic in Your Favorite Windows Apps
Now open any Windows application and select **PhoneMic** (or *CABLE Output*) as your microphone input:
- **Google Chrome / YouTube Voice Search**: Go to `chrome://settings/content/microphone` → Select *PhoneMic*.
- **Discord**: Settings → Voice & Video → Input Device → Select *PhoneMic*.
- **OBS Studio**: Settings → Audio → Mic/Auxiliary Audio → Select *PhoneMic*.
- **Audacity / Premiere / DAW**: Audio Host → MME/WASAPI → Recording Device → *PhoneMic*.

---

## 🛠️ Extensible Adapter Interface (`IVirtualAudioDeviceAdapter`)

PhoneMic isolates the audio device layer behind a modular TypeScript interface located in [`desktop/electron/audio/virtualMicAdapter.ts`](file:///desktop/electron/audio/virtualMicAdapter.ts):

```typescript
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
```

This architecture allows developers to easily plug in:
- The standard **VB-Audio Cable Bridge** (`VBCableAdapter`).
- A custom Windows kernel driver or WASAPI loopback bridge (`DedicatedPhoneMicDriverAdapter`).
- A Virtual Audio Cable (VAC) named endpoint repeater.

---

## 📦 Production Builds & Packaging

To compile and package the standalone Windows Electron installer and portable EXE:

```bash
# 1. Build all workspace packages
npm run build:shared
npm run build:phone
npm run build:desktop

# 2. Package for Windows via electron-builder
npm run package:desktop
```

The resulting distribution files will be located in:
```
desktop/release/
├── PhoneMic Setup 1.0.0.exe      (Windows NSIS Installer)
└── PhoneMic 1.0.0.exe            (Windows Standalone Portable Executable)
```

---

## 📁 Repository Structure

```
PhoneMic/
├── package.json              # Monorepo root with npm workspaces
├── scripts/
│   └── test-e2e.ts           # End-to-end automated audio & network test
├── shared/                   # Shared TypeScript protocol & types
│   ├── src/
│   │   ├── types.ts          # WebSocket messages, AudioConfig, DeviceInfo
│   │   ├── constants.ts      # Audio frame sizes, default ports, intervals
│   │   └── index.ts
│   ├── tsconfig.json
│   └── package.json
├── phone/                    # Mobile Web App / PWA (React + Vite + TS)
│   ├── index.html            # Mobile viewport & manifest metadata
│   ├── public/
│   │   ├── audio-processor.js # High-priority AudioWorklet for low latency
│   │   ├── manifest.json     # PWA standalone installation config
│   │   └── icon.svg          # App icon
│   ├── src/
│   │   ├── App.tsx           # Main phone client UI
│   │   ├── hooks/
│   │   │   ├── useAudioCapture.ts # getUserMedia, AudioContext & Worklet
│   │   │   └── usePhoneSocket.ts  # Binary streaming, PIN handshake & ping
│   │   ├── components/       # VUMeter, Controls, PairingModal, Stats
│   │   └── utils/pcm.ts      # PCM conversion, packing & dB level math
│   ├── vite.config.ts
│   └── package.json
└── desktop/                  # Windows Electron App (Electron + React + Vite + TS)
    ├── electron/
    │   ├── main.ts           # Electron process, IPC & window management
    │   ├── preload.ts        # Typed ContextBridge API
    │   ├── server/
    │   │   ├── httpServer.ts # Static bundle serving & LAN HTTPS
    │   │   ├── wsServer.ts   # WebSocket audio receiver & PIN verification
    │   │   ├── certGenerator.ts # Self-signed TLS cert generator
    │   │   └── networkUtils.ts  # IPv4 LAN discovery (192.168.x.x)
    │   └── audio/
    │       ├── virtualMicAdapter.ts # IVirtualAudioDeviceAdapter interface
    │       └── audioJitterBuffer.ts # Ring buffer for smooth streaming
    ├── src/                  # React dashboard UI
    │   ├── App.tsx           # Desktop dashboard
    │   ├── components/       # QRCodeCard, AudioMonitor, VUMeterDesktop
    │   └── hooks/
    │       └── useDesktopAudio.ts # Web Audio playback & setSinkId routing
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tsconfig.electron.json
    └── package.json
```

---

## 🔒 Security Measures

1. **4-Digit PIN Authentication**: When a phone attempts to pair over WebSocket, it must provide the matching PIN shown on the PC screen.
2. **Session Token Issuance**: Only authenticated connections receive an authorized session token and can stream audio packets. Unauthenticated audio chunks are immediately dropped by the server.
3. **One-Click PIN Regeneration**: The user can regenerate a new PIN anytime from the desktop UI with one click.
4. **Local LAN Isolation**: The server binds to local network interfaces (`0.0.0.0`) and does not expose ports to the public internet.
5. **No Cloud Dependencies**: No audio data leaves your home or office local network.

---

## 📄 License
MIT License. Free for personal and commercial use.
