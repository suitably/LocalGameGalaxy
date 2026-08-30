import { createGalaxyServer } from './core/app';

let cachedApp: any = null;

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    if (!cachedApp) {
      const activePlugins = (env.PLUGINS || 'relay').split(',').map((s: string) => s.trim());
      cachedApp = await createGalaxyServer({
        port: 8787,
        activePlugins,
        allowedOrigins: env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : ['*'],
      });
    }
    return cachedApp.fetch(request, env);
  },
};
