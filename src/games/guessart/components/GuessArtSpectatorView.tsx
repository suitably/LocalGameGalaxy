/**
 * GuessArt for a device that is not in the game [ID: GUESSART-SPECTATOR]
 *
 * Pick a player: the drawer's view shows the word and the drawing once it is sent, the
 * guesser's view the drawing and the guesses so far (#659). Strokes are not streamed while drawn.
 */
import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SpectatorPlayerPicker } from '../../../components/games/SpectatorPlayerPicker';
import { useSpectatorSelection } from '../../../hooks/useSpectatorSelection';
import { ExcalidrawViewer } from '../../../modules/drawing';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';

export const GuessArtSpectatorView: React.FC<{
  game: GuessArtGameRecord;
  round: GuessArtRound;
}> = ({ game, round }) => {
  const { t } = useTranslation();
  const { watched, watch } = useSpectatorSelection(game.players.map((p) => p.id));
  const name = game.players.find((p) => p.id === watched)?.name ?? '';
  const isDrawer = watched === round.drawnById;
  const isGuesser = watched === round.guesserId;
  const drawing = round.status === 'guessing' && round.canvasData ? round.canvasData : null;

  return (
    <Box sx={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
      <SpectatorPlayerPicker players={game.players} watched={watched} onWatch={watch} />
      <Stack gap={1.5} sx={{ px: 1, pb: 2, maxWidth: 640, mx: 'auto' }}>
        {isDrawer && (
          <>
            <Typography variant="h6" fontWeight={800}>
              {round.status === 'selecting'
                ? t('guessart.spectatorChoosing', '{{name}} wählt ein Wort', { name })
                : t('guessart.spectatorDrawing', '{{name}} zeichnet', { name })}
            </Typography>
            {round.word && <Chip color="primary" label={round.word} sx={{ fontWeight: 800 }} />}
          </>
        )}
        {isGuesser && (
          <Typography variant="h6" fontWeight={800}>
            {t('guessart.spectatorGuessing', '{{name}} rät', { name })}
          </Typography>
        )}
        {!isDrawer && !isGuesser && (
          <Typography color="text.secondary">
            {t('guessart.spectatorIdle', '{{name}} ist gerade nicht dran.', { name })}
          </Typography>
        )}
        {(isDrawer || isGuesser) && drawing && (
          <Box sx={{ height: 320, borderRadius: 2, overflow: 'hidden' }}>
            <ExcalidrawViewer data={drawing} />
          </Box>
        )}
        {(isDrawer || isGuesser) && round.guesses.length > 0 && (
          <Stack direction="row" gap={0.75} flexWrap="wrap">
            {round.guesses.map((g, i) => (
              <Chip key={`${g}-${i}`} variant="outlined" label={g} />
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
};
