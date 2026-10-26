import selfsigned from 'selfsigned';

export interface CertificatePair {
  cert: string;
  key: string;
}

let cachedCert: CertificatePair | null = null;

export function generateLocalTLSCertificate(ipAddresses: string[] = []): CertificatePair {
  if (cachedCert) {
    return cachedCert;
  }

  const altNames = [
    { type: 2, value: 'localhost' },
    { type: 7, ip: '127.0.0.1' }
  ];

  for (const ip of ipAddresses) {
    if (ip !== '127.0.0.1') {
      altNames.push({ type: 7, ip });
    }
  }

  const attrs = [
    { name: 'commonName', value: 'PhoneMic Local Server' },
    { name: 'organizationName', value: 'PhoneMic' }
  ];

  // Generate self-signed certificate with 365-day validity
  const pems = selfsigned.generate(attrs, {
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      {
        name: 'subjectAltName',
        altNames
      }
    ]
  });

  cachedCert = {
    cert: pems.cert,
    key: pems.private
  };

  return cachedCert;
}
