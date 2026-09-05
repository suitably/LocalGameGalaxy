import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import LZString from 'lz-string';
import type { StoryEntry, StoryGameRecord, StoryGameSnapshot } from '../types';
import { playerAssignment } from '../logic/playerAssignment';
import { gameRelayStorage } from '../../../lib/push/gameRelayStorage';
import { LocalStoryEngine } from '../logic/engine';
import { storytellerMailboxService } from '../logic/mailboxService';
import {
  ShareSessionLinksDialog,
  type SessionPlayerItem,
} from '../../../modules/sharing';

interface ShareStoryLinksDialogProps {
  open: boolean;
  onClose: () => void;
  game: StoryGameRecord | null;
  entries?: StoryEntry[];
  onPlayerChanged?: () => void;
}

export const ShareStoryLinksDialog: React.FC<ShareStoryLinksDialogProps> = ({
  open,
  onClose,
  game,
  entries = [],
  onPlayerChanged,
}) => {
  const { t } = useTranslation();

  const buildPlayerLink = useCallback(
    (playerId: string) => {
      if (!game) return '';
      const updatedPlayers = game.players.map((p) =>
        p.id === playerId ? { ...p, isRemote: true } : p,
      );
      const snapshot: StoryGameSnapshot = {
        game: { ...game, players: updatedPlayers },
        entries,
      };
      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(snapshot));
      const playerObj = updatedPlayers.find((p) => p.id === playerId);
      const relay = gameRelayStorage.getEffectiveRelay(game.id, playerObj?.relayUrl);
      let link = `${window.location.origin}${window.location.pathname}#/games/storyteller?gameId=${game.id}&player=${playerId}&data=${compressed}`;
      if (relay) {
        link += `&gameRelay=${encodeURIComponent(relay)}`;
      }
      return link;
    },
    [game, entries],
  );

  const markPlayerRemote = useCallback(
    async (playerId: string) => {
      if (!game) return;
      if (game.players[0] && playerId !== game.players[0].id) {
        playerAssignment.removeLocalPlayerId(game.id, playerId);
        const updatedPlayers = game.players.map((p) =>
          p.id === playerId ? { ...p, isRemote: true } : p,
        );
        try {
          const snap = await LocalStoryEngine.updateGameDetails(game.id, { players: updatedPlayers });
          storytellerMailboxService.publish(game.id, {
            type: 'STORY_SYNC',
            snapshot: { game: snap.game, entries },
          });
        } catch (e) {
          console.warn('[ShareStoryLinksDialog] Failed to mark player remote in db:', e);
        }
        onPlayerChanged?.();
      }
    },
    [game, entries, onPlayerChanged],
  );

  const markPlayerLocal = useCallback(
    async (playerId: string) => {
      if (!game) return;
      playerAssignment.addLocalPlayerId(game.id, playerId);
      const updatedPlayers = game.players.map((p) =>
        p.id === playerId ? { ...p, isRemote: false } : p,
      );
      try {
        const snap = await LocalStoryEngine.updateGameDetails(game.id, { players: updatedPlayers });
        storytellerMailboxService.publish(game.id, {
          type: 'STORY_SYNC',
          snapshot: { game: snap.game, entries },
        });
      } catch (e) {
        console.warn('[ShareStoryLinksDialog] Failed to mark player local in db:', e);
      }
      onPlayerChanged?.();
    },
    [game, entries, onPlayerChanged],
  );

  const isPlayerLocal = useCallback(
    (playerId: string) => {
      if (!game) return true;
      return playerAssignment.isPlayerLocal(game.id, playerId);
    },
    [game],
  );

  if (!game) return null;

  return (
    <ShareSessionLinksDialog
      open={open}
      onClose={onClose}
      sessionId={game.id}
      sessionTitle={t('storyteller.shareLinksTitle', 'Mitspieler-Links & Benachrichtigungen')}
      players={game.players}
      buildLink={buildPlayerLink}
      isPlayerLocal={isPlayerLocal}
      onMarkPlayerRemote={markPlayerRemote}
      onMarkPlayerLocal={markPlayerLocal}
      shareMessageTitle={`${t('games.storyteller.title', 'Geschichtenschreiber')} - "${game.name || 'Geschichte'}"`}
      shareMessageText={(player: SessionPlayerItem, link: string) =>
        `📖 Hallo ${player.name}! Schreibe mit an unserer Geschichte: ${link}`
      }
      descriptionText={t(
        'storyteller.shareLinksDesc',
        'Sobald ein Link oder QR-Code geteilt wird, wird der Spieler als Remote markiert. Mitspieler spielen auf ihrem Smartphone mit und empfangen Push-Benachrichtigungen.',
      )}
      enablePushBanner={true}
    />
  );
};
