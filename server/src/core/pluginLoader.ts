import type { Hono } from 'hono';
import type { GalaxyPlugin, ServerConfig, HonoEnv } from './types';
import { relayPlugin } from '../plugins/relay';
import { melodiqPlugin } from '../plugins/melodiq';
import { tabletopPlugin } from '../plugins/tabletop';

const ALL_PLUGINS: Record<string, GalaxyPlugin> = {
  relay: relayPlugin,
  melodiq: melodiqPlugin,
  tabletop: tabletopPlugin,
};

export async function loadPlugins(app: Hono<HonoEnv>, config: ServerConfig): Promise<GalaxyPlugin[]> {
  const loaded: GalaxyPlugin[] = [];

  for (const pluginId of config.activePlugins) {
    const plugin = ALL_PLUGINS[pluginId.trim().toLowerCase()];
    if (plugin) {
      console.log(`[Plugin] Initializing "${plugin.name}" (${plugin.version})...`);
      await plugin.init(app, config);
      loaded.push(plugin);
    } else {
      console.warn(`[Plugin] Unknown plugin requested: "${pluginId}"`);
    }
  }

  return loaded;
}
