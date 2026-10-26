import React, { useEffect, useState } from 'react';

interface VUMeterProps {
  peakLevel: number; // 0.0 to 1.0
  dbLevel: number;   // -60 to 0
  isMuted: boolean;
  isActive: boolean;
}

export const VUMeter: React.FC<VUMeterProps> = ({ peakLevel, dbLevel, isMuted, isActive }) => {
  const [peakHold, setPeakHold] = useState(0);

  useEffect(() => {
    if (!isActive || isMuted) {
      setPeakHold(0);
      return;
    }

    const currentPercent = Math.min(100, Math.max(0, (peakLevel * 100)));
    setPeakHold(prev => Math.max(prev * 0.95, currentPercent));
  }, [peakLevel, isActive, isMuted]);

  const levelPercent = isMuted || !isActive ? 0 : Math.min(100, Math.max(0, peakLevel * 100));
  const displayDb = isMuted || !isActive ? -60 : Math.round(dbLevel);

  return (
    <div className="meter-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Mic Input Level
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: displayDb > -6 ? 'var(--accent-red)' : 'var(--text-primary)', fontWeight: 600 }}>
          {displayDb <= -60 ? '-∞ dB' : `${displayDb} dB`}
        </span>
      </div>

      <div className="meter-track">
        <div
          className="meter-fill"
          style={{
            width: `${levelPercent}%`,
            background: isMuted
              ? 'rgba(239, 68, 68, 0.4)'
              : 'linear-gradient(90deg, #10b981 0%, #10b981 70%, #f59e0b 85%, #ef4444 100%)'
          }}
        />
        {peakHold > 1 && !isMuted && (
          <div
            className="meter-peak"
            style={{ left: `${Math.min(99, peakHold)}%` }}
          />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        <span>-60</span>
        <span>-36</span>
        <span>-18</span>
        <span>-6</span>
        <span>0 dB</span>
      </div>
    </div>
  );
};
