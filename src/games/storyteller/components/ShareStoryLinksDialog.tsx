import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import LZString from 'lz-string';
import type { StoryEntry, StoryGameRecord, StoryGameSnapshot } from '../types';
import { playerAssignment } from '../logic/playerAssignment';
import { gameRelayStorage } from '../../../lib/push/gameRelayStorage';
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
      const snapshot: StoryGameSnapshot = { game, entries };
      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(snapshot));
      const playerObj = game.players.find((p) => p.id === playerId);
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
    (playerId: string) => {
      if (!game) return;
      playerAssignment.removeLocalPlayerId(game.id, playerId);
      onPlayerChanged?.();
    },
    [game, onPlayerChanged],
  );

  const markPlayerLocal = useCallback(
    (playerId: string) => {
      if (!game) return;
      playerAssignment.addLocalPlayerId(game.id, playerId);
      onPlayerChanged?.();
    },
    [game, onPlayerChanged],
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
