import type { Hono } from 'hono';

export interface ServerConfig {
  port: number;
  sslPort?: number;
  token?: string;
  allowedOrigins?: string[];
  enableTunnel?: boolean;
  activePlugins: string[];
  musicDir?: string;
  modelsDir?: string;
}

export interface GalaxyPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  init: (app: Hono, config: ServerConfig) => Promise<void> | void;
  destroy?: () => Promise<void> | void;
}

export interface RoomPeer {
  id: string;
  name: string;
  joinedAt: number;
}
