import os from 'os';
import { execSync } from 'child_process';

export interface NetworkInterfaceInfo {
  name: string;
  address: string;
  family: string;
  isInternal: boolean;
  isWireless: boolean;
  isDefaultGateway?: boolean;
}

function getActiveRouteInterface(): string | null {
  if (process.platform === 'win32') {
    try {
      const output = execSync('powershell.exe -NoProfile -Command "Get-NetRoute -DestinationPrefix 0.0.0.0/0 | Select-Object -ExpandProperty InterfaceAlias"', {
        encoding: 'utf8',
        timeout: 1500,
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
      if (output) {
        const first = output.split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0];
        return first || null;
      }
    } catch {
      // fallback
    }
  }
  return null;
}

export function getLocalIPAddresses(): NetworkInterfaceInfo[] {
  const overrideIP = process.env.PHONEMIC_IP;
  const activeRouteName = getActiveRouteInterface();
  const interfaces = os.networkInterfaces();
  const results: NetworkInterfaceInfo[] = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;

    for (const addr of addrs) {
      // Look for IPv4 non-internal addresses
      if (addr.family === 'IPv4' && !addr.internal) {
        const lowerName = name.toLowerCase();

        // Filter out virtual/host-only adapters that cannot be reached by external devices
        const isVirtual = 
          lowerName.includes('virtualbox') ||
          lowerName.includes('host-only') ||
          lowerName.includes('vethernet') ||
          lowerName.includes('vmware') ||
          lowerName.includes('wsl') ||
          lowerName.includes('loopback') ||
          lowerName.includes('teredo') ||
          lowerName.includes('isatap') ||
          addr.address.startsWith('192.168.56.') ||
          addr.address.startsWith('169.254.'); // link-local APIPA

        const isWireless = lowerName.includes('wi-fi') || lowerName.includes('wlan') || lowerName.includes('wireless');
        const isDefaultRoute = activeRouteName ? name.toLowerCase() === activeRouteName.toLowerCase() : false;

        // Include if not virtual, OR if it happens to be the active default route
        if (!isVirtual || isDefaultRoute) {
          results.push({
            name,
            address: addr.address,
            family: addr.family,
            isInternal: addr.internal,
            isWireless,
            isDefaultGateway: isDefaultRoute
          });
        }
      }
    }
  }

  // Sort priority:
  // 1. Explicit override IP (if set)
  // 2. Active default gateway interface (e.g. Ethernet 4 for USB tethering)
  // 3. Wireless (Wi-Fi)
  // 4. Other physical LAN interfaces
  results.sort((a, b) => {
    if (overrideIP) {
      if (a.address === overrideIP) return -1;
      if (b.address === overrideIP) return 1;
    }
    if (a.isDefaultGateway && !b.isDefaultGateway) return -1;
    if (!a.isDefaultGateway && b.isDefaultGateway) return 1;
    if (a.isWireless && !b.isWireless) return -1;
    if (!a.isWireless && b.isWireless) return 1;
    return a.name.localeCompare(b.name);
  });

  return results;
}

export function getPrimaryLANIP(): string {
  const overrideIP = process.env.PHONEMIC_IP;
  if (overrideIP) return overrideIP;

  const list = getLocalIPAddresses();
  if (list.length > 0) {
    return list[0].address;
  }
  return '127.0.0.1';
}
