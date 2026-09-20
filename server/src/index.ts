import { serve } from '@hono/node-server';
import { createGalaxyServer } from './core/app';
import { cloudflareTunnel } from './core/tunnel';
import type { ServerConfig } from './core/types';
import { serverConfig } from './config';
import { getLocalIp } from './utils/helpers';

const port = serverConfig.port;
const activePlugins = (process.env.PLUGINS || 'relay,melodiq,tabletop').split(',').map((s) => s.trim());
const enableTunnel = process.env.ENABLE_TUNNEL === 'true' || process.argv.includes('--tunnel');

const config: ServerConfig = {
  port,
  activePlugins,
  enableTunnel,
  musicDir: process.env.MUSIC_DIR,
  allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : undefined,
};

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
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
