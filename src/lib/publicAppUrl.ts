/** Public address of the hosted web app, used in share texts that leave the device. */
export const PUBLIC_APP_URL = 'https://games.nexumia.de';

/** Public link to a game route (e.g. `games/wordle`), for share texts. */
export const publicAppLink = (route: string): string =>
  `${PUBLIC_APP_URL}/${route.replace(/^\/+/, '')}`;
