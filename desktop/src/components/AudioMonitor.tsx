import React from 'react';
import { AudioDeviceOption } from '../hooks/useDesktopAudio';
import { Headphones, Volume2, BellRing, RefreshCw } from 'lucide-react';

interface AudioMonitorProps {
  isMonitoring: boolean;
  monitorVolume: number;
  outputDevices: AudioDeviceOption[];
  selectedDeviceId: string;
  isPlayingTestTone: boolean;
  onToggleMonitoring: () => void;
  onVolumeChange: (vol: number) => void;
  onSelectDevice: (id: string) => void;
  onToggleTestTone: () => void;
  onRefreshDevices: () => void;
}

export const AudioMonitor: React.FC<AudioMonitorProps> = ({
  isMonitoring,
  monitorVolume,
  outputDevices,
  selectedDeviceId,
  isPlayingTestTone,
  onToggleMonitoring,
  onVolumeChange,
  onSelectDevice,
  onToggleTestTone,
  onRefreshDevices
}) => {
  return (
    <div className="glass-card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-blue)'
          }}>
            <Headphones size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>PC Audio Output & Monitoring</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Route to speakers or Virtual Cable</p>
          </div>
        </div>

        {/* Listen Live Toggle Switch */}
        <button
          onClick={onToggleMonitoring}
          style={{
            padding: '7px 14px',
            borderRadius: 20,
            background: isMonitoring ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${isMonitoring ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
            color: isMonitoring ? 'var(--accent-emerald)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span className={`status-dot ${isMonitoring ? 'active' : 'idle'}`} />
          <span>{isMonitoring ? 'MONITORING ACTIVE' : 'MONITOR MUTED'}</span>
        </button>
      </div>

      {/* Output Device Selector */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Destination Audio Device (Playback / Virtual Cable)
          </label>
          <button
            onClick={onRefreshDevices}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.72rem'
            }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        <select
          value={selectedDeviceId}
          onChange={(e) => onSelectDevice(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="default" style={{ background: '#0e131f' }}>
            Default Windows Playback Device (Speakers/Headphones)
          </option>
          {outputDevices.map(d => (
            <option key={d.deviceId} value={d.deviceId} style={{ background: '#0e131f' }}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* Volume slider & Test tone */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Volume2 size={14} /> Output Volume
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-emerald)' }}>
              {Math.round(monitorVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={monitorVolume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            style={{
              width: '100%',
              accentColor: 'var(--accent-emerald)',
              cursor: 'pointer'
            }}
          />
        </div>

        <button
          onClick={onToggleTestTone}
          className="btn-outline"
          style={{
            padding: '8px 14px',
            borderColor: isPlayingTestTone ? 'var(--accent-emerald)' : 'var(--border-subtle)',
            color: isPlayingTestTone ? 'var(--accent-emerald)' : 'var(--text-primary)'
          }}
          title="Play 440Hz test beep through selected device"
        >
          <BellRing size={15} />
          <span>{isPlayingTestTone ? 'Testing...' : 'Test Tone'}</span>
        </button>
      </div>
    </div>
  );
};
