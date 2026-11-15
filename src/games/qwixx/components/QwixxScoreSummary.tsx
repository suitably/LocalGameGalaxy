import React from 'react';
import { Box, Paper, Typography, Chip } from '@mui/material';
import type { ReactNode } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsRounded';
import LocalFloristIcon from '@mui/icons-material/LocalFloristRounded';
import { useTranslation } from 'react-i18next';
import type { PlayerSheet, RowColor } from '../logic/types';
import { calculateTotalScore } from '../logic/qwixxReducer';
import { QwixxMissBoxes } from './QwixxMissBoxes';
import { QwixxScoreTile } from './QwixxScoreTile';

interface QwixxScoreSummaryProps {
  sheet: PlayerSheet;
  onAddMiss: () => void;
  onRemoveMiss: () => void;
  disabled?: boolean;
  /** Sheet name / random chips for the top line. */
  sheetChips?: ReactNode;
}

const ROW_COLORS: RowColor[] = ['red', 'yellow', 'green', 'blue'];

const Operator: React.FC<{ children: string }> = ({ children }) => (
  <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: undefined } }}>
    {children}
  </Typography>
);

export const QwixxScoreSummary: React.FC<QwixxScoreSummaryProps> = ({
  sheet,
  onAddMiss,
  onRemoveMiss,
  disabled = false,
  sheetChips,
}) => {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const scores = calculateTotalScore(sheet);
  const labels: Record<RowColor, string> = {
    red: t('games.qwixx.red', 'Red'),
    yellow: t('games.qwixx.yellow', 'Yellow'),
    green: t('games.qwixx.green', 'Green'),
    blue: t('games.qwixx.blue', 'Blue'),
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1, sm: 2 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        mt: { xs: 0, sm: 2 },
        // Phones: compact so the whole sheet incl. score and misses fits one screen.
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 0.75, sm: 1.5 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {sheetChips}

        {sheet.sheetType === 'longo' && sheet.luckyNumbers && (
          <Box
            title={t('games.qwixx.lucky_numbers', 'Glückszahlen')}
            sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 0.8 }, flexShrink: 0 }}
          >
            <LocalFloristIcon sx={{ fontSize: '1.1rem', color: 'secondary.main' }} />
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 'bold',
                display: { xs: 'none', sm: 'inline' },
              }}
            >
              {t('games.qwixx.lucky_numbers', 'Glückszahlen')}:
            </Typography>
            {sheet.luckyNumbers.map((n, i) => (
              <Chip
                key={i}
                label={n}
                size="small"
                sx={{
                  bgcolor: alpha(palette.secondary.main, 0.16),
                  color: 'text.primary',
                  border: `1px solid ${palette.secondary.main}`,
                  fontWeight: 'bold',
                  height: 22,
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: { xs: 0.75, sm: 1.5 },
        }}
      >
        <Box
          sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, alignItems: 'center', flexWrap: 'wrap' }}
        >
          {ROW_COLORS.map((color, i) => (
            <React.Fragment key={color}>
              {i > 0 && <Operator>+</Operator>}
              <QwixxScoreTile
                label={labels[color]}
                value={scores[color]}
                color={palette.piece[color]}
              />
            </React.Fragment>
          ))}

          {scores.stairsBonus !== undefined && (
            <>
              <Operator>+</Operator>
              <QwixxScoreTile
                label={t('games.qwixx.stairs', 'Treppe')}
                value={scores.stairsBonus}
                color={palette.primary.main}
                minWidth={52}
                icon={<EmojiEventsIcon sx={{ fontSize: '0.85rem', color: 'primary.text' }} />}
              />
            </>
          )}

          <Operator>-</Operator>
          <QwixxScoreTile
            label={t('games.qwixx.misses', 'Misses')}
            value={scores.missesPenalty}
            color={palette.error.main}
          />

          <Operator>=</Operator>
          <Box
            sx={{
              p: { xs: 0.5, sm: 1 },
              px: { xs: 1.5, sm: 2 },
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              textAlign: 'center',
              minWidth: { xs: 52, sm: 70 },
            }}
            aria-label={t('games.qwixx.total', 'TOTAL')}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'primary.contrastText',
                display: { xs: 'none', sm: 'block' },
                fontWeight: 'bold',
              }}
            >
              {t('games.qwixx.total', 'TOTAL')}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: 'primary.contrastText',
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                fontSize: { xs: '1.25rem', sm: undefined },
                lineHeight: 1.3,
              }}
            >
              {scores.total}
            </Typography>
          </Box>
        </Box>

        <QwixxMissBoxes
          misses={sheet.misses}
          onAddMiss={onAddMiss}
          onRemoveMiss={onRemoveMiss}
          disabled={disabled}
        />
      </Box>
    </Paper>
  );
};
