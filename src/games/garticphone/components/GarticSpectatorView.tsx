/**
 * Gartic Phone for a device that is not in the game [ID: GARTIC-SPECTATOR]
 *
 * Pick a player and follow their round: the step they answer and, once sent, their answer (#659).
 */
import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SpectatorPlayerPicker } from '../../../components/games/SpectatorPlayerPicker';
import { useSpectatorSelection } from '../../../hooks/useSpectatorSelection';
import { isPlayerFinishedCurrentRound } from '../garticEngine';
import { garticSpectatorView } from '../logic/spectatorView';
import type { GarticGameState } from '../types';
import { AlbumStepCard } from './AlbumStepCard';

export const GarticSpectatorView: React.FC<{ state: GarticGameState }> = ({ state }) => {
  const { t } = useTranslation();
  const { watched, watch } = useSpectatorSelection(state.players.map((p) => p.id));
  const view = watched ? garticSpectatorView(state, watched) : null;
  const name = state.players.find((p) => p.id === watched)?.name ?? '';
  const doneIds = state.players
    .filter((p) => isPlayerFinishedCurrentRound(state, p.id))
    .map((p) => p.id);

  const taskLabel =
    view?.task === 'prompt'
      ? t('gartic.spectatorTaskPrompt', '{{name}} schreibt einen Satz', { name })
      : view?.task === 'drawing'
        ? t('gartic.spectatorTaskDrawing', '{{name}} zeichnet', { name })
        : t('gartic.spectatorTaskGuessing', '{{name}} beschreibt die Zeichnung', { name });

  return (
    <Box sx={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
      <SpectatorPlayerPicker
        players={state.players}
        watched={watched}
        onWatch={watch}
        doneIds={doneIds}
      />
      {view && (
        <Stack gap={1.5} sx={{ px: 1, pb: 2, maxWidth: 640, mx: 'auto' }}>
          <Typography variant="h6" fontWeight={800}>
            {taskLabel}
          </Typography>
          {view.received && (
            <AlbumStepCard step={view.received} isInitial={view.received.roundIndex === 0} />
          )}
          {view.sent ? (
            <AlbumStepCard step={view.sent} isInitial={view.task === 'prompt'} />
          ) : (
            <Typography color="text.secondary">
              {t('gartic.spectatorWorking', 'Noch nicht abgeschickt …')}
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );
};
