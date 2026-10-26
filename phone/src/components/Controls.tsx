import React from 'react';
import { ConnectionState } from '@phonemic/shared';
import { Mic, MicOff, Play, Square, Volume2 } from 'lucide-react';

interface ControlsProps {
  connectionState: ConnectionState;
  isCapturing: boolean;
  isMuted: boolean;
  gain: number;
  onToggleCapture: () => void;
  onToggleMute: () => void;
  onOpenPairing: () => void;
  onOpenSettings: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  connectionState,
  isCapturing,
  isMuted,
  gain,
  onToggleCapture,
  onToggleMute,
  onOpenPairing,
  onOpenSettings
}) => {
  const isConnected = connectionState === 'connected' || connectionState === 'streaming';

  const getButtonState = () => {
    if (!isConnected) return 'idle';
    if (!isCapturing) return 'idle';
    if (isMuted) return 'muted';
    return 'active';
  };

  const buttonState = getButtonState();

  const handleMainAction = () => {
    if (!isConnected) {
      onOpenPairing();
    } else {
      onToggleCapture();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 16 }}>
      {/* Central Interactive Mic Button */}
      <div className="mic-button-wrapper">
        {buttonState === 'active' && <div className="mic-button-halo" />}
        {buttonState === 'muted' && <div className="mic-button-halo muted" />}

        <button
          onClick={handleMainAction}
          className={`mic-main-btn ${buttonState}`}
          aria-label={isCapturing ? 'Stop microphone streaming' : 'Start microphone streaming'}
        >
          {buttonState === 'muted' ? (
            <MicOff size={44} color="#ffffff" />
          ) : (
            <Mic size={44} color={buttonState === 'active' ? '#ffffff' : '#94a3b8'} />
          )}

          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            marginTop: 6,
            textTransform: 'uppercase',
            color: '#ffffff'
          }}>
            {!isConnected
              ? 'PAIR PC'
              : !isCapturing
              ? 'START'
              : isMuted
              ? 'MUTED'
              : 'LIVE'}
          </span>
        </button>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 360, justifyContent: 'center' }}>
        {isConnected && isCapturing && (
          <button
            onClick={onToggleMute}
            className="btn-secondary"
            style={{
              flex: 1,
              borderColor: isMuted ? 'var(--accent-red)' : 'var(--border-color)',
              background: isMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)'
            }}
          >
            {isMuted ? <MicOff size={18} color="var(--accent-red)" /> : <Mic size={18} />}
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
        )}

        {isConnected && (
          <button
            onClick={onToggleCapture}
            className={isCapturing ? 'btn-stop' : 'btn-primary'}
            style={{ flex: 1.2 }}
          >
            {isCapturing ? (
              <>
                <Square size={18} />
                <span>Stop Stream</span>
              </>
            ) : (
              <>
                <Play size={18} />
                <span>Start Stream</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={onOpenSettings}
          className="btn-secondary"
          style={{ width: 48, padding: 0 }}
          title="Audio Settings"
        >
          <Volume2 size={18} />
        </button>
      </div>

      {gain !== 1.0 && (
        <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 600 }}>
          Mic Boost: {Math.round(gain * 100)}%
        </div>
      )}
    </div>
  );
};
