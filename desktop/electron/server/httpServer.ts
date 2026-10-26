import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { generateLocalTLSCertificate } from './certGenerator';
import { getLocalIPAddresses } from './networkUtils';

export interface HttpServerConfig {
  port: number;
  useHttps: boolean;
  pin: string;
}

export interface ServerInstance {
  server: http.Server | https.Server;
  port: number;
  protocol: 'http' | 'https';
  addresses: string[];
}

export function createHttpServer(config: HttpServerConfig): ServerInstance {
  const addresses = getLocalIPAddresses().map(a => a.address);

  // Phone app build path
  const candidatePaths = [
    path.resolve(__dirname, '../../../phone/dist'),
    path.resolve(__dirname, '../../phone/dist'),
    path.resolve(process.cwd(), 'phone/dist')
  ];
  const phoneDistPath = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
  const hasPhoneDist = fs.existsSync(phoneDistPath);

  const requestHandler: http.RequestListener = (req, res) => {
    // CORS headers for local LAN access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // API endpoint for pairing info
    if (url.pathname === '/api/info') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        appName: 'PhoneMic',
        version: '1.0.0',
        port: config.port,
        protocol: config.useHttps ? 'https' : 'http',
        pin: config.pin,
        ipAddresses: addresses
      }));
      return;
    }

    // Serve static phone app if compiled
    if (hasPhoneDist) {
      let filePath = path.join(phoneDistPath, url.pathname === '/' ? 'index.html' : url.pathname);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(phoneDistPath, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.ico': 'image/x-icon'
      };

      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(content);
        return;
      } catch (e) {
        // Fallback to basic HTML
      }
    }

    // Fallback info page if phone app not built yet
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PhoneMic Server</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; background: #090d16; color: #f8fafc; padding: 30px; text-align: center; }
            .card { max-width: 440px; margin: 40px auto; background: #121826; border-radius: 16px; padding: 24px; border: 1px solid rgba(255,255,255,0.1); }
            h1 { color: #10b981; }
            code { background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>PhoneMic Server Active</h1>
            <p>Connect your phone client to:</p>
            <p><code>${addresses[0] || '127.0.0.1'}:${config.port}</code></p>
            <p>Pairing PIN: <strong>${config.pin}</strong></p>
          </div>
        </body>
      </html>
    `);
  };

  let server: http.Server | https.Server;

  if (config.useHttps) {
    try {
      const certs = generateLocalTLSCertificate(addresses);
      server = https.createServer({
        cert: certs.cert,
        key: certs.key
      }, requestHandler);
    } catch (err) {
      console.warn('Failed to start HTTPS server, falling back to HTTP:', err);
      server = http.createServer(requestHandler);
      config.useHttps = false;
    }
  } else {
    server = http.createServer(requestHandler);
  }

  return {
    server,
    port: config.port,
    protocol: config.useHttps ? 'https' : 'http',
    addresses
  };
}
