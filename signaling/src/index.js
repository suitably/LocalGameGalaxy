import { Server } from 'bittorrent-tracker';
import os from 'node:os';

const PORT = Number(process.env.PORT || process.env.TRACKER_PORT || 8000);
const HOST = process.env.HOST || process.env.TRACKER_HOST || '0.0.0.0';

const server = new Server({
  udp: false,  // UDP not needed for WebRTC browser signaling
  http: true, // HTTP enabled for health checks, stats, and HTTP trackers
  ws: true,   // WebSockets enabled for WebRTC peer signaling
  stats: true, // Built-in /stats endpoint
});

// Intercept custom HTTP endpoints before bittorrent-tracker's internal router
if (server.http) {
  server.http.prependListener('request', (req, res) => {
    const url = (req.url || '').split('?')[0];

    if (url === '/health' || url === '/api/health') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      });
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'galaxy-signaling',
          uptime: Math.floor(process.uptime()),
          torrents: Object.keys(server.torrents || {}).length,
        })
      );
      return;
    }

    if (url === '/' && req.method === 'GET' && !req.headers.upgrade) {
      res.writeHead(200, {
        'Content-Type': 'application/json',
      });
      res.end(
        JSON.stringify({
          name: 'LocalGameGalaxy WebRTC Signaling Server',
          version: '1.0.0',
          protocol: 'bittorrent-tracker-ws',
          endpoints: {
            websocket: `ws://${req.headers.host || 'localhost:' + PORT}`,
            health: '/health',
            stats: '/stats',
          },
        })
      );
    }
  });
}

server.on('error', (err) => {
  console.error('[Signaling Server] Fatal error:', err.message);
});

server.on('warning', (err) => {
  console.warn('[Signaling Server] Warning:', err.message);
});

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

server.listen(PORT, HOST, () => {
  const localIp = getLocalIp();
  console.log('======================================================');
  console.log('🛰️  LOCAL GAME GALAXY / WEBRTC SIGNALING SERVICE');
  console.log('======================================================');
  console.log(`📍 WebSocket URL:    ws://localhost:${PORT}`);
  console.log(`🌐 Network Access:   ws://${localIp}:${PORT}`);
  console.log(`💚 Health Check:     http://localhost:${PORT}/health`);
  console.log(`📊 Statistics:       http://localhost:${PORT}/stats`);
  console.log('======================================================\n');
});

// Graceful shutdown
const shutdown = () => {
  console.log('\nShutting down signaling server...');
  server.close(() => {
    console.log('Signaling server terminated.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
