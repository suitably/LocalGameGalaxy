/**
 * Opening a shared GuessArt player link [ID: HOOK-GUESSART-JOIN-LINK]
 *
 * Imports the game from the link and takes the player's seat on this device, then publishes
 * so the inviting device sees that the player joined.
 */
import { gameRelayStorage } from '../../../lib/push/gameRelayStorage';
import { joinSeatFromLink } from '../../../modules/player-management';
import { useGameJoinUrl } from '../../../modules/sharing';
import { LocalGameEngine } from '../logic/engine';
import { guessArtMailbox } from '../logic/guessArtMailbox';
import type { GameSnapshot } from '../logic/types';

const playerParam = (params: URLSearchParams) => params.get('player') || params.get('playerId');
const relayParam = (params: URLSearchParams) =>
  params.get('gameRelay') || params.get('relay') || undefined;

async function takeSeatHere(
  gameId: string,
  playerId: string,
  relay: string | undefined,
  language: string,
) {
  const { game } = await LocalGameEngine.getGameSnapshot(gameId, language);
  const players = joinSeatFromLink(game.players, playerId, relay);
  if (!players) return;
  const snap = await LocalGameEngine.updateGameDetails(gameId, { players }, language);
  // Not awaited: without a reachable broker the publish waits, the join must not.
  guessArtMailbox.publish(gameId, snap).catch(() => {});
}

export function useGuessArtJoinLink(language: string, onOpened: (gameId: string) => Promise<void>) {
  useGameJoinUrl<GameSnapshot>({
    defaultHashPath: '#/games/guessart',
    onSnapshotLoaded: async (snapshot, params) => {
      if (!snapshot?.game) return;
      const imported = await LocalGameEngine.importSnapshot(snapshot, language);
      const gameId = imported.game.id;
      const relay = relayParam(params);
      if (relay) gameRelayStorage.setGameRelay(gameId, relay);
      const playerId = playerParam(params);
      if (playerId) await takeSeatHere(gameId, playerId, relay, language);
      await onOpened(gameId);
    },
    onDirectGameId: async (gameId, params) => {
      const relay = relayParam(params);
      if (relay) gameRelayStorage.setGameRelay(gameId, relay);
      const playerId = playerParam(params);
      // Without a snapshot the game must already be on this device.
      if (playerId) await takeSeatHere(gameId, playerId, relay, language).catch(() => {});
      await onOpened(gameId);
    },
  });
}
