import React, { useRef, useEffect } from 'react';
import { Terminal, Trash2 } from 'lucide-react';

interface LogsPanelProps {
  logs: string[];
  onClearLogs: () => void;
}

export const LogsPanel: React.FC<LogsPanelProps> = ({ logs, onClearLogs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          <Terminal size={14} color="var(--accent-cyan)" />
          <span>ACTIVITY LOGS & EVENTS</span>
        </div>

        <button
          onClick={onClearLogs}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.72rem'
          }}
          title="Clear console logs"
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>

      <div
        ref={scrollRef}
        style={{
          height: 100,
          overflowY: 'auto',
          background: 'rgba(0, 0, 0, 0.45)',
          borderRadius: 8,
          padding: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.72rem',
          lineHeight: 1.5,
          color: '#cbd5e1'
        }}
      >
        {logs.length === 0 ? (
          <span style={{ color: 'var(--text-muted)' }}>Waiting for server events...</span>
        ) : (
          logs.map((log, index) => (
            <div key={index} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
