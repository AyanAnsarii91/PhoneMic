import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { generateLocalTLSCertificate } from './certGenerator.js';
import { getLocalIPAddresses } from './networkUtils.js';

export interface HttpServerConfig {
  port: number;
  useHttps: boolean;
  pin?: string;
  getPin?: () => string;
}

export interface ServerInstance {
  server: http.Server | https.Server;
  port: number;
  protocol: 'http' | 'https';
  addresses: string[];
}

function getPhoneDistPath(): string | null {
  const candidatePaths = [
    path.resolve(__dirname, '../../../phone/dist'),
    path.resolve(__dirname, '../../phone/dist'),
    path.resolve(process.cwd(), 'phone/dist'),
    path.resolve(process.cwd(), '../phone/dist')
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(path.join(p, 'index.html'))) {
      return p;
    }
  }
  return null;
}

export function createHttpServer(config: HttpServerConfig): ServerInstance {
  const addresses = getLocalIPAddresses().map(a => a.address);

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

    const currentPin = config.getPin ? config.getPin() : (config.pin || '0000');
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // API endpoint for pairing info
    if (url.pathname === '/api/info') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        appName: 'PhoneMic',
        version: '1.0.0',
        port: config.port,
        protocol: config.useHttps ? 'https' : 'http',
        pin: currentPin,
        ipAddresses: addresses
      }));
      return;
    }

    // Explicit status endpoint
    if (url.pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>PhoneMic Server Status</title>
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
              <p>Primary IP: <code>${addresses[0] || '127.0.0.1'}:${config.port}</code></p>
              <p>Authoritative Pairing PIN: <strong>${currentPin}</strong></p>
              <p><a href="/" style="color: #10b981;">Open Phone Client App</a></p>
            </div>
          </body>
        </html>
      `);
      return;
    }

    // Serve compiled PhoneMic Mobile Client PWA
    const phoneDist = getPhoneDistPath();
    if (phoneDist) {
      let relPath = url.pathname.replace(/^\/+/, '');
      if (!relPath) relPath = 'index.html';
      let filePath = path.join(phoneDist, relPath);

      // SPA fallback to index.html if file does not exist
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(phoneDist, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.ico': 'image/x-icon',
        '.webmanifest': 'application/manifest+json'
      };

      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, {
          'Content-Type': mimeTypes[ext] || 'application/octet-stream',
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000'
        });
        res.end(content);
        return;
      } catch (e) {
        // Fallback
      }
    }

    // Fallback info page ONLY if phone app is not built yet
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
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
            <p>Pairing PIN: <strong>${currentPin}</strong></p>
            <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 15px;">Phone client build not detected. Run <code>npm run build:phone</code>.</p>
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
