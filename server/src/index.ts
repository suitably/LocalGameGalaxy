import { serve } from '@hono/node-server';
import { createGalaxyServer } from './core/app';
import { cloudflareTunnel } from './core/tunnel';
import type { ServerConfig } from './core/types';

const port = Number(process.env.PORT || 3000);
const activePlugins = (process.env.PLUGINS || 'relay,melodiq').split(',').map((s) => s.trim());
const enableTunnel = process.env.ENABLE_TUNNEL === 'true' || process.argv.includes('--tunnel');

const config: ServerConfig = {
  port,
  activePlugins,
  enableTunnel,
  musicDir: process.env.MUSIC_DIR,
  allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : undefined,
};

async function main() {
  const app = await createGalaxyServer(config);

  serve({ fetch: app.fetch, port }, async (info) => {
    console.log(`\n======================================================`);
    console.log(`🚀 LOCAL GAME GALAXY BACKEND KERNEL RUNNING`);
    console.log(`======================================================`);
    console.log(`📍 Local URL:       http://localhost:${info.port}`);
    console.log(`🧩 Active Plugins:  ${config.activePlugins.join(', ')}`);

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
      console.log(`💡 To enable zero-config public sharing, pass '--tunnel' or ENABLE_TUNNEL=true`);
      console.log(`======================================================\n`);
    }
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
