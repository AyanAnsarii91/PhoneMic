import os from 'os';

export interface NetworkInterfaceInfo {
  name: string;
  address: string;
  family: string;
  isInternal: boolean;
  isWireless: boolean;
}

export function getLocalIPAddresses(): NetworkInterfaceInfo[] {
  const interfaces = os.networkInterfaces();
  const results: NetworkInterfaceInfo[] = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;

    for (const addr of addrs) {
      // Look for IPv4 non-internal addresses
      if (addr.family === 'IPv4' && !addr.internal) {
        const lowerName = name.toLowerCase();
        const isWireless = lowerName.includes('wi-fi') || lowerName.includes('wlan') || lowerName.includes('wireless');

        results.push({
          name,
          address: addr.address,
          family: addr.family,
          isInternal: addr.internal,
          isWireless
        });
      }
    }
  }

  // Sort wireless first, then general LAN
  results.sort((a, b) => {
    if (a.isWireless && !b.isWireless) return -1;
    if (!a.isWireless && b.isWireless) return 1;
    return a.name.localeCompare(b.name);
  });

  return results;
}

export function getPrimaryLANIP(): string {
  const list = getLocalIPAddresses();
  if (list.length > 0) {
    return list[0].address;
  }
  return '127.0.0.1';
}
