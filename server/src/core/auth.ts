import type { Context, MiddlewareHandler } from 'hono';
import { serverConfig } from '../config';
import type { ApiKeyPermission, HonoEnv } from './types';

/** Token sent by the caller via `Authorization: Bearer …` or `?token=`, normalized; null if absent. */
export const getRequestToken = (c: Context<HonoEnv>): string | null => {
  const authHeader = c.req.header('Authorization') || c.req.header('authorization');
  const rawToken = authHeader || c.req.query('token');
  if (!rawToken) return null;
  return String(rawToken)
    .replace(/^Bearer\s+/i, '')
    .trim()
    .replace(/^["']|["']$/g, '');
};

export const requireAuth: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const cleanToken = getRequestToken(c);

  if (!cleanToken) {
    c.header('WWW-Authenticate', 'Bearer realm="melodiq"');
    return c.json({ error: 'Unauthorized. No Token provided.' }, 401);
  }

  c.set('isMasterToken', false);

  if (cleanToken === serverConfig.token) {
    c.set('isMasterToken', true);
    return next();
  }

  const validApiKey = serverConfig.apiKeys.find((k) => k.token === cleanToken);
  if (validApiKey) {
    c.set('apiKey', validApiKey);
    if (validApiKey.allowManagement) {
      c.set('isMasterToken', true);
    }
    return next();
  }

  c.header('WWW-Authenticate', 'Bearer realm="melodiq"');
  return c.json({ error: 'Unauthorized. Invalid Token.' }, 401);
};

export const requireMasterToken: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const isMaster = c.get('isMasterToken');
  const apiKey = c.get('apiKey');
  if (!isMaster && (!apiKey || !apiKey.allowManagement)) {
    return c.json({ error: 'Master Token or Management permission required' }, 403);
  }
  return next();
};

/** True for the master token (and management keys) or an API key that holds `permission`. */
export const hasPermission = (c: Context<HonoEnv>, permission: ApiKeyPermission): boolean =>
  c.get('isMasterToken') === true || c.get('apiKey')?.[permission] === true;

/** Who made the request: the API key, or the master token. Used to own server-side records. */
export const getRequester = (c: Context<HonoEnv>): { id: string; name: string } => {
  const apiKey = c.get('apiKey');
  return apiKey ? { id: apiKey.id, name: apiKey.name } : { id: 'master', name: 'Master' };
};
