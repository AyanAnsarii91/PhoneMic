import React, { useState } from 'react';
import { HelpCircle, Sliders, Volume2, X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gain: number;
  onGainChange: (val: number) => void;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  onToggleEcho: (val: boolean) => void;
  onToggleNoise: (val: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  gain,
  onGainChange,
  echoCancellation,
  noiseSuppression,
  onToggleEcho,
  onToggleNoise
}) => {
  const [showHttpsGuide, setShowHttpsGuide] = useState(false);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: 16
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: 420,
        padding: 24,
        background: '#0d131f',
        position: 'relative',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
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
            <Sliders size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Audio Settings</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Tune phone microphone capture and DSP
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Digital Gain Boost Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Volume2 size={16} /> Mic Gain Booster
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                {Math.round(gain * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={gain}
              onChange={(e) => onGainChange(parseFloat(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--accent-green)',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
              <span>50%</span>
              <span>100% (Normal)</span>
              <span>200%</span>
              <span>300% (High Boost)</span>
            </div>
          </div>

          {/* DSP Toggles */}
          <div style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Noise Suppression</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Filters fan, keyboard and background noise</div>
              </div>
              <input
                type="checkbox"
                checked={noiseSuppression}
                onChange={(e) => onToggleNoise(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--accent-green)' }}
              />
            </label>

            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Echo Cancellation</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Prevents audio loop if phone speaker is active</div>
              </div>
              <input
                type="checkbox"
                checked={echoCancellation}
                onChange={(e) => onToggleEcho(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--accent-green)' }}
              />
            </label>
          </div>

          {/* Mobile HTTPS Guide Expandable */}
          <div style={{
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            padding: 12,
            background: 'rgba(16, 185, 129, 0.05)'
          }}>
            <button
              onClick={() => setShowHttpsGuide(prev => !prev)}
              style={{
                background: 'transparent',
                border: 'none',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'var(--accent-green)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <HelpCircle size={15} /> Android Chrome Mic Permissions Info
              </span>
              <span>{showHttpsGuide ? '▲' : '▼'}</span>
            </button>

            {showHttpsGuide && (
              <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <p style={{ marginBottom: 6 }}>
                  Chrome on Android requires a secure context (HTTPS) or localhost for microphone permissions.
                </p>
                <p style={{ marginBottom: 6 }}>
                  <strong>Option A:</strong> Use the HTTPS link shown on your PC app and click &quot;Advanced → Proceed&quot; once.
                </p>
                <p>
                  <strong>Option B:</strong> Open <code style={{ color: 'var(--accent-green)' }}>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code> on your phone, paste your PC IP address (e.g. <code>http://192.168.x.x:8990</code>), enable it and tap Relaunch.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="btn-primary"
            style={{ width: '100%', padding: '12px 20px', fontSize: '0.95rem' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
