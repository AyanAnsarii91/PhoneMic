import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface VUMeterDesktopProps {
  peak: number;      // 0.0 to 1.0
  db: number;        // -60 to 0
  isStreaming: boolean;
  isMuted: boolean;
}

export const VUMeterDesktop: React.FC<VUMeterDesktopProps> = ({
  peak,
  db,
  isStreaming,
  isMuted
}) => {
  const [peakHold, setPeakHold] = useState(0);
  const [isClipping, setIsClipping] = useState(false);

  useEffect(() => {
    if (!isStreaming || isMuted) {
      setPeakHold(0);
      setIsClipping(false);
      return;
    }

    const currentPercent = Math.min(100, Math.max(0, peak * 100));
    setPeakHold(prev => Math.max(prev * 0.94, currentPercent));

    if (db >= -1) {
      setIsClipping(true);
      const timer = setTimeout(() => setIsClipping(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [peak, db, isStreaming, isMuted]);

  const levelPercent = !isStreaming || isMuted ? 0 : Math.min(100, Math.max(0, peak * 100));
  const displayDb = !isStreaming || isMuted ? -60 : Math.round(db);

  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isMuted ? (
            <VolumeX size={18} color="var(--accent-red)" />
          ) : (
            <Volume2 size={18} color={isStreaming ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
          )}
          <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Live Audio Level
          </span>
          {isClipping && (
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              background: 'var(--accent-red)',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: 6
            }}>
              CLIP
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9rem',
            fontWeight: 700,
            color: isClipping ? 'var(--accent-red)' : displayDb > -12 ? 'var(--accent-emerald)' : 'var(--text-secondary)'
          }}>
            {displayDb <= -60 ? '-∞ dB' : `${displayDb} dB`}
          </span>
          <span style={{
            fontSize: '0.75rem',
            padding: '3px 8px',
            borderRadius: 6,
            background: isStreaming ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: isStreaming ? 'var(--accent-emerald)' : 'var(--text-muted)',
            fontWeight: 600
          }}>
            {isMuted ? 'MUTED' : isStreaming ? 'ACTIVE' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Meter Bar */}
      <div style={{
        height: 18,
        background: 'rgba(0, 0, 0, 0.4)',
        borderRadius: 9,
        padding: 3,
        border: '1px solid var(--border-subtle)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${levelPercent}%`,
          borderRadius: 6,
          background: isMuted
            ? 'rgba(239, 68, 68, 0.5)'
            : 'linear-gradient(90deg, #10b981 0%, #10b981 65%, #f59e0b 85%, #ef4444 100%)',
          transition: 'width 0.04s ease-out'
        }} />

        {peakHold > 1 && !isMuted && (
          <div style={{
            position: 'absolute',
            top: 2,
            bottom: 2,
            left: `${Math.min(99, peakHold)}%`,
            width: 2,
            background: '#ffffff',
            boxShadow: '0 0 6px #fff'
          }} />
        )}
      </div>

      {/* dB Markings */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 6,
        fontSize: '0.68rem',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)'
      }}>
        <span>-60 dB</span>
        <span>-48</span>
        <span>-36</span>
        <span>-24</span>
        <span>-12</span>
        <span>-6</span>
        <span>-3</span>
        <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>0 dB</span>
      </div>
    </div>
  );
};
