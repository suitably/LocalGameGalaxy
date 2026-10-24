import React from 'react';
import { alpha, Box, Paper, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/AddRounded';
import { fontFamilies } from '../../../themeTokens';

interface KnisterCellProps {
  value: number | null;
  /** Cell lies on the main or anti diagonal (counts double). */
  onDiagonal: boolean;
  isCenter: boolean;
  interactive: boolean;
  /** A sum (roll or selected number) is waiting to be placed. */
  hasActiveSum: boolean;
  activeSum: number | null;
  isTargetPicker: boolean;
  onActivate: () => void;
}

export const KnisterCell: React.FC<KnisterCellProps> = ({
  value,
  onDiagonal,
  isCenter,
  interactive,
  hasActiveSum,
  activeSum,
  isTargetPicker,
  onActivate,
}) => {
  const isEmpty = value === null;
  const offersPlacement = hasActiveSum && interactive;
  const highlighted = isTargetPicker || offersPlacement;

  return (
    <Paper
      elevation={0}
      onClick={() => interactive && onActivate()}
      sx={{
        aspectRatio: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fontFamilies.display,
        fontVariantNumeric: 'tabular-nums',
        fontSize: { xs: '1.25rem', sm: '1.6rem', md: '1.85rem' },
        fontWeight: 800,
        borderRadius: 2,
        cursor: interactive ? 'pointer' : 'default',
        bgcolor: (theme) =>
          !isEmpty
            ? 'background.paper'
            : isTargetPicker
              ? alpha(theme.palette.warning.main, 0.25)
              : offersPlacement
                ? alpha(theme.palette.warning.main, 0.12)
                : theme.palette.action.hover,
        color: isEmpty ? 'text.secondary' : 'text.primary',
        border: '2px solid',
        borderColor: highlighted ? 'warning.main' : onDiagonal ? 'secondary.main' : 'divider',
        transition: 'background-color 0.2s, border-color 0.2s, transform 0.2s',
        position: 'relative',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        '&:hover': interactive
          ? {
              transform: 'scale(1.06)',
              bgcolor: (theme) =>
                hasActiveSum
                  ? alpha(theme.palette.warning.main, 0.25)
                  : theme.palette.action.selected,
              borderColor: hasActiveSum ? 'warning.main' : 'primary.main',
            }
          : {},
        '&:active': interactive ? { transform: 'scale(0.96)' } : {},
      }}
    >
      {value !== null ? (
        value
      ) : offersPlacement ? (
        <Typography
          variant="caption"
          sx={{
            opacity: 0.45,
            fontSize: { xs: '0.85rem', sm: '1.15rem' },
            color: 'warning.main',
            fontWeight: 800,
          }}
        >
          {activeSum}
        </Typography>
      ) : interactive ? (
        <AddIcon
          sx={{
            opacity: 0.15,
            fontSize: { xs: '1rem', sm: '1.25rem' },
            color: 'text.secondary',
            transition: 'opacity 0.2s',
            '&:hover': { opacity: 0.5 },
          }}
        />
      ) : null}

      {onDiagonal && (
        <Box
          sx={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: isCenter ? 8 : 5,
            height: isCenter ? 8 : 5,
            borderRadius: '50%',
            bgcolor: 'secondary.main',
          }}
        />
      )}
    </Paper>
  );
};
