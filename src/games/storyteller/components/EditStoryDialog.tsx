import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { StoryGameRecord } from '../types';
import { EditSessionDialog } from '../../../modules/sharing';

interface EditStoryDialogProps {
  open: boolean;
  onClose: () => void;
  game: StoryGameRecord | null;
  onSave: (payload: { name?: string; players?: { id: string; name: string }[] }) => Promise<void>;
}

export const EditStoryDialog: React.FC<EditStoryDialogProps> = ({
  open,
  onClose,
  game,
  onSave,
}) => {
  const { t } = useTranslation();

  const players = useMemo(
    () => (game ? game.players.map((p) => ({ id: p.id, name: p.name })) : []),
    [game],
  );

  if (!game) return null;

  return (
    <EditSessionDialog
      open={open}
      onClose={onClose}
      title={t('storyteller.editStory', 'Geschichte bearbeiten')}
      nameLabel={t('storyteller.storyTitleLabel', 'Titel der Geschichte')}
      initialName={game.name || ''}
      players={players}
      onSave={onSave}
    />
  );
};
