import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { ServerConfig } from './types';
import { loadPlugins } from './pluginLoader';

export async function createGalaxyServer(config: ServerConfig): Promise<Hono> {
  const app = new Hono();

  // Middleware: Logger & CORS
  app.use('*', logger());
  app.use(
    '*',
    cors({
      origin: config.allowedOrigins && config.allowedOrigins.length > 0 ? config.allowedOrigins : '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['Content-Length', 'X-Requested-With'],
      maxAge: 86400,
    })
  );

  // Health & Server Info
  app.get('/health', (c) => c.json({ status: 'ok', uptime: process.uptime() }));
  app.get('/api/info', (c) =>
    c.json({
      name: 'LocalGameGalaxy Backend Kernel',
      version: '2.0.0',
      activePlugins: config.activePlugins,
    })
  );

  // Load requested plugins
  await loadPlugins(app, config);

  return app;
}
