import React from 'react';
import { piecePalette } from '../../../themeTokens';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
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
        transition: 'all 0.2s ease',
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
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            ➔
          </Typography>
          <Chip
            label={`${nextTotal}P`}
            size="small"
            color="primary"
            variant="filled"
            sx={{ fontWeight: 800, fontSize: '0.85rem' }}
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

      {/* Quick Increment / Decrement Chips */}
      <Stack spacing={0.8}>
        {/* Positive Adds */}
        <Box sx={{ display: 'flex', gap: 0.8, overflowX: 'auto', pb: 0.2 }}>
          {QUICK_POSITIVE.map((amt) => (
            <Button
              key={amt}
              size="small"
              variant="outlined"
              onClick={() => handleStep(amt)}
              sx={{
                minWidth: 44,
                py: 0.2,
                px: 1,
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'success.main',
                borderColor: (theme) => alpha(theme.palette.success.main, 0.3),
                bgcolor: (theme) => alpha(theme.palette.success.main, 0.04),
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': {
                  borderColor: 'success.main',
                  bgcolor: (theme) => alpha(theme.palette.success.main, 0.15),
                },
              }}
            >
              +{amt}
            </Button>
          ))}
        </Box>

        {/* Negative Subtracts */}
        <Box sx={{ display: 'flex', gap: 0.8, overflowX: 'auto', pb: 0.2 }}>
          {QUICK_NEGATIVE.map((amt) => (
            <Button
              key={amt}
              size="small"
              variant="outlined"
              onClick={() => handleStep(amt)}
              sx={{
                minWidth: 44,
                py: 0.2,
                px: 1,
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'error.main',
                borderColor: (theme) => alpha(theme.palette.error.main, 0.3),
                bgcolor: (theme) => alpha(theme.palette.error.main, 0.04),
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': {
                  borderColor: 'error.main',
                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.15),
                },
              }}
            >
              {amt}
            </Button>
          ))}
        </Box>
      </Stack>
    </Box>
  );
};
