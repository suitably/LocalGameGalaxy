import React from 'react';
import { Box, Chip, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import BrushRoundedIcon from '@mui/icons-material/BrushRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useTranslation } from 'react-i18next';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';

interface GuessArtHeaderTitleProps {
  game: GuessArtGameRecord;
  round: GuessArtRound;
  isDrawing: boolean;
  isCurrentTurnLocal: boolean;
  currentDrawer: string;
  currentGuesser: string;
  effectiveGameName?: string | null;
}

export const GuessArtHeaderTitle: React.FC<GuessArtHeaderTitleProps> = ({
  game: _game,
  round,
  isDrawing,
  isCurrentTurnLocal,
  currentDrawer,
  currentGuesser,
  effectiveGameName,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumUp = useMediaQuery(theme.breakpoints.up('md'));

  const isLocalDrawingActive = isDrawing && isCurrentTurnLocal && round.status === 'drawing' && Boolean(round.word);

  if (isLocalDrawingActive && round.word) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.8, sm: 1.5 }, minWidth: 0, flexWrap: 'nowrap' }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.6,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            px: { xs: 1, sm: 1.5 },
            py: 0.4,
            borderRadius: 2,
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            minWidth: 0,
          }}
        >
          <BrushRoundedIcon sx={{ fontSize: { xs: 16, sm: 18 }, flexShrink: 0 }} />
          <Typography
            variant="caption"
            fontWeight={800}
            sx={{
              display: { xs: 'none', sm: 'inline-block' },
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              fontSize: '0.75rem',
              flexShrink: 0,
            }}
          >
            {t('guessart.drawWordPrompt', 'Zeichne:')}
          </Typography>
          <Typography
            variant="body2"
            fontWeight={900}
            sx={{
              fontSize: { xs: '0.92rem', sm: '1.05rem' },
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: { xs: '140px', sm: '260px' },
            }}
          >
            {round.word}
          </Typography>
          <Tooltip title={t('guessart.secretWordOnlyYou', 'Nur für dich sichtbar')}>
            <LockRoundedIcon sx={{ fontSize: { xs: 13, sm: 15 }, opacity: 0.85, flexShrink: 0 }} />
          </Tooltip>
        </Box>

        <Chip
          label={t('guessart.roundHeader', { round: round.roundNumber, defaultValue: `Runde ${round.roundNumber}` })}
          size="small"
          variant="outlined"
          sx={{
            fontSize: '0.75rem',
            height: { xs: 22, sm: 24 },
            borderColor: 'rgba(255, 255, 255, 0.2)',
            display: { xs: 'none', xs_plus: 'inline-flex', sm: 'inline-flex' },
            flexShrink: 0,
          }}
        />

        {isMediumUp && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, flexShrink: 0 }}>
            ({currentDrawer} vs. {currentGuesser})
          </Typography>
        )}
      </Box>
    );
  }

  // Non-drawing or remote drawing state
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.8, sm: 1.2 }, minWidth: 0 }}>
      <Typography
        variant="subtitle1"
        fontWeight={800}
        sx={{
          fontSize: { xs: '0.92rem', sm: '1.05rem' },
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: { xs: '140px', sm: '240px', md: '360px' },
        }}
      >
        {currentDrawer} vs. {currentGuesser}
      </Typography>

      <Chip
        label={
          isSmallScreen
            ? `R${round.roundNumber}`
            : t('guessart.roundHeader', { round: round.roundNumber, defaultValue: `Runde ${round.roundNumber}` })
        }
        size="small"
        variant="outlined"
        sx={{ fontSize: '0.75rem', height: { xs: 20, sm: 24 }, flexShrink: 0 }}
      />

      {effectiveGameName && isMediumUp && (
        <Chip
          label={effectiveGameName}
          size="small"
          variant="filled"
          sx={{ fontSize: '0.75rem', height: 22, bgcolor: 'action.selected', flexShrink: 0 }}
        />
      )}

      <Chip
        icon={isDrawing ? <BrushRoundedIcon fontSize="small" /> : <PsychologyRoundedIcon fontSize="small" />}
        label={
          isDrawing
            ? isSmallScreen
              ? currentDrawer
              : t('guessart.drawerLabel', { name: currentDrawer, defaultValue: `Zeichnet: ${currentDrawer}` })
            : isSmallScreen
              ? currentGuesser
              : t('guessart.guesserLabel', { name: currentGuesser, defaultValue: `Rät: ${currentGuesser}` })
        }
        color={isDrawing ? 'primary' : 'secondary'}
        size="small"
        sx={{
          fontWeight: 700,
          fontSize: '0.75rem',
          height: { xs: 22, sm: 24 },
          display: { xs: isDrawing ? 'inline-flex' : 'none', sm: 'inline-flex' },
          flexShrink: 0,
        }}
      />
    </Box>
  );
};
