import React from 'react';
import { ConnectionState } from '@phonemic/shared';
import { Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';

interface ConnectionBadgeProps {
  state: ConnectionState;
  latencyMs: number;
  reconnectAttempts: number;
}

export const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({ state, latencyMs, reconnectAttempts }) => {
  const getBadgeConfig = () => {
    switch (state) {
      case 'streaming':
        return {
          color: '#10b981',
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.3)',
          label: 'STREAMING',
          icon: <Wifi size={14} className="text-emerald-400" />
        };
      case 'connected':
        return {
          color: '#06b6d4',
          bg: 'rgba(6, 182, 212, 0.15)',
          border: 'rgba(6, 182, 212, 0.3)',
          label: 'PAIRED & READY',
          icon: <Wifi size={14} />
        };
      case 'connecting':
      case 'pairing':
        return {
          color: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.3)',
          label: state === 'pairing' ? 'VERIFYING PIN...' : 'CONNECTING...',
          icon: <RefreshCw size={14} className="animate-spin" />
        };
      case 'disconnected':
        return {
          color: '#f97316',
          bg: 'rgba(249, 115, 22, 0.15)',
          border: 'rgba(249, 115, 22, 0.3)',
          label: reconnectAttempts > 0 ? `RECONNECTING (${reconnectAttempts})...` : 'DISCONNECTED',
          icon: <RefreshCw size={14} className="animate-spin" />
        };
      case 'error':
        return {
          color: '#ef4444',
          bg: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.3)',
          label: 'ERROR',
          icon: <AlertCircle size={14} />
        };
      case 'idle':
      default:
        return {
          color: '#94a3b8',
          bg: 'rgba(148, 163, 184, 0.1)',
          border: 'rgba(148, 163, 184, 0.2)',
          label: 'NOT CONNECTED',
          icon: <WifiOff size={14} />
        };
    }
  };

  const badge = getBadgeConfig();

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 14px',
      borderRadius: 24,
      background: badge.bg,
      border: `1px solid ${badge.border}`,
      color: badge.color,
      fontSize: '0.78rem',
      fontWeight: 700,
      letterSpacing: '0.04em'
    }}>
      {badge.icon}
      <span>{badge.label}</span>
      {(state === 'streaming' || state === 'connected') && latencyMs > 0 && (
        <span style={{
          marginLeft: 4,
          paddingLeft: 8,
          borderLeft: '1px solid rgba(255,255,255,0.2)',
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
          opacity: 0.9
        }}>
          {latencyMs}ms
        </span>
      )}
    </div>
  );
};
