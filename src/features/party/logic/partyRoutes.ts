/**
 * Party lobby routing and share links [ID: LOGIC-PARTY-ROUTES]
 */
import { parseGameUrlParams } from '../../../modules/sharing';
import type { PartyGameType, RoomDiceGame } from './universalPartyManager';

const ROOM_DICE_GAMES: readonly RoomDiceGame[] = ['knister'];

/** Dice games that run in the party room with a sheet on every device. */
export const isRoomDiceGame = (id: string | null | undefined): id is RoomDiceGame =>
  ROOM_DICE_GAMES.includes(id as RoomDiceGame);

export type LobbyEntry = { kind: 'join'; roomId: string } | { kind: 'create' };

/** Join the room from the prop or the `room` URL parameter; otherwise this device creates one. */
export function resolveLobbyEntry(
  initialRoomId?: string,
  params: URLSearchParams = parseGameUrlParams(),
): LobbyEntry {
  if (initialRoomId) return { kind: 'join', roomId: initialRoomId };
  const fromUrl = params.get('room');
  return fromUrl ? { kind: 'join', roomId: fromUrl.toUpperCase().trim() } : { kind: 'create' };
}

/**
 * A game chosen before the lobby opened, from the Spieltisch: `/party?launch=tabletop&gameId=…`
 * or `/party?launch=knister`.
 */
export function resolvePendingLaunch(
  params: URLSearchParams = parseGameUrlParams(),
): { gameType: 'tabletop' | RoomDiceGame; gameId?: string } | null {
  const launch = params.get('launch');
  const gameId = params.get('gameId');
  if (launch === 'tabletop') return gameId ? { gameType: 'tabletop', gameId } : null;
  return isRoomDiceGame(launch) ? { gameType: launch } : null;
}

/** Route of the active party game; tabletop opens as TV for the host and as a seat for players. */
export function getGameRoute({
  gameType,
  tabletopGameId,
  roomId,
  isHost,
  seat,
  spectator = false,
}: {
  gameType: PartyGameType | null;
  tabletopGameId?: string | null;
  roomId: string;
  isHost: boolean;
  seat: number;
  /** Opens tabletop as `role=spectator` (no seat, read-only). */
  spectator?: boolean;
}): string {
  if (gameType === 'tabletop') {
    const targetGame = tabletopGameId || 'standard-cards';
    if (!isHost && spectator) {
      return `/games/tabletop?room=${roomId}&gameId=${targetGame}&role=spectator`;
    }
    return isHost
      ? `/games/tabletop?room=${roomId}&gameId=${targetGame}&role=tv`
      : `/games/tabletop?room=${roomId}&gameId=${targetGame}&seat=${Math.max(0, seat)}`;
  }
  if (gameType === 'garticphone') return `/games/garticphone?room=${roomId}`;
  if (isRoomDiceGame(gameType)) return `/games/${gameType}?room=${roomId}`;
  return '/games/guessart';
}

/** Invite link for the lobby; carries the companion server as `gameRelay` when it is active. */
export function buildPartyShareUrl({
  origin,
  pathname,
  roomId,
  relayUrl,
}: {
  origin: string;
  pathname: string;
  roomId: string;
  relayUrl?: string | null;
}): string {
  const url = `${origin}${pathname}#/party?room=${roomId}`;
  return relayUrl ? `${url}&gameRelay=${encodeURIComponent(relayUrl)}` : url;
}
