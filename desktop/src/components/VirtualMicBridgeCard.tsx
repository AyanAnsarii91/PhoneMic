import React, { useState } from 'react';
import { VirtualAudioDeviceStatus } from '@phonemic/shared';
import { Cpu, Download, HelpCircle, Layers, CheckCircle2, Mic } from 'lucide-react';

interface VirtualMicBridgeCardProps {
  status: VirtualAudioDeviceStatus | null;
  instructions: string;
}

export const VirtualMicBridgeCard: React.FC<VirtualMicBridgeCardProps> = ({
  status,
  instructions
}) => {
  const [showDetailedGuide, setShowDetailedGuide] = useState(false);

  const openDownloadCable = () => {
    window.phoneMicDesktop?.openExternalUrl('https://vb-audio.com/Cable/');
  };

  return (
    <div className="glass-card" style={{ padding: 22 }}>
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
              Route phone audio into Discord, OBS, Chrome & YouTube
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          borderRadius: 20,
          background: 'rgba(139, 92, 246, 0.15)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          color: 'var(--accent-purple)',
          fontSize: '0.75rem',
          fontWeight: 700
        }}>
          <Layers size={13} />
          <span>ADAPTER READY</span>
        </div>
      </div>

      {/* Architecture Explanation Box */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--accent-emerald)', fontSize: '0.82rem', fontWeight: 700 }}>
          <CheckCircle2 size={16} /> How PhoneMic works as a Windows System Mic:
        </div>
        <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Windows requires a kernel audio driver or virtual audio device to register a system-wide microphone input. PhoneMic routes the incoming phone audio directly into <strong>CABLE Input</strong>. Any Windows application (Chrome voice search, Discord, OBS, Audacity, etc.) then selects <strong>CABLE Output (PhoneMic)</strong> as its microphone!
        </p>
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
            STEP 1
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Install Virtual Cable</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Free 1-click Windows driver for loopback audio.
          </div>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10,
          padding: 12
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', fontWeight: 800, marginBottom: 4 }}>
            STEP 2
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Select in PhoneMic</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Choose &quot;CABLE Input&quot; as the output device above.
          </div>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10,
          padding: 12
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 800, marginBottom: 4 }}>
            STEP 3
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Select in Apps</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Pick &quot;CABLE Output&quot; as microphone in Discord or Chrome.
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
            <Mic size={14} color="var(--accent-purple)" />
            Renaming the Virtual Device to &quot;PhoneMic&quot; in Windows
          </h3>
          <ol style={{ paddingLeft: 18, marginBottom: 12 }}>
            <li>Press <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: 4 }}>Win + R</kbd>, type <code>mmsys.cpl</code> and press Enter.</li>
            <li>Go to the <strong>Recording</strong> tab.</li>
            <li>Right click <strong>CABLE Output</strong> → Properties.</li>
            <li>Rename it to <strong>PhoneMic</strong>, click OK!</li>
            <li>Now every app on your PC will see your phone as a high-fidelity microphone named &quot;PhoneMic&quot;!</li>
          </ol>
        </div>
      )}
    </div>
  );
};
