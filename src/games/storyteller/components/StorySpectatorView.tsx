/**
 * Storyteller for a device that is not in the game [ID: STORY-SPECTATOR]
 *
 * Pick a player: whether they are writing now and the lines they sent so far (#659). Text being
 * typed is not streamed; a line shows once it is sent.
 */
import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SpectatorPlayerPicker } from '../../../components/games/SpectatorPlayerPicker';
import { useSpectatorSelection } from '../../../hooks/useSpectatorSelection';
import type { StoryEntry, StoryGameRecord } from '../types';

export const StorySpectatorView: React.FC<{
  game: StoryGameRecord;
  entries: StoryEntry[];
}> = ({ game, entries }) => {
  const { t } = useTranslation();
  const { watched, watch } = useSpectatorSelection(game.players.map((p) => p.id));
  const name = game.players.find((p) => p.id === watched)?.name ?? '';
  const writing = game.players[game.currentPlayerIndex]?.id === watched;
  const own = entries.filter((e) => e.authorId === watched);

  return (
    <Box sx={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
      <SpectatorPlayerPicker players={game.players} watched={watched} onWatch={watch} />
      <Stack gap={1.5} sx={{ px: 1, pb: 2, maxWidth: 640, mx: 'auto' }}>
        <Typography variant="h6" fontWeight={800}>
          {writing
            ? t('storyteller.roomWaiting', '{{name}} schreibt gerade …', { name })
            : t('storyteller.spectatorNotTurn', '{{name}} ist gerade nicht dran.', { name })}
        </Typography>
        {own.length === 0 && (
          <Typography color="text.secondary">
            {t('storyteller.spectatorNoLines', 'Noch keine Zeile geschrieben.')}
          </Typography>
        )}
        {own.map((e) => (
          <Paper key={e.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {t('storyteller.spectatorTurn', 'Zug {{n}}', { n: e.turnNumber })}
            </Typography>
            <Typography>{e.text}</Typography>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
};
