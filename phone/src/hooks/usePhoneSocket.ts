import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ConnectionState,
  WSClientMessage,
  WSServerMessage,
  RECONNECT_INTERVAL_MS,
  MAX_RECONNECT_ATTEMPTS,
  PING_INTERVAL_MS
} from '@phonemic/shared';
import { packAudioPacket } from '../utils/pcm';

export interface PhoneSocketConfig {
  ip: string;
  port: number;
  protocol: 'ws' | 'wss';
  pin: string;
  deviceName: string;
}

export interface PhoneSocketStats {
  latencyMs: number;
  packetsSent: number;
  bytesSent: number;
  sendRateKbps: number;
  packetRate: number;
  reconnectAttempts: number;
}

export function usePhoneSocket() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<PhoneSocketStats>({
    latencyMs: 0,
    packetsSent: 0,
    bytesSent: 0,
    sendRateKbps: 0,
    packetRate: 0,
    reconnectAttempts: 0
  });

  const socketRef = useRef<WebSocket | null>(null);
  const configRef = useRef<PhoneSocketConfig | null>(null);
  const seqRef = useRef(0);
  const pingTimerRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectCountRef = useRef(0);
  const manualDisconnectRef = useRef(false);

  // Rate measurement refs
  const bytesSinceLastSecRef = useRef(0);
  const packetsSinceLastSecRef = useRef(0);
  const rateTimerRef = useRef<number | null>(null);

  // Calculate bitrates every second
  useEffect(() => {
    rateTimerRef.current = window.setInterval(() => {
      const kbps = ((bytesSinceLastSecRef.current * 8) / 1000);
      const pps = packetsSinceLastSecRef.current;
      bytesSinceLastSecRef.current = 0;
      packetsSinceLastSecRef.current = 0;

      setStats(prev => ({
        ...prev,
        sendRateKbps: Math.round(kbps * 10) / 10,
        packetRate: pps
      }));
    }, 1000);

    return () => {
      if (rateTimerRef.current) clearInterval(rateTimerRef.current);
    };
  }, []);
  1
  const clearTimers = useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const sendJSON = useCallback((msg: WSClientMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const startPingLoop = useCallback(() => {
    if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    pingTimerRef.current = window.setInterval(() => {
      sendJSON({
        type: 'ping',
        timestamp: Date.now()
      });
    }, PING_INTERVAL_MS);
  }, [sendJSON]);

  const disconnect = useCallback((manual = true) => {
    manualDisconnectRef.current = manual;
    clearTimers();
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch {
        // ignore
      }
      socketRef.current = null;
    }
    setConnectionState('idle');
  }, [clearTimers]);

  const connect = useCallback((config: PhoneSocketConfig) => {
    configRef.current = config;
    manualDisconnectRef.current = false;
    clearTimers();

    const wsUrl = `${config.protocol}://${config.ip}:${config.port}/ws`;
    setConnectionState('connecting');
    setErrorMessage(null);

    try {
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      socketRef.current = ws;

      ws.onopen = () => {
        setConnectionState('pairing');
        reconnectCountRef.current = 0;
        setStats(prev => ({ ...prev, reconnectAttempts: 0 }));

        // Send pairing request
        const pairMsg: WSClientMessage = {
          type: 'pair_request',
          pin: config.pin,
          deviceName: config.deviceName || navigator.userAgent.slice(0, 30)
        };
        ws.send(JSON.stringify(pairMsg));
      };

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const data: WSServerMessage = JSON.parse(event.data);
            if (data.type === 'pair_response') {
              if (data.success) {
                setConnectionState('connected');
                startPingLoop();
              } else {
                setConnectionState('error');
                setErrorMessage(data.error || 'Pairing failed. Check PIN and try again.');
                disconnect(true);
              }
            } else if (data.type === 'pong') {
              const rtt = Date.now() - data.timestamp;
              setStats(prev => ({ ...prev, latencyMs: Math.max(1, Math.round(rtt / 2)) }));
            } else if (data.type === 'stream_state') {
              setConnectionState(data.streaming ? 'streaming' : 'connected');
            } else if (data.type === 'error') {
              setErrorMessage(data.message);
            }
          } catch (e) {
            console.error('Failed to parse WS server message:', e);
          }
        }
      };

      ws.onerror = () => {
        // WebSocket error event gives minimal details in browser for security
        setErrorMessage('Connection failed. Verify Wi-Fi network and Desktop IP.');
      };

      ws.onclose = (event) => {
        clearTimers();
        if (manualDisconnectRef.current) {
          setConnectionState('idle');
          return;
        }

        setConnectionState('disconnected');

        // Automatic Reconnect
        if (reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectCountRef.current++;
          const nextAttempt = reconnectCountRef.current;
          setStats(prev => ({ ...prev, reconnectAttempts: nextAttempt }));

          reconnectTimerRef.current = window.setTimeout(() => {
            if (configRef.current && !manualDisconnectRef.current) {
              connect(configRef.current);
            }
          }, RECONNECT_INTERVAL_MS);
        } else {
          setConnectionState('error');
          setErrorMessage('Max reconnect attempts reached. Please reconnect manually.');
        }
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create WebSocket';
      setConnectionState('error');
      setErrorMessage(msg);
    }
  }, [clearTimers, disconnect, startPingLoop]);

  const sendAudioChunk = useCallback((pcmData: ArrayBuffer) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const seq = seqRef.current++;
    const timestamp = Date.now();
    const packet = packAudioPacket(seq, timestamp, pcmData);

    try {
      socketRef.current.send(packet);

      const byteLen = packet.byteLength;
      bytesSinceLastSecRef.current += byteLen;
      packetsSinceLastSecRef.current += 1;

      setStats(prev => ({
        ...prev,
        packetsSent: prev.packetsSent + 1,
        bytesSent: prev.bytesSent + byteLen
      }));
    } catch (err) {
      console.error('Failed to send audio packet:', err);
    }
  }, []);

  const notifyStreamState = useCallback((streaming: boolean) => {
    sendJSON({ type: streaming ? 'start_stream' : 'stop_stream' });
    setConnectionState(streaming ? 'streaming' : 'connected');
  }, [sendJSON]);

  const notifyMute = useCallback((muted: boolean) => {
    sendJSON({ type: 'mute', muted });
  }, [sendJSON]);

  useEffect(() => {
    return () => {
      clearTimers();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [clearTimers]);

  return {
    connectionState,
    errorMessage,
    stats,
    connect,
    disconnect,
    sendAudioChunk,
    notifyStreamState,
    notifyMute
  };
}
