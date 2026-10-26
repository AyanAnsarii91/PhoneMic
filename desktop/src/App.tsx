import React, { useState, useEffect, useCallback } from 'react';
import {
  ServerInfo,
  AudioPacketTelemetry,
  DeviceInfo,
  VirtualAudioDeviceStatus
} from '@phonemic/shared';
import { useDesktopAudio } from './hooks/useDesktopAudio';
import { QRCodeCard } from './components/QRCodeCard';
import { VUMeterDesktop } from './components/VUMeterDesktop';
import { AudioMonitor } from './components/AudioMonitor';
import { DeviceStatusCard } from './components/DeviceStatusCard';
import { VirtualMicBridgeCard } from './components/VirtualMicBridgeCard';
import { LogsPanel } from './components/LogsPanel';
import { Mic, Radio, Server, Shield } from 'lucide-react';

export const App: React.FC = () => {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<DeviceInfo | null>(null);
  const [virtualMicStatus, setVirtualMicStatus] = useState<VirtualAudioDeviceStatus | null>(null);
  const [virtualMicInstructions, setVirtualMicInstructions] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isRegeneratingPin, setIsRegeneratingPin] = useState(false);

  // Live audio telemetry
  const [latestPeak, setLatestPeak] = useState(0);
  const [latestDb, setLatestDb] = useState(-60);
  const [latestLatency, setLatestLatency] = useState(0);
  const [packetsReceived, setPacketsReceived] = useState(0);

  // Audio Playback / Routing engine
  const audioEngine = useDesktopAudio();

  // Load server info on mount
  useEffect(() => {
    if (window.phoneMicDesktop) {
      window.phoneMicDesktop.getServerInfo().then(setServerInfo).catch(console.error);
      window.phoneMicDesktop.getVirtualMicStatus().then(setVirtualMicStatus).catch(console.error);
      window.phoneMicDesktop.getVirtualMicInstructions().then(setVirtualMicInstructions).catch(console.error);

      // Listen for audio telemetry and PCM samples
      const unsubAudio = window.phoneMicDesktop.onAudioData((telemetry: AudioPacketTelemetry) => {
        setLatestPeak(telemetry.peak);
        setLatestDb(telemetry.db);
        setLatestLatency(telemetry.latencyMs);
        setPacketsReceived(prev => prev + 1);

        // Feed into PC audio monitoring / virtual cable destination
        audioEngine.playPcmChunk(telemetry.pcmData);
      });

      // Listen for device events
      const unsubConnected = window.phoneMicDesktop.onDeviceConnected((device: DeviceInfo) => {
        setConnectedDevice(device);
      });

      const unsubDisconnected = window.phoneMicDesktop.onDeviceDisconnected(() => {
        setConnectedDevice(null);
        setLatestPeak(0);
        setLatestDb(-60);
      });

      const unsubState = window.phoneMicDesktop.onDeviceStateUpdated((device: DeviceInfo) => {
        setConnectedDevice({ ...device });
      });

      const unsubLog = window.phoneMicDesktop.onLog((log: string) => {
        setLogs(prev => [...prev.slice(-100), log]);
      });

      return () => {
        unsubAudio();
        unsubConnected();
        unsubDisconnected();
        unsubState();
        unsubLog();
      };
    } else {
      // Mock data for preview in browser without Electron
      setServerInfo({
        addresses: [{ name: 'Wi-Fi Adapter', address: '192.168.1.105', isWireless: true }],
        selectedAddress: '192.168.1.105',
        port: 8990,
        protocol: 'https',
        pin: '7482',
        qrPayload: 'https://192.168.1.105:8990/?ip=192.168.1.105&port=8990&pin=7482&proto=wss',
        phoneWebUrl: 'https://192.168.1.105:8990/?ip=192.168.1.105&port=8990&pin=7482&proto=wss'
      });
      setLogs(['[Browser Preview Mode] Electron bridge simulated.']);
    }
  }, [audioEngine]);

  const handleRegeneratePin = useCallback(async () => {
    if (!window.phoneMicDesktop) return;
    setIsRegeneratingPin(true);
    try {
      await window.phoneMicDesktop.regeneratePin();
      const updated = await window.phoneMicDesktop.getServerInfo();
      setServerInfo(updated);
    } finally {
      setIsRegeneratingPin(false);
    }
  }, []);

  const handleSelectIp = useCallback(async (ip: string) => {
    if (!window.phoneMicDesktop) return;
    const updated = await window.phoneMicDesktop.selectIPAddress(ip);
    setServerInfo(updated);
  }, []);

  return (
    <div style={{
      maxWidth: 1200,
      margin: '0 auto',
      padding: '20px 24px 30px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }}>
      {/* Top Header Bar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
          }}>
            <Mic size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Phone<span style={{ color: 'var(--accent-emerald)' }}>Mic</span> Desktop
              </h1>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-emerald)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '2px 8px',
                borderRadius: 20
              }}>
                v1.0 MVP
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Wireless Phone Microphone to Windows Virtual Audio Device Bridge
            </p>
          </div>
        </div>

        {/* Server & Network Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 20,
            fontSize: '0.78rem',
            color: 'var(--text-secondary)'
          }}>
            <Server size={14} color="var(--accent-emerald)" />
            <span>Port {serverInfo?.port || 8990}</span>
            <span style={{ opacity: 0.4 }}>|</span>
            <Shield size={14} color={serverInfo?.protocol === 'https' ? 'var(--accent-emerald)' : 'var(--accent-amber)'} />
            <span style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{serverInfo?.protocol || 'HTTP'}</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            background: connectedDevice ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${connectedDevice ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
            borderRadius: 20,
            fontSize: '0.78rem',
            color: connectedDevice ? 'var(--accent-emerald)' : 'var(--text-muted)',
            fontWeight: 700
          }}>
            <Radio size={14} className={connectedDevice?.isStreaming ? 'animate-pulse' : ''} />
            <span>{connectedDevice ? (connectedDevice.isStreaming ? 'PHONE STREAMING' : 'PHONE CONNECTED') : 'NO DEVICE'}</span>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '360px 1fr',
        gap: 20,
        alignItems: 'stretch'
      }}>
        {/* Left Column: Pairing QR Card & Device Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <QRCodeCard
            serverInfo={serverInfo}
            onRegeneratePin={handleRegeneratePin}
            onSelectIp={handleSelectIp}
            isRegenerating={isRegeneratingPin}
          />

          <DeviceStatusCard
            device={connectedDevice}
            packetsReceived={packetsReceived}
            latestLatency={latestLatency}
          />
        </div>

        {/* Right Column: Audio Meter, PC Monitor, Virtual Mic Bridge & Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <VUMeterDesktop
            peak={latestPeak}
            db={latestDb}
            isStreaming={!!connectedDevice?.isStreaming}
            isMuted={!!connectedDevice?.isMuted}
          />

          <AudioMonitor
            isMonitoring={audioEngine.isMonitoring}
            monitorVolume={audioEngine.monitorVolume}
            outputDevices={audioEngine.outputDevices}
            selectedDeviceId={audioEngine.selectedDeviceId}
            isPlayingTestTone={audioEngine.isPlayingTestTone}
            onToggleMonitoring={audioEngine.toggleMonitoring}
            onVolumeChange={audioEngine.handleVolumeChange}
            onSelectDevice={audioEngine.setOutputDevice}
            onToggleTestTone={audioEngine.toggleTestTone}
            onRefreshDevices={audioEngine.refreshOutputDevices}
          />

          <VirtualMicBridgeCard
            status={virtualMicStatus}
            instructions={virtualMicInstructions}
          />

          <LogsPanel
            logs={logs}
            onClearLogs={() => setLogs([])}
          />
        </div>
      </div>
    </div>
  );
};
export default App;
