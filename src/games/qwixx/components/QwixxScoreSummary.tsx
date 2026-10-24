import React from 'react';
import { Box, Paper, Typography, Chip } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsRounded';
import LocalFloristIcon from '@mui/icons-material/LocalFloristRounded';
import { useTranslation } from 'react-i18next';
import type { PlayerSheet, RowColor } from '../logic/types';
import { calculateTotalScore } from '../logic/qwixxReducer';
import { getSheetDefinition } from '../logic/sheetDefinitions';
import { QwixxMissBoxes } from './QwixxMissBoxes';
import { QwixxScoreTile } from './QwixxScoreTile';

interface QwixxScoreSummaryProps {
  sheet: PlayerSheet;
  onAddMiss: () => void;
  onRemoveMiss: () => void;
  disabled?: boolean;
}

const ROW_COLORS: RowColor[] = ['red', 'yellow', 'green', 'blue'];

const Operator: React.FC<{ children: string }> = ({ children }) => (
  <Typography variant="h6" color="text.secondary">
    {children}
  </Typography>
);

export const QwixxScoreSummary: React.FC<QwixxScoreSummaryProps> = ({
  sheet,
  onAddMiss,
  onRemoveMiss,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const scores = calculateTotalScore(sheet);
  const sheetDef = getSheetDefinition(sheet.sheetType || 'classic');
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
        p: { xs: 1.5, sm: 2 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        mt: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1.5,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary" fontWeight="bold">
            {t('games.qwixx.mode_label', 'Modus:')}
          </Typography>
          <Chip
            size="small"
            label={t(sheetDef.nameKey)}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 'bold' }}
          />
        </Box>

        {sheet.sheetType === 'longo' && sheet.luckyNumbers && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <LocalFloristIcon sx={{ fontSize: '1.1rem', color: 'secondary.main' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
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
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
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
                icon={<EmojiEventsIcon sx={{ fontSize: '0.85rem', color: 'primary.main' }} />}
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
              p: 1,
              px: 2,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              textAlign: 'center',
              minWidth: 70,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: 'primary.contrastText', display: 'block', fontWeight: 'bold' }}
            >
              {t('games.qwixx.total', 'TOTAL')}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: 'primary.contrastText',
                fontWeight: 900,
                fontVariantNumeric: 'tabular-nums',
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
