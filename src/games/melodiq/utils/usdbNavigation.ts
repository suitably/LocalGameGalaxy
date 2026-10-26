import type { NavigateFunction, Location } from 'react-router-dom';
import { settingsPath } from '../../../features/settings/settingsRoutes';

/**
 * Checks if an error indicates that USDB login credentials are required or failed.
 */
export function isUsdbLoginRequiredError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('usdb requires login') ||
    msg.includes('save your credentials') ||
    msg.includes('login to search') ||
    (msg.includes('usdb') && msg.includes('credentials')) ||
    (msg.includes('usdb') && msg.includes('login'))
  );
}

/**
 * Navigates to Settings -> Connectivity -> Companion plugins (USDB credentials),
 * using the `usdb` highlight so the credentials card is highlighted and focused.
 */
export function navigateToUsdbSettings(
  navigate: NavigateFunction,
  location?: Location | { pathname: string; search: string },
): void {
  const from = location ? `${location.pathname}${location.search}` : '/games/melodiq';
  navigate(settingsPath({ kind: 'app', section: 'connectivity', highlight: 'usdb' }), {
    state: { from },
  });
}
