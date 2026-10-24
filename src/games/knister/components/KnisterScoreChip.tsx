import React from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { fontFamilies } from '../../../themeTokens';

interface KnisterScoreChipProps {
  title: string;
  points: number;
  color: 'primary' | 'secondary';
  /** Extra spacing so the chip sits next to the grid edge it belongs to. */
  wrapperSx?: SxProps<Theme>;
}

/** Points badge at the end of a row or column, with the combination name as tooltip. */
export const KnisterScoreChip: React.FC<KnisterScoreChipProps> = ({
  title,
  points,
  color,
  wrapperSx,
}) => (
  <Tooltip title={title} arrow>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', ...wrapperSx }}>
      <Chip
        label={`${points}`}
        size="small"
        color={points > 0 ? color : 'default'}
        variant={points > 0 ? 'filled' : 'outlined'}
        sx={{
          fontFamily: fontFamilies.display,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 700,
          fontSize: { xs: '0.75rem', sm: '0.85rem' },
          minWidth: { xs: 28, sm: 36 },
        }}
      />
    </Box>
  </Tooltip>
);
