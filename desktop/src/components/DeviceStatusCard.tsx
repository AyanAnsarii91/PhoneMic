import React from 'react';
import { DeviceInfo } from '@phonemic/shared';
import { Smartphone, Activity, Radio, Clock, MicOff, Mic, ShieldCheck } from 'lucide-react';

interface DeviceStatusCardProps {
  device: DeviceInfo | null;
  packetsReceived: number;
  latestLatency: number;
}

export const DeviceStatusCard: React.FC<DeviceStatusCardProps> = ({
  device,
  packetsReceived,
  latestLatency
}) => {
  const formatDuration = (startTime?: number) => {
    if (!startTime) return '00:00';
    const elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsedSecs / 60);
    const secs = elapsedSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!device) {
    return (
      <div className="glass-card" style={{ padding: 22, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px dashed var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12
        }}>
          <Smartphone size={26} color="var(--text-muted)" />
        </div>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>No Phone Connected</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: 260, lineHeight: 1.4 }}>
          Scan the QR code with your phone camera or enter the IP and PIN to pair.
        </p>
      </div>
    );
  }

  const effectiveLatency = latestLatency || device.latencyMs || 0;

  return (
    <div className="glass-card-glow" style={{ padding: 22, height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)'
          }}>
            <Smartphone size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{device.name}</h3>
              <span title="Paired & Authenticated" style={{ display: 'flex' }}>
                <ShieldCheck size={16} color="var(--accent-emerald)" />
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {device.ip}
            </span>
          </div>
        </div>

        <div style={{
          padding: '4px 10px',
          borderRadius: 20,
          background: device.isStreaming ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${device.isStreaming ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
          color: device.isStreaming ? 'var(--accent-emerald)' : 'var(--text-muted)',
          fontSize: '0.72rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          {device.isMuted ? (
            <>
              <MicOff size={13} color="var(--accent-red)" />
              <span style={{ color: 'var(--accent-red)' }}>MUTED</span>
            </>
          ) : device.isStreaming ? (
            <>
              <Mic size={13} />
              <span>STREAMING</span>
            </>
          ) : (
            <>
              <Radio size={13} />
              <span>PAIRED</span>
            </>
          )}
        </div>
      </div>

      {/* Grid Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 16 }}>
        <div style={{
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10,
          padding: '10px 12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>
            <Activity size={12} color="var(--accent-emerald)" />
            <span>PING</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
            {effectiveLatency ? `${effectiveLatency} ms` : '< 1 ms'}
          </div>
        </div>

        <div style={{
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10,
          padding: '10px 12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>
            <Radio size={12} color="var(--accent-cyan)" />
            <span>PACKETS</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {packetsReceived.toLocaleString()}
          </div>
        </div>

        <div style={{
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10,
          padding: '10px 12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>
            <Clock size={12} color="var(--accent-purple)" />
            <span>UPTIME</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {formatDuration(device.connectedAt)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        <span>Audio Format: 48.0 kHz 16-bit Mono</span>
        <span>Protocol: WebSocket PCM</span>
      </div>
    </div>
  );
};
