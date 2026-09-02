import React from 'react';
import { Box, Paper, Typography, ButtonBase, Tooltip, IconButton, alpha } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import { useTranslation } from 'react-i18next';

const KNISTER_NUMBERS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface KnisterNumberBarProps {
  selectedNumber: number | null;
  onSelectNumber: (num: number | null) => void;
  disabled?: boolean;
}

export const KnisterNumberBar: React.FC<KnisterNumberBarProps> = ({
  selectedNumber,
  onSelectNumber,
  disabled = false,
}) => {
  const { t } = useTranslation();

  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 1, sm: 1.5 },
        borderRadius: 3,
        bgcolor: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
        width: '100%',
        maxWidth: 520,
        mx: 'auto',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, px: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <TouchAppIcon sx={{ fontSize: '1.1rem', color: selectedNumber !== null ? 'warning.main' : 'text.secondary' }} />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: selectedNumber !== null ? 'warning.main' : 'text.secondary',
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
            }}
          >
            {selectedNumber !== null
              ? t('games.knister.selected_number_prompt', {
                  defaultValue: `Zahl ${selectedNumber} gewählt – Feld antippen!`,
                  num: selectedNumber,
                })
              : t('games.knister.select_number_bar_title', 'Zahl für eigenes Würfeln wählen:')}
          </Typography>
        </Box>

        {selectedNumber !== null && (
          <Tooltip title={t('games.knister.clear_selection', 'Auswahl aufheben')}>
            <IconButton
              size="small"
              onClick={() => onSelectNumber(null)}
              sx={{ p: 0.2, color: 'text.secondary', '&:hover': { color: 'error.main' } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Number Buttons Row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(11, 1fr)',
          gap: { xs: 0.5, sm: 0.8 },
        }}
      >
        {KNISTER_NUMBERS.map((num) => {
          const isSelected = selectedNumber === num;
          const isSeven = num === 7;

          return (
            <ButtonBase
              key={`bar-num-${num}`}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onSelectNumber(isSelected ? null : num);
              }}
              sx={{
                aspectRatio: '1',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: { xs: '0.9rem', sm: '1.15rem' },
                bgcolor: isSelected
                  ? 'warning.main'
                  : isSeven
                  ? alpha('#ffa726', 0.15)
                  : 'rgba(255, 255, 255, 0.07)',
                color: isSelected ? 'warning.contrastText' : isSeven ? 'warning.light' : '#fff',
                border: '1.5px solid',
                borderColor: isSelected
                  ? 'warning.light'
                  : isSeven
                  ? alpha('#ffa726', 0.4)
                  : 'rgba(255, 255, 255, 0.12)',
                boxShadow: isSelected ? '0 0 12px rgba(255, 167, 38, 0.6)' : 'none',
                transform: isSelected ? 'scale(1.08)' : 'none',
                transition: 'all 0.15s ease',
                cursor: disabled ? 'default' : 'pointer',
                '&:hover': !disabled
                  ? {
                      bgcolor: isSelected ? 'warning.main' : alpha('#ffa726', 0.25),
                      borderColor: 'warning.main',
                      transform: 'scale(1.05)',
                    }
                  : {},
                '&:active': !disabled ? { transform: 'scale(0.95)' } : {},
              }}
            >
              {num}
            </ButtonBase>
          );
        })}
      </Box>
    </Paper>
  );
};
