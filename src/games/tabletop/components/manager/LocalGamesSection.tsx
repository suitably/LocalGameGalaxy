import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { GameCardItem } from './GameCardItem';
import type { TabletopGameSummary } from '../../logic/types';

interface LocalGamesSectionProps {
  games: TabletopGameSummary[];
  serverConnected: boolean;
  busyId: string | null;
  onPlayParty: (id: string) => void;
  onPlayLocal: (id: string) => void;
  onEdit: (id: string) => void;
  onExportJson: (id: string) => void;
  onExportPcio: (id: string) => void;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveToServer: (id: string) => void;
}

/** Games kept in this browser (imports, edits, local folders); with a server they can be saved there. */
export const LocalGamesSection: React.FC<LocalGamesSectionProps> = ({
  games,
  serverConnected,
  busyId,
  onSaveToServer,
  ...handlers
}) => {
  const { t } = useTranslation();
  if (games.length === 0) return null;
  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle1" fontWeight={700}>
        {t('games.tabletop.local_games_title', { count: games.length })}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {serverConnected
          ? t('games.tabletop.local_games_hint')
          : t('games.tabletop.local_games_hint_offline')}
      </Typography>
      <Stack spacing={1.5}>
        {games.map((g) => (
          <GameCardItem
            key={g.id}
            game={g}
            {...handlers}
            onSaveToServer={serverConnected ? onSaveToServer : undefined}
            busy={busyId === g.id}
          />
        ))}
      </Stack>
    </Box>
  );
};
