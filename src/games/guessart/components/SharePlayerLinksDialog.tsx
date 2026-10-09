import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';
import { playerAssignment } from '../logic/playerAssignment';
import { LocalGameEngine } from '../logic/engine';
import { guessArtMailbox } from '../logic/guessArtMailbox';
import { ShareSessionLinksDialog, type SessionPlayerItem } from '../../../modules/sharing';
import {
  useSessionSharing,
  createIsPlayerLocalHelper,
  buildShareSessionDialogProps,
} from '../../../modules/sharing/useSessionSharing';

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

  const { buildPlayerLink, markPlayerRemote, markPlayerLocal } = useSessionSharing({
    game,
    basePath: '/games/guessart',
    buildSnapshot: (updatedPlayers) => ({
      game: { ...game!, players: updatedPlayers },
      round: activeRound || round || null,
    }),
    onPlayerChanged,
    removeLocalPlayerId: playerAssignment.removeLocalPlayerId.bind(playerAssignment),
    addLocalPlayerId: playerAssignment.addLocalPlayerId.bind(playerAssignment),
    updateGameDetails: LocalGameEngine.updateGameDetails.bind(LocalGameEngine),
    publishSync: guessArtMailbox.publish.bind(guessArtMailbox),
  });

  const isPlayerLocal = useCallback(
    createIsPlayerLocalHelper(game, playerAssignment.isPlayerLocal.bind(playerAssignment)),
    [game],
  );

  const sharedProps = buildShareSessionDialogProps(
    game,
    isPlayerLocal,
    buildPlayerLink,
    markPlayerRemote,
    markPlayerLocal,
    open,
    onClose,
    t('guessart.shareLinksTitle', 'Mitspieler-Links & Benachrichtigungen'),
    `GuessArt - "${game?.name || 'Spiel'}"`,
  );
  if (!sharedProps) return null;

  return (
    <ShareSessionLinksDialog
      {...sharedProps}
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
