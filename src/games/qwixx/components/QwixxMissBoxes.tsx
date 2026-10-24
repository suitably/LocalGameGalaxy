import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/CloseRounded';
import { useTranslation } from 'react-i18next';
import { transitionOf } from '../../../lib/motion';

interface QwixxMissBoxesProps {
  misses: number;
  onAddMiss: () => void;
  onRemoveMiss: () => void;
  disabled?: boolean;
}

const MAX_MISSES = 4;

/** Four tick boxes; only the next free or the last ticked box reacts. */
export const QwixxMissBoxes: React.FC<QwixxMissBoxesProps> = ({
  misses,
  onAddMiss,
  onRemoveMiss,
  disabled = false,
}) => {
  const { t } = useTranslation();

  const handleTap = (index: number) => {
    if (disabled) return;
    if (misses === index) onRemoveMiss();
    else if (misses === index - 1) onAddMiss();
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Typography variant="body2" color="text.secondary" fontWeight="bold">
        {t('games.qwixx.misses_label', 'Misses (-5):')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.75 }}>
        {Array.from({ length: MAX_MISSES }, (_, i) => i + 1).map((index) => {
          const isMissed = misses >= index;
          return (
            <ButtonBase
              key={index}
              onClick={() => handleTap(index)}
              disabled={disabled}
              sx={{
                width: { xs: 28, sm: 34 },
                height: { xs: 28, sm: 34 },
                borderRadius: 2,
                border: '2px solid',
                borderColor: isMissed ? 'error.main' : 'divider',
                bgcolor: isMissed
                  ? 'error.main'
                  : (theme) => alpha(theme.palette.text.primary, 0.05),
                color: 'error.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: transitionOf(['background-color', 'border-color']),
              }}
            >
              {isMissed ? <CloseIcon sx={{ fontSize: 20 }} /> : null}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
};
