import React from 'react';
import { useTranslation } from 'react-i18next';
import type { StoryEntry, StoryGameRecord, StoryGameSnapshot } from '../types';
import { playerAssignment } from '../logic/playerAssignment';
import { LocalStoryEngine } from '../logic/engine';
import { storytellerMailboxService } from '../logic/mailboxService';
import { ShareSessionLinksDialog, type SessionPlayerItem } from '../../../modules/sharing';
import {
  useSessionSharing,
  buildShareSessionDialogProps,
} from '../../../modules/sharing/useSessionSharing';

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

  const { buildPlayerLink, markPlayerRemote, markPlayerLocal } = useSessionSharing({
    game,
    basePath: '/games/storyteller',
    buildSnapshot: (updatedPlayers): StoryGameSnapshot => ({
      game: { ...game!, players: updatedPlayers },
      entries,
    }),
    onPlayerChanged,
    updateGameDetails: LocalStoryEngine.updateGameDetails.bind(LocalStoryEngine),
    publishSync: (gameId, snapshot) =>
      storytellerMailboxService.publish(gameId, { type: 'STORY_SYNC', snapshot }),
  });

  const isPlayerLocal = (playerId: string) => !game || playerAssignment.isLocal(game, playerId);

  const sharedProps = buildShareSessionDialogProps(
    game,
    isPlayerLocal,
    buildPlayerLink,
    markPlayerRemote,
    markPlayerLocal,
    open,
    onClose,
    t('storyteller.shareLinksTitle'),
    `${t('games.storyteller.title')} - "${game?.name || 'Geschichte'}"`,
  );
  if (!sharedProps) return null;

  return (
    <ShareSessionLinksDialog
      {...sharedProps}
      shareMessageText={(player: SessionPlayerItem, link: string) =>
        `📖 Hallo ${player.name}! Schreibe mit an unserer Geschichte: ${link}`
      }
      descriptionText={t('storyteller.shareLinksDesc')}
      enablePushBanner={true}
    />
  );
};
