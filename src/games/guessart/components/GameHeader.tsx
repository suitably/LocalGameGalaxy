import React from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import BrushRoundedIcon from '@mui/icons-material/BrushRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { useTranslation } from 'react-i18next';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';

interface GameHeaderProps {
  game: GuessArtGameRecord | null;
  round: GuessArtRound | null;
  onExit: () => void;
  onOpenHistory?: () => void;
  onEditGame?: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  game,
  round,
  onExit,
  onOpenHistory,
  onEditGame,
}) => {
  const { t } = useTranslation();

  if (!game || !round) return null;

  const currentDrawer = game.players.find((p) => p.id === round.drawnById)?.name || 'Player';
  const isDrawing = game.status === 'drawing' || game.status === 'selecting';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1,
        py: 0.8,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <IconButton size="small" onClick={onExit} aria-label={t('common.back', 'Back')}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box>
          <Box display="flex" alignItems="center" gap={0.8}>
            <Typography variant="subtitle1" fontWeight={800} lineHeight={1.2}>
              {game.name || t('guessart.roundHeader', { round: round.roundNumber, defaultValue: `Runde ${round.roundNumber}` })}
            </Typography>
            {game.name && (
              <Chip
                label={t('guessart.roundHeader', { round: round.roundNumber, defaultValue: `Runde ${round.roundNumber}` })}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem', height: 20 }}
              />
            )}
          </Box>
        </Box>
      </Box>

      <Box display="flex" alignItems="center" gap={0.8}>
        <Chip
          icon={isDrawing ? <BrushRoundedIcon fontSize="small" /> : <PsychologyRoundedIcon fontSize="small" />}
          label={
            isDrawing
              ? t('guessart.drawerLabel', { name: currentDrawer, defaultValue: `Zeichnet: ${currentDrawer}` })
              : t('guessart.guesserLabel', { defaultValue: 'Raten!' })
          }
          color={isDrawing ? 'primary' : 'secondary'}
          size="small"
          sx={{ fontWeight: 600 }}
        />

        {onEditGame && (
          <Tooltip title={t('guessart.editGame', 'Spiel bearbeiten')}>
            <IconButton
              size="small"
              onClick={onEditGame}
              aria-label={t('guessart.editGame', 'Spiel bearbeiten')}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <EditRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {onOpenHistory && (
          <Tooltip title={t('guessart.viewHistory', 'Historie ansehen')}>
            <IconButton
              size="small"
              onClick={onOpenHistory}
              color="primary"
              aria-label={t('guessart.viewHistory', 'Historie ansehen')}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <HistoryRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

