import React, { useState, useEffect } from 'react';
import { PhoneSocketConfig } from '../hooks/usePhoneSocket';
import { QrCode, Server, Shield, Smartphone, X } from 'lucide-react';
import { DEFAULT_PORT } from '@phonemic/shared';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: PhoneSocketConfig) => void;
  isConnecting: boolean;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  isConnecting
}) => {
  const [ip, setIp] = useState('');
  const [port, setPort] = useState(DEFAULT_PORT.toString());
  const [pin, setPin] = useState('');
  const [protocol, setProtocol] = useState<'ws' | 'wss'>('ws');
  const [deviceName, setDeviceName] = useState('');

  // Auto-detect device name & URL parameters from QR Code scan
  useEffect(() => {
    // Detect friendly phone device name
    const ua = navigator.userAgent;
    let detectedName = 'Mobile Browser';
    if (/Android/i.test(ua)) detectedName = 'Android Phone';
    else if (/iPhone|iPad/i.test(ua)) detectedName = 'iOS Device';
    setDeviceName(detectedName);

    // Read URL query parameters from QR code
    const params = new URLSearchParams(window.location.search);
    const queryIp = params.get('ip');
    const queryPort = params.get('port');
    const queryPin = params.get('pin');
    const queryProto = params.get('proto');

    if (queryIp) setIp(queryIp);
    if (queryPort) setPort(queryPort);
    if (queryPin) setPin(queryPin);
    if (queryProto === 'wss' || queryProto === 'ws') setProtocol(queryProto);
    else if (window.location.protocol === 'https:') setProtocol('wss');
    
    // Auto-fill from localStorage if previously paired
    const savedConfig = localStorage.getItem('phonemic_last_config');
    if (savedConfig && !queryIp) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.ip) setIp(parsed.ip);
        if (parsed.port) setPort(parsed.port.toString());
        if (parsed.pin) setPin(parsed.pin);
        if (parsed.protocol) setProtocol(parsed.protocol);
      } catch {
        // ignore
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip.trim() || !pin.trim()) return;

    const config: PhoneSocketConfig = {
      ip: ip.trim(),
      port: parseInt(port, 10) || DEFAULT_PORT,
      protocol,
      pin: pin.trim(),
      deviceName: deviceName.trim() || 'Android Phone'
    };

    localStorage.setItem('phonemic_last_config', JSON.stringify(config));
    onConnect(config);
  };

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-green)'
          }}>
            <QrCode size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Pair with Desktop PC</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Scan QR code on PC screen or enter details below
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <Server size={14} /> Desktop IP Address
            </label>
            <input
              type="text"
              placeholder="e.g. 192.168.1.50"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <Shield size={14} /> 4-Digit PIN
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-green)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  letterSpacing: '0.2em',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <Smartphone size={14} /> Device Nickname
            </label>
            <input
              type="text"
              placeholder="e.g. My Phone"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Security Protocol:</span>
            <button
              type="button"
              onClick={() => setProtocol(p => p === 'ws' ? 'wss' : 'ws')}
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                background: protocol === 'wss' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${protocol === 'wss' ? 'var(--accent-green)' : 'var(--border-color)'}`,
                color: protocol === 'wss' ? 'var(--accent-green)' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer'
              }}
            >
              {protocol.toUpperCase()}
            </button>
          </div>

          <button
            type="submit"
            disabled={isConnecting}
            className="btn-primary"
            style={{ marginTop: 8 }}
          >
            {isConnecting ? 'Connecting...' : 'Connect to PC'}
          </button>
        </form>
      </div>
    </div>
  );
};
