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
  /** Locked by crossing the lock number (+1 cross); otherwise closed by another player. */
  hasBonus: boolean;
  canLock: boolean;
  disabled?: boolean;
  onLock: () => void;
  onUnlock: () => void;
}

export const QwixxLockButton: React.FC<QwixxLockButtonProps> = ({
  color,
  isLocked,
  hasBonus,
  canLock,
  disabled = false,
  onLock,
  onUnlock,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const tone = getRowTone(theme, color);
  // Always tappable: a row another player closed is closed here too, just without the bonus.
  const highlighted = isLocked || canLock;
  const label = isLocked
    ? t('common.a11y.unlock_row', 'Unlock row')
    : canLock
      ? t('common.a11y.lock_row', 'Lock row')
      : t('games.qwixx.close_row_by_other', 'Close row (closed by another player, no point)');
  const lockedBorder = hasBonus ? `2px solid ${tone.ink}` : `2px dashed ${tone.ink}`;

  return (
    <ButtonBase
      onClick={isLocked ? onUnlock : onLock}
      disabled={disabled}
      aria-label={label}
      title={label}
      sx={{
        // Phones: shares the row width like the cells, so it is a rounded slot, not a circle.
        flex: { xs: 1, sm: 'none' },
        minWidth: 0,
        width: { xs: 'auto', sm: 38, md: 46 },
        maxWidth: { xs: 48, sm: 'none' },
        height: { xs: 48, sm: 40, md: 48 },
        borderRadius: { xs: 2, sm: '50%' },
        bgcolor: highlighted ? tone.button : tone.muted,
        color: highlighted ? tone.ink : alpha(tone.ink, 0.5),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: isLocked ? lockedBorder : 'none',
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
