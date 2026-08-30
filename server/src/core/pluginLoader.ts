import type { Hono } from 'hono';
import type { GalaxyPlugin, ServerConfig } from './types';
import { relayPlugin } from '../plugins/relay';
import { melodiqPlugin } from '../plugins/melodiq';

const ALL_PLUGINS: Record<string, GalaxyPlugin> = {
  relay: relayPlugin,
  melodiq: melodiqPlugin,
};

export async function loadPlugins(app: Hono, config: ServerConfig): Promise<GalaxyPlugin[]> {
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
