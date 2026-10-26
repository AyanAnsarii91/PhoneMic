import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ServerInfo, NetworkAddressItem, sanitizeHostAndPort } from '@phonemic/shared';
import { Check, Copy, Network, QrCode, RefreshCw, Shield, ExternalLink } from 'lucide-react';

interface QRCodeCardProps {
  serverInfo: ServerInfo | null;
  onRegeneratePin: () => void;
  onSelectIp: (ip: string) => void;
  isRegenerating: boolean;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({
  serverInfo,
  onRegeneratePin,
  onSelectIp,
  isRegenerating
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (serverInfo?.qrPayload) {
      QRCode.toDataURL(serverInfo.qrPayload, {
        width: 260,
        margin: 2,
        color: {
          dark: '#07090e',
          light: '#ffffff'
        }
      }).then(setQrDataUrl).catch(console.error);
    }
  }, [serverInfo?.qrPayload]);

  const copyUrl = () => {
    if (serverInfo?.phoneWebUrl) {
      navigator.clipboard.writeText(serverInfo.phoneWebUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openInBrowser = () => {
    if (serverInfo?.phoneWebUrl && window.phoneMicDesktop?.openExternalUrl) {
      window.phoneMicDesktop.openExternalUrl(serverInfo.phoneWebUrl);
    }
  };

  return (
    <div className="glass-card" style={{ padding: 24, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-emerald)'
          }}>
            <QrCode size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Connect Phone</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Scan QR code with phone camera</p>
          </div>
        </div>

        {/* Pairing PIN Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '6px 12px',
          borderRadius: 12,
          border: '1px solid var(--border-subtle)'
        }}>
          <Shield size={14} color="var(--accent-emerald)" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>PIN:</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, color: 'var(--accent-emerald)', letterSpacing: '0.1em' }}>
            {serverInfo?.pin || '----'}
          </span>
          <button
            onClick={onRegeneratePin}
            disabled={isRegenerating}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              padding: 2
            }}
            title="Generate new PIN"
          >
            <RefreshCw size={13} className={isRegenerating ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* QR Code Container */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        background: 'rgba(0,0,0,0.25)',
        borderRadius: 14,
        border: '1px solid var(--border-subtle)',
        marginBottom: 16
      }}>
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Scan to pair"
            style={{
              width: 190,
              height: 190,
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
            }}
          />
        ) : (
          <div style={{ width: 190, height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Generating QR...</span>
          </div>
        )}

        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 10 }}>
          Make sure phone and PC are connected to the same Wi-Fi
        </span>
      </div>

      {/* Network Interface Switcher */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <Network size={14} /> Network Interface (PC IP)
          </div>
          <button
            type="button"
            onClick={() => {
              const custom = prompt('Enter PC IP Address (e.g. 10.106.174.208):', serverInfo?.selectedAddress || '10.106.174.208');
              if (custom && custom.trim()) {
                const s = sanitizeHostAndPort(custom.trim(), serverInfo?.port || 8990);
                onSelectIp(s.host);
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-emerald)',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Custom IP...
          </button>
        </div>
        <select
          value={serverInfo?.selectedAddress || ''}
          onChange={(e) => onSelectIp(e.target.value)}
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {serverInfo?.addresses.map((addr: NetworkAddressItem) => (
            <option key={addr.address} value={addr.address} style={{ background: '#0e131f' }}>
              {addr.name} — {addr.address} {addr.isWireless ? '(Wi-Fi)' : ''}
            </option>
          ))}
          {serverInfo?.selectedAddress && !serverInfo.addresses.some(a => a.address === serverInfo.selectedAddress) && (
            <option value={serverInfo.selectedAddress} style={{ background: '#0e131f' }}>
              Active Tethering IP — {serverInfo.selectedAddress}
            </option>
          )}
        </select>
      </div>

      {/* Copy / Open URL Buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={copyUrl}
          className="btn-outline"
          style={{ flex: 1, justifyContent: 'center' }}
        >
          {copied ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
          <span>{copied ? 'Copied URL!' : 'Copy Pairing Link'}</span>
        </button>

        <button
          onClick={openInBrowser}
          className="btn-outline"
          style={{ padding: '9px 12px' }}
          title="Open phone web app in browser (test mode)"
        >
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
};
