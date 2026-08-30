import React from 'react';
import {
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ExcalidrawViewer } from './ExcalidrawViewer';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';

interface WaitingForGuesserViewProps {
  game: GuessArtGameRecord;
  round: GuessArtRound;
  onOpenShareLinks?: () => void;
  onClaimPlayer?: (playerId: string) => void;
}

export const WaitingForGuesserView: React.FC<WaitingForGuesserViewProps> = ({
  round,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Drawing Preview Area */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          position: 'relative',
          borderRadius: 2.5,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <ExcalidrawViewer data={round.canvasData} />
      </Box>

      {/* Previous Guesses (if any) */}
      {round.guesses && round.guesses.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 1,
            mt: 1,
            borderRadius: 2,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            {t('guessart.guessesHistoryLabel', 'Bisherige Versuche:')}
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {round.guesses.map((g, idx) => (
              <Chip key={idx} label={g} size="small" variant="outlined" sx={{ textDecoration: 'line-through' }} />
            ))}
          </Stack>
        </Paper>
      )}
    </Box>
  );
};
