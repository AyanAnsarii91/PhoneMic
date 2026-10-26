import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAudioCapture } from './hooks/useAudioCapture';
import { usePhoneSocket, PhoneSocketConfig } from './hooks/usePhoneSocket';
import { VUMeter } from './components/VUMeter';
import { ConnectionBadge } from './components/ConnectionBadge';
import { Controls } from './components/Controls';
import { LatencyStats } from './components/LatencyStats';
import { PairingModal } from './components/PairingModal';
import { SettingsModal } from './components/SettingsModal';
import { AlertTriangle, Mic, QrCode, Sliders, ShieldCheck } from 'lucide-react';
import { DEFAULT_PORT } from '@phonemic/shared';

export const App: React.FC = () => {
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [echoCancellation, setEchoCancellation] = useState(false);
  const [noiseSuppression, setNoiseSuppression] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Audio Capture hook
  const {
    state: audioState,
    startCapture,
    stopCapture,
    setMuted,
    setGain
  } = useAudioCapture((pcmBuffer) => {
    socket.sendAudioChunk(pcmBuffer);
  });

  // WebSocket hook
  const socket = usePhoneSocket();

  // Screen WakeLock to keep screen on while streaming
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch {
      // ignore
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync mute state between audio engine and network
  const handleToggleMute = useCallback(() => {
    const nextMuted = !audioState.isMuted;
    setMuted(nextMuted);
    socket.notifyMute(nextMuted);
  }, [audioState.isMuted, setMuted, socket]);

  // Start or Stop streaming
  const handleToggleCapture = useCallback(async () => {
    if (audioState.isCapturing) {
      stopCapture();
      socket.notifyStreamState(false);
      releaseWakeLock();
    } else {
      const success = await startCapture({
        sampleRate: 48000,
        echoCancellation,
        noiseSuppression,
        autoGainControl: false
      });

      if (success) {
        socket.notifyStreamState(true);
        requestWakeLock();
      }
    }
  }, [audioState.isCapturing, startCapture, stopCapture, socket, echoCancellation, noiseSuppression, requestWakeLock, releaseWakeLock]);

  // Check URL parameters on mount and auto-pair if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryIp = params.get('ip');
    const queryPin = params.get('pin');
    const queryPort = params.get('port');
    const queryProto = params.get('proto');

    if (queryIp && queryPin) {
      const config: PhoneSocketConfig = {
        ip: queryIp,
        port: parseInt(queryPort || `${DEFAULT_PORT}`, 10),
        protocol: (queryProto === 'wss' || window.location.protocol === 'https:') ? 'wss' : 'ws',
        pin: queryPin,
        deviceName: /Android/i.test(navigator.userAgent) ? 'Android Phone' : 'Mobile Phone'
      };
      socket.connect(config);
    }
  }, []);

  return (
    <div style={{
      maxWidth: 480,
      width: '100%',
      margin: '0 auto',
      minHeight: '100dvh',
      padding: '16px 20px 24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      {/* Top Header */}
      <div>
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              <Mic size={22} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Phone<span style={{ color: 'var(--accent-green)' }}>Mic</span>
              </h1>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Wireless PC Mic
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="btn-secondary"
              style={{ padding: '8px 12px', borderRadius: 10 }}
              title="Settings"
            >
              <Sliders size={16} />
            </button>
            <button
              onClick={() => setIsPairingOpen(true)}
              className="btn-secondary"
              style={{ padding: '8px 14px', borderRadius: 10 }}
            >
              <QrCode size={16} />
              <span style={{ fontSize: '0.8rem' }}>Pair</span>
            </button>
          </div>
        </header>

        {/* Connection status badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <ConnectionBadge
            state={socket.connectionState}
            latencyMs={socket.stats.latencyMs}
            reconnectAttempts={socket.stats.reconnectAttempts}
          />
        </div>

        {/* Permission / Network Error Banner */}
        {audioState.permissionError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 14,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12
          }}>
            <AlertTriangle size={20} color="var(--accent-red)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.8rem', color: '#fca5a5', lineHeight: 1.4 }}>
              <strong>Microphone Error:</strong> {audioState.permissionError}
            </div>
          </div>
        )}

        {socket.errorMessage && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 14,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12
          }}>
            <AlertTriangle size={20} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.8rem', color: '#fcd34d', lineHeight: 1.4 }}>
              <strong>Connection Warning:</strong> {socket.errorMessage}
            </div>
          </div>
        )}

        {/* Security / Wi-Fi reassurance info */}
        {socket.connectionState === 'idle' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: 14,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <ShieldCheck size={24} color="var(--accent-green)" />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Scan the QR code on your PC app to connect securely over local Wi-Fi.
            </div>
          </div>
        )}
      </div>

      {/* Center Interactive Controls & VU Meter */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, margin: 'auto 0' }}>
        <Controls
          connectionState={socket.connectionState}
          isCapturing={audioState.isCapturing}
          isMuted={audioState.isMuted}
          gain={audioState.gain}
          onToggleCapture={handleToggleCapture}
          onToggleMute={handleToggleMute}
          onOpenPairing={() => setIsPairingOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <div style={{ width: '100%' }}>
          <VUMeter
            peakLevel={audioState.peakLevel}
            dbLevel={audioState.dbLevel}
            isMuted={audioState.isMuted}
            isActive={audioState.isCapturing}
          />
        </div>
      </div>

      {/* Bottom Network & Audio Stats */}
      <div style={{ marginTop: 20 }}>
        <LatencyStats
          stats={socket.stats}
          sampleRate={audioState.actualSampleRate}
          usingWorklet={audioState.usingWorklet}
        />
      </div>

      {/* Modals */}
      <PairingModal
        isOpen={isPairingOpen}
        onClose={() => setIsPairingOpen(false)}
        onConnect={(config) => {
          setIsPairingOpen(false);
          socket.connect(config);
        }}
        isConnecting={socket.connectionState === 'connecting' || socket.connectionState === 'pairing'}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        gain={audioState.gain}
        onGainChange={setGain}
        echoCancellation={echoCancellation}
        noiseSuppression={noiseSuppression}
        onToggleEcho={setEchoCancellation}
        onToggleNoise={setNoiseSuppression}
      />
    </div>
  );
};
export default App;
