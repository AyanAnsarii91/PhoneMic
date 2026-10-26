export interface SanitizedHostConfig {
  host: string;
  port: number;
  protocol: 'ws' | 'wss';
}

/**
 * Robustly sanitizes and separates hostname and port from any input string.
 * Prevents duplicate port anomalies such as "10.106.174.208:8990:8990"
 * or invalid paths like "/wss".
 */
export function sanitizeHostAndPort(
  rawInput: string,
  defaultPort = 8990,
  defaultProtocol: 'ws' | 'wss' = 'wss'
): SanitizedHostConfig {
  let cleaned = (rawInput || '').trim();
  let protocol: 'ws' | 'wss' = defaultProtocol;

  // Extract and clean protocol if present
  if (cleaned.startsWith('https://')) {
    protocol = 'wss';
    cleaned = cleaned.replace(/^https:\/\//, '');
  } else if (cleaned.startsWith('http://')) {
    protocol = 'ws';
    cleaned = cleaned.replace(/^http:\/\//, '');
  } else if (cleaned.startsWith('wss://')) {
    protocol = 'wss';
    cleaned = cleaned.replace(/^wss:\/\//, '');
  } else if (cleaned.startsWith('ws://')) {
    protocol = 'ws';
    cleaned = cleaned.replace(/^ws:\/\//, '');
  }

  // Strip path or trailing slashes (e.g. /ws, /wss, /?ip=...)
  cleaned = cleaned.replace(/[/?#].*$/, '');

  let host = cleaned;
  let port = defaultPort;

  // Split on colon if port is embedded in host (e.g. "10.106.174.208:8990")
  if (cleaned.includes(':')) {
    const lastColonIndex = cleaned.lastIndexOf(':');
    const potentialHost = cleaned.substring(0, lastColonIndex);
    const potentialPortStr = cleaned.substring(lastColonIndex + 1);
    const parsedPort = parseInt(potentialPortStr, 10);

    if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
      host = potentialHost;
      port = parsedPort;
    }
  }

  // Strip any brackets from IPv6 (e.g. [::1])
  host = host.replace(/^\[|\]$/g, '');

  return { host, port, protocol };
}
