import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import LZString from 'lz-string';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';
import { playerAssignment } from '../logic/playerAssignment';
import { gameRelayStorage } from '../../../lib/push/gameRelayStorage';
import { LocalGameEngine } from '../logic/engine';
import {
  ShareSessionLinksDialog,
  type SessionPlayerItem,
} from '../../../modules/sharing';

interface SharePlayerLinksDialogProps {
  open: boolean;
  onClose: () => void;
  game: GuessArtGameRecord | null;
  round?: GuessArtRound | null;
  onPlayerChanged?: () => void;
}

export const SharePlayerLinksDialog: React.FC<SharePlayerLinksDialogProps> = ({
  open,
  onClose,
  game,
  round,
  onPlayerChanged,
}) => {
  const { t } = useTranslation();
  const [activeRound, setActiveRound] = useState<GuessArtRound | null>(round || null);

  useEffect(() => {
    if (round) {
      setActiveRound(round);
    } else if (game) {
      LocalGameEngine.getGameSnapshot(game.id)
        .then((snap) => {
          if (snap.round) {
            setActiveRound(snap.round);
          }
        })
        .catch((e) => console.warn('[SharePlayerLinksDialog] Failed to fetch round:', e));
    }
  }, [game, round]);

  const buildPlayerLink = useCallback(
    (playerId: string) => {
      if (!game) return '';
      const effRound = activeRound || round || null;
      const snapshot = { game, round: effRound };
      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(snapshot));
      const playerObj = game.players.find((p) => p.id === playerId);
      const relay = gameRelayStorage.getEffectiveRelay(game.id, playerObj?.relayUrl);
      let link = `${window.location.origin}${window.location.pathname}#/games/guessart?gameId=${game.id}&player=${playerId}&data=${compressed}`;
      if (relay) {
        link += `&gameRelay=${encodeURIComponent(relay)}`;
      }
      return link;
    },
    [game, activeRound, round],
  );

  const markPlayerRemote = useCallback(
    (playerId: string) => {
      if (!game) return;
      if (game.players[0] && playerId !== game.players[0].id) {
        playerAssignment.removeLocalPlayerId(game.id, playerId);
        onPlayerChanged?.();
      }
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
      sessionTitle={t('guessart.shareLinksTitle', 'Mitspieler-Links & Benachrichtigungen')}
      players={game.players}
      buildLink={buildPlayerLink}
      isPlayerLocal={isPlayerLocal}
      onMarkPlayerRemote={markPlayerRemote}
      shareMessageTitle={`GuessArt - "${game.name || 'Spiel'}"`}
      shareMessageText={(player: SessionPlayerItem, link: string) =>
        `🎨 Hallo ${player.name}! Hier ist dein Mitspieler-Link: ${link}`
      }
      descriptionText={t(
        'guessart.shareLinksDesc',
        'Sobald ein Link oder QR-Code geteilt wird, wird der Spieler als Remote markiert. Mitspieler spielen auf ihrem Smartphone mit und empfangen Push-Benachrichtigungen.',
      )}
      enablePushBanner={true}
    />
  );
};
