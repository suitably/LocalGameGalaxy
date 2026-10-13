import { useCallback } from 'react';
import LZString from 'lz-string';
import { gameRelayStorage } from '../../lib/push/gameRelayStorage';

export interface UseSessionSharingOptions<TGame, TSnapshot> {
  game: (TGame & { id: string; players: any[] }) | null;
  basePath: string; // e.g., '/games/guessart'
  buildSnapshot: (updatedPlayers: any[]) => TSnapshot;
  onPlayerChanged?: () => void;
  removeLocalPlayerId: (gameId: string, playerId: string) => void;
  addLocalPlayerId: (gameId: string, playerId: string) => void;
  updateGameDetails: (gameId: string, details: { players: any[] }) => Promise<{ game: any }>;
  publishSync: (gameId: string, snapshot: TSnapshot) => Promise<any> | void;
}

export function useSessionSharing<TGame, TSnapshot>({
  game,
  basePath,
  buildSnapshot,
  onPlayerChanged,
  removeLocalPlayerId,
  addLocalPlayerId,
  updateGameDetails,
  publishSync,
}: UseSessionSharingOptions<TGame, TSnapshot>) {
  const buildPlayerLink = useCallback(
    (playerId: string) => {
      if (!game) return '';
      const updatedPlayers = game.players.map((p) =>
        p.id === playerId ? { ...p, isRemote: true } : p,
      );
      const snapshot = buildSnapshot(updatedPlayers);
      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(snapshot));
      const playerObj = updatedPlayers.find((p) => p.id === playerId);
      const relay = gameRelayStorage.getEffectiveRelay(game.id, playerObj?.relayUrl);
      let link = `${window.location.origin}${window.location.pathname}#${basePath}?gameId=${game.id}&player=${playerId}&data=${compressed}`;
      if (relay) {
        link += `&gameRelay=${encodeURIComponent(relay)}`;
      }
      return link;
    },
    [game, basePath, buildSnapshot],
  );

  const updateAndSyncPlayer = useCallback(
    async (playerId: string, isRemote: boolean, isHost: boolean) => {
      if (!game) return;
      if (isRemote && isHost) return;

      if (isRemote) {
        removeLocalPlayerId(game.id, playerId);
      } else {
        addLocalPlayerId(game.id, playerId);
      }

      const updatedPlayers = game.players.map((p) => (p.id === playerId ? { ...p, isRemote } : p));

      try {
        const { game: updatedGame } = await updateGameDetails(game.id, { players: updatedPlayers });
        const snapshot = buildSnapshot(updatedGame.players);
        if ((snapshot as any).game) {
          (snapshot as any).game.updatedAt = updatedGame.updatedAt;
        }
        await publishSync(game.id, snapshot);
      } catch (e) {
        console.warn(
          `[useSessionSharing] Failed to mark player ${isRemote ? 'remote' : 'local'} in db:`,
          e,
        );
      }
      onPlayerChanged?.();
    },
    [
      game,
      onPlayerChanged,
      removeLocalPlayerId,
      addLocalPlayerId,
      updateGameDetails,
      buildSnapshot,
      publishSync,
    ],
  );

  const markPlayerRemote = useCallback(
    (playerId: string) =>
      updateAndSyncPlayer(playerId, true, !!game?.players[0] && playerId === game.players[0].id),
    [updateAndSyncPlayer, game],
  );

  const markPlayerLocal = useCallback(
    (playerId: string) => updateAndSyncPlayer(playerId, false, false),
    [updateAndSyncPlayer],
  );

  return {
    buildPlayerLink,
    markPlayerRemote,
    markPlayerLocal,
  };
}

export const createIsPlayerLocalHelper = (
  game: { id: string } | null,
  isLocalImpl: (gameId: string, playerId: string) => boolean,
) => {
  return (playerId: string) => {
    if (!game) return true;
    return isLocalImpl(game.id, playerId);
  };
};

export const buildShareSessionProps = <TGame extends { id: string }>(
  game: TGame | null,
  isPlayerLocal: (playerId: string) => boolean,
  buildPlayerLink: (playerId: string) => string,
  markPlayerRemote: (playerId: string) => void,
  markPlayerLocal: (playerId: string) => void,
) => {
  if (!game) return null;
  return {
    sessionId: game.id,
    isPlayerLocal,
    buildLink: buildPlayerLink,
    onMarkPlayerRemote: markPlayerRemote,
    onMarkPlayerLocal: markPlayerLocal,
  };
};

export const buildShareSessionDialogProps = <
  TGame extends { id: string; players: any[]; name?: string },
>(
  game: TGame | null,
  isPlayerLocal: (playerId: string) => boolean,
  buildPlayerLink: (playerId: string) => string,
  markPlayerRemote: (playerId: string) => void,
  markPlayerLocal: (playerId: string) => void,
  open: boolean,
  onClose: () => void,
  sessionTitle: string,
  shareMessageTitle: string,
) => {
  if (!game) return null;
  return {
    open,
    onClose,
    sessionId: game.id,
    isPlayerLocal,
    buildLink: buildPlayerLink,
    onMarkPlayerRemote: markPlayerRemote,
    onMarkPlayerLocal: markPlayerLocal,
    players: game.players,
    sessionTitle,
    shareMessageTitle,
  };
};
