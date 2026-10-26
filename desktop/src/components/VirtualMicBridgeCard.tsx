import React, { useState } from 'react';
import { VirtualAudioDeviceStatus } from '@phonemic/shared';
import { Cpu, Download, HelpCircle, CheckCircle2, AlertTriangle, Activity, Volume2, ShieldAlert } from 'lucide-react';

interface VirtualMicBridgeCardProps {
  status: VirtualAudioDeviceStatus | null;
  instructions: string;
  latestPeak?: number;
  latestDb?: number;
  packetsReceived?: number;
  isStreaming?: boolean;
}

export const VirtualMicBridgeCard: React.FC<VirtualMicBridgeCardProps> = ({
  status,
  instructions,
  latestPeak = 0,
  latestDb = -60,
  packetsReceived = 0,
  isStreaming = false
}) => {
  const [showDetailedGuide, setShowDetailedGuide] = useState(false);

  const openDownloadCable = () => {
    window.phoneMicDesktop?.openExternalUrl('https://vb-audio.com/Cable/');
  };

  const isPcmReceived = packetsReceived > 0 || (isStreaming && latestPeak > 0.005);
  const isVirtualOutputActive = !!(status?.isOpen && status?.isWritingContinuously);
  const isRoutingFailing = isPcmReceived && !isVirtualOutputActive;

  return (
    <div className="glass-card" style={{ padding: 22 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(139, 92, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-purple)'
          }}>
            <Cpu size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Windows Virtual Microphone (PhoneMic)</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Route phone audio into Discord, OBS, Chrome & YouTube via VB-CABLE
            </p>
          </div>
        </div>

        {/* Dynamic Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          borderRadius: 20,
          background: isVirtualOutputActive 
            ? 'rgba(16, 185, 129, 0.15)' 
            : (isRoutingFailing ? 'rgba(239, 68, 68, 0.15)' : 'rgba(139, 92, 246, 0.15)'),
          border: `1px solid ${isVirtualOutputActive ? 'var(--accent-emerald)' : (isRoutingFailing ? 'var(--accent-red)' : 'rgba(139, 92, 246, 0.3)')}`,
          color: isVirtualOutputActive ? 'var(--accent-emerald)' : (isRoutingFailing ? 'var(--accent-red)' : 'var(--accent-purple)'),
          fontSize: '0.75rem',
          fontWeight: 700
        }}>
          <span className={`status-dot ${isVirtualOutputActive ? 'active' : (isRoutingFailing ? 'error' : 'idle')}`} />
          <span>{isVirtualOutputActive ? 'VIRTUAL OUTPUT STREAMING' : (status?.isOpen ? 'ADAPTER OPEN' : 'ADAPTER STANDBY')}</span>
        </div>
      </div>

      {/* Real-time Audio Diagnostics Panel */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: `1px solid ${isRoutingFailing ? 'rgba(239, 68, 68, 0.5)' : 'var(--border-subtle)'}`,
        borderRadius: 12,
        padding: 14,
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <Activity size={14} color="var(--accent-cyan)" />
            <span>Live Audio Pipeline Diagnostics</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Format: 48.0 kHz 16-bit Mono PCM
          </span>
        </div>

        {/* Two Separate Diagnostic Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {/* Diagnostic 1: PCM RECEIVED */}
          <div style={{
            background: isPcmReceived ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${isPcmReceived ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
            borderRadius: 8,
            padding: '10px 12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isPcmReceived ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                1. PCM RECEIVED
              </span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 10,
                background: isPcmReceived ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: isPcmReceived ? 'var(--accent-emerald)' : 'var(--text-muted)'
              }}>
                {isPcmReceived ? 'RECEIVING' : 'STANDBY'}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {isPcmReceived ? (
                <>Packets: {packetsReceived.toLocaleString()} | Peak: {(latestPeak * 100).toFixed(1)}% ({latestDb.toFixed(0)} dB)</>
              ) : (
                <>No PCM packets received yet</>
              )}
            </div>
          </div>

          {/* Diagnostic 2: VIRTUAL OUTPUT ACTIVE */}
          <div style={{
            background: isVirtualOutputActive ? 'rgba(16, 185, 129, 0.1)' : (isRoutingFailing ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.03)'),
            border: `1px solid ${isVirtualOutputActive ? 'rgba(16, 185, 129, 0.3)' : (isRoutingFailing ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-subtle)')}`,
            borderRadius: 8,
            padding: '10px 12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isVirtualOutputActive ? 'var(--accent-emerald)' : (isRoutingFailing ? 'var(--accent-red)' : 'var(--text-muted)') }}>
                2. VIRTUAL OUTPUT ACTIVE
              </span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 10,
                background: isVirtualOutputActive ? 'rgba(16, 185, 129, 0.2)' : (isRoutingFailing ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)'),
                color: isVirtualOutputActive ? 'var(--accent-emerald)' : (isRoutingFailing ? 'var(--accent-red)' : 'var(--text-muted)')
              }}>
                {isVirtualOutputActive ? 'WRITING CONTINUOUS' : (status?.isOpen ? 'DEVICE READY' : 'CLOSED')}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {isVirtualOutputActive ? (
                <>Target: {status?.openedEndpoint || 'CABLE Input'} | Out Peak: {((status?.outputPeak || 0) * 100).toFixed(1)}%</>
              ) : (
                <>{status?.diagnosticMessage || 'Awaiting phone audio stream'}</>
              )}
            </div>
          </div>
        </div>

        {/* Explicit Failure or Success Alert */}
        {isRoutingFailing ? (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--accent-red)',
            fontSize: '0.8rem'
          }}>
            <AlertTriangle size={18} />
            <div>
              <strong style={{ display: 'block', fontSize: '0.85rem' }}>Audio routing to VB-CABLE is failing</strong>
              <span>
                PCM packets are arriving from phone, but audio samples are not reaching the virtual audio endpoint ({status?.openedEndpoint || 'CABLE Input'}). Check if VB-Audio Cable is installed and CABLE Input is available.
              </span>
            </div>
          </div>
        ) : isVirtualOutputActive ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 8,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--accent-emerald)',
            fontSize: '0.78rem'
          }}>
            <CheckCircle2 size={16} />
            <div>
              <strong>Audio routing to VB-CABLE is active:</strong> Streaming directly into <strong>{status?.openedEndpoint}</strong>. Windows apps recording from <strong>CABLE Output (PhoneMic)</strong> receive real-time audio.
            </div>
          </div>
        ) : null}
      </div>

      {/* Step by Step Setup Flow */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        <div style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10,
          padding: 12
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-purple)', fontWeight: 800, marginBottom: 4 }}>
            ENDPOINT 1
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>CABLE Input (Playback)</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            PhoneMic Desktop writes the 48kHz phone stream here.
          </div>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10,
          padding: 12
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', fontWeight: 800, marginBottom: 4 }}>
            DRIVER LOOPBACK
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>VB-Audio Virtual Cable</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Hardware driver loops CABLE Input into CABLE Output.
          </div>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10,
          padding: 12
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 800, marginBottom: 4 }}>
            ENDPOINT 2
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>CABLE Output / PhoneMic</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Chrome, Discord & OBS record from this microphone.
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={openDownloadCable}
          className="btn-emerald"
          style={{ flex: 1 }}
        >
          <Download size={15} />
          <span>Get VB-Audio Virtual Cable (Free)</span>
        </button>

        <button
          onClick={() => setShowDetailedGuide(prev => !prev)}
          className="btn-outline"
        >
          <HelpCircle size={15} />
          <span>{showDetailedGuide ? 'Hide Guide' : 'Setup Guide'}</span>
        </button>
      </div>

      {/* Detailed instructions drawer */}
      {showDetailedGuide && (
        <div style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 12,
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.78rem',
          lineHeight: 1.6,
          color: 'var(--text-secondary)'
        }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Volume2 size={14} color="var(--accent-purple)" />
            Renaming the Virtual Device to &quot;PhoneMic&quot; in Windows
          </h3>
          <ol style={{ paddingLeft: 18, marginBottom: 12 }}>
            <li>Press <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: 4 }}>Win + R</kbd>, type <code>mmsys.cpl</code> and press Enter.</li>
            <li>Go to the <strong>Recording</strong> tab.</li>
            <li>Right click <strong>CABLE Output</strong> → Properties.</li>
            <li>Rename it to <strong>PhoneMic</strong>, click OK!</li>
            <li>In Chrome, Discord, or OBS, select <strong>PhoneMic</strong> (or <em>CABLE Output</em>) as your recording microphone.</li>
          </ol>
        </div>
      )}
    </div>
  );
};
