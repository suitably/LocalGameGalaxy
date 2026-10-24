import React from 'react';
import { piecePalette, scoreText } from '../../../themeTokens';
import { transitionOf } from '../../../lib/motion';
import { ScoreQuickAmounts } from './ScoreQuickAmounts';
import { Box, Chip, IconButton, Stack, TextField, Tooltip, Typography, alpha } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded';
import AddIcon from '@mui/icons-material/AddRounded';
import RemoveIcon from '@mui/icons-material/RemoveRounded';
import RestartAltIcon from '@mui/icons-material/RestartAltRounded';
import { useTranslation } from 'react-i18next';

interface ModernScoreAdjusterProps {
  playerName: string;
  currentTotal: number;
  delta: number;
  onChange: (val: number) => void;
  accentColor?: string;
}

const QUICK_POSITIVE = [1, 5, 10, 20, 50];
const QUICK_NEGATIVE = [-1, -5, -10, -20, -50];

export const ModernScoreAdjuster: React.FC<ModernScoreAdjusterProps> = ({
  playerName,
  currentTotal,
  delta,
  onChange,
  accentColor = piecePalette.orange,
}) => {
  const { t } = useTranslation();

  const handleStep = (amount: number) => {
    onChange(delta + amount);
  };

  const handleClear = () => {
    onChange(0);
  };

  const handleDirectInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || raw === '-') {
      onChange(0);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const nextTotal = currentTotal + delta;

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 3,
        bgcolor: delta !== 0 ? alpha(accentColor, 0.08) : 'background.default',
        border: '1px solid',
        borderColor: delta !== 0 ? alpha(accentColor, 0.4) : 'divider',
        transition: transitionOf(['background-color', 'border-color'], 'standard'),
      }}
    >
      {/* Player Header & Live Result Preview */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          mb: 1.5,
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {playerName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('games.cards.current_score', 'Punktestand')}: <strong>{currentTotal}P</strong>
          </Typography>
        </Box>

        {/* Live Delta & New Total Badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={delta > 0 ? `+${delta}P` : `${delta}P`}
            size="small"
            sx={{
              ...scoreText,
              fontWeight: 800,
              fontSize: '0.85rem',
              bgcolor: (theme) =>
                delta === 0
                  ? theme.palette.action.selected
                  : alpha(theme.palette[delta > 0 ? 'success' : 'error'].main, 0.2),
              color: delta > 0 ? 'success.main' : delta < 0 ? 'error.main' : 'text.secondary',
              border: '1px solid',
              borderColor: (theme) =>
                delta === 0
                  ? 'transparent'
                  : alpha(theme.palette[delta > 0 ? 'success' : 'error'].main, 0.4),
            }}
          />
          <ArrowForwardIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Chip
            label={`${nextTotal}P`}
            size="small"
            color="primary"
            variant="filled"
            sx={{ ...scoreText, fontWeight: 800, fontSize: '0.85rem' }}
          />
        </Box>
      </Box>

      {/* Stepper and Custom Direct Input Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <IconButton
          size="small"
          onClick={() => handleStep(-1)}
          sx={{
            bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08),
            '&:hover': { bgcolor: (theme) => alpha(theme.palette.text.primary, 0.15) },
            borderRadius: 2,
            p: 0.8,
          }}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>

        <TextField
          size="small"
          type="number"
          value={delta === 0 ? '' : delta}
          onChange={handleDirectInput}
          placeholder="0"
          sx={{
            flex: 1,
            '& .MuiInputBase-input': {
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '1.05rem',
              py: 0.8,
            },
          }}
        />

        <IconButton
          size="small"
          onClick={() => handleStep(1)}
          sx={{
            bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08),
            '&:hover': { bgcolor: (theme) => alpha(theme.palette.text.primary, 0.15) },
            borderRadius: 2,
            p: 0.8,
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>

        {delta !== 0 && (
          <Tooltip title={t('games.cards.reset_delta', 'Auf 0 zurücksetzen')}>
            <IconButton
              size="small"
              onClick={handleClear}
              sx={{
                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05),
                color: 'text.secondary',
                '&:hover': { bgcolor: (theme) => alpha(theme.palette.text.primary, 0.12) },
                borderRadius: 2,
              }}
            >
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Stack spacing={0.8}>
        <ScoreQuickAmounts amounts={QUICK_POSITIVE} tone="success" onPick={handleStep} />
        <ScoreQuickAmounts amounts={QUICK_NEGATIVE} tone="error" onPick={handleStep} />
      </Stack>
    </Box>
  );
};
