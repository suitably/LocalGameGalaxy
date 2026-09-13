import { serve, type ServerType } from '@hono/node-server';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { createGalaxyServer } from './core/app';
import { cloudflareTunnel } from './core/tunnel';
import type { ServerConfig } from './core/types';
import { serverConfig } from './config';
import { getLocalIp } from './utils/helpers';

const port = serverConfig.port;
const activePlugins = (process.env.PLUGINS || 'relay,melodiq').split(',').map((s) => s.trim());
const enableTunnel = process.env.ENABLE_TUNNEL === 'true' || process.argv.includes('--tunnel');

const config: ServerConfig = {
  port,
  activePlugins,
  enableTunnel,
  musicDir: process.env.MUSIC_DIR,
  allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : undefined,
};

async function initializeTracker(httpServer: ServerType): Promise<void> {
  try {
    const { Server: TrackerServer } = await import('bittorrent-tracker');
    const tracker = new TrackerServer({
      http: false,
      udp: false,
      ws: { noServer: true },
    });

    httpServer.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      tracker.ws.handleUpgrade(request, socket, head, (ws: unknown) => {
        tracker.ws.emit('connection', ws, request);
      });
    });

    tracker.on('error', (err: Error) => {
      console.error('[Tracker] Error:', err.message);
    });
    tracker.on('warning', (err: Error) => {
      console.warn('[Tracker] Warning:', err.message);
    });

    console.log('[Tracker] WebRTC signaling tracker initialized on HTTP upgrade path');
  } catch (err) {
    console.error('[Tracker] Failed to initialize tracker:', err);
  }
}

async function main(): Promise<void> {
  const app = await createGalaxyServer(config);

  const server = serve({ fetch: app.fetch, port }, async (info) => {
    const localIp = getLocalIp();
    console.log(`\n======================================================`);
    console.log(`🚀 LOCAL GAME GALAXY / MELODIQ RUNNING (HONO)`);
    console.log(`======================================================`);
    console.log(`📍 Local URL:       http://localhost:${info.port}`);
    console.log(`🌐 Network Access:  http://${localIp}:${info.port}`);
    console.log(`🔑 Security Token:  ${serverConfig.token}`);
    console.log(`🧩 Active Plugins:  ${config.activePlugins.join(', ')}`);
    console.log(`======================================================`);

    if (enableTunnel) {
      console.log(`\n⏳ Establishing Cloudflare Quick Tunnel for friends...`);
      const tunnelUrl = await cloudflareTunnel.start(info.port);
      if (tunnelUrl) {
        console.log(`\n🔗 Public HTTPS Link (Share with friends!):`);
        console.log(`👉 ${tunnelUrl}`);
        console.log(`======================================================\n`);
      } else {
        console.log(`⚠️  Could not start Cloudflare tunnel. Run 'cloudflared' or check connection.`);
      }
    } else {
      console.log(`💡 To enable zero-config public sharing, pass '--tunnel' or ENABLE_TUNNEL=true\n`);
    }
  });

  await initializeTracker(server);
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
