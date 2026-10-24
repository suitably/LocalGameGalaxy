/**
 * WordleToast.tsx - Short status message above the board.
 */

import React from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

export const WordleToast: React.FC<{ message: string; status: 'playing' | 'won' | 'lost' }> = ({
  message,
  status,
}) => {
  const { t } = useTranslation();
  const tone =
    status === 'won'
      ? { bgcolor: 'success.main', color: 'success.contrastText', borderColor: 'success.main' }
      : status === 'lost'
        ? { bgcolor: 'error.main', color: 'error.contrastText', borderColor: 'error.main' }
        : { bgcolor: 'action.disabledBackground', color: 'text.primary', borderColor: 'divider' };

  return (
    <Box
      role="status"
      sx={{
        px: 2,
        py: 0.8,
        mb: 1,
        borderRadius: 2,
        border: '1px solid',
        fontWeight: 700,
        fontSize: '0.9rem',
        animation: 'fadeIn 0.2s ease-out',
        ...tone,
      }}
    >
      {t(message)}
    </Box>
  );
};
