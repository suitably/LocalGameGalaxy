import React from 'react';
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
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
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
  accentColor = '#ffa726',
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
        bgcolor: delta !== 0 ? alpha(accentColor, 0.08) : 'rgba(255, 255, 255, 0.03)',
        border: '1px solid',
        borderColor: delta !== 0 ? alpha(accentColor, 0.4) : 'rgba(255, 255, 255, 0.08)',
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
              bgcolor:
                delta > 0
                  ? alpha('#00e676', 0.2)
                  : delta < 0
                  ? alpha('#ff5252', 0.2)
                  : 'rgba(255, 255, 255, 0.08)',
              color: delta > 0 ? '#00e676' : delta < 0 ? '#ff5252' : 'text.secondary',
              border: '1px solid',
              borderColor:
                delta > 0
                  ? alpha('#00e676', 0.4)
                  : delta < 0
                  ? alpha('#ff5252', 0.4)
                  : 'transparent',
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
            bgcolor: 'rgba(255, 255, 255, 0.08)',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.15)' },
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
            bgcolor: 'rgba(255, 255, 255, 0.08)',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.15)' },
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
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                color: 'text.secondary',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.12)' },
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
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#00e676',
                borderColor: alpha('#00e676', 0.3),
                bgcolor: alpha('#00e676', 0.04),
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#00e676',
                  bgcolor: alpha('#00e676', 0.15),
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
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#ff5252',
                borderColor: alpha('#ff5252', 0.3),
                bgcolor: alpha('#ff5252', 0.04),
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#ff5252',
                  bgcolor: alpha('#ff5252', 0.15),
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
