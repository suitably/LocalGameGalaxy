/**
 * Player join links for shared sessions [ID: MOD-SHARING-SESSION-LINK]
 *
 * A full link carries the compressed game snapshot and works without a broker. It is too long
 * for a scannable QR code once a game has data, so the QR code falls back to a short link
 * (game id and player only); the opening device then loads the game from the mailbox.
 */

/** Longest link still shown as a QR code that phone cameras scan reliably. */
export const QR_LINK_MAX_LENGTH = 700;

/** Byte capacity of the largest QR code (version 40, error correction L). */
export const QR_CAPACITY = 2953;

export interface SessionLinkParts {
  /** Origin and path of the app, e.g. `https://host/app/`. */
  appUrl: string;
  /** Hash route of the game, e.g. `/games/guessart`. */
  basePath: string;
  gameId: string;
  playerId: string;
  /** Compressed snapshot (already URI-safe); omitted in a short link. */
  data?: string;
  relay?: string | null;
}

export function buildSessionLink({
  appUrl,
  basePath,
  gameId,
  playerId,
  data,
  relay,
}: SessionLinkParts): string {
  let link = `${appUrl}#${basePath}?gameId=${gameId}&player=${playerId}`;
  if (data) link += `&data=${data}`;
  if (relay) link += `&gameRelay=${encodeURIComponent(relay)}`;
  return link;
}

/** The full link when it is short enough to scan, otherwise the short link without game data. */
export function pickQrLink(fullLink: string, shortLink: string): string {
  return fullLink.length <= QR_LINK_MAX_LENGTH ? fullLink : shortLink;
}

export const fitsQrCode = (link: string): boolean =>
  new TextEncoder().encode(link).length <= QR_CAPACITY;
