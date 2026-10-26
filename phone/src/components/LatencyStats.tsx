import React from 'react';
import { PhoneSocketStats } from '../hooks/usePhoneSocket';
import { Activity, Gauge, Radio, Zap } from 'lucide-react';

interface LatencyStatsProps {
  stats: PhoneSocketStats;
  sampleRate: number;
  usingWorklet: boolean;
}

export const LatencyStats: React.FC<LatencyStatsProps> = ({ stats, sampleRate, usingWorklet }) => {
  return (
    <div className="glass-panel" style={{
      width: '100%',
      padding: '12px 16px',
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 8,
      textAlign: 'center'
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: 2 }}>
          <Zap size={12} color="#10b981" />
          <span>PING</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {stats.latencyMs ? `${stats.latencyMs}ms` : '--'}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: 2 }}>
          <Activity size={12} color="#06b6d4" />
          <span>RATE</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {stats.sendRateKbps ? `${stats.sendRateKbps}k` : '0k'}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: 2 }}>
          <Gauge size={12} color="#f59e0b" />
          <span>PPS</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {stats.packetRate || 0}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: 2 }}>
          <Radio size={12} color="#8b5cf6" />
          <span>ENGINE</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {usingWorklet ? 'Worklet' : 'Script'}
        </div>
      </div>
    </div>
  );
};
