import React from 'react';
import { useTranslation } from 'react-i18next';
import { ButtonBase } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import LockIcon from '@mui/icons-material/LockRounded';
import LockOpenIcon from '@mui/icons-material/LockOpenRounded';
import type { RowColor } from '../logic/types';
import { getRowTone } from './rowTone';
import { transitionOf } from '../../../lib/motion';

interface QwixxLockButtonProps {
  color: RowColor;
  isLocked: boolean;
  canLock: boolean;
  onLock: () => void;
  onUnlock: () => void;
}

export const QwixxLockButton: React.FC<QwixxLockButtonProps> = ({
  color,
  isLocked,
  canLock,
  onLock,
  onUnlock,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const tone = getRowTone(theme, color);
  const active = isLocked || canLock;

  return (
    <ButtonBase
      onClick={isLocked ? onUnlock : onLock}
      disabled={!active}
      aria-label={
        isLocked ? t('common.a11y.unlock_row', 'Unlock row') : t('common.a11y.lock_row', 'Lock row')
      }
      sx={{
        // Phones: shares the row width like the cells, so it is a rounded slot, not a circle.
        flex: { xs: 1, sm: 'none' },
        minWidth: 0,
        width: { xs: 'auto', sm: 38, md: 46 },
        maxWidth: { xs: 48, sm: 'none' },
        height: { xs: 48, sm: 40, md: 48 },
        borderRadius: { xs: 2, sm: '50%' },
        bgcolor: active ? tone.button : tone.muted,
        color: active ? tone.ink : alpha(tone.ink, 0.5),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: isLocked ? `2px solid ${tone.ink}` : 'none',
        transition: transitionOf(['background-color', 'color', 'border-color']),
        animation: canLock ? 'qwixxLockPulse 1.5s infinite' : 'none',
        '@keyframes qwixxLockPulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        },
      }}
    >
      {isLocked ? (
        <LockIcon sx={{ fontSize: { xs: 18, sm: 24, md: 28 } }} />
      ) : (
        <LockOpenIcon sx={{ fontSize: { xs: 18, sm: 24, md: 28 } }} />
      )}
    </ButtonBase>
  );
};
