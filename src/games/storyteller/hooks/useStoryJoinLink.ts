/**
 * Opening a shared Storyteller player link [ID: HOOK-STORYTELLER-JOIN-LINK]
 *
 * Imports the story from the link, takes the player's seat on this device and publishes, so
 * the inviting device sees that the player joined.
 */
import { gameRelayStorage } from '../../../lib/push/gameRelayStorage';
import { joinSeatFromLink } from '../../../modules/player-management';
import { useGameJoinUrl } from '../../../modules/sharing';
import { LocalStoryEngine } from '../logic/engine';
import { storytellerMailboxService } from '../logic/mailboxService';
import type { StoryEntry, StoryGameRecord, StoryGameSnapshot } from '../types';

async function takeSeatHere(snap: StoryGameSnapshot, playerId: string | null, relay?: string) {
  const players = playerId ? joinSeatFromLink(snap.game.players, playerId, relay) : null;
  if (!players) return snap;
  const joined = await LocalStoryEngine.updateGameDetails(snap.game.id, { players });
  // Not awaited: without a reachable broker the publish waits, the join must not.
  storytellerMailboxService
    .publish(snap.game.id, { type: 'STORY_SYNC', snapshot: joined })
    .catch(() => {});
  return joined;
}

export function useStoryJoinLink(
  onOpened: (game: StoryGameRecord, entries: StoryEntry[]) => Promise<void>,
) {
  const open = async (snap: StoryGameSnapshot, params: URLSearchParams) => {
    const relay = params.get('gameRelay') || undefined;
    if (relay) gameRelayStorage.setGameRelay(snap.game.id, relay);
    const joined = await takeSeatHere(snap, params.get('player') || params.get('playerId'), relay);
    await onOpened(joined.game, joined.entries);
  };

  useGameJoinUrl<StoryGameSnapshot>({
    defaultHashPath: '#/games/storyteller',
    onSnapshotLoaded: async (snapshot, params) => {
      if (!snapshot?.game) return;
      const imported = await LocalStoryEngine.importSnapshot(snapshot);
      await open(imported, params);
    },
    onDirectGameId: async (gameId, params) => {
      // Without a snapshot the story must already be on this device.
      const snap = await LocalStoryEngine.getGameSnapshot(gameId).catch(() => null);
      if (snap) await open(snap, params);
    },
  });
}
