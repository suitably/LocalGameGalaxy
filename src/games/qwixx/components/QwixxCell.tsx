import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { useTheme, type Theme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/CloseRounded';
import CheckBoxIcon from '@mui/icons-material/CheckBoxRounded';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlankRounded';
import type { RowColor, SheetCell } from '../logic/types';
import { QwixxCellBadge } from './QwixxCellBadges';
import { getRowTone } from './rowTone';
import { transitionOf } from '../../../lib/motion';

interface QwixxCellProps {
  cell: SheetCell;
  /** Colour of the segment the cell sits in. */
  color: RowColor;
  chainKey?: string;
  isCrossed: boolean;
  isSubCrossed: boolean;
  isClickable: boolean;
  /** Row locked or sheet read-only: taps are ignored but the cell keeps its look. */
  disabled: boolean;
  isHighlighted: boolean;
  isLastNumber: boolean;
  isBonusRow: boolean;
  onTap: () => void;
}

const cellBorder = (theme: Theme, cell: SheetCell, isHighlighted: boolean): string => {
  const { palette } = theme;
  if (cell.isStair) return `2px dashed ${palette.primary.main}`;
  if (isHighlighted) return `3px solid ${palette.secondary.main}`;
  if (cell.isDouble) return `2.5px solid ${palette.warning.main}`;
  if (cell.chainId) return `2.5px dashed ${palette.piece.contrastText}`;
  return 'none';
};

export const QwixxCell: React.FC<QwixxCellProps> = ({
  cell,
  color,
  chainKey,
  isCrossed,
  isSubCrossed,
  isClickable,
  disabled,
  isHighlighted,
  isLastNumber,
  isBonusRow,
  onTap,
}) => {
  const theme = useTheme();
  const tone = getRowTone(theme, color);
  const dot = (key: string) => (
    <Box key={key} sx={{ width: 3.5, height: 3.5, borderRadius: '50%', bgcolor: 'warning.main' }} />
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        gap: 0.25,
      }}
    >
      <ButtonBase
        data-chain-cell={chainKey}
        onClick={onTap}
        disabled={disabled || !isClickable}
        sx={{
          width: { xs: 26, sm: 36, md: 44 },
          height: { xs: 32, sm: 40, md: 48 },
          borderRadius: 2,
          bgcolor: isCrossed ? tone.buttonCrossed : tone.button,
          color: isCrossed ? 'common.white' : tone.ink,
          fontWeight: 800,
          fontSize: { xs: '0.85rem', sm: '1.1rem', md: '1.25rem' },
          fontVariantNumeric: 'tabular-nums',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: transitionOf([
            'background-color',
            'color',
            'transform',
            'opacity',
            'border-color',
            'box-shadow',
          ]),
          transform: isCrossed ? 'scale(0.96)' : isHighlighted ? 'scale(1.08)' : 'none',
          opacity: !isClickable ? 0.35 : 1,
          border: cellBorder(theme, cell, isHighlighted),
          zIndex: isHighlighted ? 2 : 'auto',
          '&:active': { transform: 'scale(0.92)' },
        }}
      >
        {isCrossed ? (
          cell.isDouble ? (
            <Typography
              sx={{
                fontSize: { xs: '0.95rem', sm: '1.3rem', md: '1.5rem' },
                fontWeight: 800,
                color: 'primary.main',
                letterSpacing: -1,
                lineHeight: 1,
              }}
            >
              XX
            </Typography>
          ) : (
            <CloseIcon
              sx={{
                fontSize: { xs: 22, sm: 28, md: 34 },
                color: 'common.white',
                stroke: theme.palette.common.white,
                strokeWidth: 1.5,
              }}
            />
          )
        ) : (
          cell.number
        )}

        {isLastNumber && !isCrossed && !isBonusRow && (
          <Box
            sx={{
              position: 'absolute',
              top: 1,
              right: 1,
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: tone.fill,
            }}
          />
        )}

        {cell.isDouble && !isCrossed && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 2,
              display: 'flex',
              gap: 0.3,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {dot('a')}
            {dot('b')}
          </Box>
        )}
      </ButtonBase>

      <QwixxCellBadge cell={cell} />

      {cell.hasSubBox && (
        <ButtonBase
          onClick={onTap}
          disabled={disabled || !isClickable}
          sx={{
            p: 0,
            mt: 0.2,
            opacity: isCrossed ? 1 : 0.25,
            transition: transitionOf(['opacity', 'color']),
            color: tone.ink,
          }}
        >
          {isSubCrossed ? (
            <CheckBoxIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
          ) : (
            <CheckBoxOutlineBlankIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
          )}
        </ButtonBase>
      )}
    </Box>
  );
};
