/**
 * Unified Game URL Parameter Parser [ID: MODULES-SHARING-URLPARAMS]
 *
 * Extracts query parameters from both standard search queries (`?foo=bar`)
 * and HashRouter locations (`#/game/guessart?foo=bar`), supporting seamless
 * deep-linking in SPA environments.
 */

export function parseGameUrlParams(
  search = typeof window !== 'undefined' ? window.location.search : '',
  hash = typeof window !== 'undefined' ? window.location.hash : ''
): URLSearchParams {
  const hashQuery = hash.includes('?') ? hash.substring(hash.indexOf('?')) : '';
  const effectiveQuery = search || hashQuery;
  return new URLSearchParams(effectiveQuery);
}

/**
 * Cleans URL search and query parameters without triggering a reload.
 */
export function cleanWindowUrlQuery(defaultHashPath?: string): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  const cleanHash = window.location.hash ? window.location.hash.split('?')[0] : (defaultHashPath || '');
  const cleanPath = window.location.pathname + cleanHash;
  window.history.replaceState({}, document.title, cleanPath);
}
