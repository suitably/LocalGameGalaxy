import React from 'react';
import { ButtonBase } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import LockIcon from '@mui/icons-material/LockRounded';
import LockOpenIcon from '@mui/icons-material/LockOpenRounded';
import type { RowColor } from '../logic/types';
import { getRowTone } from './rowTone';

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
  const theme = useTheme();
  const tone = getRowTone(theme, color);
  const active = isLocked || canLock;

  return (
    <ButtonBase
      onClick={isLocked ? onUnlock : onLock}
      disabled={!active}
      sx={{
        width: { xs: 28, sm: 38, md: 46 },
        height: { xs: 32, sm: 40, md: 48 },
        borderRadius: '50%',
        bgcolor: active ? tone.button : tone.muted,
        color: active ? tone.ink : alpha(tone.ink, 0.5),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: isLocked ? `2px solid ${tone.ink}` : 'none',
        transition: 'all 0.2s ease',
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
