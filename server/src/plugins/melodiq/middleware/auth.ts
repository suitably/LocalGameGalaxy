import type { MiddlewareHandler } from 'hono';
import { serverConfig } from '../../../config';
import type { HonoEnv } from '../../../core/types';

export const requireAuth: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization') || c.req.header('authorization');
  const queryToken = c.req.query('token');
  const rawToken = authHeader || queryToken;

  if (!rawToken) {
    c.header('WWW-Authenticate', 'Bearer realm="melodiq"');
    return c.json({ error: 'Unauthorized. No Token provided.' }, 401);
  }

  const cleanToken = String(rawToken)
    .replace(/^Bearer\s+/i, '')
    .trim()
    .replace(/^["']|["']$/g, '');

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
