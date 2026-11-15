/**
 * Draw pot (Lostopf) on the companion server [ID: SERVER-DRAWPOT-PLUGIN]
 *
 * Same API as the Cloudflare worker (`core/http.ts`). Creating a pot needs the server token or
 * an API key (only the owner's app may store data here); viewing and drawing are public, host
 * actions need the pot's admin key. Pots live in `DRAWPOT_DIR`, default `drawpots/` next to
 * `config.json` (so the Docker config volume keeps them), and expire after 60 days.
 */
import path from 'node:path';
import type { GalaxyPlugin } from '../../core/types';
import { requireAuth } from '../../core/auth';
import { defaultDataDir } from '../../config';
import { handleDrawPotRequest } from './core/http';
import { FilePotStore } from './store';

const SWEEP_MS = 60 * 60 * 1000;

export function drawPotDir(env: NodeJS.ProcessEnv = process.env): string {
  if (env.DRAWPOT_DIR) return path.resolve(env.DRAWPOT_DIR);
  if (env.CONFIG_PATH) return path.join(path.dirname(path.resolve(env.CONFIG_PATH)), 'drawpots');
  return defaultDataDir('drawpots');
}

export const drawPotPlugin: GalaxyPlugin = {
  id: 'drawpot',
  name: 'Draw Pot',
  version: '1.0.0',
  description: 'Draw pots (Lostopf) and secret santa shared by link',
  init(app) {
    const store = new FilePotStore(drawPotDir());
    console.log(`[DrawPot] Pots folder: ${store.dir}`);
    const timer = setInterval(() => void store.sweep(), SWEEP_MS);
    timer.unref();

    app.post('/api/drawpot', requireAuth, (c) => handleDrawPotRequest(c.req.raw, store.executor));
    app.all('/api/drawpot/*', (c) => handleDrawPotRequest(c.req.raw, store.executor));
  },
};
