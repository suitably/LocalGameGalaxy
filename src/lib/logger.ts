import { STORAGE_KEYS, storage } from './storageCore';

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/**
 * True when debug/info output is on for `scope`: always in dev builds, otherwise when the
 * `STORAGE_KEYS.DEBUG_LOG` flag is `1`/`true` (all scopes) or a comma-separated scope list.
 */
export function isDebugEnabled(scope: string): boolean {
  if (import.meta.env.DEV) return true;
  const flag = storage.get(STORAGE_KEYS.DEBUG_LOG).trim();
  if (flag === '1' || flag === 'true') return true;
  return flag !== '' && flag.split(',').some((s) => s.trim() === scope);
}

/**
 * Scoped logger. `warn`/`error` always reach the console; `debug`/`info` only when
 * `isDebugEnabled(scope)`. Never pass secrets, tokens, room keys or party ids.
 * Switch on in production: `localStorage.setItem('lgg_debug_log', '1')` (or a scope list), reload.
 */
export function createLogger(scope: string): Logger {
  const prefix = `[${scope}]`;
  return {
    debug: (...args) => {
      if (isDebugEnabled(scope)) console.debug(prefix, ...args);
    },
    info: (...args) => {
      if (isDebugEnabled(scope)) console.info(prefix, ...args);
    },
    warn: (...args) => console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args),
  };
}
